import React from 'react';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

afterEach(() => {
  cleanup();
});

// Mock @iconify/react to prevent async network fetches and timer leaks during tests
vi.mock('@iconify/react', () => ({
  Icon: ({ icon, className, ...props }: Record<string, unknown>) => {
    return React.createElement('span', {
      'data-icon': typeof icon === 'string' ? icon : 'custom-icon',
      className,
      ...props,
    });
  },
}));

// Mock Next.js navigation hooks
vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

// Provide stable localStorage mock in jsdom / test environment
if (typeof window !== 'undefined') {
  let store: Record<string, string> = {};
  const storageMock: Storage = {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = String(value);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
  };

  try {
    window.localStorage.setItem('__test__', '1');
    window.localStorage.removeItem('__test__');
  } catch {
    Object.defineProperty(window, 'localStorage', {
      value: storageMock,
      writable: true,
      configurable: true,
    });
  }
}

// Provide stable URL.createObjectURL and URL.revokeObjectURL in jsdom
if (typeof URL !== 'undefined') {
  if (!URL.createObjectURL) {
    URL.createObjectURL = vi.fn(
      () => `blob:http://localhost/${Math.random().toString(36).substring(2, 9)}`,
    );
  }
  if (!URL.revokeObjectURL) {
    URL.revokeObjectURL = vi.fn();
  }
}

if (typeof window !== 'undefined' && typeof window.MediaRecorder === 'undefined') {
  class MockMediaRecorder {
    public state: 'inactive' | 'recording' | 'paused' = 'inactive';
    public stream: MediaStream;
    public mimeType: string = 'video/webm';
    public ondataavailable: ((e: { data: Blob }) => void) | null = null;
    public onstop: (() => void) | null = null;
    public onpause: (() => void) | null = null;
    public onresume: (() => void) | null = null;

    constructor(stream: MediaStream, options?: { mimeType?: string }) {
      this.stream = stream;
      if (options?.mimeType) {
        this.mimeType = options.mimeType;
      }
    }

    start() {
      this.state = 'recording';
    }

    stop() {
      this.state = 'inactive';
      if (this.ondataavailable) {
        this.ondataavailable({
          data: new Blob(['mock-video-stream-chunk'], { type: this.mimeType }),
        });
      }
      if (this.onstop) {
        this.onstop();
      }
    }

    pause() {
      this.state = 'paused';
      if (this.onpause) this.onpause();
    }

    resume() {
      this.state = 'recording';
      if (this.onresume) this.onresume();
    }

    static isTypeSupported() {
      return true;
    }
  }

  // @ts-expect-error MockMediaRecorder for testing
  window.MediaRecorder = MockMediaRecorder;
  // @ts-expect-error MockMediaRecorder for testing
  global.MediaRecorder = MockMediaRecorder;
}
