import {
  createClient,
} from '@supabase/supabase-js';

export const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL ??
  'https://qkrouzxgiowpnjfbaokh.supabase.co';

export const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFrcm91enhnaW93cG5qZmJhb2toIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1NzMyMjIsImV4cCI6MjA5NjE0OTIyMn0.PLNx8bWaKupmqqtvNooWmo2-gRrpO26Ynba2SiKNUFU';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default supabase;