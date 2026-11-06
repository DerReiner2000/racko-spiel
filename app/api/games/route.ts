import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { GameState, ListedGame, PLAYER_NAMES, PlayerName } from "@/lib/types";
import { isBot } from "@/lib/online-bots";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const name = request.nextUrl.searchParams.get("name") as PlayerName | null;
    if (!name || !PLAYER_NAMES.includes(name)) return NextResponse.json({ error: "Bitte zuerst einen Spieler auswählen." }, { status: 400 });
    const cutoff = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { data, error } = await getSupabaseAdmin().from("games").select("state").gte("last_active_at", cutoff).order("updated_at", { ascending: false });
    if (error) throw error;
    const games: ListedGame[] = (data ?? []).map(({ state: raw }) => {
      const state = raw as GameState;
      const playerNames = state.players.map((player) => player.name);
      const canRejoin = playerNames.includes(name);
      return {
        code: state.code,
        hostName: state.players.find((player) => player.id === state.hostId)?.name ?? state.players[0].name,
        status: state.status,
        playerNames,
        playerCount: state.players.length,
        totalRounds: state.totalRounds,
        directRunRequirement: state.directRunRequirement ?? 0,
        canJoin: state.status === "lobby" && state.players.length < 4 && !canRejoin,
        canRejoin,
        ...(state.players.some(isBot) ? { botCount: state.players.filter(isBot).length } : {}),
      };
    }).filter((game) => game.status !== "finished");
    return NextResponse.json({ games });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Spiele konnten nicht geladen werden." }, { status: 500 });
  }
}
