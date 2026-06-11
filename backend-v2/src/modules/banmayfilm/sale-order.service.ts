import { supabaseAdmin } from '../../config/supabase.js';
import { SaleCustomerService } from './sale-customer.service.js';

export interface SaleOrderPayload {
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  productId: string;
  salePrice: number;
  quantity: number;
  soldBy: number; // SaleEmployee id
  notes?: string;
  status?: 'PENDING' | 'COMPLETED' | 'CANCELLED';
  createdAt?: string;
}

export class SaleOrderService {
  static async createOrder(payload: SaleOrderPayload) {
    if (!payload.customerName || !payload.customerPhone || !payload.productId || payload.quantity === undefined || !payload.soldBy) {
      throw new Error('Thiếu thông tin đơn hàng bắt buộc');
    }

    // 1. Resolve customer
    const customer = await SaleCustomerService.findOrCreateCustomer(
      payload.customerName,
      payload.customerPhone,
      payload.customerAddress
    );

    // 2. Verify and adjust product stock
    const { data: product, error: prodError } = await supabaseAdmin
      .from('sale_products')
      .select('id, name, available_stock, total_stock')
      .eq('id', payload.productId)
      .single();

    if (prodError || !product) {
      throw new Error('Sản phẩm không tồn tại');
    }

    if ((product.available_stock || 0) < payload.quantity) {
      throw new Error(`Sản phẩm ${product.name} không đủ số lượng trong kho. Còn lại: ${product.available_stock}`);
    }

    // 3. Deduct stock
    const newAvailable = (product.available_stock || 0) - payload.quantity;
    const newTotal = (product.total_stock || 0) - payload.quantity;

    const { error: stockError } = await supabaseAdmin
      .from('sale_products')
      .update({
        available_stock: newAvailable,
        total_stock: newTotal
      })
      .eq('id', payload.productId);

    if (stockError) throw stockError;

    // Resolve UUID for sold_by from employee_id (number)
    const { data: staff, error: staffErr } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('employee_id', payload.soldBy)
      .single();

    if (staffErr || !staff) {
      throw new Error('Nhân viên bán hàng không tồn tại');
    }

    // 4. Create the sale order
    const { data: order, error: orderError } = await supabaseAdmin
      .from('sale_orders')
      .insert({
        customer_id: customer.id,
        product_id: payload.productId,
        sale_price: payload.salePrice,
        quantity: payload.quantity,
        sold_by: staff.id,
        notes: payload.notes || null,
        status: payload.status || 'COMPLETED',
        created_at: payload.createdAt || new Date().toISOString()
      })
      .select()
      .single();

    if (orderError) {
      // Rollback stock if order creation fails
      await supabaseAdmin
        .from('sale_products')
        .update({
          available_stock: product.available_stock,
          total_stock: product.total_stock
        })
        .eq('id', payload.productId);
      throw orderError;
    }

    return order;
  }

  static async getOrders(month?: number, year?: number, limit = 10, offset = 0) {
    let query = supabaseAdmin
      .from('sale_orders')
      .select(`
        *,
        sale_products(name, brand, category_name),
        sale_customers(full_name, phone, address),
        users(first_name, last_name, staff_code)
      `);

    if (month && year) {
      const startDate = `${year}-${String(month).padStart(2, '0')}-01T00:00:00.000Z`;
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}T23:59:59.999Z`;
      query = query.gte('created_at', startDate).lte('created_at', endDate);
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    
    return (data || []).map((order: any) => {
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

  static async updateOrder(id: number, updates: Partial<SaleOrderPayload>) {
    // 1. Get existing order
    const { data: oldOrder, error: oldOrderErr } = await supabaseAdmin
      .from('sale_orders')
      .select('*')
      .eq('id', id)
      .single();

    if (oldOrderErr || !oldOrder) {
      throw new Error('Đơn hàng không tồn tại');
    }

    // Resolve customer if customer details are updated
    let customerId = oldOrder.customer_id;
    if (updates.customerName || updates.customerPhone) {
      const name = updates.customerName || '';
      const phone = updates.customerPhone || '';
      const address = updates.customerAddress;
      const customer = await SaleCustomerService.findOrCreateCustomer(name, phone, address);
      customerId = customer.id;
    }

    const newProductId = updates.productId !== undefined ? updates.productId : oldOrder.product_id;
    const newQty = updates.quantity !== undefined ? updates.quantity : oldOrder.quantity;

    // 2. Handle stock adjustment if product or quantity changed
    if (newProductId !== oldOrder.product_id || newQty !== oldOrder.quantity) {
      // Restore stock for old product
      const { data: oldProd } = await supabaseAdmin
        .from('sale_products')
        .select('available_stock, total_stock')
        .eq('id', oldOrder.product_id)
        .single();
      
      if (oldProd) {
        await supabaseAdmin
          .from('sale_products')
          .update({
            available_stock: (oldProd.available_stock || 0) + oldOrder.quantity,
            total_stock: (oldProd.total_stock || 0) + oldOrder.quantity
          })
          .eq('id', oldOrder.product_id);
      }

      // Check stock for new product
      const { data: newProd } = await supabaseAdmin
        .from('sale_products')
        .select('name, available_stock, total_stock')
        .eq('id', newProductId)
        .single();

      if (!newProd) {
        throw new Error('Sản phẩm mới không tồn tại');
      }

      if ((newProd.available_stock || 0) < newQty) {
        // Rollback old product stock restore
        if (oldProd) {
          await supabaseAdmin
            .from('sale_products')
            .update({
              available_stock: oldProd.available_stock,
              total_stock: oldProd.total_stock
            })
            .eq('id', oldOrder.product_id);
        }
        throw new Error(`Sản phẩm ${newProd.name} không đủ số lượng trong kho. Còn lại: ${newProd.available_stock}`);
      }

      // Deduct stock for new product
      await supabaseAdmin
        .from('sale_products')
        .update({
          available_stock: (newProd.available_stock || 0) - newQty,
          total_stock: (newProd.total_stock || 0) - newQty
        })
        .eq('id', newProductId);
    }

    const mappedUpdates: Record<string, any> = {
      customer_id: customerId
    };
    if (updates.productId !== undefined) mappedUpdates.product_id = updates.productId;
    if (updates.salePrice !== undefined) mappedUpdates.sale_price = updates.salePrice;
    if (updates.quantity !== undefined) mappedUpdates.quantity = updates.quantity;
    
    if (updates.soldBy !== undefined) {
      const { data: staff, error: staffErr } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('employee_id', updates.soldBy)
        .single();

      if (staffErr || !staff) {
        throw new Error('Nhân viên bán hàng không tồn tại');
      }
      mappedUpdates.sold_by = staff.id;
    }
    
    if (updates.notes !== undefined) mappedUpdates.notes = updates.notes;
    if (updates.status !== undefined) mappedUpdates.status = updates.status;

    const { data: updatedOrder, error: updateErr } = await supabaseAdmin
      .from('sale_orders')
      .update(mappedUpdates)
      .eq('id', id)
      .select()
      .single();

    if (updateErr) throw updateErr;
    return updatedOrder;
  }

  static async deleteOrder(id: number) {
    // 1. Get the order to find product and quantity
    const { data: order, error: orderErr } = await supabaseAdmin
      .from('sale_orders')
      .select('product_id, quantity')
      .eq('id', id)
      .single();

    if (orderErr || !order) {
      throw new Error('Đơn hàng không tồn tại');
    }

    // 2. Restore stock
    const { data: product } = await supabaseAdmin
      .from('sale_products')
      .select('available_stock, total_stock')
      .eq('id', order.product_id)
      .single();

    if (product) {
      await supabaseAdmin
        .from('sale_products')
        .update({
          available_stock: (product.available_stock || 0) + order.quantity,
          total_stock: (product.total_stock || 0) + order.quantity
        })
        .eq('id', order.product_id);
    }

    // 3. Delete order
    const { error: delErr } = await supabaseAdmin
      .from('sale_orders')
      .delete()
      .eq('id', id);

    if (delErr) throw delErr;
    return { success: true };
  }

  static async getOrderSummary(month: number, year: number) {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01T00:00:00.000Z`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}T23:59:59.999Z`;

    const { data, error } = await supabaseAdmin
      .from('sale_orders')
      .select(`
        quantity,
        sale_price,
        sale_products(name)
      `)
      .eq('status', 'COMPLETED')
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    if (error) throw error;

    let totalRevenue = 0;
    const revenueByProduct: Record<string, number> = {};

    (data || []).forEach((item: any) => {
      const price = Number(item.sale_price) || 0;
      const qty = Number(item.quantity) || 1;
      const subTotal = price * qty;
      totalRevenue += subTotal;

      const prodName = item.sale_products?.name || 'Sản phẩm không tên';
      revenueByProduct[prodName] = (revenueByProduct[prodName] || 0) + subTotal;
    });

    const productsSummary = Object.entries(revenueByProduct).map(([productName, revenue]) => ({
      productName,
      revenue
    }));

    return {
      totalRevenue,
      productsSummary
    };
  }
}
