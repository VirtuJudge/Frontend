import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  validateFile,
  resolveMediaType,
  formatBytes,
  formatDuration,
  computeFileChecksum,
  uploadFileDirectly,
  sanitizeDestinationUrl,
  generateIdempotencyKey,
} from "@/lib/upload";

describe("Upload Infrastructure (Phase 1)", () => {
  describe("File Validation & Rules", () => {
    it("validates presentation video within 500 MB and 10 minutes", () => {
      const validVideo = new File(["dummy video"], "pitch.mp4", {
        type: "video/mp4",
      });
      const result = validateFile(validVideo, "presentation_video", 8 * 60 * 1000);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("rejects oversized presentation video > 500 MB", () => {
      const bigVideo = new File(["data"], "huge.mp4", { type: "video/mp4" });
      Object.defineProperty(bigVideo, "size", {
        value: 501 * 1024 * 1024,
      });

      const result = validateFile(bigVideo, "presentation_video");
      expect(result.valid).toBe(false);
      expect(result.code).toBe("FILE_TOO_LARGE");
      expect(result.error).toContain("500 MB");
    });

    it("rejects presentation video exceeding 10 minutes duration", () => {
      const longVideo = new File(["data"], "long.webm", { type: "video/webm" });
      const result = validateFile(
        longVideo,
        "presentation_video",
        11 * 60 * 1000,
      );
      expect(result.valid).toBe(false);
      expect(result.code).toBe("DURATION_EXCEEDED");
      expect(result.error).toContain("10m 0s");
    });

    it("rejects unsupported format for presentation video", () => {
      const textFile = new File(["data"], "pitch.txt", { type: "text/plain" });
      const result = validateFile(textFile, "presentation_video");
      expect(result.valid).toBe(false);
      expect(result.code).toBe("UNSUPPORTED_TYPE");
      expect(result.error).toContain(".mp4, .webm");
    });

    it("validates supporting document within 25 MB", () => {
      const pdf = new File(["pdf data"], "deck.pdf", {
        type: "application/pdf",
      });
      const result = validateFile(pdf, "supporting_document");
      expect(result.valid).toBe(true);
    });

    it("rejects supporting document > 25 MB", () => {
      const bigDoc = new File(["data"], "slides.pptx", {
        type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      });
      Object.defineProperty(bigDoc, "size", {
        value: 26 * 1024 * 1024,
      });

      const result = validateFile(bigDoc, "supporting_document");
      expect(result.valid).toBe(false);
      expect(result.code).toBe("FILE_TOO_LARGE");
      expect(result.error).toContain("25 MB");
    });

    it("rejects empty 0-byte file", () => {
      const emptyFile = new File([], "empty.pdf", { type: "application/pdf" });
      const result = validateFile(emptyFile, "supporting_document");
      expect(result.valid).toBe(false);
      expect(result.code).toBe("EMPTY_FILE");
    });

    it("resolves media types accurately", () => {
      expect(
        resolveMediaType(
          new File([""], "test.mp4", { type: "" }),
          "presentation_video",
        ),
      ).toBe("video/mp4");
      expect(
        resolveMediaType(
          new File([""], "deck.pptx", { type: "" }),
          "supporting_document",
        ),
      ).toBe(
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      );
      expect(
        resolveMediaType(
          new File([""], "sample.wav", { type: "" }),
          "answer_audio",
        ),
      ).toBe("audio/wav");
    });

    it("formats bytes and durations readably", () => {
      expect(formatBytes(500)).toBe("500 B");
      expect(formatBytes(1536)).toBe("1.5 KB");
      expect(formatBytes(26214400)).toBe("25 MB");
      expect(formatDuration(90000)).toBe("1m 30s");
    });
  });

  describe("Non-blocking Checksum Calculation", () => {
    it("computes correct SHA-256 hash with sha256: prefix", async () => {
      const sampleContent = "VirtuJudge Secure Media Checksum Test";
      const file = new File([sampleContent], "sample.mp4", {
        type: "video/mp4",
      });

      const progressSpy = vi.fn();
      const checksum = await computeFileChecksum(file, progressSpy);

      expect(checksum).toMatch(/^sha256:[a-f0-9]{64}$/);
      expect(progressSpy).toHaveBeenCalled();
    });

    it("computes deterministic hash for identical content", async () => {
      const file1 = new File(["identical bytes"], "file1.pdf");
      const file2 = new File(["identical bytes"], "file2.pdf");

      const hash1 = await computeFileChecksum(file1);
      const hash2 = await computeFileChecksum(file2);

      expect(hash1).toBe(hash2);
    });
  });

  describe("Direct Storage Uploader & URL Sanitization", () => {
    let originalXHR: typeof globalThis.XMLHttpRequest;

    beforeEach(() => {
      originalXHR = globalThis.XMLHttpRequest;
    });

    afterEach(() => {
      globalThis.XMLHttpRequest = originalXHR;
    });

    it("sanitizes destination URLs by stripping query parameters and tokens", () => {
      const signedUrl =
        "https://storage.googleapis.com/virtujudge-bucket/assets/vid.mp4?X-Goog-Signature=secret123&X-Goog-Algorithm=GOOG4";
      const sanitized = sanitizeDestinationUrl(signedUrl);

      expect(sanitized).toBe(
        "https://storage.googleapis.com/virtujudge-bucket/assets/vid.mp4",
      );
      expect(sanitized).not.toContain("secret123");
      expect(sanitized).not.toContain("X-Goog-Signature");
    });

    it("uploads file directly with progress tracking", async () => {
      const file = new File(["video stream content"], "pitch.mp4", {
        type: "video/mp4",
      });

      interface MockXHRInstance {
        open: ReturnType<typeof vi.fn>;
        setRequestHeader: ReturnType<typeof vi.fn>;
        send: ReturnType<typeof vi.fn>;
        upload: {
          onprogress: ((ev: { lengthComputable: boolean; loaded: number; total: number }) => void) | null;
        };
        status: number;
        onload: (() => void) | null;
        onerror: (() => void) | null;
        onabort: (() => void) | null;
      }

      const mockXHR: MockXHRInstance = {
        open: vi.fn(),
        setRequestHeader: vi.fn(),
        send: vi.fn(),
        upload: {
          onprogress: null,
        },
        status: 200,
        onload: null,
        onerror: null,
        onabort: null,
      };

      function MockXHRConstructor() {
        return mockXHR;
      }

      globalThis.XMLHttpRequest = MockXHRConstructor as unknown as typeof XMLHttpRequest;

      const progressCallback = vi.fn();

      const uploadPromise = uploadFileDirectly({
        uploadUrl: "https://storage.virtujudge.local/upload?token=sensitive",
        file,
        headers: { "Content-Type": "video/mp4" },
        onProgress: progressCallback,
      });

      expect(mockXHR.open).toHaveBeenCalledWith(
        "PUT",
        "https://storage.virtujudge.local/upload?token=sensitive",
        true,
      );
      expect(mockXHR.setRequestHeader).toHaveBeenCalledWith(
        "Content-Type",
        "video/mp4",
      );

      if (mockXHR.upload.onprogress) {
        mockXHR.upload.onprogress({
          lengthComputable: true,
          loaded: 10,
          total: 20,
        });
        expect(progressCallback).toHaveBeenCalledWith({
          bytesUploaded: 10,
          totalBytes: 20,
          percentage: 50,
        });
      }

      if (mockXHR.onload) {
        mockXHR.onload();
      }

      await uploadPromise;
      expect(progressCallback).toHaveBeenCalledWith({
        bytesUploaded: file.size,
        totalBytes: file.size,
        percentage: 100,
      });
    });

    it("redacts credentials from error messages when upload fails", async () => {
      const file = new File(["content"], "doc.pdf");

      interface MockFailXHRInstance {
        open: ReturnType<typeof vi.fn>;
        setRequestHeader: ReturnType<typeof vi.fn>;
        send: ReturnType<typeof vi.fn>;
        upload: Record<string, unknown>;
        status: number;
        onload: (() => void) | null;
        onerror: (() => void) | null;
      }

      const mockFailXHR: MockFailXHRInstance = {
        open: vi.fn(),
        setRequestHeader: vi.fn(),
        send: vi.fn(),
        upload: {},
        status: 403,
        onload: null,
        onerror: null,
      };

      function MockFailXHRConstructor() {
        return mockFailXHR;
      }

      globalThis.XMLHttpRequest = MockFailXHRConstructor as unknown as typeof XMLHttpRequest;

      const sensitiveUrl =
        "https://s3.amazonaws.com/bucket/key.pdf?AWSAccessKeyId=AKIAIOSFODNN7EXAMPLE&Signature=vjbyPxybdZaNmGa%2ByT272YEAiv4%3D";

      const uploadPromise = uploadFileDirectly({
        uploadUrl: sensitiveUrl,
        file,
      });

      if (mockFailXHR.onload) {
        mockFailXHR.onload();
      }

      await expect(uploadPromise).rejects.toThrowError(
        /https:\/\/s3\.amazonaws\.com\/bucket\/key\.pdf/,
      );
      await expect(uploadPromise).rejects.toThrowError(
        expect.not.stringContaining("AWSAccessKeyId"),
      );
      await expect(uploadPromise).rejects.toThrowError(
        expect.not.stringContaining("Signature="),
      );
    });
  });

  describe("Idempotency Generator", () => {
    it("generates unique keys with custom prefixes", () => {
      const key1 = generateIdempotencyKey("intent");
      const key2 = generateIdempotencyKey("intent");

      expect(key1).toMatch(/^intent_/);
      expect(key2).toMatch(/^intent_/);
      expect(key1).not.toBe(key2);
    });
  });
});
