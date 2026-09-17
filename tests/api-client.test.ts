import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ApiClient, API_ENDPOINTS } from '@/lib/api/client';

describe('API Client Boundary', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    localStorage.clear();
  });

  it('keeps all API endpoint strings centralized in API_ENDPOINTS', () => {
    expect(API_ENDPOINTS.me).toBe('/me');
    expect(API_ENDPOINTS.teams).toBe('/teams');
    expect(API_ENDPOINTS.team('team_123')).toBe('/teams/team_123');
    expect(API_ENDPOINTS.teamProjects('team_123')).toBe('/teams/team_123/projects');
    expect(API_ENDPOINTS.project('proj_123')).toBe('/projects/proj_123');
    expect(API_ENDPOINTS.practiceSession('sess_123')).toBe('/practice-sessions/sess_123');
    expect(API_ENDPOINTS.cancelPracticeSession('sess_123')).toBe('/practice-sessions/sess_123/cancel');
    expect(API_ENDPOINTS.analysisAttempts('sess_123')).toBe('/practice-sessions/sess_123/analysis-attempts');
    expect(API_ENDPOINTS.questions('sess_123')).toBe('/practice-sessions/sess_123/questions');
    expect(API_ENDPOINTS.report('sess_123')).toBe('/practice-sessions/sess_123/report');
    expect(API_ENDPOINTS.teamMembers('team_123')).toBe('/teams/team_123/members');
    expect(API_ENDPOINTS.teamMember('team_123', 'user_456')).toBe('/teams/team_123/members/user_456');
    expect(API_ENDPOINTS.teamInvitations('team_123')).toBe('/teams/team_123/invitations');
    expect(API_ENDPOINTS.resendInvitation('team_123', 'inv_789')).toBe('/teams/team_123/invitations/inv_789/resend');
    expect(API_ENDPOINTS.revokeInvitation('team_123', 'inv_789')).toBe('/teams/team_123/invitations/inv_789');
    expect(API_ENDPOINTS.invitationPreview('tok_abc')).toBe('/invitations/tok_abc');
    expect(API_ENDPOINTS.acceptInvitation('tok_abc')).toBe('/invitations/tok_abc/accept');
  });

  it('normalizes session status and sends the ready/analysis lifecycle commands', async () => {
    const client = new ApiClient({ baseUrl: '/api/v1', getToken: () => 'token' });

    fetchSpy
      .mockResolvedValueOnce(new Response(JSON.stringify({
        id: 'sess-1',
        project_id: 'project-1',
        created_by: 'user-1',
        name: 'Pitch',
        status: 'ready',
        version: 2,
        created_at: '2026-09-15T00:00:00Z',
        updated_at: '2026-09-15T00:00:00Z',
        manifest: null,
      }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        id: 'attempt-1',
        session_id: 'sess-1',
        status: 'queued',
        created_at: '2026-09-15T00:00:00Z',
        attempt_number: 1,
        version: 1,
      }), { status: 202, headers: { 'Content-Type': 'application/json' } }));

    const session = await client.updatePracticeSession(
      'sess-1',
      { presentation_asset_version_id: 'version-1' },
      1,
    );
    expect(session.state).toBe('ready');
    expect(fetchSpy.mock.calls[0][0]).toBe('/api/v1/practice-sessions/sess-1');
    expect(fetchSpy.mock.calls[0][1]).toEqual(expect.objectContaining({
      method: 'PATCH',
      headers: expect.objectContaining({ 'If-Match': '"1"' }),
    }));

    const attempt = await client.createAnalysisAttempt('sess-1', 'analysis-attempt-123');
    expect(attempt.status).toBe('queued');
    expect(fetchSpy.mock.calls[1][0]).toBe('/api/v1/practice-sessions/sess-1/analysis-attempts');
    expect(fetchSpy.mock.calls[1][1]).toEqual(expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ consent: { accepted: true, policy_version: 1 } }),
      headers: expect.objectContaining({ 'Idempotency-Key': 'analysis-attempt-123' }),
    }));
  });

  it('cancels a practice session through the production cancellation endpoint', async () => {
    const client = new ApiClient({ baseUrl: '/api/v1', getToken: () => 'token' });
    fetchSpy.mockResolvedValue(new Response(JSON.stringify({
      id: 'sess-1',
      project_id: 'project-1',
      created_by: 'user-1',
      name: 'Pitch',
      status: 'cancelled',
      version: 3,
      created_at: '2026-09-15T00:00:00Z',
      updated_at: '2026-09-15T00:00:00Z',
      manifest: null,
    }), { status: 202, headers: { 'Content-Type': 'application/json' } }));

    const session = await client.cancelPracticeSession(
      'sess-1',
      'cancel-session-key-123456',
    );

    expect(session.state).toBe('cancelled');
    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/v1/practice-sessions/sess-1/cancel',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ reason: null }),
        headers: expect.objectContaining({
          'Idempotency-Key': 'cancel-session-key-123456',
        }),
      }),
    );
  });

  it('dispatches requests to expected endpoints with proper HTTP methods', async () => {
    const client = new ApiClient({ baseUrl: '/api/v1' });

    fetchSpy.mockImplementation(
      async (url: RequestInfo | URL, init?: RequestInit) => {
        const urlStr = String(url);
        const method = init?.method || "GET";

      if (urlStr.endsWith('/me')) {
        return new Response(JSON.stringify({ id: 'u1', display_name: 'Alex', email: 'alex@example.com' }), { status: 200 });
      }
      if (urlStr.endsWith('/teams') && method === 'GET') {
        return new Response(JSON.stringify({ items: [{ id: 't1', name: 'Team Alpha' }], has_more: false }), { status: 200 });
      }
      if (urlStr.endsWith('/teams') && method === 'POST') {
        return new Response(JSON.stringify({ id: 't2', name: 'New Team' }), { status: 200 });
      }
      if (urlStr.endsWith('/teams/t1/projects')) {
        return new Response(JSON.stringify({ items: [{ id: 'p1', name: 'Project Alpha' }], has_more: false }), { status: 200 });
      }
      if (urlStr.endsWith('/practice-sessions/sess-1')) {
        return new Response(JSON.stringify({ id: 'sess-1', state: 'ready', stages: [] }), { status: 200 });
      }
      if (urlStr.endsWith('/practice-sessions/sess-1/qa')) {
        return new Response(JSON.stringify({
          id: 'qr-1',
          practice_session_id: 'sess-1',
          state: 'in_progress',
          questions: [{ id: 'q1', text: 'Question 1' }],
          answers: [],
          current_question_id: 'q1',
          follow_up_count: 0,
          version: 1,
        }), { status: 200 });
      }
      if (urlStr.endsWith('/practice-sessions/sess-1/report')) {
        return new Response(JSON.stringify({ report_id: 'rep-1', practice_session_id: 'sess-1', overall_score: 0.9 }), { status: 200 });
      }
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    });

    const user = await client.getMe();
    expect(user.id).toBe('u1');
    expect(user.display_name).toBe('Alex');

    const teams = await client.getTeams();
    expect(teams.items[0].name).toBe('Team Alpha');

    const createdTeam = await client.createTeam('New Team');
    expect(createdTeam.name).toBe('New Team');

    const projects = await client.getProjects('t1');
    expect(projects.items[0].name).toBe('Project Alpha');

    const session = await client.getPracticeSession('sess-1');
    expect(session.id).toBe('sess-1');

    const qaRound = await client.getQARound('sess-1');
    expect(qaRound.questions[0].id).toBe('q1');

    const report = await client.getReport('sess-1');
    expect(report.report_id).toBe('rep-1');
  });

  it('retrieves token from localStorage and attaches Bearer authorization header to request', async () => {
    localStorage.setItem('auth_token', 'test_local_token_xyz');
    const client = new ApiClient({ baseUrl: '/api/v1' });

    let capturedHeaders: Record<string, string> = {};
    fetchSpy.mockImplementation(
      async (_url: RequestInfo | URL, init?: RequestInit) => {
        capturedHeaders = (init?.headers as Record<string, string>) || {};
      return new Response(JSON.stringify({ id: 'u1', email: 'test@example.com' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    const user = await client.getMe();
    expect(user.id).toBe('u1');
    expect(capturedHeaders['Authorization']).toBe('Bearer test_local_token_xyz');
  });

  it('sends a JSON body when skipping without a reason', async () => {
    const client = new ApiClient({ baseUrl: '/api/v1', getToken: () => 'token' });
    fetchSpy.mockResolvedValue(new Response(JSON.stringify({
      id: 'answer-1',
      question_id: 'question-1',
      answered_by: 'user-1',
      status: 'skipped',
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));

    await client.skipAnswer('question-1', 'skip-key-123456789');

    expect(fetchSpy.mock.calls[0][1]).toEqual(expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ reason: null }),
    }));
  });

  it('normalizes the nested answer upload asset version id', async () => {
    const client = new ApiClient({ baseUrl: '/api/v1', getToken: () => 'token' });
    fetchSpy.mockResolvedValue(new Response(JSON.stringify({
      answer: {
        id: 'answer-1',
        question_id: 'question-1',
        answered_by: 'user-1',
        status: 'draft',
      },
      upload_intent: {
        asset_id: 'asset-1',
        asset_version_id: 'version-1',
        upload_url: 'https://storage.example.com/upload',
        method: 'PUT',
        required_headers: {},
        expires_at: '2026-09-15T00:00:00Z',
        maximum_size_bytes: 1024,
      },
    }), { status: 201, headers: { 'Content-Type': 'application/json' } }));

    const result = await client.createAnswerUploadIntent(
      'question-1',
      {
        file_name: 'answer.webm',
        declared_media_type: 'audio/webm',
        declared_size_bytes: 1024,
      },
      'answer-intent-key',
    );

    expect(result.upload_intent.version_id).toBe('version-1');
    expect(result.upload_intent.asset_version_id).toBe('version-1');
  });

  it('retries upload completion after a transient browser network failure', async () => {
    vi.useFakeTimers();
    const client = new ApiClient({ baseUrl: '/api/v1', getToken: () => 'token' });
    fetchSpy
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        id: 'asset-1',
        project_id: 'project-1',
        kind: 'presentation_video',
        state: 'verified',
        file_name: 'presentation.webm',
        created_by: 'user-1',
        created_at: '2026-09-15T00:00:00Z',
      }), { status: 202, headers: { 'Content-Type': 'application/json' } }));

    try {
      const completion = client.completeUpload(
        'asset-1',
        'version-1',
        {
          checksum: `sha256:${'a'.repeat(64)}`,
          size_bytes: 1024,
        },
        'complete-key-1',
      );
      await vi.advanceTimersByTimeAsync(1000);

      await expect(completion).resolves.toEqual(
        expect.objectContaining({ id: 'asset-1', state: 'verified' }),
      );
      expect(fetchSpy).toHaveBeenCalledTimes(2);
      expect(fetchSpy.mock.calls[1][1]).toEqual(expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'Idempotency-Key': 'complete-key-1' }),
      }));
    } finally {
      vi.useRealTimers();
    }
  });

  it('updates speaker mappings with strict optimistic concurrency', async () => {
    const client = new ApiClient({ baseUrl: '/api/v1', getToken: () => 'token' });
    fetchSpy.mockResolvedValue(new Response(JSON.stringify([]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));

    await client.saveSpeakerMappings(
      'session-1',
      [{ speaker_label: 'SPEAKER_00', user_id: 'user-1' }],
      3,
    );

    expect(fetchSpy.mock.calls[0][1]).toEqual(expect.objectContaining({
      method: 'PUT',
      headers: expect.objectContaining({ 'If-Match': '"3"' }),
      body: JSON.stringify({ mappings: [{ speaker_label: 'SPEAKER_00', user_id: 'user-1' }] }),
    }));
  });

  it('deletes a project with confirmation', async () => {
    const client = new ApiClient({ baseUrl: '/api/v1', getToken: () => 'token' });
    fetchSpy.mockResolvedValue(new Response(null, { status: 204 }));

    await client.deleteProject('project-123', 'My Pitch Project');

    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/v1/projects/project-123',
      expect.objectContaining({
        method: 'DELETE',
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ confirmation: 'My Pitch Project' }),
      }),
    );
  });

  it('deletes a practice session', async () => {
    const client = new ApiClient({ baseUrl: '/api/v1', getToken: () => 'token' });
    fetchSpy.mockResolvedValue(new Response(null, { status: 204 }));

    await client.deletePracticeSession('sess-456');

    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/v1/practice-sessions/sess-456',
      expect.objectContaining({
        method: 'DELETE',
      }),
    );
  });
});

