import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { ProductService } from './modules/inventory/product.service.js';

async function run() {
  try {
    const result = await ProductService.searchAndFilter({});
    console.log('--- SEARCH AND FILTER RESULT ---');
    console.log(JSON.stringify(result.products.map(p => ({
      id: p.id,
      name: p.name,
      brand: p.brand,
      type: p.type,
      totalStock: p.totalStock,
      availableStock: p.availableStock
    })), null, 2));
  } catch (error) {
    console.error('Search failed:', error);
  }
}

run();
