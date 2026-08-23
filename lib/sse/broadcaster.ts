export type SSEEvent = {
  type: "queue_update" | "order_status" | "slot_update" | "new_order";
  data: Record<string, unknown>;
};

type Listener = (event: SSEEvent) => void;

class SSEBroadcaster {
  private listeners: Set<Listener> = new Set();

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  broadcast(event: SSEEvent) {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        this.listeners.delete(listener);
      }
    }
  }

  getListenerCount(): number {
    return this.listeners.size;
  }
}

const globalForSSE = globalThis as unknown as {
  sseBroadcaster: SSEBroadcaster | undefined;
};

export const sseBroadcaster = globalForSSE.sseBroadcaster ?? new SSEBroadcaster();

if (process.env.NODE_ENV !== "production") {
  globalForSSE.sseBroadcaster = sseBroadcaster;
}
