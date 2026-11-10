import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ikyflzhgfnxlucqhskq.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_2IuOF2UaJKyd3jUiUFCRLQ_VxF8lFvu';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);