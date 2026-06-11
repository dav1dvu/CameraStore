import { supabaseAdmin } from '../../config/supabase.js';

export interface SaleImportPayload {
  importDate: string; // YYYY-MM-DD
  totalValue: number;
  productName: string; // Free text
  quantity: number;
  receivedBy: string;
  notes?: string;
  productId?: string;
  brand?: string;
  categoryName?: string;
  salePrice?: number;
}

export class SaleImportService {
  static async createImport(payload: SaleImportPayload) {
    if (!payload.importDate || payload.totalValue === undefined || !payload.productName || payload.quantity === undefined || !payload.receivedBy) {
      throw new Error('Thiếu thông tin nhập kho bắt buộc');
    }

    // 1. Update stock / Create product in sale_products
    if (payload.productId) {
      // Existing product
      const { data: product, error: prodErr } = await supabaseAdmin
        .from('sale_products')
        .select('available_stock, total_stock')
        .eq('id', payload.productId)
        .single();

      if (prodErr || !product) {
        throw new Error('Sản phẩm đã chọn không tồn tại trong kho');
      }

      const { error: updateErr } = await supabaseAdmin
        .from('sale_products')
        .update({
          available_stock: (product.available_stock || 0) + payload.quantity,
          total_stock: (product.total_stock || 0) + payload.quantity
        })
        .eq('id', payload.productId);

      if (updateErr) throw updateErr;
    } else {
      // New product - check if a product with the same name already exists to avoid duplication
      const { data: existing, error: findErr } = await supabaseAdmin
        .from('sale_products')
        .select('id, available_stock, total_stock')
        .eq('name', payload.productName.trim())
        .limit(1);

      if (!findErr && existing && existing.length > 0) {
        const prod = existing[0];
        const { error: updateErr } = await supabaseAdmin
          .from('sale_products')
          .update({
            available_stock: (prod.available_stock || 0) + payload.quantity,
            total_stock: (prod.total_stock || 0) + payload.quantity
          })
          .eq('id', prod.id);

        if (updateErr) throw updateErr;
      } else {
        // Create new product
        const brand = payload.brand || '';
        const categoryName = payload.categoryName || 'Chưa phân loại';
        const salePrice = payload.salePrice || 0;

        const { error: createErr } = await supabaseAdmin
          .from('sale_products')
          .insert({
            name: payload.productName.trim(),
            brand: brand.trim(),
            category_name: categoryName.trim(),
            sale_price: salePrice,
            total_stock: payload.quantity,
            available_stock: payload.quantity,
            description: payload.notes || 'Nhập từ chứng từ nhập kho'
          });

        if (createErr) throw createErr;
      }
    }

    // 2. Insert import record
    const { data, error } = await supabaseAdmin
      .from('sale_imports')
      .insert({
        import_date: payload.importDate,
        total_value: payload.totalValue,
        product_name: payload.productName,
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
      .from('sale_imports')
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

  static async updateImport(id: number, updates: Partial<SaleImportPayload>) {
    const mappedUpdates: Record<string, any> = {};
    if (updates.importDate !== undefined) mappedUpdates.import_date = updates.importDate;
    if (updates.totalValue !== undefined) mappedUpdates.total_value = updates.totalValue;
    if (updates.productName !== undefined) mappedUpdates.product_name = updates.productName;
    if (updates.quantity !== undefined) mappedUpdates.quantity = updates.quantity;
    if (updates.receivedBy !== undefined) mappedUpdates.received_by = updates.receivedBy;
    if (updates.notes !== undefined) mappedUpdates.notes = updates.notes;

    const { data, error } = await supabaseAdmin
      .from('sale_imports')
      .update(mappedUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async deleteImport(id: number) {
    // 1. Get the import record to find product name and quantity
    const { data: importRec, error: fetchErr } = await supabaseAdmin
      .from('sale_imports')
      .select('product_name, quantity')
      .eq('id', id)
      .single();

    if (!fetchErr && importRec) {
      // Find matching product in sale_products by name
      const { data: product } = await supabaseAdmin
        .from('sale_products')
        .select('id, available_stock, total_stock')
        .eq('name', importRec.product_name)
        .limit(1);

      if (product && product.length > 0) {
        const prod = product[0];
        const newAvailable = Math.max(0, (prod.available_stock || 0) - importRec.quantity);
        const newTotal = Math.max(0, (prod.total_stock || 0) - importRec.quantity);

        await supabaseAdmin
          .from('sale_products')
          .update({
            available_stock: newAvailable,
            total_stock: newTotal
          })
          .eq('id', prod.id);
      }
    }

    // 2. Delete the import record
    const { error } = await supabaseAdmin
      .from('sale_imports')
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
      .from('sale_imports')
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
