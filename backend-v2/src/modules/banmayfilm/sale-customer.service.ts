import { supabaseAdmin } from '../../config/supabase.js';

export interface SaleCustomerPayload {
  fullName: string;
  phone: string;
  address?: string;
  email?: string;
  notes?: string;
}

export class SaleCustomerService {
  static async createCustomer(payload: SaleCustomerPayload) {
    if (!payload.fullName || !payload.phone) {
      throw new Error('Tên khách hàng và Số điện thoại là bắt buộc');
    }

    const { data, error } = await supabaseAdmin
      .from('sale_customers')
      .insert({
        full_name: payload.fullName,
        phone: payload.phone,
        address: payload.address || null,
        email: payload.email || null,
        notes: payload.notes || null
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async findOrCreateCustomer(fullName: string, phone: string, address?: string) {
    if (!fullName || !fullName.trim()) {
      throw new Error('Tên khách hàng là bắt buộc');
    }
    if (!phone || !phone.trim()) {
      throw new Error('Số điện thoại là bắt buộc');
    }

    // Search by phone (unique identifier for sale_customers)
    const { data: existing, error } = await supabaseAdmin
      .from('sale_customers')
      .select('*')
      .eq('phone', phone.trim())
      .limit(1);

    if (error) throw error;

    if (existing && existing.length > 0) {
      const customer = existing[0];
      // Update address if provided and different
      if (address && address.trim() && address.trim() !== customer.address) {
        const { data: updated } = await supabaseAdmin
          .from('sale_customers')
          .update({ address: address.trim() })
          .eq('id', customer.id)
          .select()
          .single();
        return updated || customer;
      }
      return customer;
    }

    // Create new customer
    return await this.createCustomer({
      fullName: fullName.trim(),
      phone: phone.trim(),
      address: address || undefined
    });
  }

  static async getAllCustomers(limit = 100, offset = 0, query?: string) {
    let q = supabaseAdmin.from('sale_customers').select('*');

    if (query && query.trim()) {
      const clean = query.trim();
      q = q.or(`full_name.ilike.%${clean}%,phone.ilike.%${clean}%,address.ilike.%${clean}%,email.ilike.%${clean}%,notes.ilike.%${clean}%`);
    }

    const { data, error } = await q
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return data || [];
  }

  static async getCustomerById(id: string) {
    const { data, error } = await supabaseAdmin
      .from('sale_customers')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  static async updateCustomer(id: string, updates: Partial<SaleCustomerPayload>) {
    const mappedUpdates: Record<string, any> = {};
    if (updates.fullName !== undefined) mappedUpdates.full_name = updates.fullName;
    if (updates.phone !== undefined) mappedUpdates.phone = updates.phone;
    if (updates.address !== undefined) mappedUpdates.address = updates.address;
    if (updates.email !== undefined) mappedUpdates.email = updates.email;
    if (updates.notes !== undefined) mappedUpdates.notes = updates.notes;

    const { data, error } = await supabaseAdmin
      .from('sale_customers')
      .update(mappedUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async deleteCustomer(id: string) {
    const { error } = await supabaseAdmin
      .from('sale_customers')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  }

  static async getCustomerHistory(customerId: string) {
    await this.getCustomerById(customerId);

    const { data: orders, error } = await supabaseAdmin
      .from('sale_orders')
      .select(`
        *,
        sale_products(name, brand, category_name),
        users(first_name, last_name, staff_code)
      `)
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (orders || []).map((order: any) => {
      const copy = { ...order };
      if (copy.users) {
        copy.sale_employees = {
          full_name: `${copy.users.first_name || ''} ${copy.users.last_name || ''}`.trim() || 'Staff',
          staff_code: copy.users.staff_code || ''
        };
        delete copy.users;
      } else {
        copy.sale_employees = null;
      }
      return copy;
    });
  }
}

