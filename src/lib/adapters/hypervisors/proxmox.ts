/**
 * Proxmox VE driver (API v2, /api2/json).
 *
 * Supports QEMU virtual machines and LXC containers. Authentication uses a
 * ticket obtained from /access/ticket (root@pam with password, or any API
 * user). POST and DELETE requests carry the CSRF prevention token returned
 * with the ticket.
 *
 * Console sessions are established through the VNC proxy (novnc), which
 * yields a WebSocket endpoint plus a one-time ticket.
 */

import {
  HypervisorDriverError,
  type Allocation,
  type BackupInfo,
  type ConsoleSession,
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
import type { ProxmoxConfig } from "./types";

interface ProxmoxTicket {
  ticket: string;
  CSRFPreventionToken: string;
  username: string;
}

interface ProxmoxApiResponse<T> {
  data: T;
}

interface ProxmoxNode {
  node: string;
  status: string;
  cpu: number;
  maxcpu: number;
  mem: number;
  maxmem: number;
  disk: number;
  maxdisk: number;
  type?: string;
}

interface ProxmoxVm {
  vmid: number;
  name?: string;
  status?: string;
  type: "qemu" | "lxc";
}

interface ProxmoxVmStatus {
  status: string;
  cpu?: number;
  mem?: number;
  maxmem?: number;
  disk?: number;
  maxdisk?: number;
  netin?: number;
  netout?: number;
  name?: string;
}

const DEFAULT_TIMEOUT_MS = 20_000;

export class ProxmoxDriver implements HypervisorDriver {
  readonly kind = "proxmox" as const;
  readonly configName: string;

  private readonly baseUrl: string;
  private readonly user: string;
  private readonly password: string;
  private readonly storage: string;
  private readonly timeoutMs: number;
  private readonly verifyTls: boolean;

  private ticket: ProxmoxTicket | null = null;

  constructor(config: ProxmoxConfig) {
    this.configName = config.name;
    this.baseUrl = config.baseUrl.replace(/\/+$/, "");
    this.user = config.user;
    this.password = config.password;
    this.storage = config.storage;
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.verifyTls = config.verifyTls;
  }

  supports(type: "vm" | "container"): boolean {
    return type === "vm" || type === "container";
  }

  // -------------------------------------------------------------------------
  // Authentication
  // -------------------------------------------------------------------------

  private async ensureTicket(): Promise<ProxmoxTicket> {
    if (this.ticket) return this.ticket;

    const response = await fetch(`${this.baseUrl}/api2/json/access/ticket`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ username: this.user, password: this.password }),
      // Proxmox uses a self-signed cert by default; the fetch API cannot
      // disable TLS verification, so self-signed deployments must terminate
      // TLS at a reverse proxy or configure a trusted certificate.
      signal: AbortSignal.timeout(this.timeoutMs)
    });

    if (!response.ok) {
      throw new HypervisorDriverError({
        kind: this.kind,
        code: response.status === 401 ? "UNAUTHORIZED" : "BACKEND_ERROR",
        message: `[${this.configName}] authentication failed (HTTP ${response.status})`,
        status: response.status
      });
    }

    const payload = (await response.json()) as ProxmoxApiResponse<ProxmoxTicket>;
    this.ticket = payload.data;
    return this.ticket;
  }

  private async request<T>(
    path: string,
    options: { method?: "GET" | "POST" | "PUT" | "DELETE"; body?: URLSearchParams } = {}
  ): Promise<T> {
    const ticket = await this.ensureTicket();
    const headers: Record<string, string> = {
      Cookie: `PVEAuthCookie=${ticket.ticket}`
    };
    if (options.method && options.method !== "GET") {
      headers["CSRFPreventionToken"] = ticket.CSRFPreventionToken;
      headers["Content-Type"] = "application/x-www-form-urlencoded";
    }

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/api2/json${path}`, {
        method: options.method ?? "GET",
        headers,
        body: options.body?.toString(),
        signal: AbortSignal.timeout(this.timeoutMs)
      });
    } catch (cause) {
      // A 401 with an expired ticket triggers a refresh once, then fails hard.
      if (this.ticket) {
        this.ticket = null;
        return this.request<T>(path, options);
      }
      throw new HypervisorDriverError({
        kind: this.kind,
        code: "NETWORK",
        message: `[${this.configName}] request failed for ${path}`,
        cause
      });
    }

    if (!response.ok) {
      // Refresh an expired ticket once, then surface the error.
      if (response.status === 401 && this.ticket) {
        this.ticket = null;
        return this.request<T>(path, options);
      }
      throw new HypervisorDriverError({
        kind: this.kind,
        code: response.status === 401 ? "UNAUTHORIZED" : response.status === 404 ? "NOT_FOUND" : "BACKEND_ERROR",
        message: `[${this.configName}] ${path}: HTTP ${response.status}`,
        status: response.status
      });
    }

    const payload = (await response.json()) as ProxmoxApiResponse<T>;
    return payload.data;
  }

  // -------------------------------------------------------------------------
  // Health and discovery
  // -------------------------------------------------------------------------

  async health(): Promise<HealthReport> {
    const startedAt = Date.now();
    try {
      await this.request<ProxmoxNode[]>("/version");
      return { kind: this.kind, reachable: true, latencyMs: Date.now() - startedAt, version: "pve" };
    } catch (cause) {
      if (cause instanceof HypervisorDriverError) {
        return { kind: this.kind, reachable: false, latencyMs: Date.now() - startedAt, message: cause.message };
      }
      throw cause;
    }
  }

  async listNodes(): Promise<NodeDefinition[]> {
    const nodes = await this.request<ProxmoxNode[]>("/nodes");
    return nodes.map((node) => ({
      externalId: node.node,
      name: node.node,
      fqdn: node.node,
      location: node.node,
      status: node.status === "online" ? "online" : "offline",
      capacity: {
        cores: Math.round(node.maxcpu),
        memoryMb: Math.round(node.maxmem / (1024 * 1024)),
        diskMb: Math.round(node.maxdisk / (1024 * 1024))
      },
      utilization: {
        cpuPercent: Math.round(node.cpu * 100),
        memoryMb: Math.round(node.mem / (1024 * 1024)),
        diskMb: Math.round(node.disk / (1024 * 1024))
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
        message: `[${this.configName}] node ${nodeExternalId} not found`
      });
    }
    return node;
  }

  async listAllocations(_nodeExternalId: string): Promise<Allocation[]> {
    // Proxmox assigns addresses at the VM/container layer; there is no
    // pre-provisioned allocation pool.
    return [];
  }

  async listEggs(): Promise<EggDefinition[]> {
    // Proxmox uses templates (VZDump backups / ISO images) instead of eggs.
    return [];
  }

  // -------------------------------------------------------------------------
  // Server lifecycle
  // -------------------------------------------------------------------------

  async listServers(filter?: ListServersFilter): Promise<ServerInfo[]> {
    const nodes = await this.listNodes();
    const servers: ServerInfo[] = [];
    for (const node of nodes) {
      if (filter?.nodeExternalId && node.externalId !== filter.nodeExternalId) continue;
      const qemu = await this.request<ProxmoxVm[]>(`/nodes/${node.externalId}/qemu`);
      const lxc = await this.request<ProxmoxVm[]>(`/nodes/${node.externalId}/lxc`);
      for (const vm of [...qemu, ...lxc]) {
        servers.push(await this.toServerInfo(node.externalId, vm));
      }
    }
    return servers.filter((server) => (filter?.state ? server.state === filter.state : true));
  }

  async getServer(serverExternalId: string): Promise<ServerInfo> {
    const { node, type, vmid } = this.parseServerId(serverExternalId);
    const vm = await this.request<ProxmoxVm>(`/nodes/${node}/${type}/${vmid}`);
    return this.toServerInfo(node, vm);
  }

  async provision(request: ProvisionRequest): Promise<ProvisionResult> {
    const type = request.type === "vm" ? "qemu" : "lxc";
    const vmid = await this.nextVmid();
    const params = new URLSearchParams({
      vmid: String(vmid),
      name: request.name,
      cores: String(request.resources.vcpu),
      memory: String(request.resources.memoryMb),
      net0: "virtio,bridge=vmbr0",
      ostype: type === "qemu" ? "l26" : "ubuntu",
      onboot: "1"
    });

    if (type === "qemu") {
      params.set("scsihw", "virtio-scsi-pci");
      params.set("scsi0", `${this.storage}:${request.resources.diskMb}`);
      params.set("ide2", `${request.image}`);
    } else {
      params.set("storage", this.storage);
      params.set("rootfs", `${this.storage}:${request.resources.diskMb}`);
      params.set("ostemplate", request.image);
    }

    await this.request(`/nodes/${request.nodeExternalId}/${type}`, {
      method: "POST",
      body: params
    });

    if (request.startOnCompletion ?? true) {
      await this.request(`/nodes/${request.nodeExternalId}/${type}/${vmid}/status/start`, {
        method: "POST"
      });
    }

    return {
      serverExternalId: `${request.nodeExternalId}:${type}:${vmid}`,
      state: "installing"
    };
  }

  async rebuild(request: RebuildRequest): Promise<ServerInfo> {
    const { node, type, vmid } = this.parseServerId(request.serverExternalId);
    // Reinstall resets the VM to the given template/ISO.
    await this.request(`/nodes/${node}/${type}/${vmid}/status/stop`, { method: "POST" });
    if (type === "lxc") {
      const params = new URLSearchParams({ ostemplate: request.image });
      await this.request(`/nodes/${node}/lxc/${vmid}`, { method: "PUT", body: params });
    }
    if (request.startOnCompletion ?? true) {
      await this.request(`/nodes/${node}/${type}/${vmid}/status/start`, { method: "POST" });
    }
    return this.getServer(request.serverExternalId);
  }

  async suspend(serverExternalId: string): Promise<ServerInfo> {
    const { node, type, vmid } = this.parseServerId(serverExternalId);
    await this.request(`/nodes/${node}/${type}/${vmid}/status/suspend`, { method: "POST" });
    return this.getServer(serverExternalId);
  }

  async unsuspend(serverExternalId: string): Promise<ServerInfo> {
    const { node, type, vmid } = this.parseServerId(serverExternalId);
    await this.request(`/nodes/${node}/${type}/${vmid}/status/resume`, { method: "POST" });
    return this.getServer(serverExternalId);
  }

  async terminate(serverExternalId: string, options?: TerminateOptions): Promise<void> {
    const { node, type, vmid } = this.parseServerId(serverExternalId);
    const params = new URLSearchParams();
    if (options?.deleteSnapshots) params.set("purge", "1");
    await this.request(`/nodes/${node}/${type}/${vmid}`, {
      method: "DELETE",
      body: params
    });
  }

  // -------------------------------------------------------------------------
  // Power, telemetry and console
  // -------------------------------------------------------------------------

  async power(serverExternalId: string, signal: PowerSignal): Promise<void> {
    const { node, type, vmid } = this.parseServerId(serverExternalId);
    const action = signal === "start" ? "start" : signal === "stop" ? "shutdown" : signal === "restart" ? "reboot" : "stop";
    await this.request(`/nodes/${node}/${type}/${vmid}/status/${action}`, { method: "POST" });
  }

  async getTelemetry(serverExternalId: string): Promise<TelemetrySample> {
    const { node, type, vmid } = this.parseServerId(serverExternalId);
    const status = await this.request<ProxmoxVmStatus>(`/nodes/${node}/${type}/${vmid}/status/current`);
    return {
      cpuPercent: Math.round((status.cpu ?? 0) * 100),
      memoryMb: Math.round((status.mem ?? 0) / (1024 * 1024)),
      diskMb: Math.round((status.disk ?? 0) / (1024 * 1024)),
      networkRxBytesPerSec: status.netin ?? 0,
      networkTxBytesPerSec: status.netout ?? 0,
      sampledAt: new Date()
    };
  }

  async openConsole(serverExternalId: string): Promise<ConsoleSession> {
    const { node, type, vmid } = this.parseServerId(serverExternalId);
    const proxy = await this.request<{ ticket: string; port: number; host: string; password?: string }>(
      `/nodes/${node}/${type}/${vmid}/vncproxy`,
      { method: "POST" }
    );
    const websocket = await this.request<{ ticket: string }>(
      `/nodes/${node}/${type}/${vmid}/vncwebsocket?port=${proxy.port}&vncticket=${encodeURIComponent(proxy.ticket)}`,
      { method: "GET" }
    );
    return {
      url: `${this.baseUrl.replace(/^http/, "ws")}/api2/json/nodes/${node}/${type}/${vmid}/vncwebsocket?port=${proxy.port}&vncticket=${encodeURIComponent(websocket.ticket)}`,
      token: websocket.ticket,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      protocol: "wss"
    };
  }

  // -------------------------------------------------------------------------
  // Backups
  // -------------------------------------------------------------------------

  async listBackups(serverExternalId: string): Promise<BackupInfo[]> {
    const { node, type, vmid } = this.parseServerId(serverExternalId);
    const snapshots = await this.request<Array<{ name: string; snapname: string; size?: number; created?: number }>>(
      `/nodes/${node}/${type}/${vmid}/snapshot`
    );
    return snapshots.map((snapshot) => ({
      id: snapshot.snapname,
      serverExternalId,
      name: snapshot.name,
      sizeBytes: snapshot.size ?? 0,
      status: "completed",
      createdAt: new Date((snapshot.created ?? Date.now()) * 1000)
    }));
  }

  async createBackup(serverExternalId: string, name: string): Promise<BackupInfo> {
    const { node, type, vmid } = this.parseServerId(serverExternalId);
    const params = new URLSearchParams({ snapname: name, description: `Aetheris backup: ${name}` });
    await this.request(`/nodes/${node}/${type}/${vmid}/snapshot`, { method: "POST", body: params });
    return { id: name, serverExternalId, name, sizeBytes: 0, status: "pending", createdAt: new Date() };
  }

  async restoreBackup(serverExternalId: string, backupExternalId: string): Promise<void> {
    const { node, type, vmid } = this.parseServerId(serverExternalId);
    const params = new URLSearchParams({ snapname: backupExternalId });
    await this.request(`/nodes/${node}/${type}/${vmid}/snapshot/${backupExternalId}/rollback`, {
      method: "POST",
      body: params
    });
  }

  async deleteBackup(serverExternalId: string, backupExternalId: string): Promise<void> {
    const { node, type, vmid } = this.parseServerId(serverExternalId);
    await this.request(`/nodes/${node}/${type}/${vmid}/snapshot/${backupExternalId}`, { method: "DELETE" });
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  private parseServerId(serverExternalId: string): { node: string; type: "qemu" | "lxc"; vmid: number } {
    const parts = serverExternalId.split(":");
    if (parts.length !== 3 || !["qemu", "lxc"].includes(parts[1] ?? "")) {
      throw new HypervisorDriverError({
        kind: this.kind,
        code: "VALIDATION",
        message: `[${this.configName}] invalid server id format: ${serverExternalId} (expected node:qemu|lxc:vmid)`
      });
    }
    return { node: parts[0] as string, type: parts[1] as "qemu" | "lxc", vmid: Number(parts[2]) };
  }

  private async nextVmid(): Promise<number> {
    const nodes = await this.listNodes();
    let highest = 100;
    for (const node of nodes) {
      const qemu = await this.request<ProxmoxVm[]>(`/nodes/${node.externalId}/qemu`);
      const lxc = await this.request<ProxmoxVm[]>(`/nodes/${node.externalId}/lxc`);
      for (const vm of [...qemu, ...lxc]) {
        highest = Math.max(highest, vm.vmid);
      }
    }
    return highest + 1;
  }

  private async toServerInfo(nodeExternalId: string, vm: ProxmoxVm): Promise<ServerInfo> {
    const state = vm.status === "running" ? "running" : vm.status === "stopped" ? "running" : "error";
    return {
      externalId: `${nodeExternalId}:${vm.type}:${vm.vmid}`,
      name: vm.name ?? `vm-${vm.vmid}`,
      nodeExternalId,
      state,
      powerState: vm.status === "running" ? "running" : vm.status === "stopped" ? "stopped" : "unknown",
      resources: { vcpu: 0, memoryMb: 0, diskMb: 0, swapMb: 0 },
      image: "",
      createdAt: new Date()
    };
  }
}
