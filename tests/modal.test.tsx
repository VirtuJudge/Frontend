import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Modal } from "@/components/modal";
import { Input } from "@/components/input";

describe("Modal Component", () => {
  it("does not render when isOpen is false", () => {
    render(
      <Modal isOpen={false} onClose={vi.fn()} title="Test Modal">
        <p>Modal Body</p>
      </Modal>,
    );

    expect(screen.queryByText("Test Modal")).toBeNull();
    expect(screen.queryByText("Modal Body")).toBeNull();
  });

  it("renders title, description, children and default buttons when isOpen is true", () => {
    const onClose = vi.fn();
    const onSubmit = vi.fn((e) => e.preventDefault());

    render(
      <Modal
        isOpen={true}
        onClose={onClose}
        title="Test Modal"
        description="Modal Description"
        onSubmit={onSubmit}
        submitText="Submit Form"
        cancelText="Dismiss"
      >
        <input placeholder="Enter text" />
      </Modal>,
    );

    expect(screen.getByText("Test Modal")).toBeDefined();
    expect(screen.getByText("Modal Description")).toBeDefined();
    expect(screen.getByPlaceholderText("Enter text")).toBeDefined();
    expect(screen.getByRole("button", { name: "Submit Form" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Dismiss" })).toBeDefined();

    // Close button
    const closeBtn = screen.getByRole("button", { name: /close dialog/i });
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);

    // Form submit
    const submitBtn = screen.getByRole("button", { name: "Submit Form" });
    fireEvent.click(submitBtn);
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("displays error message if error prop is provided", () => {
    render(
      <Modal
        isOpen={true}
        onClose={vi.fn()}
        title="Test Error Modal"
        error="Something went wrong"
      >
        <p>Content</p>
      </Modal>,
    );

    expect(screen.getByRole("alert")).toBeDefined();
    expect(screen.getByText("Something went wrong")).toBeDefined();
  });

  it("displays loading text and disables buttons when loading is true", () => {
    render(
      <Modal
        isOpen={true}
        onClose={vi.fn()}
        title="Test Loading Modal"
        loading={true}
        onSubmit={vi.fn()}
        submitText="Save"
        loadingText="Saving..."
      >
        <p>Content</p>
      </Modal>,
    );

    const submitBtn = screen.getByRole("button", { name: "Saving..." });
    expect(submitBtn).toBeDefined();
    expect(submitBtn.hasAttribute("disabled")).toBe(true);

    const cancelBtn = screen.getByRole("button", { name: "Cancel" });
    expect(cancelBtn.hasAttribute("disabled")).toBe(true);
  });

  it("allows clicking and typing into secondary inputs without stealing focus to the first input", () => {
    render(
      <Modal isOpen={true} onClose={vi.fn()} title="Multi Input Modal">
        <Input label="Project Name" placeholder="Name" />
        <Input label="Description" placeholder="Description" />
      </Modal>,
    );

    const nameInput = screen.getByPlaceholderText("Name") as HTMLInputElement;
    const descInput = screen.getByPlaceholderText("Description") as HTMLInputElement;

    const nameFocusSpy = vi.spyOn(nameInput, "focus");

    fireEvent.click(descInput);
    expect(nameFocusSpy).not.toHaveBeenCalled();

    fireEvent.change(descInput, { target: { value: "New project description" } });
    expect(descInput.value).toBe("New project description");
    expect(nameFocusSpy).not.toHaveBeenCalled();
  });
});

