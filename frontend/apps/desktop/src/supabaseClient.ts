/**
 * supabaseClient.ts
 * 데스크톱 애플리케이션 공통 Supabase 클라이언트 단일 인스턴스 (SSOT)
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://lkohpffieaanwhohttbu.supabase.co';
const SUPABASE_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxrb2hwZmZpZWFhbndob2h0dGJ1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5Mjk4OTE5NCwiZXhwIjoyMTA4NTY1MTk0fQ.v5dNs-0ydVQ5zJe4JlUqBB6Up_f1puLD8sCfLBIBmC8';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in .env');
}

export const supabase = createClient(SUPABASE_URL || '', SUPABASE_KEY || '');
