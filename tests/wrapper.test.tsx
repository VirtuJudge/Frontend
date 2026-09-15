import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Wrapper, getWrapperBorderStyle } from "@/components";
import { Button } from "@/components";

describe("General Wrapper Component", () => {
  it("renders default glass styling with gradient border and no outline", () => {
    const { container } = render(
      <Wrapper data-testid="wrapper-box">Glass Content</Wrapper>,
    );
    const box = screen.getByTestId("wrapper-box");

    expect(box).toBeDefined();
    expect(box.className).toContain("bg-glass");
    expect(box.className).toContain("backdrop-blur-[20px]");
    expect(box.className).toContain("outline-none");
    expect(box.className).toContain("border-gradient");
    expect(container.innerHTML).toContain("Glass Content");
  });

  it("renders all background variants correctly", () => {
    const { rerender } = render(
      <Wrapper variant="glass" data-testid="bg-box">
        Glass
      </Wrapper>,
    );
    let box = screen.getByTestId("bg-box");
    expect(box.className).toContain("bg-glass");
    expect(box.className).toContain("backdrop-blur-[20px]");

    rerender(
      <Wrapper variant="glass-dark" data-testid="bg-box">
        Glass Dark
      </Wrapper>,
    );
    box = screen.getByTestId("bg-box");
    expect(box.className).toContain("bg-glass-dark");
    expect(box.className).toContain("backdrop-blur-[20px]");

    rerender(
      <Wrapper variant="primary" data-testid="bg-box">
        Primary
      </Wrapper>,
    );
    box = screen.getByTestId("bg-box");
    expect(box.className).toContain("bg-primary");
    expect(box.className).toContain("text-bg");

    rerender(
      <Wrapper variant="dark" data-testid="bg-box">
        Dark
      </Wrapper>,
    );
    box = screen.getByTestId("bg-box");
    expect(box.className).toContain("bg-bg-light");
    expect(box.className).toContain("text-glass");

    rerender(
      <Wrapper variant="danger" data-testid="bg-box">
        Danger
      </Wrapper>,
    );
    box = screen.getByTestId("bg-box");
    expect(box.className).toContain("bg-danger");
    expect(box.className).toContain("text-white");
  });

  it("renders all border gradient variants correctly", () => {
    const { rerender } = render(
      <Wrapper borderGradient="default" data-testid="grad-box">
        Default Border
      </Wrapper>,
    );
    let box = screen.getByTestId("grad-box");
    expect(box.className).toContain("border-gradient");

    rerender(
      <Wrapper borderGradient="nav" data-testid="grad-box">
        Nav Border
      </Wrapper>,
    );
    box = screen.getByTestId("grad-box");
    expect(box.className).toContain("border-gradient-nav");

    rerender(
      <Wrapper borderGradient="none" data-testid="grad-box">
        No Border Gradient
      </Wrapper>,
    );
    box = screen.getByTestId("grad-box");
    expect(box.className).toContain("border-transparent");
    expect(box.className).not.toContain("border-gradient");
  });

  it("can wrap a Button component without duplicating logic", () => {
    render(
      <Wrapper className="rounded-[50px]" data-testid="button-wrapper">
        <Button variant="primary">Nested Button</Button>
      </Wrapper>,
    );

    const wrapper = screen.getByTestId("button-wrapper");
    const button = screen.getByRole("button", { name: /nested button/i });

    expect(wrapper.className).toContain("rounded-[50px]");
    expect(wrapper.className).toContain("bg-glass");
    expect(button).toBeDefined();
  });

  it("can wrap an Input component or direct HTML input", () => {
    render(
      <Wrapper
        data-testid="input-wrapper"
        className="w-120 h-13.75 px-6"
      >
        <input placeholder="Type something..." className="bg-transparent" />
      </Wrapper>,
    );

    const wrapper = screen.getByTestId("input-wrapper");
    const input = screen.getByPlaceholderText("Type something...");

    expect(wrapper.className).toContain("bg-glass backdrop-blur-[20px] text-fg border-gradient rounded-[2.5rem] py-[0.9375rem] outline-none focus:outline-none focus-visible:outline-none w-120 h-13.75 px-6");
    expect(wrapper.className).toContain("w-120");
    expect(wrapper.className).toContain("h-13.75");
    expect(input).toBeDefined();
  });

  it("automatically focuses inner input when wrapper container is clicked", () => {
    render(
      <Wrapper data-testid="click-wrapper" className="p-4">
        <input placeholder="Click outside to focus me" />
      </Wrapper>,
    );

    const wrapper = screen.getByTestId("click-wrapper");
    const input = screen.getByPlaceholderText("Click outside to focus me");

    const focusSpy = vi.spyOn(input, "focus");
    fireEvent.click(wrapper);

    expect(focusSpy).toHaveBeenCalledTimes(1);
  });

  it("can be used polymorphically as a button or input directly", () => {
    const handleClick = vi.fn();
    const { rerender } = render(
      <Wrapper
        as="button"
        type="button"
        onClick={handleClick}
        data-testid="direct-button"
      >
        Direct Glass Button
      </Wrapper>,
    );

    const btn = screen.getByTestId("direct-button");
    expect(btn.tagName.toLowerCase()).toBe("button");
    fireEvent.click(btn);
    expect(handleClick).toHaveBeenCalledTimes(1);

    rerender(
      <Wrapper
        as="input"
        placeholder="Direct Glass Input"
        data-testid="direct-input"
      />,
    );
    const inp = screen.getByTestId("direct-input");
    expect(inp.tagName.toLowerCase()).toBe("input");
    expect(inp.getAttribute("placeholder")).toBe("Direct Glass Input");
  });

  it("supports default rounded-[2.5rem] and custom rounding overrides via className", () => {
    const { rerender } = render(
      <Wrapper data-testid="box">
        Default
      </Wrapper>,
    );
    let box = screen.getByTestId("box");
    expect(box.className).toContain("bg-glass");
    expect(box.className).toContain("rounded-[2.5rem]");

    rerender(
      <Wrapper className="rounded-[50px]" data-testid="box">
        50
      </Wrapper>,
    );
    box = screen.getByTestId("box");
    expect(box.className).toContain("rounded-[50px]");
    expect(box.className).not.toContain("rounded-[2.5rem]");

    rerender(
      <Wrapper className="rounded-full" data-testid="box">
        Full
      </Wrapper>,
    );
    box = screen.getByTestId("box");
    expect(box.className).toContain("rounded-full");
    expect(box.className).not.toContain("rounded-[2.5rem]");
  });

  it("forwards ref properly to underlying element", () => {
    const ref = React.createRef<HTMLDivElement>();
    render(<Wrapper ref={ref}>Ref Content</Wrapper>);

    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it("getWrapperBorderStyle returns expected styling object with variants", () => {
    const styleDefault = getWrapperBorderStyle({
      variant: "glass",
      borderGradient: "default",
    });
    expect(styleDefault.backgroundColor).toBe("var(--color-glass)");
    expect(styleDefault.backdropFilter).toBe("blur(20px)");
    expect(
      (styleDefault as Record<string, unknown>)["--border-gradient-source"],
    ).toContain("var(--background-image-gradient-border)");

    const styleGlassDark = getWrapperBorderStyle({
      variant: "glass-dark",
      borderGradient: "default",
    });
    expect(styleGlassDark.backgroundColor).toBe("var(--color-glass-dark)");
    expect(styleGlassDark.backdropFilter).toBe("blur(20px)");
    expect(
      (styleGlassDark as Record<string, unknown>)["--border-gradient-source"],
    ).toContain("var(--background-image-gradient-border)");

    const styleNav = getWrapperBorderStyle({
      variant: "dark",
      borderGradient: "nav",
    });
    expect(styleNav.backgroundColor).toBe("var(--color-bg-light)");
    expect(
      (styleNav as Record<string, unknown>)["--border-gradient-source"],
    ).toContain("var(--background-image-gradient-nav-border)");

    const styleNone = getWrapperBorderStyle({
      variant: "primary",
      borderGradient: "none",
    });
    expect(styleNone.backgroundColor).toBe("var(--color-primary)");
    expect(styleNone.border).toBe("1px solid transparent");
  });
});
