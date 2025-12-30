import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function inspectTable() {
    console.log("Inspecting 'pharmacies' table...");
    // Try to select lat/lng. If it fails, they don't exist.
    const { data, error } = await supabase
        .from('pharmacies')
        .select('id, name, latitude, longitude')
        .limit(1);

    if (error) {
        console.error("❌ Error selecting lat/lng:", error.message);
        if (error.message.includes('does not exist')) {
            console.log("👉 DIAGNOSIS: Columns 'latitude' and 'longitude' are MISSING.");
        }
    } else {
        console.log("✅ Columns exist. Data:", data);
    }
}

inspectTable();
