import { supabaseAdmin } from '../../config/supabase.js';

export interface FeedbackPayload {
  customerId?: string;
  bookingId?: string;
  orderId?: string;
  type: 'FEEDBACK' | 'COMPLAINT' | 'SUGGESTION';
  content: string;
  staffId: string;
}

export class FeedbackService {
  static async createFeedback(payload: FeedbackPayload) {
    if (!payload.content || !payload.content.trim()) {
      throw new Error('Feedback content cannot be empty.');
    }

    const { data, error } = await supabaseAdmin
      .from('feedbacks')
      .insert({
        customer_id: payload.customerId || null,
        booking_id: payload.bookingId || null,
        order_id: payload.orderId || null,
        type: payload.type,
        content: payload.content,
        staff_id: payload.staffId
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async listFeedbacks(filters: {
    type?: string;
    resolved?: boolean;
    customerId?: string;
    limit?: number;
    offset?: number;
  }) {
    const { resolved, customerId, limit = 50, offset = 0 } = filters;

    let query = supabaseAdmin
      .from('feedbacks')
      .select(`
        *,
        customers (
          id,
          full_name,
          phone_number
        ),
        staff:users!feedbacks_staff_id_fkey (
          id,
          first_name,
          last_name
        )
      `, { count: 'exact' });

    if (customerId) query = query.eq('customer_id', customerId);
    if (resolved !== undefined) {
      query = query.eq('resolved', resolved);
    }

    query = query
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    const { data, error, count } = await query;
    if (error) throw error;

    const mapped = (data || []).map((item: any) => {
      const copy = { ...item };
      
      copy.resolved = !!item.resolved;
      copy.resolved_at = item.resolved_at || item.created_at;

      if (item.customers) {
        copy.profiles = {
          full_name: item.customers.full_name,
          phone: item.customers.phone_number
        };
      } else {
        copy.profiles = {
          full_name: 'Khách vãng lai',
          phone: ''
        };
      }

      if (item.staff) {
        copy.staff = {
          full_name: `${item.staff.last_name || ''} ${item.staff.first_name || ''}`.trim() || 'Nhân viên'
        };
      } else {
        copy.staff = {
          full_name: 'Hệ thống'
        };
      }
      return copy;
    });

    return {
      feedbacks: mapped,
      totalCount: count || 0
    };
  }

  static async resolveFeedback(feedbackId: string | number, resolvedById: string) {
    const { data, error } = await supabaseAdmin
      .from('feedbacks')
      .update({
        resolved: true,
        resolved_by: resolvedById,
        resolved_at: new Date().toISOString()
      })
      .eq('id', feedbackId)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new Error('Feedback not found');
      }
      throw error;
    }
    return data;
  }
}
