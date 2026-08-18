import { NextResponse } from "next/server";
import { ensureSchema, getPool } from "@/lib/db";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await ensureSchema();
  const { id } = await params;
  const pool = getPool();
  await pool.query(`DELETE FROM documents WHERE id = $1`, [id]);
  return NextResponse.json({ ok: true });
}
