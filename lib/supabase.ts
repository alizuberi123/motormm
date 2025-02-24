import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing Supabase environment variables") // Debug log
  throw new Error("Missing Supabase environment variables")
}

console.log("Initializing Supabase client") // Debug log
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

