import {
  User,
  Team,
  Project,
  Asset,
  UploadIntent,
  CreateUploadIntentRequest,
  CompleteUploadRequest,
  PracticeSession,
  SpeakerMapping,
  Question,
  Answer,
  Report,
  Page,
  InvitationPreview,
  TeamMembership,
  ProblemDetails,
} from "./types";

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
  uploadIntents: (projectId: string) =>
    `/projects/${projectId}/assets/upload-intents`,
  completeUpload: (assetId: string, versionId: string) =>
    `/assets/${assetId}/versions/${versionId}/complete`,
  projectSessions: (projectId: string) =>
    `/projects/${projectId}/practice-sessions`,
  practiceSession: (sessionId: string) => `/practice-sessions/${sessionId}`,
  startAnalysis: (sessionId: string) =>
    `/practice-sessions/${sessionId}/start-analysis`,
  speakerMappings: (sessionId: string) =>
    `/practice-sessions/${sessionId}/speaker-mappings`,
  questions: (sessionId: string) => `/practice-sessions/${sessionId}/questions`,
  submitAnswer: (questionId: string) => `/questions/${questionId}/answers`,
  skipAnswer: (questionId: string) => `/questions/${questionId}/skip`,
  report: (sessionId: string) => `/practice-sessions/${sessionId}/report`,
  invitationPreview: (token: string) => `/invitations/${token}`,
  acceptInvitation: (token: string) => `/invitations/${token}/accept`,
} as const;

export interface ClientConfig {
  baseUrl?: string;
  getToken?: () => Promise<string | null> | string | null;
  useMock?: boolean;
}

// Default Seeded Mocks for local development and testing
export const MOCK_DATA = {
  user: {
    id: "01J6GZ1A000000000000000001",
    display_name: "Alex Presenter",
    email: "alex@example.com",
    created_at: "2026-09-01T10:00:00Z",
  } as User,
  teams: [
    {
      id: "01J6GZ2B000000000000000002",
      name: "VirtuJudge Pitch Team",
      role: "owner",
      member_count: 3,
      created_at: "2026-09-01T10:15:00Z",
      version: 1,
    },
  ] as Team[],
  projects: [
    {
      id: "01J6GZ3C000000000000000003",
      team_id: "01J6GZ2B000000000000000002",
      name: "Series A Pitch Practice",
      description: "Preparing for the investor demo day showcase",
      created_by: "01J6GZ1A000000000000000001",
      created_at: "2026-09-01T11:00:00Z",
      version: 1,
    },
  ] as Project[],
  session: {
    id: "01J6GZ4D000000000000000004",
    project_id: "01J6GZ3C000000000000000003",
    state: "ready",
    manifest_frozen: false,
    presentation_asset_id: "01J6GZ5E000000000000000005",
    document_asset_ids: ["01J6GZ6F000000000000000006"],
    stages: [
      { stage: "ingestion", status: "completed" },
      { stage: "transcription", status: "completed" },
      { stage: "diarization", status: "completed" },
      { stage: "vision", status: "completed" },
      { stage: "audio", status: "completed" },
      { stage: "grounding", status: "completed" },
    ],
    created_at: "2026-09-01T12:00:00Z",
    version: 1,
  } as PracticeSession,
  questions: [
    {
      id: "01J6GZ7G000000000000000007",
      session_id: "01J6GZ4D000000000000000004",
      sequence: 1,
      type: "primary",
      text: "How do you plan to handle enterprise data retention when dealing with sensitive pitch recordings?",
      reason:
        "Contradiction between document privacy retention policy and stated pipeline persistence",
      rubric_dimension: "Security & Compliance",
      evidence_references: [
        {
          asset_id: "01J6GZ6F000000000000000006",
          source_type: "document",
          page_number: 4,
          excerpt: "Customer audio is permanently archived in tier-1 storage.",
        },
      ],
      status: "active",
    },
    {
      id: "01J6GZ8H000000000000000008",
      session_id: "01J6GZ4D000000000000000004",
      sequence: 2,
      type: "primary",
      text: "What is the projected unit economics and customer acquisition cost for the team tier?",
      reason: "Omission of CAC assumptions in financial forecast slide",
      rubric_dimension: "Business Model",
      evidence_references: [
        {
          asset_id: "01J6GZ5E000000000000000005",
          source_type: "video",
          start_ms: 120000,
          end_ms: 145000,
          excerpt:
            "Speaker mentions 80% margins without factoring pipeline inference compute.",
        },
      ],
      status: "active",
    },
    {
      id: "01J6GZ9J000000000000000009",
      session_id: "01J6GZ4D000000000000000004",
      sequence: 3,
      type: "primary",
      text: "How will the AI pipeline differentiate between multiple speakers in noisy presentation environments?",
      reason: "Weak explanation of audio diarization fallback mechanisms",
      rubric_dimension: "Technical Architecture",
      evidence_references: [
        {
          asset_id: "01J6GZ5E000000000000000005",
          source_type: "video",
          start_ms: 210000,
          end_ms: 230000,
          excerpt:
            "Presenter claims pyannote handles arbitrary acoustic noise perfectly.",
        },
      ],
      status: "active",
    },
  ] as Question[],
  report: {
    id: "01J6GZAK000000000000000010",
    session_id: "01J6GZ4D000000000000000004",
    status: "ready",
    team_score: 0.85,
    team_feedback:
      "Strong cohesive narrative and compelling market thesis. Clarify retention guarantees and unit economics during Q&A.",
    member_feedback: [
      {
        speaker_id: "SPEAKER_00",
        score: 0.88,
        strengths: ["Clear pacing", "Effective posture and eye contact"],
        areas_for_improvement: [
          "Avoid filler phrases during technical questions",
        ],
        transcript_citations: ['Timestamp 02:15 - "You know, basically..."'],
      },
    ],
    created_at: "2026-09-01T13:00:00Z",
    pdf_download_url:
      "/api/v1/practice-sessions/01J6GZ4D000000000000000004/report.pdf",
  } as Report,
};

export class ApiClient {
  private readonly baseUrl: string;
  private readonly getToken?: () => Promise<string | null> | string | null;
  private useMock: boolean;

  constructor(config?: ClientConfig) {
    this.baseUrl =
      config?.baseUrl ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api/v1";
    this.getToken = config?.getToken;
    this.useMock =
      config?.useMock ??
      (typeof process !== "undefined" &&
        process.env.NEXT_PUBLIC_MOCK_API === "true");
  }

  public setUseMock(enabled: boolean): void {
    this.useMock = enabled;
  }

  public isMocking(): boolean {
    return this.useMock;
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

    if (this.getToken) {
      const token = await this.getToken();
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
    if (this.useMock) return MOCK_DATA.user;
    return this.request<User>(API_ENDPOINTS.me);
  }

  public async getTeams(cursor?: string): Promise<Page<Team>> {
    if (this.useMock) return { items: MOCK_DATA.teams, has_more: false };
    const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
    return this.request<Page<Team>>(`${API_ENDPOINTS.teams}${query}`);
  }

  public async createTeam(
    name: string,
    idempotencyKey?: string,
  ): Promise<Team> {
    if (this.useMock) {
      const newTeam: Team = {
        id:
          "01J6GZ2B" +
          Math.random().toString(36).substring(2, 10).toUpperCase(),
        name,
        role: "owner",
        member_count: 1,
        created_at: new Date().toISOString(),
        version: 1,
      };
      MOCK_DATA.teams.push(newTeam);
      return newTeam;
    }
    return this.request<Team>(API_ENDPOINTS.teams, {
      method: "POST",
      body: JSON.stringify({ name }),
      idempotencyKey,
    });
  }

  public async getTeam(teamId: string): Promise<Team> {
    if (this.useMock) {
      const team =
        MOCK_DATA.teams.find((t) => t.id === teamId) ?? MOCK_DATA.teams[0];
      return team;
    }
    return this.request<Team>(API_ENDPOINTS.team(teamId));
  }

  public async getInvitationPreview(token: string): Promise<InvitationPreview> {
    if (this.useMock) {
      return {
        team_name: "VirtuJudge Pitch Team",
        inviter_display_name: "Alex Presenter",
        email_masked: "a***@example.com",
        expires_at: "2026-09-10T12:00:00Z",
        status: "pending",
      };
    }
    return this.request<InvitationPreview>(
      API_ENDPOINTS.invitationPreview(token),
    );
  }

  public async acceptInvitation(token: string): Promise<TeamMembership> {
    if (this.useMock) {
      return {
        team_id: MOCK_DATA.teams[0].id,
        user_id: MOCK_DATA.user.id,
        role: "member",
        display_name: MOCK_DATA.user.display_name,
        joined_at: new Date().toISOString(),
        version: 1,
      };
    }
    return this.request<TeamMembership>(API_ENDPOINTS.acceptInvitation(token), {
      method: "POST",
    });
  }

  // ================= Projects & Assets =================

  public async getProjects(
    teamId: string,
    cursor?: string,
  ): Promise<Page<Project>> {
    if (this.useMock) return { items: MOCK_DATA.projects, has_more: false };
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
    if (this.useMock) {
      const newProj: Project = {
        id:
          "01J6GZ3C" +
          Math.random().toString(36).substring(2, 10).toUpperCase(),
        team_id: teamId,
        name: data.name,
        description: data.description,
        created_by: MOCK_DATA.user.id,
        created_at: new Date().toISOString(),
        version: 1,
      };
      MOCK_DATA.projects.push(newProj);
      return newProj;
    }
    return this.request<Project>(API_ENDPOINTS.teamProjects(teamId), {
      method: "POST",
      body: JSON.stringify(data),
      idempotencyKey,
    });
  }

  public async getProject(projectId: string): Promise<Project> {
    if (this.useMock) {
      return (
        MOCK_DATA.projects.find((p) => p.id === projectId) ??
        MOCK_DATA.projects[0]
      );
    }
    return this.request<Project>(API_ENDPOINTS.project(projectId));
  }

  public async getAssets(projectId: string): Promise<Page<Asset>> {
    if (this.useMock) {
      return {
        items: [
          {
            id: "01J6GZ5E000000000000000005",
            project_id: projectId,
            kind: "presentation_video",
            file_name: "pitch_demo.mp4",
            media_type: "video/mp4",
            size_bytes: 45000000,
            state: "verified",
            checksum:
              "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
            created_at: "2026-09-01T11:30:00Z",
          },
        ],
        has_more: false,
      };
    }
    return this.request<Page<Asset>>(API_ENDPOINTS.projectAssets(projectId));
  }

  public async createUploadIntent(
    projectId: string,
    req: CreateUploadIntentRequest,
    idempotencyKey: string,
  ): Promise<UploadIntent> {
    if (this.useMock) {
      return {
        asset_id:
          "01J6GZ5E" +
          Math.random().toString(36).substring(2, 10).toUpperCase(),
        version_id: "01J6GZVER00000000000000001",
        upload_url:
          "https://storage.virtujudge.local/mock-bucket/signed-upload",
        expires_at: new Date(Date.now() + 3600000).toISOString(),
      };
    }
    return this.request<UploadIntent>(API_ENDPOINTS.uploadIntents(projectId), {
      method: "POST",
      body: JSON.stringify(req),
      idempotencyKey,
    });
  }

  public async completeUpload(
    assetId: string,
    versionId: string,
    req: CompleteUploadRequest,
    idempotencyKey: string,
  ): Promise<Asset> {
    if (this.useMock) {
      return {
        id: assetId,
        project_id: MOCK_DATA.projects[0].id,
        kind: "presentation_video",
        file_name: "uploaded_video.mp4",
        media_type: "video/mp4",
        size_bytes: req.size_bytes,
        state: "verified",
        checksum: req.checksum,
        created_at: new Date().toISOString(),
      };
    }
    return this.request<Asset>(
      API_ENDPOINTS.completeUpload(assetId, versionId),
      {
        method: "POST",
        body: JSON.stringify(req),
        idempotencyKey,
      },
    );
  }

  // ================= Practice Sessions =================

  public async createPracticeSession(
    projectId: string,
    data: {
      presentation_asset_id: string;
      document_asset_ids: string[];
      policy_version: string;
    },
    idempotencyKey: string,
  ): Promise<PracticeSession> {
    if (this.useMock) {
      return {
        ...MOCK_DATA.session,
        project_id: projectId,
        presentation_asset_id: data.presentation_asset_id,
        document_asset_ids: data.document_asset_ids,
      };
    }
    return this.request<PracticeSession>(
      API_ENDPOINTS.projectSessions(projectId),
      {
        method: "POST",
        body: JSON.stringify(data),
        idempotencyKey,
      },
    );
  }

  public async getPracticeSession(sessionId: string): Promise<PracticeSession> {
    if (this.useMock) return MOCK_DATA.session;
    return this.request<PracticeSession>(
      API_ENDPOINTS.practiceSession(sessionId),
    );
  }

  public async startAnalysis(
    sessionId: string,
    idempotencyKey: string,
  ): Promise<PracticeSession> {
    if (this.useMock) {
      return { ...MOCK_DATA.session, state: "processing" };
    }
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
    if (this.useMock) {
      return { ...MOCK_DATA.session, speaker_mappings: mappings, state: "qa" };
    }
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

  public async getQuestions(sessionId: string): Promise<Question[]> {
    if (this.useMock) return MOCK_DATA.questions;
    return this.request<Question[]>(API_ENDPOINTS.questions(sessionId));
  }

  public async submitAnswer(
    questionId: string,
    data: { asset_id: string; duration_ms: number },
    idempotencyKey: string,
  ): Promise<Answer> {
    if (this.useMock) {
      return {
        id: "01J6GZANS00000000000000001",
        question_id: questionId,
        status: "submitted",
        asset_id: data.asset_id,
        duration_ms: data.duration_ms,
        submitted_at: new Date().toISOString(),
      };
    }
    return this.request<Answer>(API_ENDPOINTS.submitAnswer(questionId), {
      method: "POST",
      body: JSON.stringify(data),
      idempotencyKey,
    });
  }

  public async skipAnswer(
    questionId: string,
    idempotencyKey: string,
  ): Promise<Answer> {
    if (this.useMock) {
      return {
        id: "01J6GZANS00000000000000002",
        question_id: questionId,
        status: "skipped",
        submitted_at: new Date().toISOString(),
      };
    }
    return this.request<Answer>(API_ENDPOINTS.skipAnswer(questionId), {
      method: "POST",
      idempotencyKey,
    });
  }

  public async getReport(sessionId: string): Promise<Report> {
    if (this.useMock) return MOCK_DATA.report;
    return this.request<Report>(API_ENDPOINTS.report(sessionId));
  }
}

export const apiClient = new ApiClient();
