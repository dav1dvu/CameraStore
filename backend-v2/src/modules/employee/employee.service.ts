import { supabaseAdmin } from '../../config/supabase.js';

export interface EmployeePayload {
  staffCode: string;
  fullName: string;
  phone?: string;
  address?: string;
  notes?: string;
}

export class EmployeeService {
  static async createEmployee(payload: EmployeePayload) {
    if (!payload.staffCode || !payload.fullName) {
      throw new Error('Mã nhân viên và Tên nhân viên là bắt buộc');
    }

    const { data, error } = await supabaseAdmin
      .from('employees')
      .insert({
        staff_code: payload.staffCode,
        full_name: payload.fullName,
        phone: payload.phone || null,
        address: payload.address || null,
        notes: payload.notes || null
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async getAllEmployees() {
    const { data, error } = await supabaseAdmin
      .from('employees')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  static async getEmployeeById(id: number) {
    const { data, error } = await supabaseAdmin
      .from('employees')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  static async updateEmployee(id: number, updates: Partial<EmployeePayload>) {
    const mappedUpdates: Record<string, any> = {};
    if (updates.staffCode !== undefined) mappedUpdates.staff_code = updates.staffCode;
    if (updates.fullName !== undefined) mappedUpdates.full_name = updates.fullName;
    if (updates.phone !== undefined) mappedUpdates.phone = updates.phone;
    if (updates.address !== undefined) mappedUpdates.address = updates.address;
    if (updates.notes !== undefined) mappedUpdates.notes = updates.notes;

    const { data, error } = await supabaseAdmin
      .from('employees')
      .update(mappedUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async deleteEmployee(id: number) {
    const { error } = await supabaseAdmin
      .from('employees')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  }
}
