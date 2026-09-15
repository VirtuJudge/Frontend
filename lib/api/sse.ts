export interface SseEvent<T = unknown> {
  id?: string;
  event: string;
  data: T;
}

export interface SseConnectionOptions {
  url: string;
  getToken?: () => Promise<string | null> | string | null;
  onMessage?: (event: SseEvent) => void;
  onError?: (error: Error) => void;
  onOpen?: () => void;
  lastEventId?: string;
  reconnectDelayMs?: number;
}

export class SseHelper {
  private controller: AbortController | null = null;
  private lastEventId: string | null;

  constructor(private readonly options: SseConnectionOptions) {
    this.lastEventId = options.lastEventId || null;
  }

  public connect(): void {
    if (typeof window === "undefined" || this.controller) return;
    this.controller = new AbortController();
    void this.readWithReconnect(this.controller);
  }

  public getLastEventId(): string | null {
    return this.lastEventId;
  }

  public disconnect(): void {
    this.controller?.abort();
    this.controller = null;
  }

  private async readWithReconnect(controller: AbortController): Promise<void> {
    while (!controller.signal.aborted) {
      try {
        await this.readStream(controller.signal);
      } catch (error) {
        if (!controller.signal.aborted) {
          this.options.onError?.(
            error instanceof Error ? error : new Error("SSE connection failed"),
          );
        }
      }
      if (controller.signal.aborted) return;
      await new Promise<void>((resolve) => {
        const timeout = window.setTimeout(resolve, this.options.reconnectDelayMs ?? 3000);
        controller.signal.addEventListener("abort", () => {
          window.clearTimeout(timeout);
          resolve();
        }, { once: true });
      });
    }
  }

  private async readStream(signal: AbortSignal): Promise<void> {
    const token = await this.options.getToken?.();
    const headers: Record<string, string> = { Accept: "text/event-stream" };
    if (token) headers.Authorization = `Bearer ${token}`;
    if (this.lastEventId) headers["Last-Event-ID"] = this.lastEventId;

    const response = await fetch(this.options.url, {
      method: "GET",
      headers,
      cache: "no-store",
      signal,
    });
    if (!response.ok || !response.body) {
      throw new Error(`SSE request failed with status ${response.status}`);
    }

    this.options.onOpen?.();
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (!signal.aborted) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value, { stream: !done }).replace(/\r\n/g, "\n");
      let boundary = buffer.indexOf("\n\n");
      while (boundary >= 0) {
        this.emitFrame(buffer.slice(0, boundary));
        buffer = buffer.slice(boundary + 2);
        boundary = buffer.indexOf("\n\n");
      }
      if (done) break;
    }
  }

  private emitFrame(frame: string): void {
    if (!frame.trim() || frame.startsWith(":")) return;
    let event = "message";
    let id: string | undefined;
    const data: string[] = [];
    for (const line of frame.split("\n")) {
      if (line.startsWith("event:")) event = line.slice(6).trimStart();
      else if (line.startsWith("id:")) id = line.slice(3).trimStart();
      else if (line.startsWith("data:")) data.push(line.slice(5).trimStart());
    }
    if (id) this.lastEventId = id;
    const rawData = data.join("\n");
    let parsed: unknown = rawData;
    try {
      parsed = JSON.parse(rawData);
    } catch {
      // Text payloads are valid SSE data.
    }
    this.options.onMessage?.({ id, event, data: parsed });
  }
}
