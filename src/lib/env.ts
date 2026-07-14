// Server-side environment access. Supabase keys are optional: without them the
// app runs in local-storage development mode (data/ folder on disk).

export interface SupabaseEnv {
  url: string;
  secretKey: string;
}

export function getSupabaseEnv(): SupabaseEnv | null {
  const url = process.env.SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secretKey) return null;
  return { url, secretKey };
}

export function storageMode(): "supabase" | "local" {
  return getSupabaseEnv() ? "supabase" : "local";
}

/** Canonical public origin for QR codes and share links. */
export function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "http://localhost:3000";
}

export const STORAGE_BUCKET = "book-assets";
