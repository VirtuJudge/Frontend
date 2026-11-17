import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import axe from 'axe-core';
import HomeProductDemo, {
  PRODUCT_DEMO_ID,
} from '@/components/home/home-product-demo';

type ObserverCallback = (entries: Array<{ isIntersecting: boolean }>) => void;

let observerCallback: ObserverCallback | null = null;
const observe = vi.fn();
const disconnect = vi.fn();

class MockIntersectionObserver {
  constructor(callback: ObserverCallback) {
    observerCallback = callback;
  }
  observe = observe;
  disconnect = disconnect;
  unobserve = vi.fn();
  takeRecords = vi.fn(() => []);
}

function mockReducedMotion(reduce: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: reduce && query.includes('prefers-reduced-motion'),
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

function getVideo(container: HTMLElement) {
  const video = container.querySelector('video');
  if (!video) throw new Error('video element missing');
  return video;
}

function stubPlayback(video: HTMLVideoElement) {
  let paused = true;
  Object.defineProperty(video, 'paused', { configurable: true, get: () => paused });
  const play = vi.fn(() => {
    paused = false;
    video.dispatchEvent(new Event('play'));
    return Promise.resolve();
  });
  const pause = vi.fn(() => {
    paused = true;
    video.dispatchEvent(new Event('pause'));
  });
  video.play = play;
  video.pause = pause;
  return { play, pause };
}

describe('HomeProductDemo', () => {
  beforeEach(() => {
    observerCallback = null;
    observe.mockClear();
    disconnect.mockClear();
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
    mockReducedMotion(false);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders the demo section targeted by the About page link', () => {
    const { container } = render(<HomeProductDemo />);

    const section = container.querySelector(`#${PRODUCT_DEMO_ID}`);
    expect(section).not.toBeNull();
    // ScrollReveal hides the section until it scrolls into view, so query the
    // heading directly rather than through the accessibility tree.
    const heading = container.querySelector('#product-demo-title');
    expect(heading?.tagName).toBe('H2');
    expect(heading?.textContent).toBe('One practice round, start to finish');
    expect(section?.getAttribute('aria-labelledby')).toBe('product-demo-title');
  });

  it('serves a muted, inline, controllable video with WebM and MP4 sources', () => {
    const { container } = render(<HomeProductDemo />);
    const video = getVideo(container);

    expect(video.muted).toBe(true);
    expect(video.hasAttribute('controls')).toBe(true);
    expect(video.hasAttribute('playsinline')).toBe(true);
    expect(video.getAttribute('preload')).toBe('metadata');
    expect(video.getAttribute('poster')).toBe('/videos/virtujudge-promo-poster.webp');
    expect(video.getAttribute('aria-describedby')).toBe('product-demo-description');

    const sources = Array.from(video.querySelectorAll('source')).map((s) => [
      s.getAttribute('src'),
      s.getAttribute('type'),
    ]);
    expect(sources).toEqual([
      ['/videos/virtujudge-promo.webm', 'video/webm'],
      ['/videos/virtujudge-promo.mp4', 'video/mp4'],
    ]);
  });

  it('plays while on screen and pauses when scrolled away', () => {
    const { container } = render(<HomeProductDemo />);
    const video = getVideo(container);
    const { play, pause } = stubPlayback(video);

    expect(observe).toHaveBeenCalledWith(video);

    observerCallback?.([{ isIntersecting: true }]);
    expect(play).toHaveBeenCalledTimes(1);

    observerCallback?.([{ isIntersecting: false }]);
    expect(pause).toHaveBeenCalledTimes(1);

    observerCallback?.([{ isIntersecting: true }]);
    expect(play).toHaveBeenCalledTimes(2);
  });

  it('stays paused after the visitor pauses it', () => {
    const { container } = render(<HomeProductDemo />);
    const video = getVideo(container);
    const { play } = stubPlayback(video);

    observerCallback?.([{ isIntersecting: true }]);
    expect(play).toHaveBeenCalledTimes(1);

    // Visitor presses pause in the native controls.
    Object.defineProperty(video, 'paused', { configurable: true, get: () => true });
    video.dispatchEvent(new Event('pause'));

    observerCallback?.([{ isIntersecting: false }]);
    observerCallback?.([{ isIntersecting: true }]);
    expect(play).toHaveBeenCalledTimes(1);
  });

  it('never autoplays for visitors who prefer reduced motion', () => {
    mockReducedMotion(true);
    const { container } = render(<HomeProductDemo />);
    const video = getVideo(container);
    const { play } = stubPlayback(video);

    expect(observe).not.toHaveBeenCalled();
    expect(observerCallback).toBeNull();
    expect(play).not.toHaveBeenCalled();
  });

  it('jumps to the demo when the URL targets it, and stops once the visitor scrolls', () => {
    vi.useFakeTimers();
    window.history.replaceState(null, '', '/#product-demo');
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) =>
      window.setTimeout(() => cb(0), 0),
    );

    const { unmount } = render(<HomeProductDemo />);
    vi.advanceTimersByTime(0);
    expect(scrollIntoView).toHaveBeenCalledTimes(1);

    window.dispatchEvent(new Event('wheel'));
    vi.advanceTimersByTime(2000);
    expect(scrollIntoView).toHaveBeenCalledTimes(1);

    unmount();
    window.history.replaceState(null, '', '/');
    vi.useRealTimers();
  });

  it('does not jump when the URL has no demo anchor', () => {
    vi.useFakeTimers();
    window.history.replaceState(null, '', '/');
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;

    render(<HomeProductDemo />);
    vi.advanceTimersByTime(2000);
    expect(scrollIntoView).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('disconnects the observer on unmount', () => {
    const { unmount } = render(<HomeProductDemo />);
    unmount();
    expect(disconnect).toHaveBeenCalled();
  });

  it('has no serious accessibility violations', async () => {
    const { container } = render(<HomeProductDemo />);
    const results = await axe.run(container, {
      rules: { 'color-contrast': { enabled: false } },
    });
    const serious = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious',
    );
    expect(serious).toEqual([]);
  });
});
