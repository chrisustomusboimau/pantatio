import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wind, Droplet, Satellite, CloudRain, Activity } from "lucide-react";
import { iotNodes, aiTacticalLogs, macroData } from "@/data/mockData";

const statusColor: Record<string, string> = {
  ok: "bg-success",
  warn: "bg-warning",
  critical: "bg-destructive",
};

// TODO: swap placeholder grid with Mapbox/MapLibre GL + PostGIS tile layer.
// Tactical decisions feed will stream from /api/b2b/agents/log (event-sourced).
export function MacroDataMap() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Macro Data & Field Map</h1>
        <p className="text-sm text-muted-foreground">Live IoT mesh telemetry overlaid on environmental macro data.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="overflow-hidden lg:col-span-2">
          <div className="relative h-[420px] bg-[oklch(0.95_0.03_140)]">
            {/* Stylized topo grid */}
            <svg className="absolute inset-0 h-full w-full opacity-40" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="g" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="oklch(0.42 0.11 150)" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#g)" />
            </svg>
            {/* Fake terrain blobs */}
            <div className="absolute left-[10%] top-[15%] h-40 w-56 rounded-full bg-primary/10 blur-2xl" />
            <div className="absolute right-[8%] bottom-[10%] h-52 w-72 rounded-full bg-success/10 blur-3xl" />

            {iotNodes.map((n, i) => (
              <div
                key={n.id}
                className="group absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${10 + i * 11}%`, top: `${20 + (i % 4) * 18}%` }}
              >
                <span className={`relative block h-3 w-3 rounded-full ${statusColor[n.status]} ring-4 ring-white shadow`}>
                  <span className={`absolute inset-0 animate-ping rounded-full ${statusColor[n.status]} opacity-60`} />
                </span>
                <div className="pointer-events-none absolute left-4 top-0 hidden whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-xs text-background group-hover:block">
                  {n.id} · {n.zone} · {n.moisture}%
                </div>
              </div>
            ))}

            <div className="absolute bottom-3 left-3 flex gap-3 rounded-lg bg-card/95 px-3 py-2 text-xs shadow backdrop-blur">
              <Legend color="bg-success" label="Healthy" />
              <Legend color="bg-warning" label="Warning" />
              <Legend color="bg-destructive" label="Critical" />
            </div>
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <div className="mb-3 text-sm font-semibold">Macro Environment</div>
            <div className="space-y-2 text-sm">
              <Row icon={<Droplet className="h-4 w-4" />} label="Soil permeability" value={macroData.soilPermeability.toFixed(2)} />
              <Row icon={<Activity className="h-4 w-4" />} label="Soil pH" value={`${macroData.soilPh}`} />
              <Row icon={<Wind className="h-4 w-4" />} label="Wind" value={`${macroData.windKmh} km/h`} />
              <Row icon={<CloudRain className="h-4 w-4" />} label="Incoming" value={macroData.incomingWeather} />
              <Row icon={<Satellite className="h-4 w-4" />} label="Next satellite pass" value={macroData.satellitePass} />
            </div>
          </Card>

          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-semibold">AI Tactical Decisions</div>
              <Badge variant="outline" className="text-[10px]">live</Badge>
            </div>
            <ol className="space-y-3">
              {aiTacticalLogs.map((l, i) => (
                <li key={i} className="flex gap-3 text-sm">
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                    l.severity === "critical" ? "bg-destructive" : l.severity === "warn" ? "bg-warning" : "bg-primary"
                  }`} />
                  <div className="flex-1">
                    <div className="text-xs text-muted-foreground">{l.time}</div>
                    <div>{l.action}</div>
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`h-2 w-2 rounded-full ${color}`} />
      <span>{label}</span>
    </div>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b py-1.5 last:border-0">
      <span className="flex items-center gap-2 text-muted-foreground">
        {icon}
        {label}
      </span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
