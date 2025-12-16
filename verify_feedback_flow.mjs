
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://raggrackqlfpawjxoawm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhZ2dyYWNrcWxmcGF3anhvYXdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4MTc5MDMsImV4cCI6MjA4MDM5MzkwM30.hQqxRBbhA93vp_32i2WoBfPS4GLGskXy45xyiJS6s4c';

const supabase = createClient(supabaseUrl, supabaseKey);

async function runVerification() {
    console.log("Starting Verification...");

    // 1. Create Test User
    const email = `verifier_${Date.now()}@gmail.com`;
    const password = 'password123';

    // Sign up
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email, password
    });

    if (authError) {
        console.error("Auth Failed:", authError.message);
        return;
    }

    let userId = authData.user?.id;

    // Supabase might require email confirmation. If so, we can't easily insert RLS controlled rows unless we ignore RLS or use service key (which we don't have, only anon).
    // However, if we just want to verify connectivity and public insert policies (or authenticated ones assuming auto-confirm is on for dev).
    // Let's assume auto-confirm is on for this dev instance.

    console.log("Test User Created:", userId);

    // If no user (e.g. email confirmation required and session null), we might fail.
    if (!authData.session) {
        console.log("Warning: No active session. Email confirmation may be required. Attempting to sign in (might fail if not confirmed)...");
        // Try sign in?
    }

    // 2. Get a Pharmacy
    const { data: pharmacies } = await supabase.from('pharmacies').select('id').limit(1);
    const pharmacyId = pharmacies && pharmacies.length > 0 ? pharmacies[0].id : null;

    if (!pharmacyId) {
        console.log("No pharmacies found. Skipping feedback insert.");
    } else {
        // 3. Insert Feedback
        console.log(`Inserting feedback for pharmacy ${pharmacyId}...`);
        const { data: feedback, error: feedbackError } = await supabase
            .from('app_feedback')
            .insert([{
                user_id: userId,
                pharmacy_id: pharmacyId,
                pharmacy_rating: 5,
                app_rating: 4,
                suggestion: "Verification Test"
            }])
            .select()
            .single();

        if (feedbackError) {
            console.error("Feedback Insert Failed:", feedbackError.message);
        } else {
            console.log("Feedback Insert Success:", feedback);
        }
    }

    // 4. Verify Drug ID logic (Schema Check)
    // Create Request
    const { data: request, error: reqError } = await supabase.from('medicine_requests').insert([{
        user_id: userId,
        drug_name: 'Test Drug',
        latitude: 0,
        longitude: 0
    }]).select().single();

    if (reqError) {
        console.log("Request Insert Error:", reqError.message);
    } else if (request) {
        // Try Inserting Response
        const { error: responseError } = await supabase.from('pharmacy_responses').insert([{
            request_id: request.id,
            pharmacy_id: pharmacyId,
            status: 'available',
            price: 100
        }]);

        if (responseError) {
            console.log("Response Insert Error:", responseError.message);
        } else {
            console.log("Response Insert Success (Schema valid).");
        }
    }

    console.log("Verification Complete.");
}

runVerification();
