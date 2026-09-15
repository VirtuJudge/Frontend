/**
 * VirtuJudge Data Contracts & Boundary Models
 * Based on Docs/Contracts/Data-Contracts.md and Docs/Contracts/Frontend-Backend-API.md
 */

export type ResourceId = string; // 26-character ULID
export type UtcTimestamp = string; // RFC 3339 UTC, e.g. 2026-09-02T12:30:00Z
export type DurationMs = number; // >= 0
export type Checksum = string; // sha256: followed by 64 lowercase hex characters
export type NormalizedScore = number; // 0.0 <= value <= 1.0
export type EmailAddress = string;

export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
  code?: string;
  trace_id?: string;
  invalid_params?: Array<{
    name: string;
    reason: string;
  }>;
}

export interface Page<T> {
  items: T[];
  next_cursor?: string;
  has_more: boolean;
}

// ================= Identity and Teams =================

export interface User {
  id: ResourceId;
  display_name: string;
  email: EmailAddress;
  created_at: UtcTimestamp;
}

export type TeamRole = 'owner' | 'member';

export interface Team {
  id: ResourceId;
  name: string;
  role: TeamRole;
  member_count: number;
  created_at: UtcTimestamp;
  version: number;
}

export interface TeamMembership {
  team_id: ResourceId;
  user_id: ResourceId;
  role: TeamRole;
  display_name: string;
  joined_at: UtcTimestamp;
  version: number;
}

export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'revoked';
export type DeliveryStatus = 'queued' | 'accepted_by_gmail' | 'failed';

export interface TeamInvitation {
  id: ResourceId;
  team_id: ResourceId;
  email: EmailAddress;
  role: TeamRole;
  status: InvitationStatus;
  delivery_status: DeliveryStatus;
  delivery_attempts: number;
  expires_at: UtcTimestamp;
  created_at: UtcTimestamp;
  version?: number;
  etag?: string;
}

export interface InvitationPreview {
  team_name: string;
  invited_by_name?: string;
  inviter_display_name?: string;
  invited_email?: string;
  email_masked?: string;
  role?: string;
  expires_at: UtcTimestamp;
  status: InvitationStatus;
}

export interface UserInvitation {
  id: ResourceId;
  team_id: ResourceId;
  team_name: string;
  inviter_name: string;
  email: EmailAddress;
  role: string;
  status: InvitationStatus;
  expires_at: UtcTimestamp;
  created_at: UtcTimestamp;
  token: string;
}

// ================= Projects and Assets =================

export interface Project {
  id: ResourceId;
  team_id: ResourceId;
  name: string;
  description?: string;
  created_by: ResourceId;
  created_at: UtcTimestamp;
  version: number;
}

export type AssetKind = 'presentation_video' | 'supporting_document' | 'answer_audio' | 'report_pdf';
export type AssetState =
  | 'pending_upload'
  | 'uploaded'
  | 'verifying'
  | 'verified'
  | 'rejected'
  | 'deleting'
  | 'deleted'
  | 'pending'
  | 'uploading'
  | 'failed'
  | 'erased';

export interface AssetVersion {
  id: ResourceId;
  asset_id: ResourceId;
  version_number: number;
  checksum: Checksum;
  size_bytes: number;
  media_type: string;
  duration_ms?: number;
  created_at: UtcTimestamp;
  created_by?: ResourceId;
}

export interface Asset {
  id: ResourceId;
  project_id: ResourceId;
  kind: AssetKind;
  file_name: string;
  media_type: string;
  size_bytes: number;
  state: AssetState;
  checksum?: Checksum;
  duration_ms?: number;
  created_at: UtcTimestamp;
  version_id?: ResourceId;
  versions?: AssetVersion[];
  rejection_reason?: string;
  rejection_code?: string;
}

export interface UploadIntent {
  asset_id: ResourceId;
  version_id: ResourceId;
  asset_version_id?: ResourceId;
  upload_url: string;
  method?: string;
  expires_at: UtcTimestamp;
  required_headers?: Record<string, string>;
  maximum_size_bytes?: number;
}

export interface DownloadIntent {
  asset_id?: ResourceId;
  asset_version_id?: ResourceId;
  download_url: string;
  expires_at: UtcTimestamp;
  media_type: string;
  size_bytes: number;
  file_name: string;
}

export interface AssetFilterParams {
  kind?: AssetKind;
  state?: AssetState;
  cursor?: string;
  limit?: number;
}




export interface CreateUploadIntentRequest {
  kind: AssetKind;
  file_name: string;
  declared_media_type: string;
  declared_size_bytes: number;
}

export interface CreateVersionUploadIntentRequest {
  file_name: string;
  declared_media_type: string;
  declared_size_bytes: number;
}

export interface CompleteUploadRequest {
  checksum: Checksum;
  size_bytes: number;
}

// ================= Practice Sessions =================

export type SessionState =
  | 'draft'
  | 'ready'
  | 'analyzing'
  | 'questions_ready'
  | 'questions_in_progress'
  | 'report_generating'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type AnalysisStage =
  | 'ingestion'
  | 'speech'
  | 'diarization'
  | 'vision'
  | 'audio_features'
  | 'documents'
  | 'aggregation'
  | 'grounding'
  | 'questions'
  | 'answers'
  | 'report'
  | 'processing';

export type StageStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'skipped'
  | 'cancelled';

export interface StageProgress {
  stage: AnalysisStage;
  status: StageStatus;
  progress: number;
  started_at?: UtcTimestamp;
  completed_at?: UtcTimestamp;
  limitation_code?: string;
}

export interface SpeakerPreviewInterval {
  start_ms: number;
  end_ms: number;
  quote_text: string;
}

export interface SpeakerMapping {
  id: ResourceId;
  attempt_id: ResourceId;
  speaker_label: string;
  user_id?: ResourceId | null;
  member_id?: ResourceId | null;
  mapped_by: ResourceId;
  mapped_at: UtcTimestamp;
}

export interface DetectedSpeaker {
  speaker_label: string;
  preview?: SpeakerPreviewInterval;
  assigned_user_id?: string;
}

export interface SpeakerMappingRequestItem {
  speaker_label: string;
  user_id: string;
}

export interface ConsentRecord {
  policy_version: string;
  affirmed_at: UtcTimestamp;
  affirmed_by: ResourceId;
}

export interface RubricSpec {
  rubric_id: string;
  version: number;
}

export interface SessionManifest {
  id: ResourceId;
  session_id: ResourceId;
  presentation_version_id: ResourceId;
  supporting_document_version_ids: ResourceId[];
  rubric_id: string;
  rubric_version: number;
  snapshot?: Record<string, unknown> | null;
  frozen_at?: UtcTimestamp | null;
}

export interface SafeFailure {
  code: string;
  stage?: string;
  retryable: boolean;
  message: string;
  trace_id: string;
}

export interface Limitation {
  code: string;
  scope: string;
  message: string;
  affected_dimensions: string[];
}

export interface PracticeSession {
  id: ResourceId;
  project_id: ResourceId;
  team_id?: ResourceId;
  name?: string;
  state: SessionState;
  status?: SessionState;
  manifest?: SessionManifest | null;
  rubric?: RubricSpec;
  manifest_frozen?: boolean;
  presentation_asset_id?: ResourceId;
  document_asset_ids?: ResourceId[];
  stages?: StageProgress[];
  speaker_mappings?: SpeakerMapping[];
  consent?: ConsentRecord;
  current_attempt?: number;
  current_question_id?: ResourceId;
  failure?: SafeFailure;
  limitations?: Limitation[];
  created_by: ResourceId;
  created_at: UtcTimestamp;
  updated_at: UtcTimestamp;
  version: number;
}

export interface AnalysisAttempt {
  id: ResourceId;
  session_id: ResourceId;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  created_at: UtcTimestamp;
  attempt_number: number;
  version: number;
  idempotency_key?: string | null;
}

export interface UpdatePracticeSessionRequest {
  name?: string;
  presentation_asset_version_id?: ResourceId;
  supporting_document_version_ids?: ResourceId[];
  rubric?: RubricSpec;
}

// ================= Q&A =================

export type QARoundState = 'not_started' | 'in_progress' | 'completed';
export type QuestionKind = 'primary' | 'follow_up';
export type QuestionState = 'pending' | 'active' | 'answered' | 'skipped';
export type AnswerStatus = 'draft' | 'submitted' | 'skipped';

export interface QARound {
  id: ResourceId;
  practice_session_id: ResourceId;
  state: QARoundState;
  questions: Question[];
  answers: Answer[];
  current_question_id: ResourceId | null;
  follow_up_count: number;
  version: number;
}

export interface Question {
  id: ResourceId;
  practice_session_id: ResourceId;
  kind: QuestionKind;
  position: number;
  text: string;
  reason: string;
  rubric_dimension: string;
  evidence_ids: string[];
  parent_answer_id?: ResourceId;
  state: QuestionState;
}

export interface Answer {
  id: ResourceId;
  question_id: ResourceId;
  answered_by: ResourceId;
  status: AnswerStatus;
  audio_asset_version_id?: ResourceId;
  transcript_artifact_id?: ResourceId;
  duration_ms?: DurationMs;
  submitted_at?: UtcTimestamp;
}

/** Response from POST /questions/{id}/answer-upload-intents */
export interface AnswerUploadIntentResponse {
  answer: Answer;
  upload_intent: UploadIntent;
}

// ================= Reports =================

export interface ScoreComponent {
  dimension: string;
  status: 'scored' | 'not_evaluated';
  configured_weight: number;
  normalized_score?: NormalizedScore | null;
  display_score?: number | null;
  label?: 'needs_work' | 'developing' | 'good' | 'strong' | null;
  effective_weight?: number | null;
  evidence_ids: string[];
  rationale?: string | null;
  limitation_code?: string | null;
}

export interface Finding {
  id: string;
  kind: 'strength' | 'improvement' | 'alignment' | 'contradiction' | 'omission' | 'observation';
  title: string;
  detail: string;
  recommendation?: string | null;
  evidence_ids: string[];
  rubric_dimension?: string | null;
  speaker_labels: string[];
}

export interface FeedbackSection {
  summary: string;
  strengths: Finding[];
  improvements: Finding[];
  score_components: ScoreComponent[];
  limitations: Array<Record<string, unknown>>;
}

export interface MemberFeedback {
  user_id: ResourceId;
  display_name: string;
  speaker_labels: string[];
  summary: string;
  strengths: Finding[];
  improvements: Finding[];
  delivery_components: ScoreComponent[];
  qa_feedback?: FeedbackSection | null;
}

export interface Report {
  schema_version: number;
  report_id: ResourceId;
  practice_session_id: ResourceId;
  evaluation_id: ResourceId;
  title: string;
  executive_summary: string;
  overall_score: NormalizedScore;
  score_components: ScoreComponent[];
  team_feedback: FeedbackSection;
  member_feedback: MemberFeedback[];
  transcript_timeline: Array<Record<string, unknown>>;
  document_alignment: Array<Record<string, unknown>>;
  qa_review: Array<Record<string, unknown>>;
  recommendations: string[];
  limitations: Array<Record<string, unknown>>;
  reproducibility: Record<string, unknown>;
  generated_at: UtcTimestamp;
}

export interface ReportExport {
  id: ResourceId;
  report_id: ResourceId;
  practice_session_id: ResourceId;
  format: 'pdf';
  status: 'queued' | 'rendering' | 'ready' | 'failed';
  asset_version_id?: ResourceId | null;
  failure?: SafeFailure | null;
  created_at: UtcTimestamp;
  completed_at?: UtcTimestamp | null;
}

// ================= Erasure =================

export interface ErasureStep {
  store: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  attempts: number;
}

export interface ErasureRequest {
  id: ResourceId;
  scope: 'asset' | 'practice_session' | 'project' | 'team';
  scope_id: ResourceId;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  requested_by: ResourceId;
  requested_at: UtcTimestamp;
  deadline_at: UtcTimestamp;
  completed_at?: UtcTimestamp;
  steps: ErasureStep[];
}

// ================= SSE Events =================

export interface SseSessionEvent {
  sequence: number;
  practice_session_id: ResourceId;
  occurred_at: UtcTimestamp;
  trace_id: string;
}

export interface SessionUpdatedEvent extends SseSessionEvent {
  version: number;
  state: SessionState;
  current_attempt?: number;
}

export interface AnalysisProgressedEvent extends SseSessionEvent {
  analysis_attempt_id: ResourceId;
  analysis_attempt_number: number;
  stage: AnalysisStage;
  status: StageStatus;
  progress: number;
}

export interface QuestionAvailableEvent extends SseSessionEvent {
  qa_round_id: ResourceId;
  question_id: ResourceId;
  position: number;
  kind: QuestionKind;
  state: 'active';
  version: number;
}

export interface AnswerUpdatedEvent extends SseSessionEvent {
  qa_round_id: ResourceId;
  question_id: ResourceId;
  answer_id: ResourceId;
  status: 'submitted' | 'skipped';
  version: number;
}

export interface ReportReadyEvent extends SseSessionEvent {
  report_id: ResourceId;
  evaluation_id: ResourceId;
  status: 'ready';
  version: number;
}

export interface ErasureUpdatedEvent extends SseSessionEvent {
  erasure_request_id: ResourceId;
  scope: 'practice_session' | 'project' | 'team' | 'asset';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
}

export type ResyncReason =
  | 'cursor_missing'
  | 'cursor_trimmed'
  | 'cursor_expired'
  | 'cursor_future';

export interface ResyncRequiredEvent extends SseSessionEvent {
  reason: ResyncReason;
  current_sequence: number;
  requested_sequence?: number;
}
