import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import MeLayout from "@/app/(auth)/me/layout";

const mockSignOut = vi.fn();

vi.mock("@/features/auth/auth-context", () => ({
  useAuth: () => ({
    user: { id: "user-1", email: "user@example.com" },
    isAuthenticated: true,
    signOut: mockSignOut,
  }),
}));

describe("MeLayout & MeNavBar Header", () => {
  it("renders the header with brand link to home and logout action", () => {
    render(
      <MeLayout>
        <div data-testid="account-content">User Profile Details</div>
      </MeLayout>,
    );

    // Verify child content renders
    expect(screen.getByTestId("account-content")).toBeDefined();

    // Verify brand logo link to home (/)
    const brandLink = screen.getByRole("link");
    expect(brandLink.getAttribute("href")).toBe("/");

    // Verify logout button
    const logoutBtn = screen.getByRole("button", { name: /logout/i });
    expect(logoutBtn).toBeDefined();

    // Verify clicking logout triggers signOut
    fireEvent.click(logoutBtn);
    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });
});
