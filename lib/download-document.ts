import type { DownloadIntent } from "@/lib/api/types";

export async function downloadDocument(intent: DownloadIntent): Promise<void> {
  const response = await fetch(intent.download_url);
  if (!response.ok) {
    throw new Error(
      response.status === 404
        ? "This document is missing from storage. Please upload the original file again."
        : "The document could not be downloaded. Please try again.",
    );
  }
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  link.href = url;
  link.download = intent.file_name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
