import { supabaseAdmin } from '../../config/supabase.js';

export interface SaleProductPayload {
  name: string;
  brand?: string;
  categoryName: string;
  salePrice: number;
  totalStock?: number;
  availableStock?: number;
  description?: string;
  images?: string[];
}

export class SaleProductService {
  static async createProduct(payload: SaleProductPayload) {
    if (!payload.name || !payload.categoryName || payload.salePrice === undefined) {
      throw new Error('Tên sản phẩm, Danh mục và Giá bán là bắt buộc');
    }

    const totalStock = payload.totalStock !== undefined ? payload.totalStock : 0;
    const availableStock = payload.availableStock !== undefined ? payload.availableStock : totalStock;

    const { data, error } = await supabaseAdmin
      .from('sale_products')
      .insert({
        name: payload.name,
        brand: payload.brand || '',
        category_name: payload.categoryName,
        sale_price: payload.salePrice,
        total_stock: totalStock,
        available_stock: availableStock,
        description: payload.description || null,
        images: payload.images || []
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async getAllProducts() {
    const { data, error } = await supabaseAdmin
      .from('sale_products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  static async getProductById(id: string) {
    const { data, error } = await supabaseAdmin
      .from('sale_products')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  static async updateProduct(id: string, updates: Partial<SaleProductPayload>) {
    const mappedUpdates: Record<string, any> = {};
    if (updates.name !== undefined) mappedUpdates.name = updates.name;
    if (updates.brand !== undefined) mappedUpdates.brand = updates.brand;
    if (updates.categoryName !== undefined) mappedUpdates.category_name = updates.categoryName;
    if (updates.salePrice !== undefined) mappedUpdates.sale_price = updates.salePrice;
    if (updates.totalStock !== undefined) mappedUpdates.total_stock = updates.totalStock;
    if (updates.availableStock !== undefined) mappedUpdates.available_stock = updates.availableStock;
    if (updates.description !== undefined) mappedUpdates.description = updates.description;
    if (updates.images !== undefined) mappedUpdates.images = updates.images;

    const { data, error } = await supabaseAdmin
      .from('sale_products')
      .update(mappedUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async deleteProduct(id: string) {
    const { error } = await supabaseAdmin
      .from('sale_products')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  }
}
