import { Request, Response, NextFunction } from 'express';
import { SaleCustomerService } from './sale-customer.service.js';

export class SaleCustomerController {
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = req.query.limit ? Number(req.query.limit) : 100;
      const offset = req.query.offset ? Number(req.query.offset) : 0;
      const q = req.query.q ? String(req.query.q) : undefined;
      const data = await SaleCustomerService.getAllCustomers(limit, offset, q);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await SaleCustomerService.getCustomerById(req.params.id);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await SaleCustomerService.createCustomer(req.body);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await SaleCustomerService.updateCustomer(req.params.id, req.body);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async remove(req: Request, res: Response, next: NextFunction) {
    try {
      await SaleCustomerService.deleteCustomer(req.params.id);
      res.json({ success: true, message: 'Đã xóa khách hàng thành công' });
    } catch (err) {
      next(err);
    }
  }

  static async getHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await SaleCustomerService.getCustomerHistory(req.params.id);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
}

