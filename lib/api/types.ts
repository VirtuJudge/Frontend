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
}

export interface InvitationPreview {
  team_name: string;
  inviter_display_name: string;
  email_masked: string;
  expires_at: UtcTimestamp;
  status: InvitationStatus;
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

export type AssetKind = 'presentation_video' | 'supporting_document' | 'answer_audio';
export type AssetState = 'pending' | 'uploading' | 'uploaded' | 'verified' | 'failed' | 'erased';

export interface Asset {
  id: ResourceId;
  project_id: ResourceId;
  kind: AssetKind;
  file_name: string;
  media_type: string;
  size_bytes: number;
  state: AssetState;
  checksum?: Checksum;
  created_at: UtcTimestamp;
  version_id?: ResourceId;
}

export interface UploadIntent {
  asset_id: ResourceId;
  version_id: ResourceId;
  upload_url: string;
  expires_at: UtcTimestamp;
  required_headers?: Record<string, string>;
}

export interface CreateUploadIntentRequest {
  kind: AssetKind;
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
  | 'processing'
  | 'speaker_mapping'
  | 'qa'
  | 'report_pending'
  | 'completed'
  | 'failed';

export type AnalysisStage =
  | 'ingestion'
  | 'transcription'
  | 'diarization'
  | 'vision'
  | 'audio'
  | 'grounding';

export type StageStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';

export interface StageProgress {
  stage: AnalysisStage;
  status: StageStatus;
  progress_pct?: number;
  error_message?: string;
}

export interface SpeakerMapping {
  speaker_id: string;
  label: string;
  assigned_user_id?: ResourceId;
  confidence: number;
}

export interface ConsentRecord {
  policy_version: string;
  affirmed_at: UtcTimestamp;
  affirmed_by: ResourceId;
}

export interface PracticeSession {
  id: ResourceId;
  project_id: ResourceId;
  state: SessionState;
  manifest_frozen: boolean;
  presentation_asset_id: ResourceId;
  document_asset_ids: ResourceId[];
  stages: StageProgress[];
  speaker_mappings?: SpeakerMapping[];
  consent?: ConsentRecord;
  created_at: UtcTimestamp;
  version: number;
}

// ================= Q&A and Reports =================

export type QuestionType = 'primary' | 'follow_up';
export type QuestionStatus = 'active' | 'answered' | 'skipped';

export interface EvidenceReference {
  asset_id: ResourceId;
  source_type: 'video' | 'document' | 'audio';
  start_ms?: number;
  end_ms?: number;
  page_number?: number;
  excerpt: string;
}

export interface Question {
  id: ResourceId;
  session_id: ResourceId;
  sequence: number;
  type: QuestionType;
  text: string;
  reason: string;
  rubric_dimension: string;
  evidence_references: EvidenceReference[];
  status: QuestionStatus;
}

export interface Answer {
  id: ResourceId;
  question_id: ResourceId;
  status: 'submitted' | 'skipped';
  asset_id?: ResourceId;
  transcript?: string;
  duration_ms?: DurationMs;
  submitted_at: UtcTimestamp;
}

export interface MemberFeedback {
  user_id?: ResourceId;
  speaker_id: string;
  score: NormalizedScore;
  strengths: string[];
  areas_for_improvement: string[];
  transcript_citations: string[];
}

export interface Report {
  id: ResourceId;
  session_id: ResourceId;
  status: 'pending' | 'ready';
  team_score: NormalizedScore;
  team_feedback: string;
  member_feedback: MemberFeedback[];
  created_at: UtcTimestamp;
  pdf_download_url?: string;
}
