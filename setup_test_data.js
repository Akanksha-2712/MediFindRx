import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function setup() {
    console.log("Setting up test data...");
    // Update first pharmacy to have coordinates
    const { data: pharm } = await supabase.from('pharmacies').select('id').limit(1).single();
    if (pharm) {
        const { error } = await supabase
            .from('pharmacies')
            .update({ latitude: 40.7128, longitude: -74.0060 })
            .eq('id', pharm.id);

        if (error) console.error("❌ Setup Failed:", error.message);
        else console.log(`✅ Updated Pharmacy ${pharm.id} with coordinates.`);
    } else {
        console.error("❌ No pharmacies found.");
    }
}

setup();
