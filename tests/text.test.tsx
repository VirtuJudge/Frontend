import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Text } from "@/components";

describe("Text Component", () => {
  it("renders with default size (20px) and text-fg as a <p> element", () => {
    render(<Text>Default paragraph</Text>);
    const element = screen.getByText("Default paragraph");

    expect(element.tagName.toLowerCase()).toBe("p");
    expect(element.className).toContain("text-[20px]");
    expect(element.className).toContain("text-fg");
  });

  it("renders small size (16px)", () => {
    render(<Text size="sm">Small text</Text>);
    const element = screen.getByText("Small text");
    expect(element.className).toContain("text-[16px]");
  });

  it("renders large size (40px and bold)", () => {
    render(<Text size="lg">Large title</Text>);
    const element = screen.getByText("Large title");
    expect(element.className).toContain("text-[40px]");
    expect(element.className).toContain("font-bold");
  });

  it("supports polymorphic as prop", () => {
    render(
      <Text as="h1" size="lg">
        Heading 1
      </Text>,
    );
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading.tagName.toLowerCase()).toBe("h1");
    expect(heading.className).toContain("text-[40px]");
    expect(heading.className).toContain("font-bold");
  });

  it("allows custom className overrides via cn", () => {
    render(
      <Text size="md" className="text-primary tracking-wide">
        Custom style
      </Text>,
    );
    const element = screen.getByText("Custom style");
    expect(element.className).toContain("text-[20px]");
    expect(element.className).toContain("text-primary");
    expect(element.className).toContain("tracking-wide");
  });
});
