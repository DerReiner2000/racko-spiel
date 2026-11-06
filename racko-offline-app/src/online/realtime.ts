import { createClient } from "@supabase/supabase-js";
import type { OnlineApi } from "./client";
import type { ConnectRealtime } from "./session";

export function realtimeFor(api: OnlineApi, code: string): ConnectRealtime {
  return async (changed, healthy) => {
    const config = await api.realtimeConfig();
    const client = createClient(config.url, config.publishableKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const channel = client.channel(`game-${code}`)
      .on("broadcast", { event: "changed" }, changed)
      .subscribe((status) => healthy(status === "SUBSCRIBED"));
    return () => { void client.removeChannel(channel); };
  };
}
