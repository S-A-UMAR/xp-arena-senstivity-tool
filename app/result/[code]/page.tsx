import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { Header } from "@/components/header";
import { ResultDisplay } from "@/components/result/result-display";
import type { Calibration, Game } from "@/lib/types";

interface PageProps {
  params: Promise<{ code: string }>;
}

export default async function ResultPage({ params }: PageProps) {
  const { code } = await params;
  const supabase = await createClient();

  const { data: calibration, error } = await supabase
    .from("calibrations")
    .select("*, game:games(*)")
    .eq("share_code", code.toUpperCase())
    .single();

  if (error || !calibration) {
    notFound();
  }

  // Increment view count
  await supabase
    .from("calibrations")
    .update({ views_count: (calibration.views_count || 0) + 1 })
    .eq("id", calibration.id);

  return (
    <main className="min-h-screen">
      <Header />
      <div className="pt-20 pb-12 px-4">
        <ResultDisplay
          calibration={calibration as Calibration & { game: Game }}
          shareCode={code.toUpperCase()}
        />
      </div>
    </main>
  );
}
