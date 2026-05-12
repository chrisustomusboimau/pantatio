import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Battery, BatteryLow, Cpu, Wrench, ShoppingCart } from "lucide-react";
import { iotNodes } from "@/data/mockData";
import { toast } from "sonner";

const statusVariant: Record<string, string> = {
  ok: "bg-success/15 text-success border-success/30",
  warn: "bg-warning/15 text-warning border-warning/30",
  critical: "bg-destructive/15 text-destructive border-destructive/30",
};

// TODO: pipe device list from MQTT broker registry + procurement actions through
// /api/b2b/devices and /api/b2b/procurement (Stripe + ERP integration).
export function DeviceManager() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Device Manager</h1>
        <p className="text-sm text-muted-foreground">Field sensors, batteries, and procurement.</p>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Node ID</TableHead>
              <TableHead>Zone</TableHead>
              <TableHead>Battery</TableHead>
              <TableHead>Moisture</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {iotNodes.map((n) => (
              <TableRow key={n.id}>
                <TableCell className="font-mono text-xs">{n.id}</TableCell>
                <TableCell>{n.zone}</TableCell>
                <TableCell>
                  <span className="flex items-center gap-1.5">
                    {n.battery < 20 ? <BatteryLow className="h-4 w-4 text-destructive" /> : <Battery className="h-4 w-4 text-muted-foreground" />}
                    {n.battery}%
                  </span>
                </TableCell>
                <TableCell>{n.moisture}%</TableCell>
                <TableCell>
                  <Badge variant="outline" className={statusVariant[n.status]}>{n.status}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="ghost" onClick={() => toast.info(`Diagnostics requested for ${n.id}`)}>Diagnose</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Procurement & Maintenance</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="p-5">
            <Cpu className="mb-3 h-6 w-6 text-primary" />
            <div className="font-semibold">Order Smart Probes</div>
            <p className="mt-1 text-sm text-muted-foreground">Plantatio Probe v3 — soil moisture, NPK, temperature, LoRa mesh.</p>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-sm">€89 / unit · MOQ 10</span>
              <Button size="sm" onClick={() => toast.success("Cart updated · 10 probes")}>
                <ShoppingCart className="mr-2 h-4 w-4" /> Add to order
              </Button>
            </div>
          </Card>
          <Card className="p-5">
            <Wrench className="mb-3 h-6 w-6 text-primary" />
            <div className="font-semibold">Request On-Site Maintenance</div>
            <p className="mt-1 text-sm text-muted-foreground">Dispatch a certified field technician for failing nodes.</p>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-sm">2 critical nodes flagged</span>
              <Button size="sm" variant="outline" onClick={() => toast.success("Maintenance ticket #M-2419 created")}>
                <Wrench className="mr-2 h-4 w-4" /> Dispatch
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
