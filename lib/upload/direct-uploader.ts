export interface DirectUploadProgress {
  bytesUploaded: number;
  totalBytes: number;
  percentage: number;
}

export interface DirectUploadParams {
  uploadUrl: string;
  file: File | Blob;
  headers?: Record<string, string>;
  onProgress?: (progress: DirectUploadProgress) => void;
  signal?: AbortSignal;
}

export function sanitizeDestinationUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}${parsed.pathname}`;
  } catch {
    return url.split("?")[0];
  }
}

export function uploadFileDirectly({
  uploadUrl,
  file,
  headers,
  onProgress,
  signal,
}: DirectUploadParams): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      return reject(new Error("Upload aborted by user"));
    }

    const xhr = new XMLHttpRequest();
    const safeUrl = sanitizeDestinationUrl(uploadUrl);

    xhr.open("PUT", uploadUrl, true);

    if (headers) {
      for (const [key, val] of Object.entries(headers)) {
        xhr.setRequestHeader(key, val);
      }
    }

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        const total = event.total || file.size;
        const loaded = event.loaded;
        const percentage = Math.min(100, Math.round((loaded / total) * 100));
        onProgress({
          bytesUploaded: loaded,
          totalBytes: total,
          percentage,
        });
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.({
          bytesUploaded: file.size,
          totalBytes: file.size,
          percentage: 100,
        });
        resolve();
      } else {
        reject(
          new Error(
            `Storage upload failed with status ${xhr.status} at ${safeUrl}`,
          ),
        );
      }
    };

    xhr.onerror = () => {
      reject(new Error(`Network error during direct upload to ${safeUrl}`));
    };

    xhr.onabort = () => {
      reject(new Error("Upload aborted"));
    };

    if (signal) {
      signal.addEventListener("abort", () => xhr.abort(), { once: true });
    }

    xhr.send(file);
  });
}
