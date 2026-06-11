import { supabaseAdmin } from '../../config/supabase.js';

export interface EquipmentFilter {
  status?: string;
  productId?: string;
  limit?: number;
  offset?: number;
}

export class EquipmentService {
  static async listAllEquipments(filters: EquipmentFilter) {
    const { status, productId, limit = 50, offset = 0 } = filters;

    let query = supabaseAdmin
      .from('equipments')
      .select(`
        *,
        camera_models (
          id,
          model_name
        )
      `, { count: 'exact' });

    if (status) {
      query = query.eq('status', status);
    }
    if (productId) {
      query = query.eq('product_id', productId);
    }

    query = query
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    const { data, error, count } = await query;
    if (error) throw error;

    // Preserve compatibility by mapping camera_models to products
    const mapped = (data || []).map((item: any) => {
      const copy = { ...item };
      if (copy.camera_models) {
        copy.products = {
          id: copy.camera_models.id,
          name: copy.camera_models.model_name,
          brand: '' // No brand in schema
        };
      }
      return copy;
    });

    return {
      equipments: mapped,
      totalCount: count || 0
    };
  }

  static async updateEquipmentStatus(id: string | number, status: string, notes: string, staffId: string) {
    // Check if equipment exists
    const { data: existing, error: findErr } = await supabaseAdmin
      .from('equipments')
      .select('id, status, serial_number')
      .eq('id', id)
      .single();

    if (findErr || !existing) {
      throw new Error(`Equipment not found: ${id}`);
    }

    const { data, error } = await supabaseAdmin
      .from('equipments')
      .update({
        status
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Automatically create maintenance log if new status is DAMAGED or MAINTENANCE
    if (status === 'DAMAGED' || status === 'MAINTENANCE') {
      const { error: logErr } = await supabaseAdmin
        .from('maintenance_logs')
        .insert({
          equipment_id: id,
          reported_by: staffId,
          issue_description: notes || `Thiết bị chuyển sang trạng thái ${status}`,
          repair_cost: 0
        });

      if (logErr) throw logErr;
    }

    return data;
  }
}
