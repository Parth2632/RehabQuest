// Import Supabase client
import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://pzgmtpnqzebnzrbkhfjg.supabase.co';
const supabasePublicKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6Z210cG5xemVibnpyYmtoZmpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxNTg2NTUsImV4cCI6MjA3MDczNDY1NX0.MIGvkphasum4mXdv2vxShk2m19_3u0E-BWaTeijO_G4';

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabasePublicKey);

// Export Supabase client for use in components
export { supabase };
