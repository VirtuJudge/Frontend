import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Input } from "@/components";

describe("Input Component", () => {
  it("renders glass variant by default with correct dimensions and glass effect", () => {
    render(<Input placeholder="Search judges..." />);
    const input = screen.getByPlaceholderText("Search judges...");
    const wrapper = input.closest('[data-slot="input-wrapper"]')!;

    expect(input).toBeDefined();
    expect(wrapper).toBeDefined();
    expect(wrapper.className).toContain("rounded-2xl");
    expect(wrapper.className).toContain("w-[480px]");
    expect(wrapper.className).toContain("h-[55px]");
    expect(wrapper.className).toContain("bg-glass");
    expect(wrapper.className).toContain("backdrop-blur-[20px]");
    expect(wrapper.className).toContain("border-gradient");
    expect(input.className).toContain("text-fg");
    expect(input.className).toContain("bg-transparent");
  });

  it("removes any outline on input and focus states", () => {
    render(<Input placeholder="No outline test" />);
    const input = screen.getByPlaceholderText("No outline test");
    const wrapper = input.closest('[data-slot="input-wrapper"]')!;

    expect(input.className).toContain("outline-none");
    expect(input.className).toContain("focus:outline-none");
    expect(input.className).toContain("focus-visible:outline-none");
    expect(wrapper.className).toContain("outline-none");
    expect(input.className).not.toContain("ring-2");
  });

  it("applies gradient border styling and glass effect using theme variables", () => {
    render(<Input placeholder="Theme variables" />);
    const input = screen.getByPlaceholderText("Theme variables");
    const wrapper = input.closest('[data-slot="input-wrapper"]') as HTMLElement;

    expect(wrapper.className).toContain("border-gradient");
    expect(wrapper.className).toContain("bg-glass");
    expect(wrapper.className).toContain("rounded-2xl");
  });

  it("renders label above the input and links htmlFor with input id", () => {
    render(
      <Input
        label="Project Name"
        placeholder="Enter project name"
        id="project-input"
      />,
    );
    const label = screen.getByText("Project Name");
    const input = screen.getByPlaceholderText("Enter project name");

    expect(label).toBeDefined();
    expect(label.getAttribute("for")).toBe("project-input");
    expect(input.getAttribute("id")).toBe("project-input");
    expect(label.className).toContain("text-fg");
  });

  it("associates label via auto-generated id when id is omitted", () => {
    render(<Input label="Pitch Title" placeholder="Enter title" />);
    const input = screen.getByLabelText("Pitch Title");

    expect(input).toBeDefined();
    expect(input.getAttribute("id")).toBeTruthy();
  });

  it("renders all variants correctly", () => {
    const { rerender } = render(<Input variant="glass" placeholder="Glass" />);
    let input = screen.getByPlaceholderText("Glass");
    let wrapper = input.closest('[data-slot="input-wrapper"]')!;
    expect(wrapper.className).toContain("bg-glass");
    expect(input.className).toContain("text-fg");

    rerender(<Input variant="primary" placeholder="Primary" />);
    input = screen.getByPlaceholderText("Primary");
    wrapper = input.closest('[data-slot="input-wrapper"]')!;
    expect(wrapper.className).toContain("bg-primary");
    expect(input.className).toContain("text-fg");

    rerender(<Input variant="dark" placeholder="Dark" />);
    input = screen.getByPlaceholderText("Dark");
    wrapper = input.closest('[data-slot="input-wrapper"]')!;
    expect(wrapper.className).toContain("bg-bg-light");
    expect(input.className).toContain("text-fg");

    rerender(<Input variant="danger" placeholder="Danger" />);
    input = screen.getByPlaceholderText("Danger");
    wrapper = input.closest('[data-slot="input-wrapper"]')!;
    expect(wrapper.className).toContain("bg-danger");
    expect(input.className).toContain("text-fg");
  });

  it("renders different sizes correctly", () => {
    const { rerender } = render(<Input size="sm" placeholder="Small" />);
    let input = screen.getByPlaceholderText("Small");
    let wrapper = input.closest('[data-slot="input-wrapper"]')!;
    expect(wrapper.className).toContain("h-[42px]");

    rerender(<Input size="default" placeholder="Default" />);
    input = screen.getByPlaceholderText("Default");
    wrapper = input.closest('[data-slot="input-wrapper"]')!;
    expect(wrapper.className).toContain("h-[55px]");

    rerender(<Input size="lg" placeholder="Large" />);
    input = screen.getByPlaceholderText("Large");
    wrapper = input.closest('[data-slot="input-wrapper"]')!;
    expect(wrapper.className).toContain("h-[64px]");
  });

  it("handles user input and change events", () => {
    const handleChange = vi.fn();
    render(<Input onChange={handleChange} placeholder="Type here" />);

    const input = screen.getByPlaceholderText("Type here");
    fireEvent.change(input, { target: { value: "Pitch presentation" } });

    expect(handleChange).toHaveBeenCalledTimes(1);
    expect((input as HTMLInputElement).value).toBe("Pitch presentation");
  });

  it("respects disabled state", () => {
    render(<Input disabled placeholder="Disabled" />);
    const input = screen.getByPlaceholderText("Disabled");
    const wrapper = input.closest('[data-slot="input-wrapper"]')!;

    expect(input.hasAttribute("disabled")).toBe(true);
    expect(wrapper.className).toContain("pointer-events-none");
    expect(wrapper.className).toContain("opacity-50");
  });

  it("allows custom className overrides for layouts and positioning", () => {
    render(
      <Input
        className="w-[300px] text-primary"
        placeholder="Custom"
      />,
    );
    const input = screen.getByPlaceholderText("Custom");
    const wrapper = input.closest('[data-slot="input-wrapper"]')!;

    expect(wrapper.className).toContain("w-[300px]");
    expect(input.className).toContain("text-primary");
  });

  it("applies full width to both container and wrapper when className contains w-full", () => {
    const { container } = render(
      <Input label="Email Address" className="w-full" placeholder="email" />,
    );
    const labelWrapper = container.firstChild as HTMLElement;
    const inputWrapper = screen.getByPlaceholderText("email").closest('[data-slot="input-wrapper"]')!;

    expect(labelWrapper.className).toContain("w-full");
    expect(inputWrapper.className).toContain("w-full");
  });

  it("supports top prop directly", () => {
    render(<Input top={30} placeholder="Top prop" />);
    const input = screen.getByPlaceholderText("Top prop");
    const wrapper = input.closest('[data-slot="input-wrapper"]') as HTMLElement;

    expect(wrapper.style.top).toBe("30px");
  });

  it("forwards ref to the underlying HTMLInputElement", () => {
    const ref = React.createRef<HTMLInputElement>();
    render(<Input ref={ref} placeholder="Ref test" />);

    expect(ref.current).toBeInstanceOf(HTMLInputElement);
    expect(ref.current?.placeholder).toBe("Ref test");
  });

  describe("Password Reveal Toggle", () => {
    it("renders password toggle button by default when type is password", () => {
      render(<Input type="password" placeholder="Enter password" />);
      const input = screen.getByPlaceholderText("Enter password") as HTMLInputElement;
      const toggleBtn = screen.getByTestId("password-toggle");

      expect(input.type).toBe("password");
      expect(toggleBtn).toBeDefined();
      expect(toggleBtn.getAttribute("aria-label")).toBe("Show password");
      expect(toggleBtn.getAttribute("aria-pressed")).toBe("false");
    });

    it("toggles input type between password and text when clicked", () => {
      render(<Input type="password" placeholder="Enter password" />);
      const input = screen.getByPlaceholderText("Enter password") as HTMLInputElement;
      const toggleBtn = screen.getByTestId("password-toggle");

      expect(input.type).toBe("password");

      // Click to reveal password
      fireEvent.click(toggleBtn);
      expect(input.type).toBe("text");
      expect(toggleBtn.getAttribute("aria-label")).toBe("Hide password");
      expect(toggleBtn.getAttribute("aria-pressed")).toBe("true");

      // Click to hide password again
      fireEvent.click(toggleBtn);
      expect(input.type).toBe("password");
      expect(toggleBtn.getAttribute("aria-label")).toBe("Show password");
      expect(toggleBtn.getAttribute("aria-pressed")).toBe("false");
    });

    it("does not render password toggle button when type is not password", () => {
      render(<Input type="text" placeholder="Text input" />);
      expect(screen.queryByTestId("password-toggle")).toBeNull();
    });

    it("allows disabling password toggle via showPasswordToggle={false}", () => {
      render(
        <Input
          type="password"
          placeholder="No toggle"
          showPasswordToggle={false}
        />,
      );
      expect(screen.queryByTestId("password-toggle")).toBeNull();
    });

    it("prevents default on mousedown to preserve input focus", () => {
      render(<Input type="password" placeholder="Focus test" />);
      const toggleBtn = screen.getByTestId("password-toggle");
      const mousedownEvent = new MouseEvent("mousedown", {
        bubbles: true,
        cancelable: true,
      });

      toggleBtn.dispatchEvent(mousedownEvent);
      expect(mousedownEvent.defaultPrevented).toBe(true);
    });

    it("disables the toggle button when input is disabled", () => {
      render(<Input type="password" placeholder="Disabled pwd" disabled />);
      const toggleBtn = screen.getByTestId("password-toggle");
      expect(toggleBtn.hasAttribute("disabled")).toBe(true);
    });
  });
});

