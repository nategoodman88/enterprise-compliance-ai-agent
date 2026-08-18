import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { getDocumentFileSignedUrl } from "@/lib/supabase";

// Redirects to a short-lived signed URL for the original uploaded file.
// The storage bucket is private, so downloads always go through this route
// rather than exposing a public/static file URL to the client.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const pool = getPool();

  const { rows } = await pool.query<{ storage_path: string | null }>(
    `SELECT storage_path FROM documents WHERE id = $1`,
    [id]
  );

  if (!rows[0]?.storage_path) {
    return NextResponse.json({ error: "No stored file for this document." }, { status: 404 });
  }

  const signedUrl = await getDocumentFileSignedUrl(rows[0].storage_path);
  return NextResponse.redirect(signedUrl);
}
