// Cloud sync for 俠客帳號. Leave empty to keep progress on this device only.
// From Supabase → Project Settings → API (the anon/public key is safe to publish;
// the profiles table is only reachable through the passcode-checked functions in supabase/schema.sql).
const CLOUD = {
  url: 'https://etcrwgifhkvimyeartpp.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0Y3J3Z2lmaGt2aW15ZWFydHBwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI0NjA4OTUsImV4cCI6MjEwODAzNjg5NX0.Tt1lSqjdgS80ZIqOKeiaYGLugISnXkh8jpVxKzlc-yo',
};
