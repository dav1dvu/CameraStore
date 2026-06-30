import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { supabaseAdmin } from './config/supabase.js';

async function run() {
  const { data: tables, error } = await supabaseAdmin
    .from('information_schema.tables' as any)
    .select('table_name, table_type' as any)
    .eq('table_schema' as any, 'oltp_store');

  if (error) {
    // If querying information_schema via RPC or direct is restricted, we can run a direct sql query or check using pg connection.
    // Let's try raw query using Supabase. PostgREST does not expose information_schema by default unless allowed.
    // Let's check if we can query camera_models view directly.
    console.error('Error fetching tables from schema:', error);
  } else {
    console.log('--- TABLES IN OLTP_STORE ---');
    console.log(JSON.stringify(tables, null, 2));
  }

  // Let's also query camera_models directly using supabaseAdmin
  const { data: models, error: modelsErr } = await supabaseAdmin
    .from('camera_models')
    .select('*');

  if (modelsErr) {
    console.error('Error fetching from camera_models:', modelsErr);
  } else {
    console.log('--- CONTENT OF camera_models ---');
    console.log(JSON.stringify(models, null, 2));
  }
}

run();
