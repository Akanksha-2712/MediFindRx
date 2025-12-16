
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://raggrackqlfpawjxoawm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhZ2dyYWNrcWxmcGF3anhvYXdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4MTc5MDMsImV4cCI6MjA4MDM5MzkwM30.hQqxRBbhA93vp_32i2WoBfPS4GLGskXy45xyiJS6s4c';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testRegistration() {
    const email = `test_node_${Date.now()}@gmail.com`;
    const password = 'password123';

    console.log(`Attempting registration for: ${email}`);

    try {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    name: 'Test Node User',
                    role: 'pharmacy'
                }
            }
        });

        if (error) {
            console.error("REGISTRATION_ERROR:", error.message);
            console.error("Full Error:", error);
        } else {
            console.log("REGISTRATION_SUCCESS");
            console.log("User ID:", data.user?.id);
            console.log("Session:", data.session ? "Created" : "Null (Email Confirmation might be on)");
        }
    } catch (err) {
        console.error("UNEXPECTED_ERROR:", err);
    }
}

testRegistration();
