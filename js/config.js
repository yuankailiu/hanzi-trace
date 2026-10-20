// Cloud sync for 俠客帳號. Leave empty to keep progress on this device only.
// Fill in from Supabase → Project Settings → API (the anon/public key is safe to publish;
// the profiles table is only reachable through the passcode-checked functions in supabase/schema.sql).
const CLOUD = {
  url: '',
  anonKey: '',
};
