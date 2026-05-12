import { Link } from "@tanstack/react-router";
import { ArrowLeft, Sprout } from "lucide-react";
import { CognitiveAssistant } from "./CognitiveAssistant";
import { PlantCardDetail } from "./PlantCardDetail";
import { BarcodeScannerMock } from "./BarcodeScannerMock";
import { WeatherSyncWidget } from "./WeatherSyncWidget";

export function B2CMainLayout() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-card/80 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
          <div className="flex items-center gap-1.5 font-semibold">
            <Sprout className="h-5 w-5 text-primary" /> PLANTATIO
          </div>
          <div className="text-xs text-muted-foreground">B2C</div>
        </div>
      </header>
      <main className="mx-auto max-w-md space-y-5 px-4 py-5">
        <WeatherSyncWidget />
        <BarcodeScannerMock />
        <PlantCardDetail />
        <CognitiveAssistant />
      </main>
    </div>
  );
}
