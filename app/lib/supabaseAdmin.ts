import { createClient, type SupabaseClient } from "@supabase/supabase-js"

let cachedClient: SupabaseClient | null = null

export function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Faltan variables de entorno de Supabase para admin. Configura NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY."
    )
  }

  if (!cachedClient) {
    cachedClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  }

  return cachedClient
}
