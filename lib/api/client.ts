import type {
  User,
  Team,
  Project,
  Asset,
  AssetVersion,
  UploadIntent,
  DownloadIntent,
  AssetFilterParams,
  CreateUploadIntentRequest,
  CreateVersionUploadIntentRequest,
  CompleteUploadRequest,
  PracticeSession,
  SpeakerMapping,
  QARound,
  Question,
  Answer,
  AnswerUploadIntentResponse,
  Report,
  Page,
  InvitationPreview,
  InvitationStatus,
  TeamMembership,
  TeamInvitation,
  TeamRole,
  ProblemDetails,
} from "./types";
import { getClientAuthToken } from "@/lib/auth/cookies";
import { AUTH_COOKIE_NAME } from "@/lib/auth/middleware";
import { generateIdempotencyKey } from "@/lib/upload/idempotency";

export * from "./types";

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

/**
 * Centralized API endpoints
 * Prevents endpoint strings from being scattered across components
 */
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
  session: (sessionId: string) => `/practice-sessions/${sessionId}`,
  startAnalysis: (sessionId: string) =>
    `/practice-sessions/${sessionId}/start-analysis`,
  speakerMappings: (sessionId: string) =>
    `/practice-sessions/${sessionId}/speaker-mappings`,
  questions: (sessionId: string) => `/practice-sessions/${sessionId}/questions`,
  qaRound: (sessionId: string) => `/practice-sessions/${sessionId}/qa`,
  answerUploadIntents: (questionId: string) => `/questions/${questionId}/answer-upload-intents`,
  submitAnswer: (answerId: string) => `/answers/${answerId}/submit`,
  skipAnswer: (questionId: string) => `/questions/${questionId}/skip`,
  report: (sessionId: string) => `/practice-sessions/${sessionId}/report`,
  evaluation: (sessionId: string) => `/practice-sessions/${sessionId}/evaluation`,
  sessionEvents: (sessionId: string) => `/practice-sessions/${sessionId}/events`,
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

export class ApiClient {
  private readonly baseUrl: string;
  private readonly getToken?: () => Promise<string | null> | string | null;

  constructor(config?: ClientConfig) {
    this.baseUrl =
      config?.baseUrl ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api/v1";
    this.getToken = config?.getToken ?? getClientAuthToken;
  }

  private async getAuthToken(): Promise<string | null> {
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        const stored = window.localStorage.getItem(AUTH_COOKIE_NAME);
        if (stored) return stored;

        // Fallback: check Supabase session if stored in localStorage
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

  private async request<T>(
    endpoint: string,
    options: RequestInit & { idempotencyKey?: string; ifMatch?: string } = {},
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
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

  // ================= Identity & Teams =================

  public async getMe(): Promise<User> {
    const res = await this.request<Record<string, unknown>>(API_ENDPOINTS.me);
    return {
      id: String(res.id ?? ""),
      display_name: res.display_name as string,
      email: res.email as string,
      created_at: (res.created_at as string) || new Date().toISOString(),
    };
  }

  public async getTeams(cursor?: string): Promise<Page<Team>> {
    const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
    return this.request<Page<Team>>(`${API_ENDPOINTS.teams}${query}`);
  }

  public async createTeam(
    name: string,
    idempotencyKey?: string,
  ): Promise<Team> {
    return this.request<Team>(API_ENDPOINTS.teams, {
      method: "POST",
      body: JSON.stringify({ name }),
      idempotencyKey,
    });
  }

  public async getTeam(teamId: string): Promise<Team> {
    return await this.request<Team>(API_ENDPOINTS.team(teamId));
  }

  public async getTeamMembers(
    teamId: string,
    cursor?: string,
  ): Promise<Page<TeamMembership>> {
    const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
    return await this.request<Page<TeamMembership>>(
      `${API_ENDPOINTS.teamMembers(teamId)}${query}`,
    );
  }

  public async removeTeamMember(teamId: string, userId: string): Promise<void> {
    return this.request<void>(API_ENDPOINTS.teamMember(teamId, userId), {
      method: "DELETE",
    });
  }

  public async transferOwnership(
    teamId: string,
    newOwnerUserId: string,
  ): Promise<TeamMembership> {
    return this.request<TeamMembership>(API_ENDPOINTS.teamOwner(teamId), {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ user_id: newOwnerUserId }),
    });
  }

  public async getTeamInvitations(
    teamId: string,
    cursor?: string,
  ): Promise<Page<TeamInvitation>> {
    const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
    return await this.request<Page<TeamInvitation>>(
      `${API_ENDPOINTS.teamInvitations(teamId)}${query}`,
    );
  }

  public async createInvitation(
    teamId: string,
    email: string,
    role: TeamRole = "member",
    idempotencyKey?: string,
  ): Promise<TeamInvitation> {
    return this.request<TeamInvitation>(API_ENDPOINTS.teamInvitations(teamId), {
      method: "POST",
      body: JSON.stringify({ email, role }),
      idempotencyKey,
    });
  }

  public async resendInvitation(
    teamId: string,
    invitationId: string,
    idempotencyKey?: string,
  ): Promise<TeamInvitation> {
    return this.request<TeamInvitation>(
      API_ENDPOINTS.resendInvitation(teamId, invitationId),
      {
        method: "POST",
        idempotencyKey,
      },
    );
  }

  public async revokeInvitation(
    teamId: string,
    invitationId: string,
    ifMatch?: string,
  ): Promise<void> {
    const cleanIfMatch = ifMatch
      ? ifMatch === "*"
        ? "*"
        : `"${ifMatch.replace(/^"|"$/g, "")}"`
      : "*";
    return this.request<void>(
      API_ENDPOINTS.revokeInvitation(teamId, invitationId),
      {
        method: "DELETE",
        ifMatch: cleanIfMatch,
      },
    );
  }

  public async getInvitationPreview(token: string): Promise<InvitationPreview> {
    const raw = await this.request<Record<string, unknown>>(
      API_ENDPOINTS.invitationPreview(token),
    );
    const invitedByName =
      (raw.invited_by_name as string) ||
      (raw.inviter_display_name as string) ||
      "Team Owner";
    const invitedEmail =
      (raw.invited_email as string) || (raw.email_masked as string) || "";
    return {
      team_name: (raw.team_name as string) || "Team",
      invited_by_name: invitedByName,
      inviter_display_name: invitedByName,
      invited_email: invitedEmail,
      email_masked: invitedEmail,
      role: (raw.role as string) || "member",
      expires_at: (raw.expires_at as string) || "",
      status: (raw.status as InvitationStatus) || "pending",
    };
  }

  public async acceptInvitation(token: string): Promise<TeamMembership> {
    return this.request<TeamMembership>(API_ENDPOINTS.acceptInvitation(token), {
      method: "POST",
    });
  }

  // ================= Projects & Assets =================

  public async getProjects(
    teamId: string,
    cursor?: string,
  ): Promise<Page<Project>> {
    const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
    return this.request<Page<Project>>(
      `${API_ENDPOINTS.teamProjects(teamId)}${query}`,
    );
  }

  public async createProject(
    teamId: string,
    data: { name: string; description?: string },
    idempotencyKey?: string,
  ): Promise<Project> {
    return this.request<Project>(API_ENDPOINTS.teamProjects(teamId), {
      method: "POST",
      body: JSON.stringify(data),
      idempotencyKey,
    });
  }

  public async getProject(projectId: string): Promise<Project> {
    return this.request<Project>(API_ENDPOINTS.project(projectId));
  }

  public async deleteProject(projectId: string): Promise<void> {
    return this.request<void>(API_ENDPOINTS.project(projectId), {
      method: "DELETE",
    });
  }

  public async getAssets(
    projectId: string,
    filters?: AssetFilterParams,
  ): Promise<Page<Asset>> {
    const params = new URLSearchParams();
    if (filters?.kind) params.set("kind", filters.kind);
    if (filters?.state) params.set("state", filters.state);
    if (filters?.cursor) params.set("cursor", filters.cursor);
    if (filters?.limit) params.set("limit", String(filters.limit));
    const query = params.toString() ? `?${params.toString()}` : "";
    const page = await this.request<Page<Asset>>(
      `${API_ENDPOINTS.projectAssets(projectId)}${query}`,
    );
    const itemsWithVersions = await Promise.all(
      page.items.map(async (asset) => {
        if (asset.versions && asset.versions.length > 0) {
          return asset;
        }
        try {
          const vPage = await this.getAssetVersions(asset.id);
          return {
            ...asset,
            versions: vPage.items,
          };
        } catch {
          return asset;
        }
      }),
    );
    return {
      ...page,
      items: itemsWithVersions,
    };
  }

  public async getAssetVersions(
    assetId: string,
  ): Promise<Page<AssetVersion>> {
    return this.request<Page<AssetVersion>>(
      API_ENDPOINTS.assetVersions(assetId),
    );
  }

  public async getAsset(assetId: string): Promise<Asset> {
    return this.request<Asset>(API_ENDPOINTS.asset(assetId));
  }

  public async deleteAsset(assetId: string): Promise<void> {
    return this.request<void>(API_ENDPOINTS.asset(assetId), {
      method: "DELETE",
    });
  }

  public async createUploadIntent(
    projectId: string,
    req: CreateUploadIntentRequest,
    idempotencyKey: string,
  ): Promise<UploadIntent> {
    const raw = await this.request<
      UploadIntent & { asset_version_id?: string }
    >(API_ENDPOINTS.uploadIntents(projectId), {
      method: "POST",
      body: JSON.stringify(req),
      idempotencyKey,
    });
    return {
      ...raw,
      version_id: raw.version_id || raw.asset_version_id || "",
    };
  }

  public async createVersionUploadIntent(
    assetId: string,
    req: CreateVersionUploadIntentRequest,
    idempotencyKey: string,
  ): Promise<UploadIntent> {
    const raw = await this.request<
      UploadIntent & { asset_version_id?: string }
    >(API_ENDPOINTS.versionUploadIntents(assetId), {
      method: "POST",
      body: JSON.stringify(req),
      idempotencyKey,
    });
    return {
      ...raw,
      version_id: raw.version_id || raw.asset_version_id || "",
    };
  }

  public async completeUpload(
    assetId: string,
    versionId: string,
    req: CompleteUploadRequest,
    idempotencyKey?: string,
  ): Promise<Asset> {
    const key = idempotencyKey || generateIdempotencyKey("complete");
    return this.request<Asset>(
      API_ENDPOINTS.completeUpload(assetId, versionId),
      {
        method: "POST",
        body: JSON.stringify(req),
        idempotencyKey: key,
      },
    );
  }

  public async createDownloadIntent(
    assetId: string,
    versionId?: string,
  ): Promise<DownloadIntent> {
    const endpoint = versionId
      ? API_ENDPOINTS.versionDownloadIntents(assetId, versionId)
      : API_ENDPOINTS.downloadIntents(assetId);
    return this.request<DownloadIntent>(endpoint, {
      method: "POST",
    });
  }

  // ================= Practice Sessions =================

  public async createPracticeSession(
    projectId: string,
    data: {
      name?: string;
      presentation_asset_id?: string;
      presentation_asset_version_id?: string;
      document_asset_ids?: string[];
      supporting_document_version_ids?: string[];
      policy_version?: string;
      rubric?: { rubric_id: string; version: number };
    },
    idempotencyKey: string,
  ): Promise<PracticeSession> {
    const presentationVersionId =
      data.presentation_asset_version_id || data.presentation_asset_id;
    const supportingDocs = (
      data.supporting_document_version_ids ||
      data.document_asset_ids ||
      []
    ).slice(0, 5);

    const payload = {
      name: data.name || `Practice Session ${new Date().toLocaleDateString()}`,
      presentation_asset_version_id: presentationVersionId,
      supporting_document_version_ids: supportingDocs,
      rubric: data.rubric || { rubric_id: "startup_pitch", version: 1 },
    };

    return this.request<PracticeSession>(
      API_ENDPOINTS.projectSessions(projectId),
      {
        method: "POST",
        body: JSON.stringify(payload),
        idempotencyKey,
      },
    );
  }

  public async getPracticeSession(sessionId: string): Promise<PracticeSession> {
    return this.request<PracticeSession>(
      API_ENDPOINTS.practiceSession(sessionId),
    );
  }

  public async getPracticeSessions(
    projectId: string,
    cursor?: string,
  ): Promise<Page<PracticeSession>> {
    const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
    return this.request<Page<PracticeSession>>(
      `${API_ENDPOINTS.projectSessions(projectId)}${query}`,
    );
  }

  public async deletePracticeSession(sessionId: string): Promise<void> {
    return this.request<void>(API_ENDPOINTS.practiceSession(sessionId), {
      method: "DELETE",
    });
  }

  public async deleteSession(sessionId: string): Promise<void> {
    return this.deletePracticeSession(sessionId);
  }

  public async startAnalysis(
    sessionId: string,
    idempotencyKey: string,
  ): Promise<PracticeSession> {
    return this.request<PracticeSession>(
      API_ENDPOINTS.startAnalysis(sessionId),
      {
        method: "POST",
        idempotencyKey,
      },
    );
  }

  public async saveSpeakerMappings(
    sessionId: string,
    mappings: SpeakerMapping[],
    idempotencyKey: string,
  ): Promise<PracticeSession> {
    return this.request<PracticeSession>(
      API_ENDPOINTS.speakerMappings(sessionId),
      {
        method: "POST",
        body: JSON.stringify({ mappings }),
        idempotencyKey,
      },
    );
  }

  // ================= Q&A and Reports =================

  public async getQARound(sessionId: string): Promise<QARound> {
    return this.request<QARound>(API_ENDPOINTS.qaRound(sessionId));
  }

  /** @deprecated Use getQARound() which returns the full QARound envelope */
  public async getQuestions(sessionId: string): Promise<Question[]> {
    const round = await this.getQARound(sessionId);
    return round.questions;
  }

  public async createAnswerUploadIntent(
    questionId: string,
    data: {
      file_name: string;
      declared_media_type: string;
      declared_size_bytes: number;
    },
    idempotencyKey: string,
  ): Promise<AnswerUploadIntentResponse> {
    return this.request<AnswerUploadIntentResponse>(
      API_ENDPOINTS.answerUploadIntents(questionId),
      {
        method: "POST",
        body: JSON.stringify(data),
        idempotencyKey,
      },
    );
  }

  public async submitAnswer(
    answerId: string,
    data: { checksum: string; size_bytes: number },
    idempotencyKey: string,
  ): Promise<Answer> {
    return this.request<Answer>(API_ENDPOINTS.submitAnswer(answerId), {
      method: "POST",
      body: JSON.stringify(data),
      idempotencyKey,
    });
  }

  public async skipAnswer(
    questionId: string,
    idempotencyKey: string,
    reason?: string,
  ): Promise<Answer> {
    return this.request<Answer>(API_ENDPOINTS.skipAnswer(questionId), {
      method: "POST",
      body: reason ? JSON.stringify({ reason }) : undefined,
      idempotencyKey,
    });
  }

  public async getReport(sessionId: string): Promise<Report> {
    return this.request<Report>(API_ENDPOINTS.report(sessionId));
  }
}

export const apiClient = new ApiClient();

export const deleteProject = (projectId: string): Promise<void> =>
  apiClient.deleteProject(projectId);

export const deleteAsset = (assetId: string): Promise<void> =>
  apiClient.deleteAsset(assetId);

export const deletePracticeSession = (sessionId: string): Promise<void> =>
  apiClient.deletePracticeSession(sessionId);

export const deleteSession = (sessionId: string): Promise<void> =>
  apiClient.deleteSession(sessionId);
