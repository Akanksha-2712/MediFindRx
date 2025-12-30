import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function repro() {
    console.log("🕵️ Diagnosis: Attempting to verify fix...");

    // Test 1: Basic Search (Should pass)
    console.log("Test 1: NULL Location");
    const { error: err1 } = await supabase.rpc('search_medicines_nearby', {
        search_text: 'a',
        user_lat: null,
        user_lng: null
    });
    if (err1) console.error("❌ Test 1 Failed:", err1.message);
    else console.log("✅ Test 1 Passed");

    // Test 2: Math Domain Edge Case (Identical Location)
    // Targeting Pharmacy 39 which we updated
    const { data: pharm, error: fetchError } = await supabase
        .from('pharmacies')
        .select('latitude, longitude')
        .eq('id', 39)
        .single();

    if (fetchError) {
        console.error("❌ Failed to fetch Pharmacy 39:", fetchError.message);
    } else if (pharm && pharm.latitude !== null) {
        console.log(`Test 2: Exact Location Match (lat: ${pharm.latitude}, lng: ${pharm.longitude})`);

        // This is the CRITICAL TEST.
        // Without the fix, this throws a 500 error.
        // With the fix, it returns success (or empty list), but NOT an error.
        const { error: err2 } = await supabase.rpc('search_medicines_nearby', {
            search_text: 'a',
            user_lat: pharm.latitude,
            user_lng: pharm.longitude
        });

        if (err2) {
            console.error("❌ Test 2 FAILED. The 500 Fix is NOT working or NOT applied.", err2.message);
        } else {
            console.log("✅ Test 2 PASSED using exact coordinates. The Math Fix is Verified.");
        }
    } else {
        console.log("⚠️ Skipping Test 2 (Pharmacy 39 has no coordinates?).");
        console.log("   Data:", pharm);
    }

    // Test 3: Trigram Extension Check (Search with special chars)
    console.log("Test 3: Special Characters");
    const { error: err3 } = await supabase.rpc('search_medicines_nearby', {
        search_text: '%',
        user_lat: 0,
        user_lng: 0
    });
    if (err3) console.error("❌ Test 3 Failed:", err3.message);
    else console.log("✅ Test 3 Passed");
}

repro();
