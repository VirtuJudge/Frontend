import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ProjectAssetsCountBadge } from "@/components/count-badge";
import { apiClient } from "@/lib/api/client";
import type { Asset } from "@/lib/api/types";

function asset(id: string, kind: Asset["kind"], state: Asset["state"] = "verified"): Asset {
  return {
    id,
    project_id: "project-1",
    kind,
    state,
    file_name: `${id}.pdf`,
    media_type: "application/pdf",
    size_bytes: 100,
    created_at: "2026-10-15T00:00:00Z",
  };
}

function renderBadge(count?: number) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <ProjectAssetsCountBadge projectId="project-1" count={count} />
    </QueryClientProvider>,
  );
}

afterEach(() => vi.restoreAllMocks());

describe("Project asset count", () => {
  it("counts the supporting documents shown in the project, excluding session files", async () => {
    vi.spyOn(apiClient, "getAssets").mockResolvedValue({
      items: [
        asset("document", "supporting_document"),
        asset("video", "presentation_video"),
        asset("answer", "answer_audio"),
        asset("report", "report_pdf"),
        asset("pending", "supporting_document", "pending_upload"),
        asset("deleted", "supporting_document", "deleted"),
      ],
      has_more: false,
    });
    renderBadge();
    expect(await screen.findByText("1 Assets")).toBeDefined();
  });

  it("follows every cursor even when has_more is absent", async () => {
    const getAssets = vi.spyOn(apiClient, "getAssets")
      .mockResolvedValueOnce({
        items: Array.from({ length: 20 }, (_, i) => asset(`document-${i}`, "supporting_document")),
        next_cursor: "page-2",
      } as Awaited<ReturnType<typeof apiClient.getAssets>>)
      .mockResolvedValueOnce({
        items: [asset("document-21", "supporting_document")],
        next_cursor: "page-3",
        has_more: true,
      })
      .mockResolvedValueOnce({
        items: [asset("document-22", "supporting_document")],
        has_more: false,
      });
    renderBadge();
    expect(await screen.findByText("22 Assets")).toBeDefined();
    expect(getAssets).toHaveBeenCalledTimes(3);
    expect(getAssets).toHaveBeenNthCalledWith(2, "project-1", expect.objectContaining({
      kind: "supporting_document", state: "verified", cursor: "page-2",
    }));
  });

  it("keeps an explicit count without fetching", () => {
    const getAssets = vi.spyOn(apiClient, "getAssets");
    renderBadge(0);
    expect(screen.getByText("0 Assets")).toBeDefined();
    expect(getAssets).not.toHaveBeenCalled();
  });
});
