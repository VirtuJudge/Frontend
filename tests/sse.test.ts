import { afterEach, describe, expect, it, vi } from "vitest";
import { SseHelper } from "@/lib/api/sse";

describe("SseHelper", () => {
  afterEach(() => vi.restoreAllMocks());

  it("authenticates, preserves named events, and resumes with Last-Event-ID", async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode("id: 42\nevent: qa.question_available.v1\ndata: {\"question_id\":\"q1\"}\n\n"));
        controller.close();
      },
    });
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(stream, { status: 200, headers: { "Content-Type": "text/event-stream" } }),
    );
    const received = vi.fn();
    const helper = new SseHelper({
      url: "https://api.example.test/api/v1/practice-sessions/s1/events",
      getToken: () => "token-123",
      lastEventId: "41",
      reconnectDelayMs: 60_000,
      onMessage: received,
    });

    helper.connect();
    await vi.waitFor(() => expect(received).toHaveBeenCalledTimes(1));
    helper.disconnect();

    expect(fetchSpy.mock.calls[0][1]).toEqual(expect.objectContaining({
      headers: expect.objectContaining({
        Authorization: "Bearer token-123",
        "Last-Event-ID": "41",
      }),
    }));
    expect(received).toHaveBeenCalledWith({
      id: "42",
      event: "qa.question_available.v1",
      data: { question_id: "q1" },
    });
    expect(helper.getLastEventId()).toBe("42");
  });
});
