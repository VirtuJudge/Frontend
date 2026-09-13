function bufferToSha256Hex(buffer: ArrayBuffer): string {
  const byteArray = new Uint8Array(buffer);
  let hex = "";
  for (let i = 0; i < byteArray.length; i++) {
    hex += byteArray[i].toString(16).padStart(2, "0");
  }
  return `sha256:${hex}`;
}

const workerCode = `
self.onmessage = async function(e) {
  try {
    const file = e.data.file;
    const arrayBuffer = await file.arrayBuffer();
    self.postMessage({ type: "progress", percent: 75 });
    const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
    const byteArray = new Uint8Array(hashBuffer);
    let hex = "";
    for (let i = 0; i < byteArray.length; i++) {
      hex += byteArray[i].toString(16).padStart(2, "0");
    }
    self.postMessage({ type: "progress", percent: 100 });
    self.postMessage({ type: "done", checksum: "sha256:" + hex });
  } catch (err) {
    self.postMessage({ type: "error", error: err instanceof Error ? err.message : String(err) });
  }
};
`;

async function computeChecksumFallback(
  file: File,
  onProgress?: (percent: number) => void,
): Promise<string> {
  onProgress?.(25);
  const buffer = await file.arrayBuffer();
  onProgress?.(75);
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  onProgress?.(100);
  return bufferToSha256Hex(hashBuffer);
}

export function computeFileChecksum(
  file: File,
  onProgress?: (percent: number) => void,
): Promise<string> {
  if (typeof window === "undefined" || typeof Worker === "undefined") {
    return computeChecksumFallback(file, onProgress);
  }

  return new Promise((resolve, reject) => {
    let worker: Worker | null = null;
    let blobUrl: string | null = null;

    try {
      const blob = new Blob([workerCode], { type: "application/javascript" });
      blobUrl = URL.createObjectURL(blob);
      worker = new Worker(blobUrl);

      worker.onmessage = (e) => {
        const { type, percent, checksum } = e.data;
        if (type === "progress") {
          onProgress?.(percent);
        } else if (type === "done") {
          cleanup();
          resolve(checksum);
        } else if (type === "error") {
          cleanup();
          computeChecksumFallback(file, onProgress).then(resolve).catch(reject);
        }
      };

      worker.onerror = () => {
        cleanup();
        computeChecksumFallback(file, onProgress).then(resolve).catch(reject);
      };

      worker.postMessage({ file });
    } catch {
      cleanup();
      computeChecksumFallback(file, onProgress).then(resolve).catch(reject);
    }

    function cleanup() {
      if (worker) {
        worker.terminate();
        worker = null;
      }
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
        blobUrl = null;
      }
    }
  });
}
