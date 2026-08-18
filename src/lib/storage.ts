import { createClient } from "@supabase/supabase-js";

// Server-only client using the service role key, which bypasses Row Level
// Security - appropriate here since there's no end-user auth yet and all
// storage access goes through our own API routes. Never expose this client
// or its key to the browser.
const globalForSupabase = globalThis as unknown as {
  supabaseAdmin?: ReturnType<typeof createClient>;
};

export const POLICY_DOCUMENTS_BUCKET = "policy-documents";

export function getSupabaseAdmin() {
  if (!globalForSupabase.supabaseAdmin) {
    const url = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceRoleKey) {
      throw new Error(
        "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set to store uploaded files."
      );
    }
    globalForSupabase.supabaseAdmin = createClient(url, serviceRoleKey, {
      auth: { persistSession: false },
    });
  }
  return globalForSupabase.supabaseAdmin;
}

export async function uploadDocumentFile(
  documentId: string,
  filename: string,
  buffer: ArrayBuffer,
  mimeType: string
): Promise<string> {
  const path = `${documentId}/${filename}`;
  const { error } = await getSupabaseAdmin()
    .storage.from(POLICY_DOCUMENTS_BUCKET)
    .upload(path, buffer, { contentType: mimeType, upsert: true });

  if (error) {
    throw new Error(`Failed to store uploaded file: ${error.message}`);
  }
  return path;
}

export async function getDocumentFileSignedUrl(
  storagePath: string,
  expiresInSeconds = 60
): Promise<string> {
  const { data, error } = await getSupabaseAdmin()
    .storage.from(POLICY_DOCUMENTS_BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds);

  if (error || !data) {
    throw new Error(`Failed to create a download link: ${error?.message ?? "unknown error"}`);
  }
  return data.signedUrl;
}

export async function deleteDocumentFile(storagePath: string): Promise<void> {
  const { error } = await getSupabaseAdmin().storage.from(POLICY_DOCUMENTS_BUCKET).remove([storagePath]);
  if (error) {
    console.error(`Failed to delete stored file "${storagePath}": ${error.message}`);
  }
}
