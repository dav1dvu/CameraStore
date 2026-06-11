import { supabaseAdmin } from '../../config/supabase.js';

export interface RentalImportPayload {
  importDate: string; // YYYY-MM-DD
  totalValue: number;
  productName: string; // Free text
  quantity: number;
  receivedBy: string;
  notes?: string;
  productId?: string | number; // optional, existing product in products
  brand?: string;
  categoryId?: string | number;
  rentPricePerDay?: number;
  salePrice?: number;
}

export class RentalImportService {
  static async createImport(payload: RentalImportPayload) {
    if (!payload.importDate || payload.totalValue === undefined || !payload.productName || payload.quantity === undefined || !payload.receivedBy) {
      throw new Error('Thiếu thông tin nhập kho bắt buộc');
    }

    let resolvedProductId: number;
    let resolvedName = payload.productName.trim();
    let resolvedBrand = payload.brand ? payload.brand.trim() : '';

    // 1. Update stock / Create product and camera model & equipments
    if (payload.productId) {
      // Existing product
      const { data: product, error: prodErr } = await supabaseAdmin
        .from('products')
        .select('id, name, brand, stock_quantity')
        .eq('id', payload.productId)
        .maybeSingle();

      if (prodErr || !product) {
        throw new Error('Sản phẩm đã chọn không tồn tại trong kho cho thuê');
      }

      resolvedProductId = product.id;
      resolvedName = product.name;
      resolvedBrand = product.brand;

      // Update product stock_quantity
      const { error: updateErr } = await supabaseAdmin
        .from('products')
        .update({
          stock_quantity: (product.stock_quantity || 0) + payload.quantity
        })
        .eq('id', product.id);

      if (updateErr) throw updateErr;

      // Add equipments
      if (product.id && payload.quantity > 0) {
        const equipsToInsert = [];
        for (let i = 0; i < payload.quantity; i++) {
          const cleanName = resolvedName.toUpperCase().replace(/[^A-Z0-9]/g, '');
          const cleanBrand = resolvedBrand.toUpperCase().replace(/[^A-Z0-9]/g, '');
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
        if (equipErr) throw equipErr;
      }
    } else {
      // No productId provided - check by product name
      const { data: existing, error: findErr } = await supabaseAdmin
        .from('products')
        .select('id, name, brand, stock_quantity')
        .eq('name', resolvedName)
        .maybeSingle();

      if (findErr) throw findErr;

      if (existing) {
        resolvedProductId = existing.id;
        resolvedName = existing.name;
        resolvedBrand = existing.brand;

        // Update product stock_quantity
        const { error: updateErr } = await supabaseAdmin
          .from('products')
          .update({
            stock_quantity: (existing.stock_quantity || 0) + payload.quantity
          })
          .eq('id', existing.id);

        if (updateErr) throw updateErr;

        // Add equipments
        if (existing.id && payload.quantity > 0) {
          const equipsToInsert = [];
          for (let i = 0; i < payload.quantity; i++) {
            const cleanName = resolvedName.toUpperCase().replace(/[^A-Z0-9]/g, '');
            const cleanBrand = resolvedBrand.toUpperCase().replace(/[^A-Z0-9]/g, '');
            const serial = `${cleanBrand}-${cleanName}-${Date.now()}-${i + 1}`;
            equipsToInsert.push({
              product_id: existing.id,
              serial_number: serial,
              status: 'AVAILABLE'
            });
          }
          const { error: equipErr } = await supabaseAdmin
            .from('equipments')
            .insert(equipsToInsert);
          if (equipErr) throw equipErr;
        }
      } else {
        // Create brand new product
        let resolvedCategoryId = payload.categoryId ? Number(payload.categoryId) : null;
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

        // Create product
        const { data: product, error: prodError } = await supabaseAdmin
          .from('products')
          .insert({
            name: resolvedName,
            brand: resolvedBrand,
            price: payload.salePrice || 0,
            rent_price_per_day: payload.rentPricePerDay || 0,
            stock_quantity: payload.quantity,
            categories_id: resolvedCategoryId
          })
          .select()
          .single();

        if (prodError) throw prodError;
        resolvedProductId = product.id;

        // Add equipments
        if (product && payload.quantity > 0) {
          const equipsToInsert = [];
          for (let i = 0; i < payload.quantity; i++) {
            const cleanName = resolvedName.toUpperCase().replace(/[^A-Z0-9]/g, '');
            const cleanBrand = resolvedBrand.toUpperCase().replace(/[^A-Z0-9]/g, '');
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
          if (equipErr) throw equipErr;
        }
      }
    }

    // 2. Insert import record
    const { data, error } = await supabaseAdmin
      .from('rental_imports')
      .insert({
        import_date: payload.importDate,
        total_value: payload.totalValue,
        product_name: resolvedName,
        quantity: payload.quantity,
        received_by: payload.receivedBy,
        notes: payload.notes || null
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async getImports(month?: number, year?: number, limit = 10, offset = 0) {
    let query = supabaseAdmin
      .from('rental_imports')
      .select('*');

    if (month && year) {
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      query = query.gte('import_date', startDate).lte('import_date', endDate);
    }

    const { data, error } = await query
      .order('import_date', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return data || [];
  }

  static async updateImport(id: number, updates: Partial<RentalImportPayload>) {
    const mappedUpdates: Record<string, any> = {};
    if (updates.importDate !== undefined) mappedUpdates.import_date = updates.importDate;
    if (updates.totalValue !== undefined) mappedUpdates.total_value = updates.totalValue;
    if (updates.productName !== undefined) mappedUpdates.product_name = updates.productName;
    if (updates.quantity !== undefined) mappedUpdates.quantity = updates.quantity;
    if (updates.receivedBy !== undefined) mappedUpdates.received_by = updates.receivedBy;
    if (updates.notes !== undefined) mappedUpdates.notes = updates.notes;

    const { data, error } = await supabaseAdmin
      .from('rental_imports')
      .update(mappedUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async deleteImport(id: number) {
    // 1. Get import record
    const { data: importRec, error: fetchErr } = await supabaseAdmin
      .from('rental_imports')
      .select('product_name, quantity')
      .eq('id', id)
      .maybeSingle();

    if (fetchErr) throw fetchErr;

    if (importRec) {
      // Find matching product in products by name
      const { data: product } = await supabaseAdmin
        .from('products')
        .select('id, name, brand, stock_quantity')
        .eq('name', importRec.product_name)
        .maybeSingle();

      if (product) {
        // Find up to `quantity` AVAILABLE equipments for this product
        const { data: availableEquips, error: equipErr } = await supabaseAdmin
          .from('equipments')
          .select('id')
          .eq('product_id', product.id)
          .eq('status', 'AVAILABLE')
          .limit(importRec.quantity);

        if (!equipErr && availableEquips && availableEquips.length > 0) {
          const idsToDelete = availableEquips.map((e: any) => e.id);
          await supabaseAdmin
            .from('equipments')
            .delete()
            .in('id', idsToDelete);
        }

        // Reduce stock_quantity
        const newStock = Math.max(0, (product.stock_quantity || 0) - importRec.quantity);
        await supabaseAdmin
          .from('products')
          .update({ stock_quantity: newStock })
          .eq('id', product.id);
      }
    }

    // 2. Delete from rental_imports
    const { error } = await supabaseAdmin
      .from('rental_imports')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  }

  static async getImportsSummary(month: number, year: number) {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const { data, error } = await supabaseAdmin
      .from('rental_imports')
      .select('total_value')
      .gte('import_date', startDate)
      .lte('import_date', endDate);

    if (error) throw error;

    const totalImportValue = (data || []).reduce((sum, item) => sum + (Number(item.total_value) || 0), 0);
    return {
      totalImportValue
    };
  }
}
