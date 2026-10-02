import { ProblemDetails } from "../types";
import { getClientAuthToken } from "@/lib/auth/cookies";
import { AUTH_COOKIE_NAME } from "@/lib/auth/middleware";

export class ApiClientError extends Error {
  constructor(
    public readonly status: number,
    public readonly problem?: ProblemDetails,
  ) {
    super(
      problem?.detail ||
        problem?.title ||
        `API Request failed with status ${status}`,
    );
    this.name = "ApiClientError";
  }
}

export const API_ENDPOINTS = {
  me: "/me",
  teams: "/teams",
  team: (id: string) => `/teams/${id}`,
  teamProjects: (teamId: string) => `/teams/${teamId}/projects`,
  project: (id: string) => `/projects/${id}`,
  projectAssets: (projectId: string) => `/projects/${projectId}/assets`,
  asset: (assetId: string) => `/assets/${assetId}`,
  assetVersions: (assetId: string) => `/assets/${assetId}/versions`,
  uploadIntents: (projectId: string) =>
    `/projects/${projectId}/assets/upload-intents`,
  versionUploadIntents: (assetId: string) =>
    `/assets/${assetId}/versions/upload-intents`,
  completeUpload: (assetId: string, versionId: string) =>
    `/assets/${assetId}/versions/${versionId}/complete`,
  downloadIntents: (assetId: string) => `/assets/${assetId}/download-intents`,
  versionDownloadIntents: (assetId: string, versionId: string) =>
    `/assets/${assetId}/versions/${versionId}/download-intents`,
  projectSessions: (projectId: string) =>
    `/projects/${projectId}/practice-sessions`,
  practiceSession: (sessionId: string) => `/practice-sessions/${sessionId}`,
  cancelPracticeSession: (sessionId: string) =>
    `/practice-sessions/${sessionId}/cancel`,
  analysisAttempts: (sessionId: string) =>
    `/practice-sessions/${sessionId}/analysis-attempts`,
  speakerMappings: (sessionId: string) =>
    `/practice-sessions/${sessionId}/speaker-mappings`,
  questions: (sessionId: string) => `/practice-sessions/${sessionId}/questions`,
  qaRound: (sessionId: string) => `/practice-sessions/${sessionId}/qa`,
  answerUploadIntents: (questionId: string) =>
    `/questions/${questionId}/answer-upload-intents`,
  submitAnswer: (answerId: string) => `/answers/${answerId}/submit`,
  skipAnswer: (questionId: string) => `/questions/${questionId}/skip`,
  report: (sessionId: string) => `/practice-sessions/${sessionId}/report`,
  reportPdf: (sessionId: string) =>
    `/practice-sessions/${sessionId}/report/pdf`,
  reportExport: (exportId: string) => `/report-exports/${exportId}`,
  reportExportDownloadIntent: (exportId: string) =>
    `/report-exports/${exportId}/download-intents`,
  evaluation: (sessionId: string) =>
    `/practice-sessions/${sessionId}/evaluation`,
  sessionEvents: (sessionId: string) =>
    `/practice-sessions/${sessionId}/events`,
  teamMembers: (teamId: string) => `/teams/${teamId}/members`,
  teamMember: (teamId: string, userId: string) =>
    `/teams/${teamId}/members/${userId}`,
  teamOwner: (teamId: string) => `/teams/${teamId}/owner`,
  teamInvitations: (teamId: string) => `/teams/${teamId}/invitations`,
  resendInvitation: (teamId: string, id: string) =>
    `/teams/${teamId}/invitations/${id}/resend`,
  revokeInvitation: (teamId: string, id: string) =>
    `/teams/${teamId}/invitations/${id}`,
  invitationPreview: (token: string) => `/invitations/${token}`,
  acceptInvitation: (token: string) => `/invitations/${token}/accept`,
} as const;

export interface ClientConfig {
  baseUrl?: string;
  getToken?: () => Promise<string | null> | string | null;
}

export class BaseClient {
  protected readonly baseUrl: string;
  protected readonly getToken?: () => Promise<string | null> | string | null;

  constructor(config?: ClientConfig) {
    this.baseUrl =
      config?.baseUrl ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api/v1";
    this.getToken = config?.getToken ?? getClientAuthToken;
  }

  public async getAuthToken(): Promise<string | null> {
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        const stored = window.localStorage.getItem(AUTH_COOKIE_NAME);
        if (stored) return stored;

        for (let i = 0; i < window.localStorage.length; i++) {
          const key = window.localStorage.key(i);
          if (key && key.startsWith("sb-") && key.endsWith("-auth-token")) {
            const raw = window.localStorage.getItem(key);
            if (raw) {
              const parsed = JSON.parse(raw);
              if (parsed?.access_token) return parsed.access_token;
            }
          }
        }
      } catch {
        // Ignore localStorage errors
      }
    }

    if (this.getToken) {
      return await this.getToken();
    }

    return null;
  }

  public resolveUrl(endpoint: string): string {
    return `${this.baseUrl}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
  }

  public async request<T>(
    endpoint: string,
    options: RequestInit & { idempotencyKey?: string; ifMatch?: string } = {},
  ): Promise<T> {
    const url = this.resolveUrl(endpoint);
    const headers: Record<string, string> = {
      Accept: "application/json",
      ...(options.headers as Record<string, string>),
    };

    if (!headers["Authorization"]) {
      const token = await this.getAuthToken();
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
    }

    if (options.idempotencyKey) {
      headers["Idempotency-Key"] = options.idempotencyKey;
    }

    if (options.ifMatch) {
      headers["If-Match"] = options.ifMatch;
    }

    if (
      options.body &&
      typeof options.body === "string" &&
      !headers["Content-Type"]
    ) {
      headers["Content-Type"] = "application/json";
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let problem: ProblemDetails | undefined;
      const contentType = response.headers.get("content-type");
      if (
        contentType &&
        (contentType.includes("application/problem+json") ||
          contentType.includes("application/json"))
      ) {
        try {
          problem = (await response.json()) as ProblemDetails;
        } catch {
          // Keep problem undefined if body is empty or invalid JSON
        }
      }
      throw new ApiClientError(response.status, problem);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  }
}
