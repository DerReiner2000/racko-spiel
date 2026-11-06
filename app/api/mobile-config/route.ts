import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) {
    return NextResponse.json({ error: "Echtzeit-Verbindung ist derzeit nicht verfügbar." }, { status: 503 });
  }
  // Exactly the public settings already used by the browser. Never return the
  // service-role key or the rest of process.env.
  return NextResponse.json({ url, publishableKey }, { headers: { "Cache-Control": "no-store" } });
}
