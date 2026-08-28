import { sseBroadcaster } from "@/lib/sse/broadcaster";
import { auth } from "@/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode("event: connected\ndata: {}\n\n"));

      const unsubscribe = sseBroadcaster.subscribe((event) => {
        try {
          const payload = `event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`;
          controller.enqueue(encoder.encode(payload));
        } catch {
          unsubscribe();
        }
      });

      const keepAlive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": keepalive\n\n"));
        } catch {
          clearInterval(keepAlive);
          unsubscribe();
        }
      }, 15000);

      const originalStart = controller.close.bind(controller);
      const cleanup = () => {
        clearInterval(keepAlive);
        unsubscribe();
      };

      (controller as { close: () => void }).close = () => {
        cleanup();
        originalStart();
      };
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
