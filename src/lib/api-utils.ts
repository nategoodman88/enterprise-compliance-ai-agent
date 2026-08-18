import { NextResponse } from "next/server";

// Wraps a route handler so any thrown/rejected error becomes a JSON error
// response instead of an uncaught exception. Without this, a failure deep in
// a route (e.g. a bad DB connection) produces a platform error page instead
// of JSON, which breaks every client-side `res.json()` call with an
// "unexpected end of JSON input"-style error instead of a readable message.
export function withJsonErrors<Args extends unknown[]>(
  handler: (request: Request, ...args: Args) => Promise<Response>
) {
  return async (request: Request, ...args: Args): Promise<Response> => {
    try {
      return await handler(request, ...args);
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : "Unexpected server error.";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  };
}
