import type {
  DownloadIntent,
  QARound,
  Question,
  Answer,
  AnswerUploadIntentResponse,
  Report,
  ReportExport,
} from "../types";
import { BaseClient, API_ENDPOINTS } from "./base";

export class QaClient extends BaseClient {
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
    const raw = await this.request<AnswerUploadIntentResponse>(
      API_ENDPOINTS.answerUploadIntents(questionId),
      {
        method: "POST",
        body: JSON.stringify(data),
        idempotencyKey,
      },
    );
    return {
      ...raw,
      upload_intent: {
        ...raw.upload_intent,
        version_id:
          raw.upload_intent.version_id ||
          raw.upload_intent.asset_version_id ||
          "",
      },
    };
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
      body: JSON.stringify({ reason: reason ?? null }),
      idempotencyKey,
    });
  }

  public async getReport(sessionId: string): Promise<Report> {
    return this.request<Report>(API_ENDPOINTS.report(sessionId));
  }

  public async createReportPdf(
    sessionId: string,
    idempotencyKey: string,
  ): Promise<ReportExport> {
    return this.request<ReportExport>(API_ENDPOINTS.reportPdf(sessionId), {
      method: "POST",
      idempotencyKey,
    });
  }

  public async getReportExport(exportId: string): Promise<ReportExport> {
    return this.request<ReportExport>(API_ENDPOINTS.reportExport(exportId));
  }

  public async createReportExportDownloadIntent(
    exportId: string,
  ): Promise<DownloadIntent> {
    return this.request<DownloadIntent>(
      API_ENDPOINTS.reportExportDownloadIntent(exportId),
      { method: "POST" },
    );
  }
}
