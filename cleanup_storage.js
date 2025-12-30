import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const FILES_TO_DELETE = [
    'stress_test_file_0_1767034103835.bin',
    'stress_test_file_1_1767034103856.bin',
    'stress_test_file_2_1767034103882.bin',
    'stress_test_file_3_1767034103913.bin',
    'stress_test_file_4_1767034103933.bin'
];

async function cleanup() {
    console.log("Cleaning up test files...");
    const { data, error } = await supabase.storage
        .from('prescriptions')
        .remove(FILES_TO_DELETE);

    if (error) {
        console.error("Cleanup Error:", error);
    } else {
        console.log("Cleanup Success:", data);
    }
}

cleanup();
