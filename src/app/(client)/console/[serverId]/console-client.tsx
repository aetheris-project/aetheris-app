"use client";

import { useEffect, useRef, useState } from "react";
import {
  ClipboardCopy,
  Download,
  ExternalLink,
  Keyboard,
  Monitor,
  Play,
  RotateCcw,
  Square,
  TerminalSquare
} from "lucide-react";
function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

interface ConsoleLine {
  time: string;
  level: "info" | "ok" | "warn";
  text: string;
}

type VncClient = "novnc" | "tigervnc" | "realvnc" | "console";

const CLIENTS: Array<{ id: VncClient; label: string; hint: string }> = [
  { id: "novnc", label: "noVNC (web)", hint: "In-browser WebSocket client" },
  { id: "tigervnc", label: "TigerVNC", hint: "Desktop client, TLS" },
  { id: "realvnc", label: "RealVNC", hint: "Desktop + mobile" },
  { id: "console", label: "Raw console", hint: "PTY stream, no VNC" }
];

const BOOT_LINES: ConsoleLine[] = [
  { time: "13:37:01", level: "info", text: "aetheris-console: session established via wss://console.aetheris.enterprise" },
  { time: "13:37:01", level: "info", text: "pterodactyl: websocket token issued (expires in 3600s)" },
  { time: "13:37:02", level: "ok", text: "systemd: Starting aetheris-vnc-agent.service" },
  { time: "13:37:03", level: "ok", text: "systemd: Reached target Multi-User System" },
  { time: "13:37:04", level: "ok", text: "docker: Container started on bridge network" },
  { time: "13:37:05", level: "info", text: "app: Application listening on 0.0.0.0:3000" },
  { time: "13:37:06", level: "ok", text: "status: Server ONLINE" }
];

const LEVEL_COLOR: Record<ConsoleLine["level"], string> = {
  info: "text-muted",
  ok: "text-success",
  warn: "text-warning"
};

export function ConsoleClient({
  serverName,
  serverIp,
  state
}: {
  serverName: string;
  serverIp: string;
  state: string;
}) {
  const [client, setClient] = useState<VncClient>("novnc");
  const [power, setPower] = useState<"running" | "stopped">(state === "running" ? "running" : "stopped");
  const [lines, setLines] = useState<ConsoleLine[]>([]);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let index = 0;
    setLines([]);
    const timer = setInterval(() => {
      index += 1;
      setLines(BOOT_LINES.slice(0, index));
      if (index >= BOOT_LINES.length) clearInterval(timer);
    }, 420);
    return () => clearInterval(timer);
  }, [power]);

  useEffect(() => {
    const node = scrollRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [lines]);

  function signal(next: "start" | "stop" | "restart") {
    if (next === "stop") setPower("stopped");
    else setPower("running");
    setNotice(
      next === "stop"
        ? `${serverName} powered off.`
        : next === "restart"
          ? `Reboot signal acknowledged for ${serverName}.`
          : `${serverName} is booting.`
    );
  }

  function launch() {
    if (client === "console") {
      setNotice("Raw console stream is active in this panel.");
      return;
    }
    if (client === "novnc") {
      window.open("https://novnc.com/noVNC/vnc.html", "_blank", "noopener,noreferrer");
      setNotice("Opened the noVNC client. In a production deployment the panel routes wss:// to your console node.");
      return;
    }
    setNotice(
      `${client === "tigervnc" ? "TigerVNC" : "RealVNC"}: connect to ${serverIp}:5900 with TLS. Download links below.`
    );
  }

  const active = CLIENTS.find((candidate) => candidate.id === client) ?? CLIENTS[0]!;

  return (
    <div className="overflow-hidden rounded-2xl border border-edge bg-surface/80 shadow-[0_18px_40px_-28px_rgb(0_0_0/0.7)] backdrop-blur-sm">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-edge px-4 py-3">
        <div className="flex items-center gap-2">
          <span className={cn("h-2 w-2 rounded-full", power === "running" ? "bg-success" : "bg-faint")} />
          <span className="text-sm font-semibold">{serverName}</span>
          <span className="rounded-full border border-edge bg-raised px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted">
            {power}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="aetheris-btn-secondary h-8 px-3"
            disabled={power === "running"}
            onClick={() => signal("start")}
          >
            <Play className="h-3.5 w-3.5" aria-hidden="true" />
            Start
          </button>
          <button
            type="button"
            className="aetheris-btn-secondary h-8 px-3"
            disabled={power !== "running"}
            onClick={() => signal("restart")}
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            Restart
          </button>
          <button
            type="button"
            className="aetheris-btn-secondary h-8 px-3 text-danger hover:border-danger/60 hover:text-danger"
            disabled={power !== "running"}
            onClick={() => signal("stop")}
          >
            <Square className="h-3.5 w-3.5" aria-hidden="true" />
            Stop
          </button>
        </div>
      </div>

      {/* Client selector */}
      <div className="flex flex-wrap items-center gap-2 border-b border-edge px-4 py-2.5">
        <span className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-faint">
          <Monitor className="h-3.5 w-3.5" aria-hidden="true" />
          VNC client
        </span>
        <div className="flex items-center gap-1 rounded-lg border border-edge bg-base/40 p-0.5" role="group" aria-label="VNC client">
          {CLIENTS.map((candidate) => (
            <button
              key={candidate.id}
              type="button"
              title={candidate.hint}
              aria-pressed={client === candidate.id}
              onClick={() => setClient(candidate.id)}
              className={cn(
                "h-7 rounded-md px-2.5 text-[11px] font-medium transition-colors duration-150",
                client === candidate.id ? "bg-accent-soft text-accent" : "text-muted hover:text-ink"
              )}
            >
              {candidate.label}
            </button>
          ))}
        </div>
        <button type="button" className="aetheris-btn-primary ml-auto h-8 px-3" onClick={launch}>
          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          {client === "console" ? "Attach console" : "Launch client"}
        </button>
      </div>

      {/* Screen */}
      <div className="p-4">
        <div className="relative h-72 w-full overflow-hidden rounded-xl border border-edge bg-black shadow-[inset_0_0_60px_rgb(0_0_0/0.6)] sm:h-80">
          <div className="scanline absolute inset-0" aria-hidden="true" />
          <div ref={scrollRef} className="absolute inset-0 overflow-y-auto p-4 font-mono text-[11px] leading-[1.7]" aria-label="Console output">
            {lines.map((line, index) => (
              <div key={`${line.time}-${index}`} className={cn("flex gap-3 whitespace-pre-wrap", LEVEL_COLOR[line.level])}>
                <span className="shrink-0 text-muted/60">{line.time}</span>
                <span className="min-w-0">{line.text}</span>
              </div>
            ))}
            {power === "running" && (
              <span className="ml-[4.5rem] inline-block h-3.5 w-2 animate-pulse bg-accent align-middle" aria-hidden="true" />
            )}
          </div>
          <div className="absolute inset-x-0 bottom-0 flex h-8 items-center justify-between border-t border-white/[0.08] bg-black/70 px-3 backdrop-blur-sm">
            <span className="font-mono text-[10px] text-muted">{client === "console" ? "pty" : "1920x1080 @ 60 FPS"}</span>
            <span className="font-mono text-[10px] text-success">
              {client === "console" ? "attached - raw stream" : `connected - ${active.label}`}
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-edge px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="aetheris-btn-ghost h-8 px-3 text-xs"
            onClick={() => setNotice("Clipboard content synced to console.")}
          >
            <ClipboardCopy className="h-3.5 w-3.5" aria-hidden="true" />
            Clipboard
          </button>
          <button
            type="button"
            className="aetheris-btn-ghost h-8 px-3 text-xs"
            onClick={() => setNotice("Ctrl+Alt+Del sent to the console.")}
          >
            <Keyboard className="h-3.5 w-3.5" aria-hidden="true" />
            Ctrl+Alt+Del
          </button>
          <button
            type="button"
            className="aetheris-btn-ghost h-8 px-3 text-xs"
            onClick={() => setNotice("Terminal command prompt ready (demo shell).")}
          >
            <TerminalSquare className="h-3.5 w-3.5" aria-hidden="true" />
            Open shell
          </button>
        </div>
        {(client === "tigervnc" || client === "realvnc") && (
          <div className="flex items-center gap-2">
            <a
              href="https://tigervnc.org"
              target="_blank"
              rel="noopener noreferrer"
              className="aetheris-btn-secondary h-8 px-3 text-xs"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              TigerVNC
            </a>
            <a
              href="https://www.realvnc.com"
              target="_blank"
              rel="noopener noreferrer"
              className="aetheris-btn-secondary h-8 px-3 text-xs"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              RealVNC
            </a>
          </div>
        )}
      </div>

      {notice && (
        <div className="border-t border-edge bg-accent-soft/40 px-4 py-2.5 text-xs text-muted">{notice}</div>
      )}
    </div>
  );
}
