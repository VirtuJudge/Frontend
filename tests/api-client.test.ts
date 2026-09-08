import { describe, it, expect, vi } from 'vitest';
import { ApiClient, API_ENDPOINTS, MOCK_DATA } from '@/lib/api/client';

describe('API Client Boundary', () => {
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

  it('runs against mocked backend responses when configured with useMock', async () => {
    const client = new ApiClient({ useMock: true });
    expect(client.isMocking()).toBe(true);

    const user = await client.getMe();
    expect(user).toBeDefined();
    expect(user.id).toBe(MOCK_DATA.user.id);
    expect(user.display_name).toBe(MOCK_DATA.user.display_name);

    const teams = await client.getTeams();
    expect(teams.items.length).toBeGreaterThan(0);
    expect(teams.items[0].name).toBe(MOCK_DATA.teams[0].name);

    const projects = await client.getProjects(teams.items[0].id);
    expect(projects.items.length).toBeGreaterThan(0);
    expect(projects.items[0].name).toBe(MOCK_DATA.projects[0].name);

    const session = await client.getPracticeSession('any-id');
    expect(session.state).toBe('ready');
    expect(session.stages.length).toBe(6);

    const questions = await client.getQuestions('any-id');
    expect(questions.length).toBe(3);
    expect(questions[0].evidence_references.length).toBeGreaterThan(0);

    const report = await client.getReport('any-id');
    expect(report.status).toBe('ready');
    expect(report.team_score).toBeGreaterThan(0);

    const members = await client.getTeamMembers(teams.items[0].id);
    expect(members.items.length).toBe(3);
    expect(members.items[0].role).toBe('owner');

    const invitations = await client.getTeamInvitations(teams.items[0].id);
    expect(invitations.items.length).toBe(3);
    expect(invitations.items[0].status).toBe('pending');
    expect(invitations.items[0].delivery_status).toBe('accepted_by_gmail');

    const newInv = await client.createInvitation(teams.items[0].id, 'newuser@example.com');
    expect(newInv.email).toBe('newuser@example.com');
    expect(newInv.delivery_status).toBe('accepted_by_gmail');

    const resent = await client.resendInvitation(teams.items[0].id, newInv.id);
    expect(resent.delivery_attempts).toBe(2);

    await client.revokeInvitation(teams.items[0].id, newInv.id);
    const afterRevoke = await client.getTeamInvitations(teams.items[0].id);
    expect(afterRevoke.items.some(i => i.id === newInv.id)).toBe(false);

    await client.removeTeamMember(teams.items[0].id, members.items[1].user_id);
    const afterRemove = await client.getTeamMembers(teams.items[0].id);
    expect(afterRemove.items.some(m => m.user_id === members.items[1].user_id)).toBe(false);
  });

  it('allows toggling mock state dynamically', async () => {
    const client = new ApiClient({ useMock: false });
    expect(client.isMocking()).toBe(false);

    client.setUseMock(true);
    expect(client.isMocking()).toBe(true);

    const user = await client.getMe();
    expect(user.email).toBe('alex@example.com');
  });

  it('retrieves token from localStorage and attaches Bearer authorization header to request', async () => {
    localStorage.setItem('auth_token', 'test_local_token_xyz');
    const client = new ApiClient({ useMock: false });

    let capturedHeaders: Record<string, string> = {};
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, init) => {
      capturedHeaders = (init?.headers as Record<string, string>) || {};
      return new Response(JSON.stringify({ id: 'u1', email: 'test@example.com' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    try {
      const user = await client.getMe();
      expect(user.id).toBe('u1');
      expect(capturedHeaders['Authorization']).toBe('Bearer test_local_token_xyz');
    } finally {
      fetchSpy.mockRestore();
      localStorage.removeItem('auth_token');
    }
  });
});
