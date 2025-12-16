
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://raggrackqlfpawjxoawm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhZ2dyYWNrcWxmcGF3anhvYXdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4MTc5MDMsImV4cCI6MjA4MDM5MzkwM30.hQqxRBbhA93vp_32i2WoBfPS4GLGskXy45xyiJS6s4c';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
    console.log("Testing connection to:", supabaseUrl);
    try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
            console.error("Connection Error:", error);
        } else {
            console.log("Connection Success! Session:", data.session ? "Active" : "None");
        }
    } catch (e) {
        console.error("Unexpected Error:", e);
    }
}

testConnection();
