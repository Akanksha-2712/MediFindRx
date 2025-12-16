
import { createClient } from '@supabase/supabase-js';
// import dotenv from 'dotenv'; // Removed
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';


// Manual .env parsing
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, '.env');

let envConfig = {};
try {
    const envFile = fs.readFileSync(envPath, 'utf8');
    envFile.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
            envConfig[key.trim()] = value.trim();
        }
    });
} catch (e) {
    console.error("Could not read .env file");
    process.exit(1);
}

const supabaseUrl = envConfig.VITE_SUPABASE_URL;
const supabaseKey = envConfig.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkFeedbackTable() {
    console.log("Checking if 'app_feedback' table exists...");

    // Attempt to select from the table. If it doesn't exist, it will error.
    const { data, error } = await supabase
        .from('app_feedback')
        .select('count', { count: 'exact', head: true });

    if (error) {
        if (error.code === '42P01') { // undefined_table
            console.error("❌ Table 'app_feedback' does NOT exist.");
            console.log("Please run the 'create_feedback_schema.sql' script in your Supabase SQL Editor.");
        } else {
            console.error("❌ Error accessing table:", error.message, error.code);
        }
        process.exit(1);
    } else {
        console.log("✅ Table 'app_feedback' exists and is accessible.");
        process.exit(0);
    }
}

checkFeedbackTable();
