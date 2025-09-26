// lib/supabaseClient.js
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://xbucbhxwapqzomulvfnc.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhidWNiaHh3YXBxem9tdWx2Zm5jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3MDA3NzEsImV4cCI6MjA3MzI3Njc3MX0.k9ADjrwU0BsTUGT4UtpEuxgPwuP_T3CeSzaPknndRcY";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
