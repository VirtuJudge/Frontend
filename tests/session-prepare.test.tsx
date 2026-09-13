import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as nextNavigation from "next/navigation";
import { apiClient } from "@/lib/api/client";
import PrepareSessionPage from "@/app/(auth)/projects/[projectId]/session/prepare/page";

const mockParams = Promise.resolve({ projectId: "proj-123" });

async function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  let result: ReturnType<typeof render>;
  await React.act(async () => {
    result = render(
      <QueryClientProvider client={queryClient}>
        <React.Suspense fallback={<div>Loading...</div>}>
          <PrepareSessionPage params={mockParams} />
        </React.Suspense>
      </QueryClientProvider>,
    );
  });
  return result!;
}

describe("Prepare Session Page (/projects/[projectId]/session/prepare)", () => {
  const pushMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    apiClient.setUseMock(true);
    vi.spyOn(nextNavigation, "useRouter").mockReturnValue({
      push: pushMock,
      replace: vi.fn(),
      prefetch: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
    } as unknown as ReturnType<typeof nextNavigation.useRouter>);
  });

  it("renders page title, toggles, duration pickers, and empty files dropdown", async () => {
    await renderPage();

    expect(
      await screen.findByText(/configure session settings/i),
    ).toBeDefined();
    expect(screen.getByText("Discussion panel")).toBeDefined();
    expect(screen.getByText("Show timer")).toBeDefined();
    expect(screen.getByText("Allow pauses")).toBeDefined();
    expect(screen.getByText("Drop here")).toBeDefined();
    expect(screen.getByText(/Slides & Documents/i)).toBeDefined();
    expect(screen.getByText("0/5")).toBeDefined();
    expect(screen.getByRole("button", { name: /^start$/i })).toBeDefined();
  });

  it("toggles the discussion panel, timer, and pauses switches when clicked", async () => {
    await renderPage();

    const discussionSwitch = await screen.findByText("Discussion panel");
    fireEvent.click(discussionSwitch);

    const timerSwitch = screen.getByText("Show timer");
    fireEvent.click(timerSwitch);

    const pausesSwitch = screen.getByText("Allow pauses");
    fireEvent.click(pausesSwitch);
  });

  it("increments and decrements duration timers", async () => {
    await renderPage();

    const incPresMin = await screen.findByRole("button", {
      name: "Increment Presentation time minutes",
    });
    fireEvent.click(incPresMin);

    const decPresMin = screen.getByRole("button", {
      name: "Decrement Presentation time minutes",
    });
    fireEvent.click(decPresMin);

    const incPresSec = screen.getByRole("button", {
      name: "Increment Presentation time seconds",
    });
    fireEvent.click(incPresSec);

    const decPresSec = screen.getByRole("button", {
      name: "Decrement Presentation time seconds",
    });
    fireEvent.click(decPresSec);
  });

  it("enforces 25MB limit per file and shows error", async () => {
    await renderPage();

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).not.toBeNull();

    const oversizedFile = new File(["dummy"], "big-deck.pdf", {
      type: "application/pdf",
    });
    Object.defineProperty(oversizedFile, "size", { value: 26 * 1024 * 1024 });

    fireEvent.change(fileInput, { target: { files: [oversizedFile] } });

    expect(await screen.findByText(/exceeds the 25 MB limit/i)).toBeDefined();
  });

  it("handles multiple files up to 5, opens dropdown, and allows file removal", async () => {
    await renderPage();

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).not.toBeNull();

    const file1 = new File(["content1"], "slides-1.pdf", { type: "application/pdf" });
    const file2 = new File(["content2"], "slides-2.pptx", {
      type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    });

    fireEvent.change(fileInput, { target: { files: [file1, file2] } });

    expect(
      (await screen.findAllByText(/slides-1\.pdf/i)).length,
    ).toBeGreaterThan(0);
    expect(screen.getByText("2/5")).toBeDefined();

    const dropdownButton = screen.getByRole("button", {
      name: /(slides & documents|uploaded files) dropdown/i,
    });
    fireEvent.click(dropdownButton);

    expect(await screen.findByText("Files (2/5)")).toBeDefined();
    expect((await screen.findAllByText(/slides-2\.pptx/i)).length).toBeGreaterThan(0);

    const removeBtn = screen.getByRole("button", { name: "Remove slides-1.pdf" });
    fireEvent.click(removeBtn);

    expect(screen.getByText("1/5")).toBeDefined();
  });

  it("enforces max 5 files limit and disables uploading when limit is reached", async () => {
    await renderPage();

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

    const files = Array.from({ length: 6 }, (_, i) =>
      new File([`data${i}`], `file-${i}.pdf`, { type: "application/pdf" })
    );

    fireEvent.change(fileInput, { target: { files } });

    expect(await screen.findByText(/maximum 5 files allowed/i)).toBeDefined();
    expect(screen.getByText("5/5")).toBeDefined();
    expect(await screen.findByText("Limit reached (5/5 files)")).toBeDefined();
    expect(fileInput.disabled).toBe(true);

    const clickSpy = vi.spyOn(fileInput, "click");
    const dropzone = fileInput.parentElement?.querySelector("div.border-dashed");
    if (dropzone) {
      fireEvent.click(dropzone);
      expect(clickSpy).not.toHaveBeenCalled();
    }
  });

  it("allows dragging and dropping files onto the dropzone", async () => {
    await renderPage();

    const dropText = await screen.findByText("Drop here");
    const dropzone = dropText.closest("div");
    expect(dropzone).not.toBeNull();

    const file = new File(["presentation"], "dragged-deck.pptx", {
      type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    });

    fireEvent.dragOver(dropzone!);
    fireEvent.drop(dropzone!, {
      dataTransfer: {
        files: [file],
      },
    });

    expect(
      (await screen.findAllByText(/dragged-deck\.pptx/i)).length,
    ).toBeGreaterThan(0);
  });

  it("navigates to session record on clicking Start", async () => {
    await renderPage();

    const startButton = await screen.findByRole("button", { name: /^start$/i });
    fireEvent.click(startButton);

    await waitFor(
      () => {
        expect(pushMock).toHaveBeenCalledWith(
          expect.stringContaining("/projects/proj-123/session/record"),
        );
      },
      { timeout: 1000 },
    );
  });

  it("renders available project documents and allows choosing documents for the session", async () => {
    await renderPage();

    const dropdownButton = await screen.findByRole("button", {
      name: /(slides & documents|uploaded files) dropdown/i,
    });
    fireEvent.click(dropdownButton);

    expect(await screen.findByText("investor_deck.pdf")).toBeDefined();

    const selectBtn = screen.getByRole("button", {
      name: /select investor_deck\.pdf/i,
    });
    fireEvent.click(selectBtn);

    expect(screen.getByText("1/5")).toBeDefined();

    const deselectBtn = await screen.findByRole("button", {
      name: /deselect investor_deck\.pdf/i,
    });
    fireEvent.click(deselectBtn);

    expect(screen.getByText("0/5")).toBeDefined();
  });

  it("persists chosen project documents and versions in session storage on Start", async () => {
    await renderPage();

    const dropdownButton = await screen.findByRole("button", {
      name: /(slides & documents|uploaded files) dropdown/i,
    });
    fireEvent.click(dropdownButton);

    const selectBtn = await screen.findByRole("button", {
      name: /select investor_deck\.pdf/i,
    });
    fireEvent.click(selectBtn);

    expect(screen.getByText("1/5")).toBeDefined();

    const startButton = screen.getByRole("button", { name: /^start$/i });
    fireEvent.click(startButton);

    await waitFor(
      () => {
        expect(pushMock).toHaveBeenCalledWith(
          expect.stringContaining("documentAssetIds="),
        );
      },
      { timeout: 1000 },
    );

    const stored = sessionStorage.getItem("session_config_proj-123");
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored!);
    expect(parsed.documentAssetIds).toContain("01J6GZ6F000000000000000006");
  });
});
