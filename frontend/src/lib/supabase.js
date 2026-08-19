import { createClient } from '@supabase/supabase-js';

// Récupère ces valeurs depuis Supabase (Settings → API)
const SUPABASE_URL = 'https://pyirolvqzwhwovdxmavh.supabase.co' // Remplace par ton URL
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5aXJvbHZxendod292ZHhtYXZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY0MjQ4MDAsImV4cCI6MjEwMjAwMDgwMH0.ND3C4q4ld_gSyCD2QfRsQzwsT76x5_ew04KJAPDpSaA'; // Remplace par ta clé publique

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);