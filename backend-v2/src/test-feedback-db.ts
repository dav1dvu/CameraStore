import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { supabaseAdmin } from './config/supabase.js';

async function testFeedbackDB() {
  console.log('Testing feedbacks table...');
  const { data, error } = await supabaseAdmin
    .from('feedbacks')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error querying feedbacks table:', error);
  } else {
    console.log('Successfully queried feedbacks table! Data:', data);
  }
}

testFeedbackDB();
