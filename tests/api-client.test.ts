import { describe, it, expect } from 'vitest';
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
  });

  it('allows toggling mock state dynamically', async () => {
    const client = new ApiClient({ useMock: false });
    expect(client.isMocking()).toBe(false);

    client.setUseMock(true);
    expect(client.isMocking()).toBe(true);

    const user = await client.getMe();
    expect(user.email).toBe('alex@example.com');
  });
});
