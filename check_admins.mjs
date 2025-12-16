
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://raggrackqlfpawjxoawm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhZ2dyYWNrcWxmcGF3anhvYXdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4MTc5MDMsImV4cCI6MjA4MDM5MzkwM30.hQqxRBbhA93vp_32i2WoBfPS4GLGskXy45xyiJS6s4c';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAdmins() {
    console.log("Checking for admins in 'public.profiles'...");

    const { data, error } = await supabase
        .from('profiles')
        .select('id, email, name, role')
        .eq('role', 'admin');

    if (error) {
        console.error("Error fetching admins:", error);
    } else {
        if (data.length === 0) {
            console.log("No admins found.");
        } else {
            console.log("Found Admins:");
            data.forEach(user => {
                console.log(`- Name: ${user.name}, Email: ${user.email}, ID: ${user.id}`);
            });
        }
    }
}

checkAdmins();
