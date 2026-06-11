import { Request, Response, NextFunction } from 'express';
import { SaleOrderService } from './sale-order.service.js';

export class SaleOrderController {
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const { month, year, limit, offset } = req.query;
      const m = month ? Number(month) : undefined;
      const y = year ? Number(year) : undefined;
      const l = limit ? Number(limit) : 10;
      const o = offset ? Number(offset) : 0;

      const data = await SaleOrderService.getOrders(m, y, l, o);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await SaleOrderService.createOrder(req.body);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await SaleOrderService.updateOrder(Number(req.params.id), req.body);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async remove(req: Request, res: Response, next: NextFunction) {
    try {
      await SaleOrderService.deleteOrder(Number(req.params.id));
      res.json({ success: true, message: 'Đã xóa đơn hàng bán thành công' });
    } catch (err) {
      next(err);
    }
  }

  static async getSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const { month, year } = req.query;
      if (!month || !year) {
        return res.status(400).json({ success: false, message: 'month và year là bắt buộc để lấy tổng kết doanh thu' });
      }

      const data = await SaleOrderService.getOrderSummary(Number(month), Number(year));
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
}
