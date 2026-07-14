import { createClient } from "@supabase/supabase-js";
import { getSupabaseEnv, STORAGE_BUCKET } from "./env";

export interface SignedUpload {
  uploadUrl: string;
  token: string;
  publicUrl: string;
  path: string;
}

/**
 * Step 1 of the direct-upload flow: create a signed URL the browser PUTs the
 * file to. The file never passes through our server (Vercel's 4.5MB body limit).
 */
export async function createSignedUpload(objectPath: string): Promise<SignedUpload> {
  const env = getSupabaseEnv();
  if (!env) throw new Error("createSignedUpload requires Supabase configuration");
  const client = createClient(env.url, env.secretKey, { auth: { persistSession: false } });
  const { data, error } = await client.storage
    .from(STORAGE_BUCKET)
    .createSignedUploadUrl(objectPath);
  if (error) throw new Error(`Storage error: ${error.message}`);
  const { data: pub } = client.storage.from(STORAGE_BUCKET).getPublicUrl(objectPath);
  return {
    uploadUrl: data.signedUrl,
    token: data.token,
    publicUrl: pub.publicUrl,
    path: objectPath,
  };
}
