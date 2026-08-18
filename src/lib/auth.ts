import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { createClient } from "./supabase/server";

type AuthResult = { user: User } | { error: NextResponse };

// The proxy already blocks unauthenticated requests before they reach a
// route handler, but route handlers check again here rather than trusting
// that - it's cheap, and it's what actually determines the user_id used to
// scope every query.
export async function getAuthedUser(): Promise<AuthResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { user };
}
