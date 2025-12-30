import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const FILE_SIZE_MB = 2; // 2 MB per file
const NUM_FILES = 5;    // Upload 5 files = ~10 MB total

async function uploadDummyFile(i) {
    // specific size buffer
    const buffer = crypto.randomBytes(FILE_SIZE_MB * 1024 * 1024);
    const fileName = `stress_test_file_${i}_${Date.now()}.bin`;

    console.log(`Uploading ${fileName} (${FILE_SIZE_MB} MB)...`);

    const { data, error } = await supabase.storage
        .from('prescriptions')
        .upload(fileName, buffer, {
            contentType: 'application/octet-stream',
            upsert: true
        });

    if (error) {
        console.error(`Upload ${i} Failed:`, error.message);
        return null;
    }
    return fileName;
}

async function runStorageTest() {
    console.log(`Starting Storage Stress Test: Uploading ${NUM_FILES} files of ${FILE_SIZE_MB}MB each...`);

    // We need to login as a user usually for RLS, but if 'prescriptions' is public/anon writable (from our earlier script?)
    // Our earlier script allowed "Authenticated Uploads" only. So we need to sign in or allow anon.
    // Let's try to sign in as one of the stress users or a temp user.

    // Quick Anon login or SignUp
    const email = `storage_tester_${Date.now()}@example.com`;
    const password = 'password123';

    const { data: { user }, error: authError } = await supabase.auth.signUp({
        email,
        password
    });

    if (authError && !authError.message.includes('already registered')) {
        // Try login if signup failed
        await supabase.auth.signInWithPassword({ email, password });
    }

    const promises = [];
    for (let i = 0; i < NUM_FILES; i++) {
        promises.push(uploadDummyFile(i));
    }

    const results = await Promise.all(promises);
    const successFiles = results.filter(f => f !== null);

    console.log(`\nSuccessfully uploaded ${successFiles.length} files.`);
    console.log(`Approx Added Storage: ${successFiles.length * FILE_SIZE_MB} MN`);
    console.log("FILES CREATED:", successFiles);
}

runStorageTest();
