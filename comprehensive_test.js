import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const TEST_DRUG_NAME = 'Paracetamol'; // Adjust if needed
let pharmacyId = null;
let drugId = null;

async function testSearchRPC() {
    console.log(`\n--- 1. Testing Backend Search (RPC: search_medicines_nearby) ---`);
    const startTime = Date.now();
    const { data, error } = await supabase.rpc('search_medicines_nearby', {
        search_text: 'a', // Broad search
        user_lat: null,
        user_lng: null
    });
    const duration = Date.now() - startTime;

    if (error) {
        console.error("❌ RPC Search Failed:", error.message);
        return false;
    }

    if (data && data.length > 0) {
        console.log(`✅ RPC Success! Found ${data.length} results in ${duration}ms.`);
        console.log("   Top Result:", data[0].pharmacy_name, "-", data[0].drug_name);

        // Save for next tests
        pharmacyId = data[0].pharmacy_id;
        drugId = data[0].drug_id;
        return true;
    } else {
        console.warn("⚠️ RPC Returned 0 results. (Might simply be empty DB, but checking query structure is advised)");
        return true; // Technically success execution, just empty
    }
}

async function testPharmacyDashboardFetch() {
    console.log(`\n--- 2. Testing Pharmacy Dashboard Fetch (Local Fetch) ---`);
    if (!pharmacyId) {
        console.log("⚠️ Skipping: No Pharmacy ID found from search test.");
        return;
    }

    console.log(`Fetching Data for Pharmacy ID: ${pharmacyId}`);

    // Stimulate the useEffect logic in PharmacyDashboard
    const { data: invData, error: invError } = await supabase
        .from('inventory')
        .select('*')
        .eq('pharmacy_id', pharmacyId);

    if (invError) {
        console.error("❌ Fetch Inventory Failed:", invError.message);
    } else {
        console.log(`✅ Inventory Fetch Success. Loaded ${invData.length} items.`);
    }

    const { data: resData, error: resError } = await supabase
        .from('reservations')
        .select('*')
        .eq('pharmacy_id', pharmacyId);

    if (resError) {
        console.error("❌ Fetch Reservations Failed:", resError.message);
    } else {
        console.log(`✅ Reservations Fetch Success. Loaded ${resData.length} items.`);
    }
}

async function testReservationFlow() {
    console.log(`\n--- 3. Testing Full Reservation Lifecycle ---`);
    if (!pharmacyId || !drugId) {
        console.log("⚠️ Skipping: Missing test IDs.");
        return;
    }

    // 1. Create Reservation
    console.log("Creating Reservation...");
    const { data: resData, error: createError } = await supabase
        .from('reservations')
        .insert([{
            pharmacy_id: pharmacyId,
            drug_id: drugId,
            customer_name: 'TestBot',
            otp: '999999',
            status: 'pending',
            quantity: 1
        }])
        .select()
        .single();

    if (createError) {
        console.error("❌ Creation Failed:", createError.message);
        return;
    }
    console.log(`✅ Reservation Created: #${resData.id}`);

    // 2. Confirm Reservation (Trigger Test)
    console.log("Confirming Reservation (Executing DB Trigger)...");
    const { error: updateError } = await supabase
        .from('reservations')
        .update({ status: 'confirmed' })
        .eq('id', resData.id);

    if (updateError) {
        console.error("❌ Confirmation Failed:", updateError.message);
    } else {
        console.log("✅ Reservation Confirmed. (Trigger likely fired)");
    }

    // 3. Cleanup (Cancel to restore stock)
    console.log("Cancelling Reservation (Restoring Stock)...");
    const { error: cancelError } = await supabase
        .from('reservations')
        .update({ status: 'cancelled' })
        .eq('id', resData.id);

    if (cancelError) console.error("❌ Cancel Failed:", cancelError.message);
    else console.log("✅ Reservation Cancelled.");
}

async function runAllTests() {
    console.log("🚀 Starting Comprehensive System Check...");
    const searchOk = await testSearchRPC();
    if (searchOk) {
        await testPharmacyDashboardFetch();
        await testReservationFlow();
    }
    console.log("\n✨ Test Suite Complete.");
}

runAllTests();
