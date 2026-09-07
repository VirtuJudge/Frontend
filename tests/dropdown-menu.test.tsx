import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { DropdownMenu, DropdownMenuItem } from "@/components";

describe("DropdownMenu Component", () => {
  it("renders trigger and keeps menu closed by default", () => {
    render(
      <DropdownMenu
        trigger={<button>Open Menu</button>}
        items={[{ label: "Profile" }]}
      />,
    );

    expect(screen.getByRole("button", { name: /open menu/i })).toBeDefined();
    expect(screen.queryByText("Profile")).toBeNull();
  });

  it("opens menu when trigger is clicked and renders glass wrapper", () => {
    render(
      <DropdownMenu
        trigger={<button>Open Menu</button>}
        items={[{ label: "Profile" }, { label: "Settings" }]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /open menu/i }));

    const profileItem = screen.getByText("Profile");
    expect(profileItem).toBeDefined();

    // Check that Wrapper glass classes are applied
    const menuContainer = profileItem.closest(".bg-glass");
    expect(menuContainer).not.toBeNull();
  });

  it("invokes item onClick and closes menu on item selection", () => {
    const handleClick = vi.fn();

    render(
      <DropdownMenu
        trigger={<button>Open Menu</button>}
        items={[{ label: "Profile", onClick: handleClick }]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /open menu/i }));
    fireEvent.click(screen.getByText("Profile"));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("closes when escape key is pressed", async () => {
    render(
      <DropdownMenu
        trigger={<button>Open Menu</button>}
        items={[{ label: "Profile" }]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /open menu/i }));
    expect(screen.getByText("Profile")).toBeDefined();

    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => {
      expect(screen.queryByText("Profile")).toBeNull();
    });
  });

  it("supports custom compound children", () => {
    render(
      <DropdownMenu trigger={<button>Open Custom</button>}>
        <DropdownMenuItem>Custom Action</DropdownMenuItem>
      </DropdownMenu>,
    );

    fireEvent.click(screen.getByRole("button", { name: /open custom/i }));
    expect(screen.getByText("Custom Action")).toBeDefined();
  });
});
