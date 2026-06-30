import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://tysjqtdolonsfgzdmxvw.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5c2pxdGRvbG9uc2ZnemRteHZ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTg5MjI3OCwiZXhwIjoyMDk1NDY4Mjc4fQ.m5s9VoQ0KerZZ-aSrqBvgvh2nF7c2BigvHCjNm4_rPg';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  db: { schema: 'oltp_store' }
});

async function run() {
  const { data: models } = await supabase.from('camera_models').select('*');
  const espioModels = models?.filter(m => m.model_name?.toLowerCase().includes('espio 80')) || [];
  console.log('ESPIO 80 CAMERA MODELS:', espioModels);

  const { data: products } = await supabase.from('products').select('*');
  const espioProducts = products?.filter(p => p.name?.toLowerCase().includes('espio 80')) || [];
  console.log('ESPIO 80 PRODUCTS:', espioProducts);

  const { data: equipments } = await supabase.from('equipments').select('*');
  const pIds = [...espioModels.map(m => m.id), ...espioProducts.map(p => p.id)];
  console.log('EQUIPMENTS FOR ESPIO 80:', equipments?.filter(e => pIds.includes(e.product_id)));
}

run();
