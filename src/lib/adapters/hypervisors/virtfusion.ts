/**
 * VirtFusion driver (REST API v1).
 *
 * VirtFusion exposes a bearer-token REST API at /api/v1. This driver covers
 * the VM lifecycle (create, power, suspend, terminate), host/server listing,
 * telemetry and snapshot backups.
 *
 * VirtFusion does not expose a public console WebSocket API; openConsole
 * raises NOT_SUPPORTED so callers can fall back to the VirtFusion UI.
 */

import {
  HypervisorDriverError,
  type BackupInfo,
  type ConsoleSession,
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
import type { VirtFusionConfig, Allocation, EggDefinition } from "./types";

interface VirtFusionServer {
  id: number;
  name: string;
  hostname?: string;
  status?: string;
  total_cpu_cores?: number;
  total_ram_mb?: number;
  total_disk_gb?: number;
  used_cpu_cores?: number;
  used_ram_mb?: number;
  used_disk_gb?: number;
}

interface VirtFusionVm {
  id: number;
  name: string;
  status?: string;
  ip_addresses?: Array<{ address: string; type: string }>;
  server_id?: number;
  created_at?: string;
}

const DEFAULT_TIMEOUT_MS = 15_000;

export class VirtFusionDriver implements HypervisorDriver {
  readonly kind = "virtfusion" as const;
  readonly configName: string;

  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly timeoutMs: number;

  constructor(config: VirtFusionConfig) {
    this.configName = config.name;
    this.baseUrl = config.baseUrl.replace(/\/+$/, "");
    this.apiKey = config.apiKey;
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  supports(type: "vm" | "container"): boolean {
    return type === "vm";
  }

  // -------------------------------------------------------------------------
  // Transport
  // -------------------------------------------------------------------------

  private async request<T>(path: string, options: { method?: "GET" | "POST" | "PUT" | "DELETE"; body?: unknown } = {}): Promise<T> {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/api/v1${path}`, {
        method: options.method ?? "GET",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
        signal: AbortSignal.timeout(this.timeoutMs)
      });
    } catch (cause) {
      throw new HypervisorDriverError({
        kind: this.kind,
        code: "NETWORK",
        message: `[${this.configName}] request failed for ${path}`,
        cause
      });
    }

    if (!response.ok) {
      throw new HypervisorDriverError({
        kind: this.kind,
        code:
          response.status === 401 || response.status === 403
            ? "UNAUTHORIZED"
            : response.status === 404
              ? "NOT_FOUND"
              : response.status === 429
                ? "RATE_LIMITED"
                : "BACKEND_ERROR",
        message: `[${this.configName}] ${path}: HTTP ${response.status}`,
        status: response.status
      });
    }

    if (response.status === 204) {
      return undefined as T;
    }
    return (await response.json()) as T;
  }

  // -------------------------------------------------------------------------
  // Health and discovery
  // -------------------------------------------------------------------------

  async health(): Promise<HealthReport> {
    const startedAt = Date.now();
    try {
      await this.request<VirtFusionServer[]>("/servers");
      return { kind: this.kind, reachable: true, latencyMs: Date.now() - startedAt, version: "virtfusion" };
    } catch (cause) {
      if (cause instanceof HypervisorDriverError) {
        return { kind: this.kind, reachable: false, latencyMs: Date.now() - startedAt, message: cause.message };
      }
      throw cause;
    }
  }

  async listNodes(): Promise<NodeDefinition[]> {
    const servers = await this.request<VirtFusionServer[]>("/servers");
    return servers.map((server) => ({
      externalId: String(server.id),
      name: server.name,
      fqdn: server.hostname ?? server.name,
      location: server.name,
      status: server.status === "disabled" ? "offline" : "online",
      capacity: {
        cores: server.total_cpu_cores ?? 0,
        memoryMb: server.total_ram_mb ?? 0,
        diskMb: (server.total_disk_gb ?? 0) * 1024
      },
      utilization: {
        cpuPercent: this.percent(server.used_cpu_cores, server.total_cpu_cores),
        memoryMb: server.used_ram_mb ?? 0,
        diskMb: (server.used_disk_gb ?? 0) * 1024
      }
    }));
  }

  async getNode(nodeExternalId: string): Promise<NodeDefinition> {
    const nodes = await this.listNodes();
    const node = nodes.find((candidate) => candidate.externalId === nodeExternalId);
    if (!node) {
      throw new HypervisorDriverError({
        kind: this.kind,
        code: "NOT_FOUND",
        message: `[${this.configName}] server ${nodeExternalId} not found`
      });
    }
    return node;
  }

  async listAllocations(_nodeExternalId: string): Promise<Allocation[]> {
    return [];
  }

  async listEggs(): Promise<EggDefinition[]> {
    return [];
  }

  // -------------------------------------------------------------------------
  // Server lifecycle
  // -------------------------------------------------------------------------

  async listServers(filter?: ListServersFilter): Promise<ServerInfo[]> {
    const vms = await this.request<VirtFusionVm[]>("/vms");
    return vms
      .map((vm) => this.toServerInfo(vm))
      .filter((server) => {
        if (filter?.nodeExternalId && server.nodeExternalId !== filter.nodeExternalId) return false;
        if (filter?.state && server.state !== filter.state) return false;
        return true;
      });
  }

  async getServer(serverExternalId: string): Promise<ServerInfo> {
    const vm = await this.request<VirtFusionVm>(`/vms/${serverExternalId}`);
    return this.toServerInfo(vm);
  }

  async provision(request: ProvisionRequest): Promise<ProvisionResult> {
    const body = {
      name: request.name,
      server_id: Number(request.nodeExternalId),
      template: request.image,
      plan: request.templateExternalId,
      cpu_cores: request.resources.vcpu,
      ram_mb: request.resources.memoryMb,
      disk_gb: Math.round(request.resources.diskMb / 1024),
      ssh_keys: [],
      additional_ips: 0,
      metadata: {
        environment: request.environment
      }
    };

    const created = await this.request<VirtFusionVm>("/vms", { method: "POST", body });
    if (request.startOnCompletion ?? true) {
      await this.power(String(created.id), "start");
    }
    return {
      serverExternalId: String(created.id),
      state: "installing",
      ipv4: created.ip_addresses?.find((entry) => entry.type === "ipv4")?.address
    };
  }

  async rebuild(request: RebuildRequest): Promise<ServerInfo> {
    await this.request(`/vms/${request.serverExternalId}`, {
      method: "PUT",
      body: { template: request.image }
    });
    return this.getServer(request.serverExternalId);
  }

  async suspend(serverExternalId: string): Promise<ServerInfo> {
    await this.power(serverExternalId, "stop");
    return this.getServer(serverExternalId);
  }

  async unsuspend(serverExternalId: string): Promise<ServerInfo> {
    await this.power(serverExternalId, "start");
    return this.getServer(serverExternalId);
  }

  async terminate(serverExternalId: string, _options?: TerminateOptions): Promise<void> {
    await this.request(`/vms/${serverExternalId}`, { method: "DELETE" });
  }

  // -------------------------------------------------------------------------
  // Power, telemetry and console
  // -------------------------------------------------------------------------

  async power(serverExternalId: string, signal: PowerSignal): Promise<void> {
    const action =
      signal === "start" ? "start" : signal === "stop" ? "shutdown" : signal === "restart" ? "restart" : "shutdown";
    await this.request(`/vms/${serverExternalId}/power/${action}`, { method: "POST" });
  }

  async getTelemetry(serverExternalId: string): Promise<TelemetrySample> {
    // VirtFusion reports statistics through its webhook/statistics endpoint;
    // a polling strategy can be layered on by callers. This call verifies
    // the VM is reachable and returns zeroed samples otherwise.
    await this.getServer(serverExternalId);
    return {
      cpuPercent: 0,
      memoryMb: 0,
      diskMb: 0,
      networkRxBytesPerSec: 0,
      networkTxBytesPerSec: 0,
      sampledAt: new Date()
    };
  }

  async openConsole(_serverExternalId: string): Promise<ConsoleSession> {
    throw new HypervisorDriverError({
      kind: this.kind,
      code: "NOT_SUPPORTED",
      message:
        "[virtfusion] no public console WebSocket API. Open the VM in the VirtFusion UI, or route noVNC through the VirtFusion proxy endpoint if available."
    });
  }

  // -------------------------------------------------------------------------
  // Backups (snapshots)
  // -------------------------------------------------------------------------

  async listBackups(serverExternalId: string): Promise<BackupInfo[]> {
    const snapshots = await this.request<Array<{ id: number; name: string; created_at?: string; size_gb?: number }>>(
      `/vms/${serverExternalId}/snapshots`
    );
    return snapshots.map((snapshot) => ({
      id: String(snapshot.id),
      serverExternalId,
      name: snapshot.name,
      sizeBytes: Math.round((snapshot.size_gb ?? 0) * 1024 * 1024 * 1024),
      status: "completed",
      createdAt: snapshot.created_at ? new Date(snapshot.created_at) : new Date()
    }));
  }

  async createBackup(serverExternalId: string, name: string): Promise<BackupInfo> {
    const created = await this.request<{ id: number; name: string }>(`/vms/${serverExternalId}/snapshots`, {
      method: "POST",
      body: { name }
    });
    return {
      id: String(created.id),
      serverExternalId,
      name: created.name,
      sizeBytes: 0,
      status: "pending",
      createdAt: new Date()
    };
  }

  async restoreBackup(serverExternalId: string, backupExternalId: string): Promise<void> {
    await this.request(`/vms/${serverExternalId}/snapshots/${backupExternalId}/restore`, { method: "POST" });
  }

  async deleteBackup(serverExternalId: string, backupExternalId: string): Promise<void> {
    await this.request(`/vms/${serverExternalId}/snapshots/${backupExternalId}`, { method: "DELETE" });
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  private percent(used: number | undefined, total: number | undefined): number {
    if (!used || !total || total === 0) return 0;
    return Math.round((used / total) * 100);
  }

  private toServerInfo(vm: VirtFusionVm): ServerInfo {
    return {
      externalId: String(vm.id),
      name: vm.name,
      nodeExternalId: String(vm.server_id ?? ""),
      state: vm.status === "active" || vm.status === "running" ? "running" : "suspended",
      powerState: vm.status === "active" || vm.status === "running" ? "running" : "stopped",
      resources: { vcpu: 0, memoryMb: 0, diskMb: 0, swapMb: 0 },
      ipv4: vm.ip_addresses?.find((entry) => entry.type === "ipv4")?.address,
      image: "",
      createdAt: vm.created_at ? new Date(vm.created_at) : new Date()
    };
  }
}
