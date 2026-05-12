import { Card } from "@/components/ui/card";
import { Cloud, CloudRain, Sun, AlertTriangle } from "lucide-react";
import { weatherAlert } from "@/data/mockData";

const iconFor = (k: string) =>
  k === "rain" ? <CloudRain className="h-4 w-4" /> : k === "cloud" ? <Cloud className="h-4 w-4" /> : <Sun className="h-4 w-4" />;

// TODO: connect to Open-Meteo (or similar) macro weather API + ML alert model
// served via /api/b2c/weather/{geohash}
export function WeatherSyncWidget() {
  return (
    <Card className="overflow-hidden">
      <div
        className="p-5 text-primary-foreground"
        style={{ background: "var(--gradient-hero)" }}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-wide opacity-80">{weatherAlert.city}</div>
            <div className="text-4xl font-semibold">{weatherAlert.tempC}°</div>
            <div className="text-sm opacity-90">{weatherAlert.condition} · {weatherAlert.humidity}% humidity</div>
          </div>
          <Sun className="h-12 w-12 opacity-90" />
        </div>
        <div className="mt-4 grid grid-cols-5 gap-2">
          {weatherAlert.forecast.map((d) => (
            <div key={d.day} className="rounded-lg bg-white/15 p-2 text-center text-xs backdrop-blur-sm">
              <div className="opacity-80">{d.day}</div>
              <div className="my-1 flex justify-center">{iconFor(d.icon)}</div>
              <div className="font-medium">{d.tempC}°</div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex gap-3 border-l-4 border-warning bg-warning/10 p-4">
        <AlertTriangle className="h-5 w-5 shrink-0 text-warning" />
        <div className="text-sm">
          <div className="font-semibold">{weatherAlert.alert.title}</div>
          <div className="text-xs text-muted-foreground">{weatherAlert.alert.body}</div>
        </div>
      </div>
    </Card>
  );
}
