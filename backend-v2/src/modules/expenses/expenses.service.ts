import { supabaseAdmin } from '../../config/supabase.js';

export interface ExpensePayload {
  businessType: 'MUONMAYCHUT' | 'BANMAYFILM';
  expenseDate: string; // YYYY-MM-DD
  description: string;
  amount: number;
  paidBy: string;
  notes?: string;
}

export class ExpenseService {
  static async createExpense(payload: ExpensePayload) {
    if (!payload.businessType || !payload.expenseDate || !payload.description || payload.amount === undefined || !payload.paidBy) {
      throw new Error('Thiếu thông tin chi phí bắt buộc');
    }

    const { data, error } = await supabaseAdmin
      .from('expenses')
      .insert({
        business_type: payload.businessType,
        expense_date: payload.expenseDate,
        description: payload.description,
        amount: payload.amount,
        paid_by: payload.paidBy,
        notes: payload.notes || null
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async getExpenses(businessType: 'MUONMAYCHUT' | 'BANMAYFILM', month?: number, year?: number) {
    let query = supabaseAdmin
      .from('expenses')
      .select('*')
      .eq('business_type', businessType);

    if (month && year) {
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      query = query.gte('expense_date', startDate).lte('expense_date', endDate);
    }

    const { data, error } = await query.order('expense_date', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  static async updateExpense(id: number, updates: Partial<ExpensePayload>) {
    const mappedUpdates: Record<string, any> = {};
    if (updates.businessType !== undefined) mappedUpdates.business_type = updates.businessType;
    if (updates.expenseDate !== undefined) mappedUpdates.expense_date = updates.expenseDate;
    if (updates.description !== undefined) mappedUpdates.description = updates.description;
    if (updates.amount !== undefined) mappedUpdates.amount = updates.amount;
    if (updates.paidBy !== undefined) mappedUpdates.paid_by = updates.paidBy;
    if (updates.notes !== undefined) mappedUpdates.notes = updates.notes;

    const { data, error } = await supabaseAdmin
      .from('expenses')
      .update(mappedUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async deleteExpense(id: number) {
    const { error } = await supabaseAdmin
      .from('expenses')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  }

  static async getExpenseSummaryByPaidBy(businessType: 'MUONMAYCHUT' | 'BANMAYFILM', month: number, year: number) {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const { data, error } = await supabaseAdmin
      .from('expenses')
      .select('paid_by, amount')
      .eq('business_type', businessType)
      .gte('expense_date', startDate)
      .lte('expense_date', endDate);

    if (error) throw error;

    // Group and sum in JavaScript for simplicity and speed
    const summary: Record<string, number> = {};
    (data || []).forEach((item: any) => {
      const paidBy = item.paid_by;
      const amt = Number(item.amount) || 0;
      summary[paidBy] = (summary[paidBy] || 0) + amt;
    });

    return Object.entries(summary).map(([paidBy, totalAmount]) => ({
      paidBy,
      totalAmount
    }));
  }
}
