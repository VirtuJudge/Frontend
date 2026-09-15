import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import FullNav from "@/components/Nav-Bar/full-nav";

describe("FullNav Component", () => {
  it("renders main navigation links and keeps company dropdown closed initially", () => {
    render(<FullNav />);

    expect(screen.getByRole("link", { name: /home/i })).toBeDefined();
    expect(screen.getByRole("link", { name: /pricing/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /company/i })).toBeDefined();

    expect(screen.queryByText("Data privacy")).toBeNull();
  });

  it("opens company dropdown menu on click", () => {
    render(<FullNav />);
    const companyBtn = screen.getByRole("button", { name: /company/i });

    fireEvent.click(companyBtn);

    expect(screen.getByText("Data privacy")).toBeDefined();
    expect(screen.getByText("Terms and conditions")).toBeDefined();
    expect(screen.getByText("Contact us")).toBeDefined();
  });

  it("closes company dropdown when clicking outside", async () => {
    render(
      <div>
        <div data-testid="outside-area">Outside</div>
        <FullNav />
      </div>,
    );

    const companyBtn = screen.getByRole("button", { name: /company/i });
    fireEvent.click(companyBtn);
    expect(screen.getByText("Data privacy")).toBeDefined();

    fireEvent.mouseDown(screen.getByTestId("outside-area"));

    await waitFor(() => {
      expect(screen.queryByText("Data privacy")).toBeNull();
    });
  });

  it("closes company dropdown when an item is clicked", async () => {
    render(<FullNav />);
    const companyBtn = screen.getByRole("button", { name: /company/i });
    fireEvent.click(companyBtn);

    const privacyLink = screen.getByText("Data privacy");
    fireEvent.click(privacyLink);

    await waitFor(() => {
      expect(screen.queryByText("Data privacy")).toBeNull();
    });
  });
});
