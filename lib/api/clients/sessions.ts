import type {
  PracticeSession,
  AnalysisAttempt,
  UpdatePracticeSessionRequest,
  SpeakerMapping,
  SpeakerMappingRequestItem,
  Page,
} from "../types";
import { BaseClient, API_ENDPOINTS } from "./base";

export class SessionsClient extends BaseClient {
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

    const session = await this.request<
      PracticeSession & { status?: PracticeSession["state"] }
    >(API_ENDPOINTS.projectSessions(projectId), {
      method: "POST",
      body: JSON.stringify(payload),
      idempotencyKey,
    });
    return this.normalizePracticeSession(session);
  }

  public async getPracticeSession(sessionId: string): Promise<PracticeSession> {
    const session = await this.request<
      PracticeSession & { status?: PracticeSession["state"] }
    >(API_ENDPOINTS.practiceSession(sessionId));
    return this.normalizePracticeSession(session);
  }

  public async getPracticeSessions(
    projectId: string,
    cursor?: string,
  ): Promise<Page<PracticeSession>> {
    const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
    const page = await this.request<
      Page<PracticeSession & { status?: PracticeSession["state"] }>
    >(`${API_ENDPOINTS.projectSessions(projectId)}${query}`);
    return {
      ...page,
      items: page.items.map((session) =>
        this.normalizePracticeSession(session),
      ),
    };
  }

  public async cancelPracticeSession(
    sessionId: string,
    idempotencyKey: string,
    reason: string | null = null,
  ): Promise<PracticeSession> {
    const session = await this.request<
      PracticeSession & { status?: PracticeSession["state"] }
    >(API_ENDPOINTS.cancelPracticeSession(sessionId), {
      method: "POST",
      body: JSON.stringify({ reason }),
      idempotencyKey,
    });
    return this.normalizePracticeSession(session);
  }

  public async deletePracticeSession(sessionId: string): Promise<void> {
    return this.request<void>(API_ENDPOINTS.practiceSession(sessionId), {
      method: "DELETE",
    });
  }

  public async updatePracticeSession(
    sessionId: string,
    data: UpdatePracticeSessionRequest,
    version: number,
  ): Promise<PracticeSession> {
    const session = await this.request<
      PracticeSession & { status?: PracticeSession["state"] }
    >(API_ENDPOINTS.practiceSession(sessionId), {
      method: "PATCH",
      body: JSON.stringify(data),
      ifMatch: `"${version}"`,
    });
    return this.normalizePracticeSession(session);
  }

  public async createAnalysisAttempt(
    sessionId: string,
    idempotencyKey: string,
  ): Promise<AnalysisAttempt> {
    return this.request<AnalysisAttempt>(
      API_ENDPOINTS.analysisAttempts(sessionId),
      {
        method: "POST",
        body: JSON.stringify({
          consent: { accepted: true, policy_version: 1 },
        }),
        idempotencyKey,
      },
    );
  }

  private normalizePracticeSession(
    session: PracticeSession & { status?: PracticeSession["state"] },
  ): PracticeSession {
    return {
      ...session,
      state: session.status ?? session.state,
    };
  }

  public async getSpeakerMappings(sessionId: string): Promise<SpeakerMapping[]> {
    return this.request<SpeakerMapping[]>(
      API_ENDPOINTS.speakerMappings(sessionId),
    );
  }

  public async saveSpeakerMappings(
    sessionId: string,
    mappings: SpeakerMappingRequestItem[],
    version: number,
  ): Promise<SpeakerMapping[]> {
    return this.request<SpeakerMapping[]>(
      API_ENDPOINTS.speakerMappings(sessionId),
      {
        method: "PUT",
        ifMatch: `"${version}"`,
        body: JSON.stringify({ mappings }),
      },
    );
  }
}
