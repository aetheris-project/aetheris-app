/**
 * Universal hypervisor driver contract.
 *
 * Every backend (Pterodactyl, Proxmox VE, VirtFusion) implements this
 * interface. The billing, provisioning and client-portal layers depend only
 * on these types, never on backend-specific details, satisfying the
 * Dependency Inversion Principle of SOLID.
 *
 * Lifecycle model shared by all drivers:
 *   provision -> (installing) -> running
 *   running   -> suspend -> unsuspend -> running
 *   running   -> terminate (irreversible, deletes the workload)
 */

// ---------------------------------------------------------------------------
// Enumerations
// ---------------------------------------------------------------------------

export type HypervisorKind = "pterodactyl" | "proxmox" | "virtfusion";

export type VirtualizationType = "container" | "vm";

export type PowerState = "running" | "stopped" | "suspended" | "unknown";

export type PowerSignal = "start" | "stop" | "restart" | "kill";

export type NodeStatus = "online" | "draining" | "offline";

export type ServerState =
  | "pending"
  | "installing"
  | "running"
  | "suspended"
  | "terminated"
  | "error";

export type BackupStatus = "pending" | "completed" | "failed";

// ---------------------------------------------------------------------------
// Connection configuration
// ---------------------------------------------------------------------------

/** Zod-validated connection configuration, discriminated by kind. */
export type HypervisorConfig =
  | PterodactylConfig
  | ProxmoxConfig
  | VirtFusionConfig;

export interface BaseHypervisorConfig {
  kind: HypervisorKind;
  /** Human-readable connection name, e.g. "pterodactyl-production". */
  name: string;
  /** Outbound request timeout in milliseconds. */
  timeoutMs?: number;
  /** Maximum requests per second against this backend. */
  rateLimitRps?: number;
}

export interface PterodactylConfig extends BaseHypervisorConfig {
  kind: "pterodactyl";
  baseUrl: string;
  /** Application API key (server lifecycle, nodes, eggs). */
  applicationApiKey: string;
  /** Client API key (power actions, resources, console, backups). */
  clientApiKey: string;
}

export interface ProxmoxConfig extends BaseHypervisorConfig {
  kind: "proxmox";
  baseUrl: string;
  user: string;
  password: string;
  verifyTls: boolean;
  /** Default storage pool for VM disks. */
  storage: string;
}

export interface VirtFusionConfig extends BaseHypervisorConfig {
  kind: "virtfusion";
  baseUrl: string;
  apiKey: string;
}

// ---------------------------------------------------------------------------
// Domain models
// ---------------------------------------------------------------------------

export interface HealthReport {
  kind: HypervisorKind;
  reachable: boolean;
  latencyMs: number;
  /** Backend-reported version when available. */
  version?: string;
  message?: string;
}

export interface NodeCapacity {
  cores: number;
  memoryMb: number;
  diskMb: number;
}

export interface NodeUtilization {
  cpuPercent: number;
  memoryMb: number;
  diskMb: number;
}

export interface NodeDefinition {
  externalId: string;
  name: string;
  fqdn: string;
  location: string;
  status: NodeStatus;
  capacity: NodeCapacity;
  utilization: NodeUtilization;
}

export interface Allocation {
  id: string;
  ip: string;
  port: number;
  alias?: string;
}

export interface EggDefinition {
  id: string;
  nestId: string;
  name: string;
  dockerImage: string;
}

export interface ResourceLimits {
  vcpu: number;
  memoryMb: number;
  diskMb: number;
  swapMb: number;
  /** IO weight or blkio weight, backend-specific. */
  io?: number;
  /** CPU limit as a percentage of one core. */
  cpuLimitPct?: number;
}

export interface ProvisionRequest {
  name: string;
  /** Stable client identifier (email or cuid) for ownership mapping. */
  clientIdentifier: string;
  type: VirtualizationType;
  nodeExternalId: string;
  /** Docker image (Pterodactyl) or template/ISO name (Proxmox, VirtFusion). */
  image: string;
  /** Backend-specific template identifier (egg ID, template name, ...). */
  templateExternalId: string;
  resources: ResourceLimits;
  /** Environment variables / startup variables passed to the image. */
  environment: Record<string, string>;
  /** Preferred allocation; omitted to let the backend auto-assign. */
  allocationExternalId?: string;
  /** Create a backup immediately after provisioning completes. */
  startOnCompletion?: boolean;
}

export interface ProvisionResult {
  serverExternalId: string;
  state: ServerState;
  ipv4?: string;
  /** One-time credentials, returned only during creation. */
  initialCredentials?: { username: string; password: string };
}

export interface ServerInfo {
  externalId: string;
  name: string;
  nodeExternalId: string;
  state: ServerState;
  powerState: PowerState;
  resources: ResourceLimits;
  ipv4?: string;
  image: string;
  createdAt: Date;
}

export interface TelemetrySample {
  cpuPercent: number;
  memoryMb: number;
  diskMb: number;
  networkRxBytesPerSec: number;
  networkTxBytesPerSec: number;
  sampledAt: Date;
}

export interface ConsoleSession {
  /** WebSocket endpoint the browser should connect to. */
  url: string;
  /** One-time authentication token for the console channel. */
  token: string;
  expiresAt: Date;
  protocol: "wss" | "ws";
}

export interface BackupInfo {
  id: string;
  serverExternalId: string;
  name: string;
  sizeBytes: number;
  status: BackupStatus;
  createdAt: Date;
  /** Present after a download URL has been requested. */
  downloadUrl?: string;
}

export interface RebuildRequest {
  serverExternalId: string;
  image: string;
  environment?: Record<string, string>;
  startOnCompletion?: boolean;
}

export interface TerminateOptions {
  /** Also delete backups and snapshots. Default: false. */
  deleteSnapshots?: boolean;
}

export interface ListServersFilter {
  nodeExternalId?: string;
  state?: ServerState;
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export type DriverErrorCode =
  | "UNAUTHORIZED"
  | "NOT_FOUND"
  | "RATE_LIMITED"
  | "VALIDATION"
  | "TIMEOUT"
  | "CONFLICT"
  | "BACKEND_ERROR"
  | "NETWORK"
  | "NOT_SUPPORTED";

export class HypervisorDriverError extends Error {
  readonly kind: HypervisorKind;
  readonly code: DriverErrorCode;
  readonly status?: number;
  readonly causeDetails?: unknown;

  constructor(options: {
    kind: HypervisorKind;
    code: DriverErrorCode;
    message: string;
    status?: number;
    cause?: unknown;
  }) {
    super(options.message);
    this.name = "HypervisorDriverError";
    this.kind = options.kind;
    this.code = options.code;
    this.status = options.status;
    this.causeDetails = options.cause;
  }
}

// ---------------------------------------------------------------------------
// Driver interface
// ---------------------------------------------------------------------------

/**
 * HypervisorDriver
 *
 * Implementations must be stateless with respect to requests (all state is
 * owned by the caller or the backend), so a single driver instance can be
 * shared across the API layer and background workers.
 */
export interface HypervisorDriver {
  readonly kind: HypervisorKind;
  readonly configName: string;

  // Health and discovery
  health(): Promise<HealthReport>;
  listNodes(): Promise<NodeDefinition[]>;
  getNode(nodeExternalId: string): Promise<NodeDefinition>;
  listAllocations(nodeExternalId: string): Promise<Allocation[]>;
  listEggs(nestExternalId?: string): Promise<EggDefinition[]>;

  // Server lifecycle
  listServers(filter?: ListServersFilter): Promise<ServerInfo[]>;
  getServer(serverExternalId: string): Promise<ServerInfo>;
  provision(request: ProvisionRequest): Promise<ProvisionResult>;
  rebuild(request: RebuildRequest): Promise<ServerInfo>;
  suspend(serverExternalId: string, reason?: string): Promise<ServerInfo>;
  unsuspend(serverExternalId: string): Promise<ServerInfo>;
  terminate(serverExternalId: string, options?: TerminateOptions): Promise<void>;

  // Power and telemetry
  power(serverExternalId: string, signal: PowerSignal): Promise<void>;
  getTelemetry(serverExternalId: string): Promise<TelemetrySample>;

  // Console
  openConsole(serverExternalId: string): Promise<ConsoleSession>;

  // Backups
  listBackups(serverExternalId: string): Promise<BackupInfo[]>;
  createBackup(serverExternalId: string, name: string): Promise<BackupInfo>;
  restoreBackup(serverExternalId: string, backupExternalId: string): Promise<void>;
  deleteBackup(serverExternalId: string, backupExternalId: string): Promise<void>;

  supports(type: VirtualizationType): boolean;
}

// ---------------------------------------------------------------------------
// Registry helpers
// ---------------------------------------------------------------------------

export interface DriverDefinition {
  kind: HypervisorKind;
  supports: VirtualizationType[];
}

export const DRIVER_CATALOG: DriverDefinition[] = [
  { kind: "pterodactyl", supports: ["container"] },
  { kind: "proxmox", supports: ["vm", "container"] },
  { kind: "virtfusion", supports: ["vm"] }
];
