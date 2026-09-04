export interface AuthUser {
  id: string;
  email: string;
  display_name: string;
}

export interface AuthSession {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
}
