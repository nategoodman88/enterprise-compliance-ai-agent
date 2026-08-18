import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { deleteDocumentFile } from "@/lib/storage";
import { withJsonErrors } from "@/lib/api-utils";
import { getAuthedUser } from "@/lib/auth";

export const DELETE = withJsonErrors(async (
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  const auth = await getAuthedUser();
  if ("error" in auth) return auth.error;
  const { user } = auth;

  const { id } = await params;
  const pool = getPool();

  const { rows } = await pool.query<{ storage_path: string | null }>(
    `SELECT storage_path FROM documents WHERE id = $1 AND user_id = $2`,
    [id, user.id]
  );

  await pool.query(`DELETE FROM documents WHERE id = $1 AND user_id = $2`, [id, user.id]);

  if (rows[0]?.storage_path) {
    await deleteDocumentFile(rows[0].storage_path);
  }

  return NextResponse.json({ ok: true });
});
