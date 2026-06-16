import { supabaseAdmin } from '../../config/supabase.js';

export interface CameraModelPayload {
  categoryId?: number | string | null;
  modelName: string;
  rentPricePerDay: number;
  depositAmount: number;
  salePrice?: number;
  isActive?: boolean;
}

export interface CameraModelFilters {
  categoryId?: number | string;
  isActive?: boolean;
}

export class CameraModelService {
  static async listCameraModels(filters: CameraModelFilters) {
    let query = supabaseAdmin
      .from('products')
      .select(`
        id,
        categories_id,
        name,
        brand,
        price,
        rent_price_per_day,
        deposit_amount,
        is_active,
        categories (
          id,
          name
        ),
        equipments (
          id
        )
      `)
      .order('id', { ascending: false });

    if (filters.categoryId) {
      query = query.eq('categories_id', filters.categoryId);
    }
    if (filters.isActive !== undefined) {
      query = query.eq('is_active', filters.isActive);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map((p: any) => ({
      id: p.id,
      catgories_id: p.categories_id,
      model_name: p.name,
      brand: p.brand,
      rent_price_per_day: p.rent_price_per_day ? Number(p.rent_price_per_day) : 0,
      deposit_amount: p.deposit_amount ? Number(p.deposit_amount) : 0,
      sale_price: p.price ? Number(p.price) : 0,
      stock_quantity: p.equipments ? p.equipments.length : 0,
      is_active: p.is_active,
      categories: p.categories
    }));
  }

  static async getCameraModelById(id: string | number) {
    const { data, error } = await supabaseAdmin
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
      .single();

    if (error) throw error;
    return data;
  }

  static async createCameraModel(payload: CameraModelPayload, staffId: string) {
    const { data, error } = await supabaseAdmin
      .from('camera_models')
      .insert({
        catgories_id: payload.categoryId || null,
        model_name: payload.modelName,
        rent_price_per_day: payload.rentPricePerDay,
        deposit_amount: payload.depositAmount,
        sale_price: payload.salePrice || 0,
        is_active: payload.isActive !== undefined ? payload.isActive : true
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async updateCameraModel(id: string | number, updates: Partial<CameraModelPayload>, staffId: string) {
    const { data: oldModel, error: findErr } = await supabaseAdmin
      .from('camera_models')
      .select('*')
      .eq('id', id)
      .single();

    if (findErr) {
      if (findErr.code === 'PGRST116') {
        throw new Error('Camera model not found.');
      }
      throw findErr;
    }

    const mappedUpdates: Record<string, any> = {};
    if (updates.categoryId !== undefined) mappedUpdates.catgories_id = updates.categoryId;
    if (updates.modelName !== undefined) mappedUpdates.model_name = updates.modelName;
    if (updates.rentPricePerDay !== undefined) mappedUpdates.rent_price_per_day = updates.rentPricePerDay;
    if (updates.depositAmount !== undefined) mappedUpdates.deposit_amount = updates.depositAmount;
    if (updates.salePrice !== undefined) mappedUpdates.sale_price = updates.salePrice;
    if (updates.isActive !== undefined) mappedUpdates.is_active = updates.isActive;

    const nameChanged = updates.modelName !== undefined && updates.modelName !== oldModel.model_name;
    const categoryChanged = updates.categoryId !== undefined && Number(updates.categoryId) !== oldModel.catgories_id;

    const { data, error } = await supabaseAdmin
      .from('camera_models')
      .update(mappedUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Sync sibling products if name or category changed
    if (nameChanged || categoryChanged) {
      const oldNameClean = (oldModel.model_name || '').trim().toLowerCase();
      const oldBrandClean = (oldModel.brand || '').trim().toLowerCase();

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
          if (updates.modelName !== undefined) sibUpdates.name = updates.modelName;
          if (updates.categoryId !== undefined) sibUpdates.categories_id = Number(updates.categoryId);

          const sibIds = sibsToUpdate.map((s: any) => s.id);
          await supabaseAdmin
            .from('products')
            .update(sibUpdates)
            .in('id', sibIds);
        }
      }
    }
    return data;
  }

  static async deleteCameraModel(id: string | number, staffId: string) {
    const { data: model, error: findErr } = await supabaseAdmin
      .from('camera_models')
      .select('*')
      .eq('id', id)
      .single();

    if (findErr) {
      if (findErr.code === 'PGRST116') {
        throw new Error('Camera model not found.');
      }
      throw findErr;
    }

    // Check if there are equipments referencing this model
    const { count, error: countErr } = await supabaseAdmin
      .from('equipments')
      .select('id', { count: 'exact', head: true })
      .eq('product_id', id);

    if (countErr) throw countErr;
    if (count && count > 0) {
      throw new Error('Cannot delete camera model because it still has active physical equipment items.');
    }

    const { error: delErr } = await supabaseAdmin
      .from('camera_models')
      .delete()
      .eq('id', id);

    if (delErr) throw delErr;
    return true;
  }

  static async checkAvailability(modelId: string | number, startDate: string, endDate: string) {
    // 1. Get total equipments for this model
    const { data: equipments, error: eqErr } = await supabaseAdmin
      .from('equipments')
      .select('id')
      .eq('product_id', modelId);

    if (eqErr) throw eqErr;
    const totalEquipments = equipments ? equipments.length : 0;

    if (totalEquipments === 0) {
      return { totalEquipments: 0, availableCount: 0, bookedCount: 0 };
    }

    // 2. Find equipments that are booked during the requested period
    // A booking overlaps if: booking.start_date < endDate AND booking.end_date > startDate
    const equipmentIds = equipments!.map(e => e.id);

    const { data: bookedLinks, error: blErr } = await supabaseAdmin
      .from('booking_equipments')
      .select(`
        equipment_id,
        bookings!inner (
          booking_status,
          start_date,
          end_date
        )
      `)
      .in('equipment_id', equipmentIds);

    if (blErr) throw blErr;

    const bookedEquipmentIds = new Set<string>();
    (bookedLinks || []).forEach((link: any) => {
      const booking = link.bookings;
      if (!booking) return;
      const status = booking.booking_status;
      if (status === 'CANCELED' || status === 'CANCELLED' || status === 'CHECKED_OUT') return;

      const bStartStr = booking.start_date.substring(0, 10);
      const bEndStr = booking.end_date.substring(0, 10);
      const qStartStr = startDate.substring(0, 10);
      const qEndStr = endDate.substring(0, 10);

      // Check overlap: booking start <= query end AND booking end >= query start
      if (bStartStr <= qEndStr && bEndStr >= qStartStr) {
        bookedEquipmentIds.add(link.equipment_id);
      }
    });

    const bookedCount = bookedEquipmentIds.size;
    const availableCount = totalEquipments - bookedCount;

    return {
      totalEquipments,
      availableCount: Math.max(0, availableCount),
      bookedCount
    };
  }

  static async checkAllAvailability(startDate: string, endDate: string) {
    // 1. Get active camera models with a valid rental price
    const { data: models, error: modelErr } = await supabaseAdmin
      .from('camera_models')
      .select('id, model_name, brand, rent_price_per_day, is_active')
      .eq('is_active', true)
      .gt('rent_price_per_day', 0);
    if (modelErr) throw modelErr;

    // 2. Get all equipments
    const { data: equipments, error: eqErr } = await supabaseAdmin
      .from('equipments')
      .select('id, product_id');
    if (eqErr) throw eqErr;

    // 3. Get all booking equipment links
    const { data: bookedLinks, error: blErr } = await supabaseAdmin
      .from('booking_equipments')
      .select(`
        equipment_id,
        bookings!inner (
          booking_status,
          start_date,
          end_date
        )
      `);
    if (blErr) throw blErr;

    const bookedEquipmentIds = new Set<string>();
    const qStartStr = startDate.substring(0, 10);
    const qEndStr = endDate.substring(0, 10);

    (bookedLinks || []).forEach((link: any) => {
      const booking = link.bookings;
      if (!booking) return;
      const status = booking.booking_status;
      if (status === 'CANCELED' || status === 'CANCELLED' || status === 'CHECKED_OUT') return;

      const bStartStr = booking.start_date.substring(0, 10);
      const bEndStr = booking.end_date.substring(0, 10);

      // Check overlap
      if (bStartStr <= qEndStr && bEndStr >= qStartStr) {
        bookedEquipmentIds.add(link.equipment_id);
      }
    });

    // Group models by brand and model_name (case-insensitive, trimmed)
    const groups = new Map<string, {
      id: any;
      model_name: string;
      brand: string;
      rent_price_per_day: number;
      productIds: Set<string>;
    }>();

    (models || []).forEach((m: any) => {
      const brandClean = (m.brand || '').trim();
      const modelNameClean = (m.model_name || '').trim();
      const key = `${brandClean.toLowerCase()}||${modelNameClean.toLowerCase()}`;
      if (!groups.has(key)) {
        groups.set(key, {
          id: m.id,
          model_name: modelNameClean,
          brand: brandClean,
          rent_price_per_day: Number(m.rent_price_per_day || 0),
          productIds: new Set<string>()
        });
      }
      groups.get(key)!.productIds.add(String(m.id));
    });

    // Aggregate equipments and availability counts for each group
    const results = Array.from(groups.values()).map((group) => {
      let totalEquipments = 0;
      let bookedCount = 0;

      (equipments || []).forEach((eq: any) => {
        const prodIdStr = String(eq.product_id);
        if (group.productIds.has(prodIdStr)) {
          totalEquipments++;
          if (bookedEquipmentIds.has(eq.id)) {
            bookedCount++;
          }
        }
      });

      const availableCount = Math.max(0, totalEquipments - bookedCount);

      return {
        id: group.id,
        model_name: group.model_name,
        brand: group.brand,
        rent_price_per_day: group.rent_price_per_day,
        totalEquipments,
        bookedCount,
        availableCount
      };
    });

    return results;
  }
}
