/**
 * Pterodactyl driver.
 *
 * Implements the HypervisorDriver contract against the Pterodactyl Panel
 * Application API (v1) and Client API (v1):
 *
 *   Application API  - nodes, allocations, nests, eggs, server lifecycle
 *                      (create, suspend, unsuspend, delete)
 *   Client API       - power signals, resource telemetry, console WebSocket
 *                      token issuance, backups
 *
 * Both keys are required. The Application API key needs read/write access to
 * servers, nodes, allocations and eggs; the Client API key must belong to an
 * administrator account (or a client with access to every managed server).
 *
 * Notable behaviors:
 *   - Token-bucket rate limiting (default 10 req/s) to stay inside the
 *     panel's rate limits.
 *   - Server identifiers are the short UUIDs issued by the panel; numeric
 *     Application API ids are resolved on demand for write endpoints.
 *   - All responses are validated by type guards; malformed payloads raise
 *     HypervisorDriverError instead of surfacing as undefined access.
 */

import {
  HypervisorDriverError,
  type Allocation,
  type BackupInfo,
  type ConsoleSession,
  type DriverErrorCode,
  type EggDefinition,
  type HealthReport,
  type HypervisorDriver,
  type ListServersFilter,
  type NodeDefinition,
  type PowerSignal,
  type ProvisionRequest,
  type ProvisionResult,
  type RebuildRequest,
  type ServerInfo,
  type TelemetrySample,
  type TerminateOptions
} from "./types";
import type { PterodactylConfig } from "./types";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_RATE_LIMIT_RPS = 10;

// ---------------------------------------------------------------------------
// Small utilities
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/** Token-bucket rate limiter shared by all requests of one driver instance. */
class TokenBucket {
  private tokens: number;
  private lastRefill: number;

  constructor(private readonly rps: number) {
    this.tokens = rps;
    this.lastRefill = Date.now();
  }

  async acquire(): Promise<void> {
    const now = Date.now();
    const elapsedMs = now - this.lastRefill;
    this.tokens = Math.min(this.rps, this.tokens + (elapsedMs / 1000) * this.rps);
    this.lastRefill = now;

    if (this.tokens >= 1) {
      this.tokens -= 1;
      return;
    }

    const waitMs = ((1 - this.tokens) / this.rps) * 1000;
    await sleep(Math.ceil(waitMs));
    this.tokens = 0;
    this.lastRefill = Date.now();
  }
}

// ---------------------------------------------------------------------------
// Response shapes (Pterodactyl wraps payloads in { attributes: {...} })
// ---------------------------------------------------------------------------

interface PterodactylResource<T> {
  attributes: T;
}

interface PterodactylList<T> {
  data: Array<PterodactylResource<T>>;
  meta?: { pagination?: { total?: number } };
}

interface AppNodeAttributes {
  id: number;
  uuid: string;
  name: string;
  fqdn: string;
  scheme: string;
  memory: number;
  disk: number;
  cpu?: number;
  location_id: number;
  status: string | null;
}

interface AppAllocationAttributes {
  id: number;
  ip: string;
  alias: string | null;
  port: number;
  assigned: boolean;
}

interface AppEggAttributes {
  id: number;
  uuid: string;
  nest: number;
  name: string;
  docker_image: string;
}

interface AppServerAttributes {
  id: number;
  uuid: string;
  identifier: string;
  name: string;
  node: number;
  user: number;
  status: string | null;
  limits: {
    memory: number;
    swap: number;
    disk: number;
    io: number;
    cpu: number;
  };
  egg: number;
  image?: string;
  allocation?: { ip?: string };
  created_at: string;
}

interface ClientServerAttributes {
  identifier: string;
  uuid: string;
  name: string;
  status: string | null;
  limits: {
    memory: number;
    swap: number;
    disk: number;
    io: number;
    cpu: number;
  };
  egg: string;
  node: string;
  created_at: string;
}

interface ClientResourcesAttributes {
  current_state: string;
  resources: {
    cpu_absolute: number;
    memory_bytes: number;
    disk_bytes: number;
    network_rx_bytes: number;
    network_tx_bytes: number;
  };
}

interface ClientWebsocketAttributes {
  token: string;
  socket: string;
}

interface ClientBackupAttributes {
  uuid: string;
  name: string;
  ignored_files: string[];
  checksum: string;
  bytes: number;
  completed_at: string | null;
  created_at: string;
  is_successful: boolean;
  is_locked: boolean;
}

function isResource<T>(value: unknown): value is PterodactylResource<T> {
  return typeof value === "object" && value !== null && "attributes" in value;
}

function isList<T>(value: unknown): value is PterodactylList<T> {
  return typeof value === "object" && value !== null && Array.isArray((value as { data?: unknown }).data);
}

function isErrorPayload(value: unknown): value is { errors?: Array<{ code?: string; detail?: string }> } {
  return typeof value === "object" && value !== null && "errors" in value;
}

// ---------------------------------------------------------------------------
// Driver
// ---------------------------------------------------------------------------

export class PterodactylDriver implements HypervisorDriver {
  readonly kind = "pterodactyl" as const;
  readonly configName: string;

  private readonly baseUrl: string;
  private readonly appKey: string;
  private readonly clientKey: string;
  private readonly timeoutMs: number;
  private readonly limiter: TokenBucket;

  constructor(config: PterodactylConfig) {
    this.configName = config.name;
    this.baseUrl = config.baseUrl.replace(/\/+$/, "");
    this.appKey = config.applicationApiKey;
    this.clientKey = config.clientApiKey;
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.limiter = new TokenBucket(config.rateLimitRps ?? DEFAULT_RATE_LIMIT_RPS);

    if (!this.baseUrl.startsWith("http://") && !this.baseUrl.startsWith("https://")) {
      throw new Error(`[${this.configName}] PTERODACTYL_URL must include a scheme`);
    }
  }

  supports(): boolean {
    return true;
  }

  // -------------------------------------------------------------------------
  // Transport
  // -------------------------------------------------------------------------

  private mapStatus(status: number): DriverErrorCode {
    if (status === 401 || status === 403) return "UNAUTHORIZED";
    if (status === 404) return "NOT_FOUND";
    if (status === 422) return "VALIDATION";
    if (status === 409) return "CONFLICT";
    if (status === 429) return "RATE_LIMITED";
    if (status >= 500) return "BACKEND_ERROR";
    return "BACKEND_ERROR";
  }

  private async request<T>(
    path: string,
    options: {
      method?: "GET" | "POST" | "PATCH" | "DELETE";
      body?: unknown;
      api: "application" | "client";
    }
  ): Promise<T> {
    await this.limiter.acquire();

    const key = options.api === "application" ? this.appKey : this.clientKey;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/api/${options.api}${path}`, {
        method: options.method ?? "GET",
        headers: {
          Accept: "application/vnd.pterodactyl.v1+json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`
        },
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
        signal: controller.signal
      });
    } catch (cause) {
      throw new HypervisorDriverError({
        kind: this.kind,
        code: "NETWORK",
        message: `[${this.configName}] request failed for ${options.api}${path}`,
        cause
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      let detail = `HTTP ${response.status}`;
      try {
        const payload: unknown = await response.json();
        if (isErrorPayload(payload)) {
          const first = payload.errors?.[0];
          detail = first?.detail ?? detail;
        }
      } catch {
        // Non-JSON error body; keep the HTTP status as the detail.
      }
      throw new HypervisorDriverError({
        kind: this.kind,
        code: this.mapStatus(response.status),
        message: `[${this.configName}] ${options.api}${path}: ${detail}`,
        status: response.status
      });
    }

    if (response.status === 204) {
      return undefined as T;
    }

    const payload: unknown = await response.json();
    return payload as T;
  }

  // -------------------------------------------------------------------------
  // Health and discovery
  // -------------------------------------------------------------------------

  async health(): Promise<HealthReport> {
    const startedAt = Date.now();
    try {
      const list = await this.request<PterodactylList<AppNodeAttributes>>("/nodes?per_page=1", {
        api: "application"
      });
      return {
        kind: this.kind,
        reachable: true,
        latencyMs: Date.now() - startedAt,
        version: list.meta?.pagination ? "pterodactyl-panel" : undefined
      };
    } catch (cause) {
      if (cause instanceof HypervisorDriverError) {
        return {
          kind: this.kind,
          reachable: false,
          latencyMs: Date.now() - startedAt,
          message: cause.message
        };
      }
      throw cause;
    }
  }

  async listNodes(): Promise<NodeDefinition[]> {
    const list = await this.request<PterodactylList<AppNodeAttributes>>("/nodes?per_page=100", {
      api: "application"
    });
    return list.data.map((resource) => this.toNodeDefinition(resource.attributes));
  }

  async getNode(nodeExternalId: string): Promise<NodeDefinition> {
    const resource = await this.request<PterodactylResource<AppNodeAttributes>>(`/nodes/${nodeExternalId}`, {
      api: "application"
    });
    return this.toNodeDefinition(resource.attributes);
  }

  async listAllocations(nodeExternalId: string): Promise<Allocation[]> {
    const numericNodeId = await this.resolveNodeId(nodeExternalId);
    const list = await this.request<PterodactylList<AppAllocationAttributes>>(
      `/nodes/${numericNodeId}/allocations?per_page=500`,
      { api: "application" }
    );
    return list.data
      .filter((resource) => !resource.attributes.assigned)
      .map((resource) => ({
        id: String(resource.attributes.id),
        ip: resource.attributes.ip,
        port: resource.attributes.port,
        alias: resource.attributes.alias ?? undefined
      }));
  }

  async listEggs(nestExternalId?: string): Promise<EggDefinition[]> {
    if (nestExternalId) {
      const list = await this.request<PterodactylList<AppEggAttributes>>(
        `/nests/${nestExternalId}/eggs?per_page=500`,
        { api: "application" }
      );
      return list.data.map((resource) => this.toEggDefinition(resource.attributes));
    }

    const nests = await this.request<PterodactylList<{ id: number; uuid: string }>>("/nests?per_page=100", {
      api: "application"
    });
    const eggs: EggDefinition[] = [];
    for (const nest of nests.data) {
      const nestId = nest.attributes.uuid;
      const list = await this.request<PterodactylList<AppEggAttributes>>(
        `/nests/${nestId}/eggs?per_page=500`,
        { api: "application" }
      );
      eggs.push(...list.data.map((resource) => this.toEggDefinition(resource.attributes)));
    }
    return eggs;
  }

  // -------------------------------------------------------------------------
  // Server lifecycle
  // -------------------------------------------------------------------------

  async listServers(filter?: ListServersFilter): Promise<ServerInfo[]> {
    const list = await this.request<PterodactylList<AppServerAttributes>>(
      "/servers?per_page=200",
      { api: "application" }
    );
    return list.data
      .map((resource) => this.toServerInfo(resource.attributes))
      .filter((server) => {
        if (filter?.nodeExternalId && server.nodeExternalId !== filter.nodeExternalId) return false;
        if (filter?.state && server.state !== filter.state) return false;
        return true;
      });
  }

  async getServer(serverExternalId: string): Promise<ServerInfo> {
    const resource = await this.request<PterodactylResource<AppServerAttributes>>(
      `/servers/${serverExternalId}`,
      { api: "application" }
    );
    return this.toServerInfo(resource.attributes);
  }

  async provision(request: ProvisionRequest): Promise<ProvisionResult> {
    const allocations = await this.listAllocations(request.nodeExternalId);
    const defaultAllocation = request.allocationExternalId
      ? Number(request.allocationExternalId)
      : allocations[0] ? Number(allocations[0].id) : undefined;

    if (!defaultAllocation) {
      throw new HypervisorDriverError({
        kind: this.kind,
        code: "VALIDATION",
        message: `[${this.configName}] node ${request.nodeExternalId} has no free allocations`
      });
    }

    const payload = {
      name: request.name,
      user: Number(request.clientIdentifier),
      egg: Number(request.templateExternalId),
      docker_image: request.image,
      startup: "",
      environment: request.environment,
      limits: {
        memory: request.resources.memoryMb,
        swap: request.resources.swapMb,
        disk: request.resources.diskMb,
        io: request.resources.io ?? 500,
        cpu: request.resources.cpuLimitPct ?? 0
      },
      feature_limits: {
        databases: 0,
        allocations: 1,
        backups: 5
      },
      allocation: {
        default: defaultAllocation,
        additional: []
      },
      deploy: {
        locations: [],
        dedicated_ip: false,
        port_range: []
      },
      start_on_completion: request.startOnCompletion ?? true
    };

    const resource = await this.request<PterodactylResource<AppServerAttributes>>("/servers", {
      method: "POST",
      body: payload,
      api: "application"
    });

    const attributes = resource.attributes;
    return {
      serverExternalId: attributes.identifier,
      state: "installing",
      ipv4: attributes.allocation?.ip
    };
  }

  async rebuild(request: RebuildRequest): Promise<ServerInfo> {
    const resource = await this.request<PterodactylResource<AppServerAttributes>>(
      `/servers/${request.serverExternalId}`,
      {
        method: "PATCH",
        body: {
          docker_image: request.image,
          environment: request.environment ?? {}
        },
        api: "application"
      }
    );
    if (request.startOnCompletion) {
      await this.power(request.serverExternalId, "start");
    }
    return this.toServerInfo(resource.attributes);
  }

  async suspend(serverExternalId: string, _reason?: string): Promise<ServerInfo> {
    const numericId = await this.resolveServerId(serverExternalId);
    await this.request(`/servers/${numericId}/suspend`, {
      method: "POST",
      api: "application"
    });
    return this.getServer(serverExternalId);
  }

  async unsuspend(serverExternalId: string): Promise<ServerInfo> {
    const numericId = await this.resolveServerId(serverExternalId);
    await this.request(`/servers/${numericId}/unsuspend`, {
      method: "POST",
      api: "application"
    });
    return this.getServer(serverExternalId);
  }

  async terminate(serverExternalId: string, options?: TerminateOptions): Promise<void> {
    const numericId = await this.resolveServerId(serverExternalId);
    const force = options?.deleteSnapshots ? "?force=1" : "";
    await this.request(`/servers/${numericId}${force}`, {
      method: "DELETE",
      api: "application"
    });
  }

  // -------------------------------------------------------------------------
  // Power and telemetry (Client API)
  // -------------------------------------------------------------------------

  async power(serverExternalId: string, signal: PowerSignal): Promise<void> {
    await this.request(`/servers/${serverExternalId}/power`, {
      method: "POST",
      body: { signal },
      api: "client"
    });
  }

  async getTelemetry(serverExternalId: string): Promise<TelemetrySample> {
    const resource = await this.request<PterodactylResource<ClientResourcesAttributes>>(
      `/servers/${serverExternalId}/resources`,
      { api: "client" }
    );
    const { resources } = resource.attributes;
    return {
      cpuPercent: resources.cpu_absolute,
      memoryMb: Math.round(resources.memory_bytes / (1024 * 1024)),
      diskMb: Math.round(resources.disk_bytes / (1024 * 1024)),
      networkRxBytesPerSec: resources.network_rx_bytes,
      networkTxBytesPerSec: resources.network_tx_bytes,
      sampledAt: new Date()
    };
  }

  // -------------------------------------------------------------------------
  // Console (Client API)
  // -------------------------------------------------------------------------

  async openConsole(serverExternalId: string): Promise<ConsoleSession> {
    const resource = await this.request<PterodactylResource<ClientWebsocketAttributes>>(
      `/servers/${serverExternalId}/websocket`,
      { api: "client" }
    );
    const { token, socket } = resource.attributes;
    const url = new URL(socket);
    url.searchParams.set("token", token);
    return {
      url: url.toString(),
      token,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      protocol: url.protocol === "wss:" ? "wss" : "ws"
    };
  }

  // -------------------------------------------------------------------------
  // Backups (Client API)
  // -------------------------------------------------------------------------

  async listBackups(serverExternalId: string): Promise<BackupInfo[]> {
    const list = await this.request<PterodactylList<ClientBackupAttributes>>(
      `/servers/${serverExternalId}/backups?per_page=50`,
      { api: "client" }
    );
    return list.data.map((resource) => this.toBackupInfo(serverExternalId, resource.attributes));
  }

  async createBackup(serverExternalId: string, name: string): Promise<BackupInfo> {
    const resource = await this.request<PterodactylResource<ClientBackupAttributes>>(
      `/servers/${serverExternalId}/backups`,
      {
        method: "POST",
        body: { name },
        api: "client"
      }
    );
    return this.toBackupInfo(serverExternalId, resource.attributes);
  }

  async restoreBackup(serverExternalId: string, backupExternalId: string): Promise<void> {
    await this.request(`/servers/${serverExternalId}/backups/${backupExternalId}/restore`, {
      method: "POST",
      api: "client"
    });
  }

  async deleteBackup(serverExternalId: string, backupExternalId: string): Promise<void> {
    await this.request(`/servers/${serverExternalId}/backups/${backupExternalId}`, {
      method: "DELETE",
      api: "client"
    });
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  private async resolveNodeId(nodeExternalId: string): Promise<number> {
    if (/^\d+$/.test(nodeExternalId)) return Number(nodeExternalId);
    const node = await this.getNode(nodeExternalId);
    return Number(node.externalId);
  }

  /**
   * Write endpoints (suspend, unsuspend, delete) require the numeric server
   * id. The Application API resolves a short UUID to its numeric record.
   */
  private async resolveServerId(serverExternalId: string): Promise<number> {
    if (/^\d+$/.test(serverExternalId)) return Number(serverExternalId);
    const resource = await this.request<PterodactylResource<AppServerAttributes>>(
      `/servers/${serverExternalId}`,
      { api: "application" }
    );
    return resource.attributes.id;
  }

  private toNodeDefinition(attributes: AppNodeAttributes): NodeDefinition {
    return {
      externalId: String(attributes.id),
      name: attributes.name,
      fqdn: attributes.fqdn,
      location: `location-${attributes.location_id}`,
      status: attributes.status === null ? "online" : attributes.status === "draining" ? "draining" : "offline",
      capacity: {
        cores: attributes.cpu ?? 0,
        memoryMb: attributes.memory,
        diskMb: attributes.disk
      },
      utilization: { cpuPercent: 0, memoryMb: 0, diskMb: 0 }
    };
  }

  private toEggDefinition(attributes: AppEggAttributes): EggDefinition {
    return {
      id: String(attributes.id),
      nestId: String(attributes.nest),
      name: attributes.name,
      dockerImage: attributes.docker_image
    };
  }

  private toServerInfo(attributes: AppServerAttributes): ServerInfo {
    return {
      externalId: attributes.identifier,
      name: attributes.name,
      nodeExternalId: String(attributes.node),
      state: this.toServerState(attributes.status),
      powerState: "unknown",
      resources: {
        vcpu: attributes.limits.cpu > 0 ? Math.round(attributes.limits.cpu / 100) : 1,
        memoryMb: attributes.limits.memory,
        diskMb: attributes.limits.disk,
        swapMb: attributes.limits.swap,
        io: attributes.limits.io,
        cpuLimitPct: attributes.limits.cpu > 0 ? attributes.limits.cpu : undefined
      },
      ipv4: attributes.allocation?.ip,
      image: attributes.image ?? "",
      createdAt: new Date(attributes.created_at)
    };
  }

  private toServerState(status: string | null): ServerInfo["state"] {
    if (status === null) return "running";
    if (status === "suspended") return "suspended";
    if (status === "installing") return "installing";
    return "error";
  }

  private toBackupInfo(serverExternalId: string, attributes: ClientBackupAttributes): BackupInfo {
    return {
      id: attributes.uuid,
      serverExternalId,
      name: attributes.name,
      sizeBytes: attributes.bytes,
      status: attributes.completed_at ? "completed" : "pending",
      createdAt: new Date(attributes.created_at)
    };
  }
}
