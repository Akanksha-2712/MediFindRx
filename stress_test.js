import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Error: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const NUM_USERS = 50;
// Remove hardcoded IDs

async function simulateUser(i, pid, did) {
    const { data, error } = await supabase
        .from('reservations')
        .insert([
            {
                pharmacy_id: pid,
                drug_id: did,
                customer_name: `StressUser_${i}`,
                otp: '123456',
                status: 'pending',
                quantity: 1
            }
        ])
        .select()
        .single();

    if (error) {
        console.error(`User ${i} failed:`, error.message);
        return null;
    }
    return data.id;
}

async function runStressTest() {
    console.log("Fetching valid test data...");
    const { data: pharmacies } = await supabase.from('pharmacies').select('id').limit(1);
    const { data: drugs } = await supabase.from('drugs').select('id').limit(1);

    if (!pharmacies?.length || !drugs?.length) {
        console.error("❌ No pharmacies or drugs found in DB to test with.");
        return;
    }

    const PHARMACY_ID = pharmacies[0].id;
    const DRUG_ID = drugs[0].id;

    // Check initial Stock
    const { data: inventory } = await supabase
        .from('inventory')
        .select('stock')
        .eq('pharmacy_id', PHARMACY_ID)
        .eq('drug_id', DRUG_ID)
        .single();

    const startStock = inventory ? inventory.stock : 0;
    console.log(`Using Pharmacy ID: ${PHARMACY_ID}, Drug ID: ${DRUG_ID}`);
    console.log(`Initial Stock: ${startStock}`);

    console.log(`Starting stress test with ${NUM_USERS} concurrent users...`);

    const promises = [];
    for (let i = 0; i < NUM_USERS; i++) {
        promises.push(simulateUser(i, PHARMACY_ID, DRUG_ID));
    }

    const results = await Promise.all(promises);
    const createdIds = results.filter(id => id !== null);

    console.log(`Created ${createdIds.length}/${NUM_USERS} reservations.`);

    if (createdIds.length === NUM_USERS) {
        console.log("✅ Concurrency Test Passed: System handled 50 simultaneous inserts.");
    } else {
        console.error("❌ Concurrency Test Partial Failure.");
    }

    console.log("\n--- Starting Confirmation Phase (Inventory Check) ---");
    let confirmedCount = 0;
    let rejectedCount = 0;

    // Process confirmations sequentially to clearly see limits (or parallel to test race conditions)
    // Let's do parallel to test the trigger's locking!
    const confirmPromises = createdIds.map(async (id) => {
        const { error } = await supabase
            .from('reservations')
            .update({ status: 'confirmed' })
            .eq('id', id);

        if (!error) return 'confirmed';
        if (error.message.includes('Insufficient stock')) return 'rejected_stock';
        return `error: ${error.message}`;
    });

    const confirmResults = await Promise.all(confirmPromises);

    confirmedCount = confirmResults.filter(r => r === 'confirmed').length;
    const stockRejects = confirmResults.filter(r => r === 'rejected_stock').length;
    const otherErrors = confirmResults.filter(r => r.startsWith('error'));

    console.log(`Expected to confirm: ${Math.min(createdIds.length, startStock)}`);
    console.log(`Actually Confirmed: ${confirmedCount}`);
    console.log(`Rejected (Insufficient Stock): ${stockRejects}`);

    if (otherErrors.length > 0) {
        console.log("Other Errors:", otherErrors);
    }

    if (confirmedCount <= startStock && (confirmedCount + stockRejects === createdIds.length)) {
        console.log("✅ INVENTORY INTEGRITY VERIFIED: No overselling occurred.");
    } else if (confirmedCount > startStock) {
        console.error("❌ FAILURE: Oversold! Confirmed > Stock.");
    } else {
        console.log("⚠️ inconclusive results, check logs.");
    }
}

runStressTest();
