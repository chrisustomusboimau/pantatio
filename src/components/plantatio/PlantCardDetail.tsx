import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Droplets, Leaf, Sun, Thermometer, Sprout } from "lucide-react";
import { plantProfile } from "@/data/mockData";
import { toast } from "sonner";

// TODO: connect to live MQTT stream from Plantatio Smart Probes
// and InfluxDB historical timeseries via /api/b2c/plants/{id}/telemetry
export function PlantCardDetail() {
  const [moisture, setMoisture] = useState(plantProfile.probe.moisture);

  const water = () => {
    setMoisture(Math.min(100, moisture + 15));
    toast.success("Watering cycle started — 200ml dispensed");
  };

  return (
    <Card className="overflow-hidden">
      <div
        className="h-44 w-full bg-cover bg-center"
        style={{ backgroundImage: `url(${plantProfile.image})` }}
      />
      <div className="space-y-4 p-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              {plantProfile.species}
            </div>
            <h2 className="text-xl font-semibold">{plantProfile.nickname}</h2>
          </div>
          <Badge className="bg-success text-primary-foreground">
            Health {plantProfile.health}%
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Sprout className="h-4 w-4 text-primary" />
          Day {plantProfile.daysPlanted} since planted
        </div>

        <div className="rounded-xl border bg-secondary/40 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm font-semibold">Plantatio Smart Probes</div>
            <Badge variant="outline" className="text-[10px]">live · MQTT</Badge>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Gauge icon={<Droplets className="h-4 w-4" />} label="Moisture" value={moisture} unit="%" />
            <Gauge icon={<Leaf className="h-4 w-4" />} label="Nutrients" value={plantProfile.probe.nutrients} unit="%" />
            <Gauge icon={<Sun className="h-4 w-4" />} label="Light" value={plantProfile.probe.light} unit="%" />
            <Gauge icon={<Thermometer className="h-4 w-4" />} label="Temp" value={plantProfile.probe.temperature} unit="°C" max={40} />
          </div>
          <Button onClick={water} className="mt-4 w-full">
            <Droplets className="mr-2 h-4 w-4" />
            Water Now
          </Button>
        </div>

        <div>
          <div className="mb-2 text-sm font-semibold">Care history</div>
          <ol className="space-y-2">
            {plantProfile.timeline.map((t) => (
              <li key={t.date} className="flex gap-3 text-sm">
                <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                <div className="flex-1">
                  <div className="flex justify-between">
                    <span className="font-medium">{t.event}</span>
                    <span className="text-xs text-muted-foreground">{t.date}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">{t.note}</div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </Card>
  );
}

function Gauge({ icon, label, value, unit, max = 100 }: { icon: React.ReactNode; label: string; value: number; unit: string; max?: number }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mb-1.5 text-lg font-semibold">{value}{unit}</div>
      <Progress value={(value / max) * 100} className="h-1.5" />
    </div>
  );
}
