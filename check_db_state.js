
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://raggrackqlfpawjxoawm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhZ2dyYWNrcWxmcGF3anhvYXdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4MTc5MDMsImV4cCI6MjA4MDM5MzkwM30.hQqxRBbhA93vp_32i2WoBfPS4GLGskXy45xyiJS6s4c';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log("Checking database state...");

    // Check validation of app_feedback
    const { error: feedbackError } = await supabase.from('app_feedback').select('id').limit(1);

    if (feedbackError) {
        if (feedbackError.code === '42P01') {
            console.log("RESULT: app_feedback table DOES NOT exist.");
        } else {
            console.log("RESULT: app_feedback error:", feedbackError.message);
        }
    } else {
        console.log("RESULT: app_feedback table EXISTS.");
    }

    // Check pharmacy_responses column
    const { error: responseError } = await supabase.from('pharmacy_responses').select('drug_id').limit(1);
    if (responseError) {
        console.log("RESULT: pharmacy_responses.drug_id column likely MISSING or error:", responseError.message);
    } else {
        console.log("RESULT: pharmacy_responses.drug_id column EXISTS.");
    }
}

check();
