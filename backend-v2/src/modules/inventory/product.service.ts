import { supabaseAdmin } from '../../config/supabase.js';

export interface SearchFilters {
  q?: string;
  category?: string | number;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  minRentalPrice?: number;
  maxRentalPrice?: number;
  priceType?: 'sale' | 'rental' | 'both';
  inStock?: boolean;
  sortBy?: string;
  limit?: number;
  offset?: number;
}

export class ProductService {
  static async searchAndFilter(filters: SearchFilters) {
    const {
      q,
      category,
      minPrice,
      maxPrice,
      minRentalPrice,
      maxRentalPrice,
      priceType = 'both',
      inStock,
      sortBy,
      limit = 20,
      offset = 0
    } = filters;

    let saleProducts: any[] = [];
    let rentalModels: any[] = [];

    // 1. Fetch from Products (Sale)
    if (priceType === 'both' || priceType === 'sale') {
      let query = supabaseAdmin
        .from('products')
        .select(`
          *,
          categories (
            id,
            name
          )
        `);

      if (q) {
        const sanitizedQ = q.replace(/[%,.\(\):\[\]@=]/g, '').trim();
        if (sanitizedQ.length > 0) {
          query = query.ilike('name', `%${sanitizedQ}%`);
        }
      }
      if (category) {
        query = query.eq('categories_id', category);
      }
      if (minPrice !== undefined) {
        query = query.gte('price', minPrice);
      }
      if (maxPrice !== undefined) {
        query = query.lte('price', maxPrice);
      }

      const { data, error } = await query;
      if (error) throw error;
      saleProducts = data || [];
    }

    // 2. Fetch from Camera Models (Rental)
    if (priceType === 'both' || priceType === 'rental') {
      let query = supabaseAdmin
        .from('camera_models')
        .select(`
          *,
          categories (
            id,
            name
          ),
          equipments (
            status
          )
        `);

      if (q) {
        const sanitizedQ = q.replace(/[%,.\(\):\[\]@=]/g, '').trim();
        if (sanitizedQ.length > 0) {
          query = query.ilike('model_name', `%${sanitizedQ}%`);
        }
      }
      if (category) {
        query = query.eq('catgories_id', category);
      }
      if (minRentalPrice !== undefined) {
        query = query.gte('rent_price_per_day', minRentalPrice);
      }
      if (maxRentalPrice !== undefined) {
        query = query.lte('rent_price_per_day', maxRentalPrice);
      }

      const { data, error } = await query;
      if (error) throw error;
      rentalModels = data || [];
    }

    // 3. Normalize and Merge
    const unifiedList: any[] = [];
    const mergedMap = new Map<string, any>();

    // Add Sales
    saleProducts.forEach((p: any) => {
      const key = `${(p.brand || '').trim().toLowerCase()}||${(p.name || '').trim().toLowerCase()}`;
      mergedMap.set(key, {
        id: p.id,
        name: p.name,
        slug: String(p.id),
        brand: p.brand || '',
        description: p.description || '',
        category: p.categories,
        salePrice: Number(p.price || p.sale_price || 0),
        rentalPricePerDay: Number(p.rent_price_per_day || 0),
        images: p.images || [],
        specs: p.specs || {},
        availableStock: p.stock_quantity,
        totalStock: p.stock_quantity,
        createdAt: p.created_at,
        type: 'SALE'
      });
    });

    // Add/Merge Rentals
    rentalModels.forEach((m: any) => {
      const key = `${(m.brand || '').trim().toLowerCase()}||${(m.model_name || '').trim().toLowerCase()}`;
      const equip = m.equipments || [];
      const stock = equip.filter((e: any) => e.status === 'AVAILABLE').length;

      const existing = mergedMap.get(key);
      if (existing) {
        existing.model_id = m.id;
        if (existing.rentalPricePerDay === 0) {
          existing.rentalPricePerDay = Number(m.rent_price_per_day || 0);
        }
        if (existing.salePrice === 0) {
          existing.salePrice = Number(m.sale_price || 0);
        }
        // Sync stock information using physical equipment items
        existing.availableStock = stock;
        existing.totalStock = equip.length;
        existing.type = 'BOTH';
      } else {
        mergedMap.set(key, {
          id: m.id,
          model_id: m.id,
          name: m.model_name,
          slug: String(m.id),
          brand: m.brand || '',
          description: m.description || '',
          category: m.categories,
          salePrice: Number(m.sale_price || 0),
          rentalPricePerDay: Number(m.rent_price_per_day || 0),
          images: m.images || [],
          specs: m.specs || {},
          availableStock: stock,
          totalStock: equip.length,
          createdAt: m.created_at || new Date().toISOString(),
          type: 'RENTAL'
        });
      }
    });

    mergedMap.forEach((val) => {
      unifiedList.push(val);
    });

    // Apply stock filter
    let filteredList = unifiedList;
    if (inStock) {
      filteredList = unifiedList.filter((item) => item.availableStock > 0);
    }

    // Apply Sorting
    filteredList.sort((a, b) => {
      return Number(b.id) - Number(a.id);
    });

    // Pagination bounds
    const totalCount = filteredList.length;
    const paginatedList = filteredList.slice(offset, offset + limit);

    return {
      products: paginatedList,
      totalCount
    };
  }

  static async getProductBySlug(slug: string) {
    const id = Number(slug);
    if (isNaN(id)) {
      throw new Error('Product not found (Invalid ID)');
    }

    // Try to find in Products (Sale)
    const { data: product } = await supabaseAdmin
      .from('products')
      .select(`
        *,
        categories (
          id,
          name
        )
      `)
      .eq('id', id)
      .maybeSingle();

    if (product) {
      return {
        ...product,
        salePrice: Number(product.price || product.sale_price || 0),
        rentalPricePerDay: Number(product.rent_price_per_day || 0),
        availableStock: product.stock_quantity,
        totalStock: product.stock_quantity,
        type: 'SALE'
      };
    }

    // Try to find in Camera Models (Rental)
    const { data: model } = await supabaseAdmin
      .from('camera_models')
      .select(`
        *,
        categories (
          id,
          name
        ),
        equipments (
          id,
          status,
          serial_number
        )
      `)
      .eq('id', id)
      .maybeSingle();

    if (model) {
      const stock = (model.equipments || []).filter((e: any) => e.status === 'AVAILABLE').length;
      return {
        ...model,
        name: model.model_name,
        salePrice: Number(model.sale_price || 0),
        rentalPricePerDay: Number(model.rent_price_per_day || 0),
        availableStock: stock,
        totalStock: (model.equipments || []).length,
        equipment: model.equipments,
        type: 'RENTAL'
      };
    }

    throw new Error('Product not found');
  }

  static async createProduct(data: any) {
    const { name, brand, salePrice, rentalPricePerDay, totalStock, categoryId } = data;
    
    let resolvedCategoryId = categoryId ? Number(categoryId) : null;
    
    if (!resolvedCategoryId) {
      const { data: categories, error: catErr } = await supabaseAdmin
        .from('categories')
        .select('id')
        .limit(1);
        
      if (catErr) throw catErr;
      
      if (categories && categories.length > 0) {
        resolvedCategoryId = categories[0].id;
      } else {
        const { data: defaultCat, error: createCatErr } = await supabaseAdmin
          .from('categories')
          .insert({ name: 'Chưa phân loại' })
          .select()
          .single();
          
        if (createCatErr) throw createCatErr;
        resolvedCategoryId = defaultCat.id;
      }
    }
    
    // 1. Create in products table
    const { data: product, error: prodError } = await supabaseAdmin
      .from('products')
      .insert({
        name,
        brand: brand || '',
        price: salePrice || 0,
        rent_price_per_day: rentalPricePerDay || 0,
        stock_quantity: totalStock || 0,
        categories_id: resolvedCategoryId
      })
      .select()
      .single();
      
    if (prodError) throw prodError;

    // 2. Populate physical equipment items
    if (product && totalStock > 0) {
      const equipsToInsert = [];
      for (let i = 0; i < totalStock; i++) {
        const cleanName = name.toUpperCase().replace(/[^A-Z0-9]/g, '');
        const cleanBrand = brand.toUpperCase().replace(/[^A-Z0-9]/g, '');
        const serial = `${cleanBrand}-${cleanName}-${Date.now()}-${i + 1}`;
        equipsToInsert.push({
          product_id: product.id,
          serial_number: serial,
          status: 'AVAILABLE'
        });
      }
      const { error: equipErr } = await supabaseAdmin
        .from('equipments')
        .insert(equipsToInsert);
      if (equipErr) {
        console.error('Failed to auto-populate equipments:', equipErr);
      }
    }

    return product;
  }

  static async updateProduct(id: string | number, data: any) {
    const { name, brand, salePrice, rentalPricePerDay, totalStock, categoryId } = data;

    // 1. Fetch current product to check old name/brand/stock
    const { data: oldProduct, error: fetchErr } = await supabaseAdmin
      .from('products')
      .select('id, name, brand, stock_quantity, categories_id')
      .eq('id', id)
      .single();

    if (fetchErr) throw fetchErr;

    const mappedUpdates: Record<string, any> = {};
    if (name !== undefined) mappedUpdates.name = name;
    if (brand !== undefined) mappedUpdates.brand = brand;
    if (salePrice !== undefined) mappedUpdates.price = salePrice;
    if (rentalPricePerDay !== undefined) mappedUpdates.rent_price_per_day = rentalPricePerDay;
    if (totalStock !== undefined) mappedUpdates.stock_quantity = totalStock;
    if (categoryId !== undefined) mappedUpdates.categories_id = Number(categoryId);

    const nameChanged = name !== undefined && name !== oldProduct.name;
    const brandChanged = brand !== undefined && brand !== oldProduct.brand;
    const categoryChanged = categoryId !== undefined && Number(categoryId) !== oldProduct.categories_id;

    // 2. Perform the update
    const { data: product, error: prodError } = await supabaseAdmin
      .from('products')
      .update(mappedUpdates)
      .eq('id', id)
      .select()
      .single();
      
    if (prodError) throw prodError;

    // Sync sibling products if name, brand, or category changed
    if (nameChanged || brandChanged || categoryChanged) {
      const oldNameClean = (oldProduct.name || '').trim().toLowerCase();
      const oldBrandClean = (oldProduct.brand || '').trim().toLowerCase();

      const { data: siblings, error: sibErr } = await supabaseAdmin
        .from('products')
        .select('id, name, brand')
        .not('id', 'eq', id);

      if (!sibErr && siblings) {
        const sibsToUpdate = siblings.filter((s: any) => {
          const sNameClean = (s.name || '').trim().toLowerCase();
          const sBrandClean = (s.brand || '').trim().toLowerCase();
          return sNameClean === oldNameClean && sBrandClean === oldBrandClean;
        });

        if (sibsToUpdate.length > 0) {
          const sibUpdates: any = {};
          if (name !== undefined) sibUpdates.name = name;
          if (brand !== undefined) sibUpdates.brand = brand;
          if (categoryId !== undefined) sibUpdates.categories_id = Number(categoryId);

          const sibIds = sibsToUpdate.map((s: any) => s.id);
          await supabaseAdmin
            .from('products')
            .update(sibUpdates)
            .in('id', sibIds);
        }
      }
    }

    // 3. Sync equipments if totalStock is provided
    if (totalStock !== undefined) {
      const targetStock = Number(totalStock);
      // Get all equipments for this product
      const { data: currentEquips, error: eqErr } = await supabaseAdmin
        .from('equipments')
        .select('id, status')
        .eq('product_id', id);

      if (eqErr) throw eqErr;

      const currentCount = currentEquips ? currentEquips.length : 0;
      
      if (targetStock > currentCount) {
        // Add new equipments
        const diff = targetStock - currentCount;
        const equipsToInsert = [];
        const finalName = name || oldProduct.name;
        const finalBrand = brand || oldProduct.brand;
        const cleanName = finalName.toUpperCase().replace(/[^A-Z0-9]/g, '');
        const cleanBrand = finalBrand.toUpperCase().replace(/[^A-Z0-9]/g, '');
        
        for (let i = 0; i < diff; i++) {
          const serial = `${cleanBrand}-${cleanName}-${Date.now()}-${i + 1}`;
          equipsToInsert.push({
            product_id: id,
            serial_number: serial,
            status: 'AVAILABLE'
          });
        }
        const { error: insertErr } = await supabaseAdmin
          .from('equipments')
          .insert(equipsToInsert);
        if (insertErr) throw insertErr;
      } else if (targetStock < currentCount) {
        // Remove surplus equipments
        const diff = currentCount - targetStock;
        
        // Find equipments that are referenced by booking_equipments to avoid FOREIGN KEY violations (ON DELETE RESTRICT)
        // Only consider active/upcoming bookings (exclude completed/cancelled bookings)
        const { data: bookedLinks, error: linkErr } = await supabaseAdmin
          .from('booking_equipments')
          .select(`
            equipment_id,
            bookings!inner (
              booking_status
            )
          `)
          .in('equipment_id', currentEquips.map(e => e.id))
          .not('bookings.booking_status', 'in', '("CHECKED_OUT","CANCELED","CANCELLED")');

        if (linkErr) throw linkErr;

        const bookedIds = new Set((bookedLinks || []).map(b => b.equipment_id));

        // Find equipments that are NOT referenced by any active/upcoming bookings
        const availableEquips = (currentEquips || []).filter(
          e => !bookedIds.has(e.id)
        );
        const idsToDelete = availableEquips.slice(0, diff).map(e => e.id);
        
        if (idsToDelete.length > 0) {
          const { error: deleteErr } = await supabaseAdmin
            .from('equipments')
            .delete()
            .in('id', idsToDelete);
          if (deleteErr) throw deleteErr;
        }
      }

      // ALWAYS update products.stock_quantity to the actual count of equipments in the database
      const { count: actualCount, error: countErr } = await supabaseAdmin
        .from('equipments')
        .select('id', { count: 'exact', head: true })
        .eq('product_id', id);

      if (!countErr && actualCount !== null) {
        await supabaseAdmin
          .from('products')
          .update({ stock_quantity: actualCount })
          .eq('id', id);
        
        // Update product return value
        product.stock_quantity = actualCount;
      }
    }

    return product;
  }

  static async deleteProduct(id: string | number) {
    // 1. Delete from products table
    // Cascade ON DELETE CASCADE in db automatically deletes physical equipments
    const { error: prodErr } = await supabaseAdmin
      .from('products')
      .delete()
      .eq('id', id);

    if (prodErr) throw prodErr;
    return true;
  }

  static async adjustProductStockForRental(modelId: string | number, quantityChange: number) {
    try {
      const { data: model } = await supabaseAdmin
        .from('camera_models')
        .select('model_name, brand')
        .eq('id', modelId)
        .maybeSingle();

      if (model) {
        const { data: prod } = await supabaseAdmin
          .from('products')
          .select('id, stock_quantity')
          .eq('name', model.model_name)
          .eq('brand', model.brand)
          .maybeSingle();

        if (prod) {
          const newStock = Math.max(0, Number(prod.stock_quantity || 0) + quantityChange);
          await supabaseAdmin
            .from('products')
            .update({ stock_quantity: newStock })
            .eq('id', prod.id);
        }
      }
    } catch (err) {
      console.error('Failed to adjust product stock for rental:', err);
    }
  }

  static async createPriceConfig(productId: string, config: any) {
    return { id: 1, ...config };
  }

  static async removePriceConfig(configId: string) {
    return true;
  }
}
