import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/header";
import { CalibrationWizard } from "@/components/calibration/calibration-wizard";
import type { Game, Device } from "@/lib/types";

export default async function CalibratePage() {
  const supabase = await createClient();

  const [gamesResult, devicesResult] = await Promise.all([
    supabase
      .from("games")
      .select("*")
      .eq("is_active", true)
      .order("sort_order"),
    supabase
      .from("devices")
      .select("*")
      .order("popularity_score", { ascending: false }),
  ]);

  const games = (gamesResult.data || []) as Game[];
  const devices = (devicesResult.data || []) as Device[];

  return (
    <main className="min-h-screen">
      <Header />
      <div className="pt-20 pb-12 px-4">
        <CalibrationWizard games={games} devices={devices} />
      </div>
    </main>
  );
}
