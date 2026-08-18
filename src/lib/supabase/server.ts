import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// A Supabase client bound to the current request's cookies, acting as the
// signed-in user (via the `anon` key + their session cookie) rather than the
// service role. Used for auth only (sign in/out, reading the session) -
// server code that touches app data still goes through `pg` in lib/db.ts.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Called from a Server Component, which can't set cookies - the
          // proxy (src/proxy.ts) refreshes the session on every request
          // instead, so this is safe to ignore here.
        }
      },
    },
  });
}
