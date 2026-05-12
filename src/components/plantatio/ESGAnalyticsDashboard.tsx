import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, TreePine, ShieldCheck, Cloud, MapPin } from "lucide-react";
import {
  ResponsiveContainer, ComposedChart, Line, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
  PieChart, Pie, Cell,
} from "recharts";
import { esgSummary } from "@/data/mockData";

const PIE_COLORS = ["oklch(0.42 0.11 150)", "oklch(0.62 0.16 145)", "oklch(0.78 0.16 75)", "oklch(0.55 0.08 200)"];

// TODO: replace with /api/b2b/esg query that aggregates from PostGIS plots,
// InfluxDB sensor history, and the carbon registry connector.
export function ESGAnalyticsDashboard() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">ESG Analytics</h1>
          <p className="text-sm text-muted-foreground">Live restoration performance across all sites.</p>
        </div>
        <Button>
          <Download className="mr-2 h-4 w-4" />
          Export Audited ESG Report
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={<TreePine />} label="Total Trees" value={esgSummary.totalTrees.toLocaleString()} delta="+2.4% MoM" />
        <Stat icon={<ShieldCheck />} label="Audited Survival Rate" value={`${esgSummary.survivalRate}%`} delta="verified Verra" />
        <Stat icon={<Cloud />} label="Carbon Sequestered" value={`${esgSummary.carbonTons.toLocaleString()} t`} delta="YTD" />
        <Stat icon={<MapPin />} label="Hectares Restored" value={`${esgSummary.hectares}`} delta="across 7 zones" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold">Carbon Sequestration: Projection vs Actual</div>
              <div className="text-xs text-muted-foreground">Tonnes CO₂e · 2025 YTD</div>
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer>
              <ComposedChart data={esgSummary.projection}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.015 140)" />
                <XAxis dataKey="month" stroke="oklch(0.5 0.02 150)" fontSize={12} />
                <YAxis stroke="oklch(0.5 0.02 150)" fontSize={12} />
                <Tooltip />
                <Legend />
                <Bar dataKey="projected" fill="oklch(0.85 0.05 145)" radius={[4, 4, 0, 0]} />
                <Line type="monotone" dataKey="actual" stroke="oklch(0.42 0.11 150)" strokeWidth={3} dot={{ r: 4 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="p-5">
          <div className="mb-4 text-sm font-semibold">Species Mix</div>
          <div className="h-72">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={esgSummary.speciesMix} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={2}>
                  {esgSummary.speciesMix.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Stat({ icon, label, value, delta }: { icon: React.ReactNode; label: string; value: string; delta: string }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between text-muted-foreground">
        <span className="text-xs uppercase tracking-wide">{label}</span>
        <span className="text-primary [&>svg]:h-4 [&>svg]:w-4">{icon}</span>
      </div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{delta}</div>
    </Card>
  );
}
