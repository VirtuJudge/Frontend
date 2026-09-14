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
        return new Response(JSON.stringify({ id: 'rep-1', status: 'ready', team_score: 0.9 }), { status: 200 });
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
    expect(report.id).toBe('rep-1');
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
});
