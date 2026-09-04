export interface SseEvent<T = unknown> {
  id?: string;
  event: string;
  data: T;
}

export interface SseConnectionOptions {
  url: string;
  onMessage?: (event: SseEvent) => void;
  onError?: (error: Event) => void;
  onOpen?: () => void;
  lastEventId?: string;
}

export class SseHelper {
  private eventSource: EventSource | null = null;
  private lastEventId: string | null = null;

  constructor(private readonly options: SseConnectionOptions) {
    this.lastEventId = options.lastEventId || null;
  }

  public connect(): void {
    if (typeof window === 'undefined' || typeof EventSource === 'undefined') {
      return;
    }

    const url = new URL(this.options.url, window.location.origin);
    if (this.lastEventId) {
      url.searchParams.set('lastEventId', this.lastEventId);
    }

    this.eventSource = new EventSource(url.toString());

    this.eventSource.onopen = () => {
      this.options.onOpen?.();
    };

    this.eventSource.onmessage = (event) => {
      if (event.lastEventId) {
        this.lastEventId = event.lastEventId;
      }
      let parsedData: unknown = event.data;
      try {
        parsedData = JSON.parse(event.data);
      } catch {
        parsedData = event.data;
      }
      this.options.onMessage?.({
        id: event.lastEventId || undefined,
        event: 'message',
        data: parsedData,
      });
    };

    this.eventSource.onerror = (error) => {
      this.options.onError?.(error);
    };
  }

  public getLastEventId(): string | null {
    return this.lastEventId;
  }

  public disconnect(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }
}
