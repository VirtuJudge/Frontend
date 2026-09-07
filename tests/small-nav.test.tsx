import React from "react";
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import SmallNav from "@/components/Nav-Bar/small-nav";

const SMALL_NAV_STORAGE_KEY = "small_nav_menu_open";

describe("SmallNav Component", () => {
  let store: Record<string, string> = {};

  beforeEach(() => {
    store = {};
    const mockStorage = {
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
    };
    Object.defineProperty(window, "localStorage", {
      value: mockStorage,
      writable: true,
      configurable: true,
    });
  });

  it("renders closed by default when localStorage is empty", () => {
    render(<SmallNav />);
    expect(screen.queryByText("About")).toBeNull();
  });

  it("opens menu on trigger click and saves state to localStorage", async () => {
    render(<SmallNav />);
    const trigger = screen.getByRole("button", { name: /open menu/i });

    fireEvent.click(trigger);

    expect(screen.getByText("About")).toBeDefined();
    expect(store[SMALL_NAV_STORAGE_KEY]).toBe("true");
  });

  it("closes menu on click outside and updates localStorage", async () => {
    render(
      <div>
        <div data-testid="outside-area">Outside</div>
        <SmallNav />
      </div>,
    );

    const trigger = screen.getByRole("button", { name: /open menu/i });
    fireEvent.click(trigger);
    expect(screen.getByText("About")).toBeDefined();

    // Click outside
    fireEvent.mouseDown(screen.getByTestId("outside-area"));

    await waitFor(() => {
      expect(screen.queryByText("About")).toBeNull();
    });
    expect(store[SMALL_NAV_STORAGE_KEY]).toBe("false");
  });

  it("restores menu open state from localStorage on mount (page reload simulation)", async () => {
    // Simulate previous open state saved before page reload
    store[SMALL_NAV_STORAGE_KEY] = JSON.stringify(true);

    render(<SmallNav />);

    await waitFor(() => {
      expect(screen.getByText("About")).toBeDefined();
    });
  });
});
