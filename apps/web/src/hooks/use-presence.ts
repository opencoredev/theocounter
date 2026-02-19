import { useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "@theocounter.com/backend/convex/_generated/api";

function getVisitorId(): string {
  let id = localStorage.getItem("presence-id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("presence-id", id);
  }
  return id;
}

export function usePresence() {
  const upsert = useMutation(api.presence.upsertPresence);

  useEffect(() => {
    const visitorId = getVisitorId();
    let isLeader = false;
    let heartbeatInterval: ReturnType<typeof setInterval> | null = null;
    let leaderCheckTimeout: ReturnType<typeof setTimeout> | null = null;
    let leaderPingInterval: ReturnType<typeof setInterval> | null = null;

    const channel = new BroadcastChannel("theocounter-presence");

    function becomeLeader() {
      if (isLeader) return;
      isLeader = true;
      upsert({ visitorId });
      heartbeatInterval = setInterval(() => upsert({ visitorId }), 30_000);
      leaderPingInterval = setInterval(
        () => channel.postMessage("leader-alive"),
        5_000,
      );
    }

    function stepDown() {
      isLeader = false;
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
      }
      if (leaderPingInterval) {
        clearInterval(leaderPingInterval);
        leaderPingInterval = null;
      }
    }

    channel.onmessage = (e: MessageEvent) => {
      if (e.data === "leader-alive") {
        if (leaderCheckTimeout) {
          clearTimeout(leaderCheckTimeout);
          leaderCheckTimeout = null;
        }
        if (isLeader) return;
        leaderCheckTimeout = setTimeout(becomeLeader, 10_000);
      } else if (e.data === "hello") {
        if (isLeader) channel.postMessage("leader-alive");
      }
    };

    channel.postMessage("hello");
    leaderCheckTimeout = setTimeout(becomeLeader, 200);

    return () => {
      stepDown();
      if (leaderCheckTimeout) clearTimeout(leaderCheckTimeout);
      channel.close();
    };
  }, [upsert]);
}
