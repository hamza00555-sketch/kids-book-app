import { NextResponse } from "next/server";

/**
 * Visible, actionable errors: every API route returns the real failure message
 * so the dashboard can show it verbatim instead of "Internal Server Error".
 */
export function serverError(context: string, e: unknown): NextResponse {
  const detail = e instanceof Error ? e.message : String(e);
  let hint = "";
  if (/bucket/i.test(detail) || /storage/i.test(detail)) {
    hint = " — make sure the public bucket 'book-assets' exists in Supabase (see SETUP.md)";
  } else if (/relation .* does not exist/i.test(detail)) {
    hint = " — run the SQL migrations in supabase/migrations/ (see SETUP.md)";
  }
  console.error(`[${context}]`, e);
  return NextResponse.json({ error: `${context}: ${detail}${hint}` }, { status: 500 });
}

export function badRequest(message: string): NextResponse {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function notFound(message = "Not found"): NextResponse {
  return NextResponse.json({ error: message }, { status: 404 });
}
