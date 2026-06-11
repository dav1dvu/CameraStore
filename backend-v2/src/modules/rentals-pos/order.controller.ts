import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware.js';
import { OrderService } from './order.service.js';

export class OrderController {
  static async createOrder(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const staffId = req.user!.id;
      const { customerId, shippingAddress, items } = req.body;

      if (!shippingAddress || typeof shippingAddress !== 'string' || shippingAddress.trim().length < 5) {
        return res.status(400).json({
          success: false,
          data: null,
          error: 'shippingAddress must be a valid address of at least 5 characters'
        });
      }

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          success: false,
          data: null,
          error: 'Missing or empty items array'
        });
      }

      for (const item of items) {
        if (!item.productId) {
          return res.status(400).json({
            success: false,
            data: null,
            error: 'Invalid productId'
          });
        }
        const qty = Number(item.quantity);
        if (isNaN(qty) || !Number.isInteger(qty) || qty <= 0) {
          return res.status(400).json({
            success: false,
            data: null,
            error: 'quantity must be a positive integer'
          });
        }
      }

      const result = await OrderService.createOrder({
        customerId,
        staffId,
        shippingAddress: shippingAddress.trim(),
        items
      });

      res.status(201).json({
        success: true,
        data: result,
        error: null
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        data: null,
        error: error.message || 'Order creation failed'
      });
    }
  }

  static async getOrder(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const order = await OrderService.getOrderDetails(req.params.id);

      res.status(200).json({
        success: true,
        data: order,
        error: null
      });
    } catch (error) {
      next(error);
    }
  }

  static async listAllOrders(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { customerId, status } = req.query;
      const orders = await OrderService.listAllOrders({
        customerId: customerId as string,
        status: status as string
      });
      res.status(200).json({
        success: true,
        data: orders,
        error: null
      });
    } catch (error) {
      next(error);
    }
  }
}
