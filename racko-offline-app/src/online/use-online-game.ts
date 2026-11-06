import { useEffect, useMemo, useSyncExternalStore } from "react";
import { AppState } from "react-native";
import type { StoredOnlineSession } from "../../../shared/online";
import { OnlineApi } from "./client";
import { realtimeFor } from "./realtime";
import { OnlineGameSession } from "./session";

export function useOnlineGame(session: StoredOnlineSession) {
  const controller = useMemo(() => {
    const api = new OnlineApi(session.serverUrl);
    return new OnlineGameSession(api, session, realtimeFor(api, session.code));
  }, [session]);
  const state = useSyncExternalStore(controller.subscribe, controller.getState, controller.getState);

  useEffect(() => {
    if (AppState.currentState === "active" || AppState.currentState === null) controller.start();
    const subscription = AppState.addEventListener("change", (next) => {
      if (next === "active") controller.start();
      else controller.pause();
    });
    return () => { subscription.remove(); controller.stop(); };
  }, [controller]);

  return { ...state, act: controller.act.bind(controller), refresh: controller.refresh.bind(controller) };
}
