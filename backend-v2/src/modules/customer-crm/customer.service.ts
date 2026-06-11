import { supabaseAdmin } from '../../config/supabase.js';

export interface CustomerPayload {
  firstName?: string;
  lastName?: string;
  fullName?: string;
  email?: string;
  phoneNumber?: string;
  identityNumber?: string;
  address?: string;
  notes?: string;
}

export function mapCustomer(c: any) {
  if (!c) return c;
  return {
    ...c,
    full_name: `${c.last_name || ''} ${c.first_name || ''}`.trim()
  };
}

export class CustomerService {
  static async createCustomer(payload: CustomerPayload, staffId?: string) {
    // Parse fullName into firstName/lastName if provided
    let firstName = payload.firstName || '';
    let lastName = payload.lastName || '';
    if (payload.fullName && !firstName && !lastName) {
      const parts = payload.fullName.trim().split(/\s+/);
      if (parts.length === 1) {
        firstName = parts[0];
        lastName = '';
      } else {
        firstName = parts[parts.length - 1];
        lastName = parts.slice(0, -1).join(' ');
      }
    }
    if (!firstName && !lastName) {
      firstName = 'Khách';
      lastName = 'Hàng';
    }

    // Validate CCCD only if provided
    if (payload.identityNumber && (payload.identityNumber.length !== 12 || !/^\d+$/.test(payload.identityNumber))) {
      throw new Error('Identity number (CCCD) must be exactly 12 digits.');
    }

    const { data, error } = await supabaseAdmin
      .from('customers')
      .insert({
        first_name: firstName,
        last_name: lastName,
        email: payload.email || null,
        phone_number: payload.phoneNumber || null,
        identity_number: payload.identityNumber || null,
        address: payload.address || null,
        notes: payload.notes || null,
        is_active: true
      })
      .select()
      .single();

    if (error) throw error;

    return mapCustomer(data);
  }

  static async findOrCreateCustomer(fullName: string, phone?: string, address?: string) {
    if (!fullName || !fullName.trim()) {
      throw new Error('Tên khách hàng là bắt buộc');
    }

    // Try to find existing customer by name + phone
    let query = supabaseAdmin
      .from('customers')
      .select('*');

    const nameParts = fullName.trim().split(/\s+/);
    const firstName = nameParts[nameParts.length - 1];
    const lastName = nameParts.length > 1 ? nameParts.slice(0, -1).join(' ') : '';

    query = query.ilike('first_name', firstName);
    if (lastName) {
      query = query.ilike('last_name', `%${lastName}%`);
    }
    if (phone) {
      query = query.eq('phone_number', phone);
    }

    const { data: existing } = await query.limit(1);

    if (existing && existing.length > 0) {
      // Update address if provided and different
      if (address && address !== existing[0].address) {
        await supabaseAdmin
          .from('customers')
          .update({ address })
          .eq('id', existing[0].id);
        existing[0].address = address;
      }
      return mapCustomer(existing[0]);
    }

    // Create new customer
    return await this.createCustomer({
      fullName: fullName.trim(),
      phoneNumber: phone || undefined,
      address: address || undefined
    });
  }

  static async getCustomerById(id: string) {
    const { data, error } = await supabaseAdmin
      .from('customers')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    return mapCustomer(data);
  }

  static async getAllCustomers(limit = 100, offset = 0) {
    const { data, error } = await supabaseAdmin
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return (data || []).map(mapCustomer);
  }

  static async searchCustomers(query: string) {
    let q = supabaseAdmin
      .from('customers')
      .select('*');

    if (query && query.trim()) {
      const cleanQuery = query.trim();
      q = q.or(`first_name.ilike.%${cleanQuery}%,last_name.ilike.%${cleanQuery}%,phone_number.ilike.%${cleanQuery}%,identity_number.ilike.%${cleanQuery}%,email.ilike.%${cleanQuery}%`);
    }

    const { data, error } = await q.order('created_at', { ascending: false }).limit(50);
    if (error) throw error;

    return (data || []).map(mapCustomer);
  }

  static async updateCustomer(id: string, updates: Partial<CustomerPayload>) {
    if (updates.identityNumber && updates.identityNumber.length > 0) {
      if (updates.identityNumber.length !== 12 || !/^\d+$/.test(updates.identityNumber)) {
        throw new Error('Identity number (CCCD) must be exactly 12 digits.');
      }
    }

    const mappedUpdates: Record<string, any> = {};
    if (updates.firstName !== undefined) mappedUpdates.first_name = updates.firstName;
    if (updates.lastName !== undefined) mappedUpdates.last_name = updates.lastName;
    if (updates.fullName !== undefined) {
      const parts = updates.fullName.trim().split(/\s+/);
      mappedUpdates.first_name = parts[parts.length - 1];
      mappedUpdates.last_name = parts.length > 1 ? parts.slice(0, -1).join(' ') : '';
    }
    if (updates.phoneNumber !== undefined) mappedUpdates.phone_number = updates.phoneNumber;
    if (updates.identityNumber !== undefined) mappedUpdates.identity_number = updates.identityNumber;
    if (updates.email !== undefined) mappedUpdates.email = updates.email;
    if (updates.address !== undefined) mappedUpdates.address = updates.address;
    if (updates.notes !== undefined) mappedUpdates.notes = updates.notes;

    const { data, error } = await supabaseAdmin
      .from('customers')
      .update(mappedUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return mapCustomer(data);
  }

  static async getCustomerHistory(customerId: string) {
    // Verify customer exists
    await this.getCustomerById(customerId);

    // Fetch Bookings (linked to customer_id in bookings)
    const { data: bookings, error: bookingsErr } = await supabaseAdmin
      .from('bookings')
      .select(`
        *,
        booking_equipments (
          equipments (
            serial_number,
            camera_models (
              model_name,
              brand
            )
          )
        )
      `)
      .eq('customer_id', customerId)
      .order('start_date', { ascending: false });

    if (bookingsErr) throw bookingsErr;

    if (bookings) {
      bookings.forEach((b: any) => {
        b.total_rental_fee = b.total_rent_fee;
        b.deposit_amount = b.deposit_fee;
        b.status = b.booking_status;

        if (b.booking_equipments && b.booking_equipments.length > 0) {
          const eqLink = b.booking_equipments[0].equipments;
          if (eqLink) {
            b.equipment = {
              serial_number: eqLink.serial_number,
              products: eqLink.camera_models ? {
                name: eqLink.camera_models.model_name,
                brand: eqLink.camera_models.brand || 'Leica'
              } : { name: 'Thiết bị', brand: '' }
            };
          }
        }
        if (!b.equipment) {
          b.equipment = {
            serial_number: 'N/A',
            products: { name: 'Mẫu máy', brand: '' }
          };
        }
      });
    }

    // Fetch Orders (linked to customer_id in orders)
    const { data: orders, error: ordersErr } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    if (ordersErr) throw ordersErr;

    return {
      bookings: bookings || [],
      orders: orders || []
    };
  }

  static async deleteCustomer(id: string) {
    const { data, error } = await supabaseAdmin
      .from('customers')
      .delete()
      .eq('id', id)
      .select();

    if (error) throw error;
    return (data || []).map(mapCustomer);
  }
}
