import { afterEach, expect, it, vi } from "vitest";
import { downloadDocument } from "@/lib/download-document";

const intent = { download_url: "https://storage.example/document", file_name: "document.pdf", media_type: "application/pdf", size_bytes: 10, expires_at: "2026-10-23T20:00:00Z" };

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); });

it("reports a missing storage object instead of silently opening a broken link", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 404 })));
  await expect(downloadDocument(intent)).rejects.toThrow("missing from storage");
});

it("downloads the verified response without opening a popup and releases its URL", async () => {
  vi.useFakeTimers();
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("pdf")));
  URL.createObjectURL = vi.fn().mockReturnValue("blob:document");
  URL.revokeObjectURL = vi.fn();
  const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
    expect(this.href).toBe("blob:document");
    expect(this.download).toBe("document.pdf");
    expect(this.target).toBe("");
  });
  await downloadDocument(intent);
  expect(click).toHaveBeenCalledOnce();
  vi.runAllTimers();
  expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:document");
});
