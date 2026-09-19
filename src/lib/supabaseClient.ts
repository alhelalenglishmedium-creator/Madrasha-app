import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pupleaopydtjqlcplaha.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1cGxlYW9weWR0anFsY3BsYWhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyNDE0ODcsImV4cCI6MjEwMzgxNzQ4N30.amZEKNxP1xpo8BLs8t0MdbNIwu9CCdwE252iMTn78mU';

if (typeof window !== 'undefined' && (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)) {
  console.error("Supabase Environment Variables Missing in Browser!");
}

// সিঙ্গলটন ক্লায়েন্ট ইনস্ট্যান্স (Multiple GoTrueClient instances ওয়ার্নিং রোধে)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// ব্যাকওয়ার্ড কম্প্যাটিবিলিটির জন্য একই ক্লায়েন্ট অবজেক্ট রেফারেন্স প্রদান
export const supabaseAnon = supabase;
