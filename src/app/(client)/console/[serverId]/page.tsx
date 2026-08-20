import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { demoClientServers } from "@/lib/demo-data";
import { ConsoleClient } from "./console-client";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params
}: {
  params: { serverId: string };
}): Promise<Metadata> {
  const demo = demoClientServers.find((candidate) => candidate.id === params.serverId);
  if (demo) return { title: `${demo.name} - Console` };
  try {
    const server = await prisma.server.findUnique({ where: { id: params.serverId } });
    if (!server) return { title: "Console" };
    return { title: `${server.name} - Console` };
  } catch {
    return { title: "Console" };
  }
}

export default async function ConsolePage({
  params
}: {
  params: { serverId: string };
}) {
  let server;
  try {
    server = await prisma.server.findUnique({
      where: { id: params.serverId },
      include: { node: { select: { name: true, location: true } } }
    });
  } catch {
    server = null;
  }
  if (!server) {
    const demo = demoClientServers.find((candidate) => candidate.id === params.serverId);
    if (!demo) notFound();
    server = {
      id: demo.id,
      name: demo.name,
      state: demo.state,
      ipv4: demo.ipv4,
      resources: demo.resources,
      node: { name: "fra-01", location: "EU West - Frankfurt" }
    };
  }

  const resources = server.resources as { vcpu?: number; memoryMb?: number; diskMb?: number };

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <Link
        href="/"
        className="inline-flex h-8 items-center gap-2 rounded-lg border border-edge bg-raised/70 px-3 text-xs font-medium text-muted transition-colors hover:border-accent/40 hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        Back to servers
      </Link>

      <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{server.name}</h1>
          <p className="mt-1 font-mono text-sm text-muted">
            {server.ipv4 ?? "no ip"} - {server.node.name} ({server.node.location})
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted">
          <span className="inline-flex h-6 items-center rounded-full border border-edge bg-raised px-2.5 font-medium">
            {resources.vcpu ?? "-"} vCPU
          </span>
          <span className="inline-flex h-6 items-center rounded-full border border-edge bg-raised px-2.5 font-medium">
            {Math.round((resources.memoryMb ?? 0) / 1024)} GB RAM
          </span>
          <span className="inline-flex h-6 items-center rounded-full border border-edge bg-raised px-2.5 font-medium">
            {Math.round((resources.diskMb ?? 0) / 1024)} GB disk
          </span>
        </div>
      </div>

      <div className="mt-8">
        <ConsoleClient serverName={server.name} serverIp={server.ipv4 ?? "10.40.0.11"} state={server.state} />
      </div>
    </div>
  );
}
