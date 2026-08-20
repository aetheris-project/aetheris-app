/**
 * Demo fallback datasets.
 *
 * The Vercel deployment has no reachable database, so every page that reads
 * from Prisma wraps its queries in try/catch and falls back to these static
 * datasets. The pages keep the exact same shapes whether they read from the
 * database or from here, so the UI never breaks and the demo always renders.
 */

export const demoStats = {
  runningServers: 3,
  nodes: 4,
  outstanding: 842.0,
  recentServers: [
    { id: "demo-1", name: "Production-01", state: "running", createdAt: new Date("2026-08-19T10:00:00Z") },
    { id: "demo-2", name: "Web-02", state: "running", createdAt: new Date("2026-08-17T09:30:00Z") },
    { id: "demo-3", name: "Staging-API", state: "stopped", createdAt: new Date("2026-08-15T14:12:00Z") },
    { id: "demo-4", name: "Cache-Redis", state: "running", createdAt: new Date("2026-08-12T08:00:00Z") }
  ]
};

export const demoClientServers = [
  {
    id: "demo-srv-1",
    name: "Production-01",
    state: "running",
    ipv4: "10.40.0.11",
    resources: { vcpu: 2, memoryMb: 4096, diskMb: 40960 }
  },
  {
    id: "demo-srv-2",
    name: "Web-02",
    state: "running",
    ipv4: "10.40.0.12",
    resources: { vcpu: 1, memoryMb: 2048, diskMb: 20480 }
  },
  {
    id: "demo-srv-3",
    name: "Staging-API",
    state: "stopped",
    ipv4: "10.40.0.13",
    resources: { vcpu: 2, memoryMb: 4096, diskMb: 40960 }
  },
  {
    id: "demo-srv-4",
    name: "Cache-Redis",
    state: "running",
    ipv4: "10.40.0.14",
    resources: { vcpu: 1, memoryMb: 1024, diskMb: 8192 }
  }
];

export const demoStatusCounts = {
  servers: 4,
  nodes: 4,
  invoices: 5
};

export const demoCronJobs = [
  {
    id: "demo-cron-1",
    name: "Nightly backups",
    description: "Snapshot every server and prune old backups",
    schedule: "0 3 * * *",
    task: "backup",
    enabled: true,
    lastRunAt: new Date("2026-08-20T03:00:00Z"),
    lastStatus: "success",
    createdAt: new Date("2026-08-01T00:00:00Z"),
    updatedAt: new Date("2026-08-01T00:00:00Z")
  },
  {
    id: "demo-cron-2",
    name: "Invoice dunning",
    description: "Send payment reminders for pending and overdue invoices",
    schedule: "0 9 * * *",
    task: "invoice.dunning",
    enabled: true,
    lastRunAt: new Date("2026-08-20T09:00:00Z"),
    lastStatus: "success",
    createdAt: new Date("2026-08-01T00:00:00Z"),
    updatedAt: new Date("2026-08-01T00:00:00Z")
  },
  {
    id: "demo-cron-3",
    name: "Pterodactyl sync",
    description: "Reconcile server state with the Pterodactyl panel",
    schedule: "*/15 * * * *",
    task: "sync.pterodactyl",
    enabled: true,
    lastRunAt: new Date("2026-08-20T17:45:00Z"),
    lastStatus: "success",
    createdAt: new Date("2026-08-01T00:00:00Z"),
    updatedAt: new Date("2026-08-01T00:00:00Z")
  },
  {
    id: "demo-cron-4",
    name: "Daily report",
    description: "Compile and deliver the daily operations report",
    schedule: "0 7 * * *",
    task: "report.daily",
    enabled: false,
    lastRunAt: null,
    lastStatus: null,
    createdAt: new Date("2026-08-01T00:00:00Z"),
    updatedAt: new Date("2026-08-01T00:00:00Z")
  }
];

export const demoSftpUsers = [
  {
    id: "demo-sftp-1",
    username: "webuser",
    homePath: "/home/container",
    enabled: true,
    createdAt: new Date("2026-08-05T10:00:00Z"),
    updatedAt: new Date("2026-08-05T10:00:00Z"),
    serverId: "demo-srv-1",
    server: { id: "demo-srv-1", name: "Production-01", ipv4: "10.40.0.11" }
  },
  {
    id: "demo-sftp-2",
    username: "deploy",
    homePath: "/home/container/www",
    enabled: true,
    createdAt: new Date("2026-08-09T14:20:00Z"),
    updatedAt: new Date("2026-08-09T14:20:00Z"),
    serverId: "demo-srv-2",
    server: { id: "demo-srv-2", name: "Web-02", ipv4: "10.40.0.12" }
  },
  {
    id: "demo-sftp-3",
    username: "backups",
    homePath: "/home/container/backups",
    enabled: false,
    createdAt: new Date("2026-08-02T08:00:00Z"),
    updatedAt: new Date("2026-08-02T08:00:00Z"),
    serverId: "demo-srv-3",
    server: { id: "demo-srv-3", name: "Staging-API", ipv4: "10.40.0.13" }
  }
];
