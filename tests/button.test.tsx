import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Button } from "@/components";

describe("Button & NavButton Component", () => {
  it("renders glass variant by default with correct default dimensions and styles", () => {
    const { container } = render(<Button>Click Me</Button>);
    const button = screen.getByRole("button", { name: /click me/i });

    expect(button).toBeDefined();
    expect(button.className).toContain("rounded-full");
    expect(button.className).toContain("h-[3.5rem]");
    expect(button.className).toContain("py-[0.9375rem]");
    expect(button.className).toContain("px-[1.25rem]");
    expect(button.className).toContain("gap-[0.625rem]");
    expect(button.className).toContain("font-bold");
    expect(button.className).toContain("backdrop-blur-[20px]");
    expect(container.innerHTML).toContain("Click Me");
  });

  it("renders all variants correctly", () => {
    const { rerender } = render(<Button variant="glass">Glass</Button>);
    let button = screen.getByRole("button", { name: /^glass$/i });
    expect(button.className).toContain("bg-glass");
    expect(button.className).toContain("text-fg");
    expect(button.className).toContain("backdrop-blur-[20px]");
    expect(button.className).toContain("font-bold");

    rerender(<Button variant="glass-dark">Glass Dark</Button>);
    button = screen.getByRole("button", { name: /glass dark/i });
    expect(button.className).toContain("bg-glass-dark");
    expect(button.className).toContain("text-fg");
    expect(button.className).toContain("backdrop-blur-[20px]");
    expect(button.className).toContain("font-bold");

    rerender(<Button variant="primary">Primary</Button>);
    button = screen.getByRole("button", { name: /primary/i });
    expect(button.className).toContain("bg-primary");
    expect(button.className).toContain("text-bg");
    expect(button.className).toContain("font-bold");

    rerender(<Button variant="danger">Danger</Button>);
    button = screen.getByRole("button", { name: /danger/i });
    expect(button.className).toContain("bg-danger");
    expect(button.className).toContain("text-white");
    expect(button.className).toContain("font-bold");

    rerender(<Button variant="dark">Dark</Button>);
    button = screen.getByRole("button", { name: /^dark$/i });
    expect(button.className).toContain("bg-bg-light");
    expect(button.className).toContain("text-glass");
    expect(button.className).toContain("font-bold");
  });

  it("renders as Next.js Link when internal href is supplied", () => {
    render(<Button href="/dashboard">Go to dashboard</Button>);
    const link = screen.getByRole("link", { name: /go to dashboard/i });
    expect(link).toBeDefined();
    expect(link.getAttribute("href")).toBe("/dashboard");
    expect(link.className).toContain("h-[3.5rem]");
    expect(link.className).toContain("px-[1.25rem]");
  });

  it("renders as external anchor when external href is supplied", () => {
    render(
      <Button href="https://example.com" variant="glass">
        External
      </Button>,
    );

    const link = screen.getByRole("link", { name: /external/i });
    expect(link).toBeDefined();
    expect(link.getAttribute("href")).toBe("https://example.com");
  });

  it("handles click events and respects disabled state", () => {
    const handleClick = vi.fn();
    const { rerender } = render(<Button onClick={handleClick}>Active</Button>);

    fireEvent.click(screen.getByRole("button", { name: /active/i }));
    expect(handleClick).toHaveBeenCalledTimes(1);

    rerender(
      <Button onClick={handleClick} disabled>
        Disabled
      </Button>,
    );

    const disabledBtn = screen.getByRole("button", { name: /disabled/i });
    expect(disabledBtn.hasAttribute("disabled")).toBe(true);
    expect(disabledBtn.className).toContain("disabled:pointer-events-none");
    expect(disabledBtn.className).toContain("disabled:opacity-50");
  });

  it("allows custom className overrides for different layouts", () => {
    render(
      <Button className="w-22.5 top-5 left-5 absolute">
        Custom
      </Button>,
    );
    const btn = screen.getByRole("button", { name: /custom/i });
    expect(btn.className).toContain("w-22.5");
    expect(btn.className).toContain("top-5");
    expect(btn.className).toContain("left-5");
    expect(btn.className).toContain("absolute");
  });

  it("allows custom padding and rounded overrides via className", () => {
    render(
      <Button borderGradient="nav" className="px-4 py-4 rounded-[50px]">
        Nav Button
      </Button>,
    );
    const btn = screen.getByRole("button", { name: /nav button/i });
    expect(btn.className).toContain("px-4");
    expect(btn.className).toContain("py-4");
    expect(btn.className).toContain("rounded-[50px]");
    expect(btn.className).not.toContain("px-[1.25rem]");
    expect(btn.className).not.toContain("py-[0.9375rem]");
    expect(btn.className).not.toContain("rounded-[2.5rem]");
  });

  it("renders icons and loading indicator", () => {
    const { rerender } = render(
      <Button leftIcon={<span data-testid="left-icon">L</span>}>
        With Icon
      </Button>,
    );
    expect(screen.getByTestId("left-icon")).toBeDefined();

    rerender(<Button loading>Loading Button</Button>);
    const loadingBtn = screen.getByRole("button", { name: /loading button/i });
    expect(loadingBtn.getAttribute("aria-busy")).toBe("true");
  });
});
