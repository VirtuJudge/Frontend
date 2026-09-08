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

export * from "./middleware";
export * from "./cookies";
export * from "./jwt";
export * from "./supabase";
