import type {
  User,
  Team,
  Page,
  InvitationPreview,
  InvitationStatus,
  TeamMembership,
  TeamInvitation,
  TeamRole,
} from "../types";
import { BaseClient, API_ENDPOINTS } from "./base";

export class TeamsClient extends BaseClient {
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
}
