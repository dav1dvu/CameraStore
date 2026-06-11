import { supabaseAdmin } from '../../config/supabase.js';

export interface OrderItemPayload {
  productId: string;
  quantity: number;
}

export interface OrderPayload {
  customerId?: string;
  staffId: string;
  shippingAddress: string;
  items: OrderItemPayload[];
}

export class OrderService {
  static async createOrder(payload: OrderPayload) {
    const { customerId, staffId, shippingAddress, items } = payload;
    let totalAmount = 0;

    // Verify customer exists if provided
    let customerInfo: any = null;
    if (customerId) {
      const { data: customer, error: customerErr } = await supabaseAdmin
        .from('customers')
        .select('id, email, phone_number')
        .eq('id', customerId)
        .single();

      if (customerErr || !customer) {
        throw new Error('Customer not found');
      }
      customerInfo = customer;
    }

    // Aggregate duplicate productIds in items array
    const aggregatedItemsMap = new Map<string, number>();
    for (const item of items) {
      aggregatedItemsMap.set(item.productId, (aggregatedItemsMap.get(item.productId) || 0) + item.quantity);
    }
    const aggregatedItems = Array.from(aggregatedItemsMap.entries()).map(([productId, quantity]) => ({
      productId,
      quantity
    }));

    const dbItemsToCreate = [];
    const decrementedStocks: { productId: string; quantity: number }[] = [];

    const rollbackStock = async () => {
      for (const item of decrementedStocks) {
        const { data: p } = await supabaseAdmin
          .from('products')
          .select('stock_quantity')
          .eq('id', item.productId)
          .single();
        if (p) {
          await supabaseAdmin
            .from('products')
            .update({ stock_quantity: (p.stock_quantity || 0) + item.quantity })
            .eq('id', item.productId);
        }
      }
    };

    try {
      for (const item of aggregatedItems) {
        // 1. Get Product
        const { data: product, error: prodErr } = await supabaseAdmin
          .from('products')
          .select('name, price, stock_quantity')
          .eq('id', item.productId)
          .single();

        if (prodErr || !product) {
          throw new Error(`Product not found: ${item.productId}`);
        }

        const salePrice = Number(product.price);
        if (salePrice <= 0) {
          throw new Error(`Product ${product.name} is not available for purchase (rental only)`);
        }

        if (product.stock_quantity < item.quantity) {
          throw new Error(`Insufficient stock for ${product.name}. Requested: ${item.quantity}, Available: ${product.stock_quantity}`);
        }

        const unitPrice = salePrice;
        totalAmount += unitPrice * item.quantity;

        // Decrement stock
        const { error: decErr } = await supabaseAdmin
          .from('products')
          .update({ stock_quantity: product.stock_quantity - item.quantity })
          .eq('id', item.productId);

        if (decErr) {
          console.error('Failed to update stock:', decErr);
          throw new Error(`Conflict detected: could not update stock for ${product.name}`);
        }

        decrementedStocks.push({ productId: item.productId, quantity: item.quantity });
        
        dbItemsToCreate.push({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice
        });
      }

      let orderCreated = false;
      let orderIdToCleanup: string | null = null;

      try {
        // 2. Create Order in database (customer_id is customerId)
        const { data: order, error: orderErr } = await supabaseAdmin
          .from('orders')
          .insert({
            customer_id: customerId || null,
            status: 'PENDING',
            total_price: totalAmount
          })
          .select()
          .single();

        if (orderErr || !order) throw orderErr || new Error('Failed to create order record');

        orderIdToCleanup = order.order_id;
        orderCreated = true;

        // 3. Create Order Items
        for (const dbItem of dbItemsToCreate) {
          const { error: itemErr } = await supabaseAdmin.from('order_items').insert({
            order_id: order.order_id,
            product_id: dbItem.productId,
            quantity: dbItem.quantity,
            unit_price: dbItem.unitPrice
          });
          if (itemErr) throw itemErr;
        }

        // 4. Create initial pending transaction (using staffId as user_id)
        const { data: transaction, error: txErr } = await supabaseAdmin
          .from('transactions')
          .insert({
            order_id: order.order_id,
            user_id: staffId,
            type: 'PURCHASE',
            amount: totalAmount,
            status: 'PENDING',
            notes: `Purchase payment for Order ID ${String(order.order_id).substring(0, 8)}`
          })
          .select()
          .single();

        if (txErr || !transaction) throw txErr || new Error('Failed to create transaction record');

        // Map database fields to what frontend/app expects
        order.id = order.order_id;
        order.total_amount = order.total_price;

        return {
          order,
          transactionId: transaction.id,
          totalAmount
        };
      } catch (error) {
        if (orderCreated && orderIdToCleanup) {
          await supabaseAdmin.from('orders').delete().eq('order_id', orderIdToCleanup);
        }
        throw error;
      }
    } catch (error) {
      await rollbackStock();
      throw error;
    }
  }

  static async getOrderDetails(orderId: string) {
    const { data, error } = await supabaseAdmin
      .from('orders')
      .select(`
        *,
        users (
          id,
          first_name,
          last_name,
          phone_number
        ),
        customers (
          id,
          first_name,
          last_name,
          phone_number,
          email,
          address
        ),
        order_items (
          *,
          products (
            name,
            brand,
            images
          )
        ),
        transactions (*)
      `)
      .eq('order_id', orderId)
      .single();

    if (error || !data) throw new Error('Order not found');

    if (data) {
      data.id = data.order_id;
      data.total_amount = data.total_price;
      if (data.customers) {
        data.profiles = {
          id: data.customers.id,
          full_name: `${data.customers.last_name || ''} ${data.customers.first_name || ''}`.trim() || 'N/A',
          phone: data.customers.phone_number
        };
      }
      if (data.users) {
        data.staff = {
          id: data.users.id,
          full_name: `${data.users.first_name} ${data.users.last_name}`.trim(),
          phone: data.users.phone_number
        };
      }
    }

    return data;
  }

  static async listAllOrders(filters?: { customerId?: string, status?: string }) {
    let query = supabaseAdmin
      .from('orders')
      .select(`
        *,
        customers (
          id,
          first_name,
          last_name,
          phone_number
        ),
        order_items (
          products (
            name,
            brand
          )
        )
      `);

    if (filters?.customerId) {
      query = query.eq('customer_id', filters.customerId);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;

    if (data) {
      data.forEach((item: any) => {
        item.id = item.order_id;
        item.total_amount = item.total_price;
        if (item.customers) {
          item.profiles = {
            id: item.customers.id,
            full_name: `${item.customers.last_name || ''} ${item.customers.first_name || ''}`.trim() || 'N/A',
            phone: item.customers.phone_number
          };
        }
      });
    }

    return data;
  }
}
