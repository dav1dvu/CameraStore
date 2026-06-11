import { supabaseAdmin } from '../../config/supabase.js';

export interface CategoryPayload {
  name: string;
  slug?: string;
  description?: string;
}

export class CategoryService {
  static async getCategories() {
    const { data, error } = await supabaseAdmin
      .from('categories')
      .select('*')
      .order('name');

    if (error) throw error;
    return (data || []).map((cat: any) => ({
      ...cat,
      slug: cat.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''),
      description: `Danh mục ${cat.name}`
    }));
  }

  static async createCategory(payload: CategoryPayload, staffId: string) {
    const { data, error } = await supabaseAdmin
      .from('categories')
      .insert({
        name: payload.name
      })
      .select()
      .single();

    if (error) throw error;
    return {
      ...data,
      slug: payload.slug || payload.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''),
      description: payload.description || `Danh mục ${payload.name}`
    };
  }

  static async updateCategory(id: string | number, updates: Partial<CategoryPayload>, staffId: string) {
    const mappedUpdates: Record<string, any> = {};
    if (updates.name !== undefined) mappedUpdates.name = updates.name;

    const { data, error } = await supabaseAdmin
      .from('categories')
      .update(mappedUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return {
      ...data,
      slug: updates.slug || data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''),
      description: updates.description || `Danh mục ${data.name}`
    };
  }

  static async deleteCategory(id: string | number, staffId: string) {
    // 1. Check for products (using categories_id column in actual schema)
    const { count: prodCount, error: prodErr } = await supabaseAdmin
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('categories_id', id);

    if (prodErr) throw prodErr;
    if (prodCount && prodCount > 0) {
      throw new Error('Cannot delete category because it has active products.');
    }

    // 2. Check for camera models (using catgories_id column in actual schema)
    const { count: modelCount, error: modelErr } = await supabaseAdmin
      .from('camera_models')
      .select('id', { count: 'exact', head: true })
      .eq('catgories_id', id);

    if (modelErr) throw modelErr;
    if (modelCount && modelCount > 0) {
      throw new Error('Cannot delete category because it has active camera models.');
    }

    // 3. Delete category
    const { error: delErr } = await supabaseAdmin
      .from('categories')
      .delete()
      .eq('id', id);

    if (delErr) throw delErr;
    return true;
  }
}
