import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { data, error } = await getSupabaseAdmin().from("leaderboard").select("*").order("average_per_game", { ascending: false });
    if (error) throw error;
    return NextResponse.json({ leaderboard: data });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Rangliste konnte nicht geladen werden." }, { status: 500 });
  }
}
