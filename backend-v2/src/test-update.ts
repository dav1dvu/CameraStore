import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { ProductService } from './modules/inventory/product.service.js';

async function run() {
  try {
    console.log('Testing updateProduct for ID 35...');
    const result = await ProductService.updateProduct(35, {
      name: 'Espio 80',
      brand: 'Pentax',
      rentalPricePerDay: 70000,
      totalStock: 1,
      categoryId: 2
    });
    console.log('Update result:', result);
  } catch (error) {
    console.error('Update failed with error:', error);
  }
}

run();
