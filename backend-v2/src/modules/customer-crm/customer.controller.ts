import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware.js';
import { CustomerService } from './customer.service.js';

export class CustomerController {
  static async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { firstName, lastName, fullName, email, phoneNumber, identityNumber, address, notes } = req.body;
      const staffId = req.user!.id;

      const customerName = fullName || `${lastName || ''} ${firstName || ''}`.trim();
      if (!customerName) {
        return res.status(400).json({
          success: false,
          data: null,
          error: 'Tên khách hàng là bắt buộc'
        });
      }

      const customer = await CustomerService.createCustomer({
        firstName,
        lastName,
        fullName,
        email,
        phoneNumber,
        identityNumber,
        address,
        notes
      }, staffId);

      res.status(201).json({
        success: true,
        data: customer,
        error: null
      });
    } catch (error: any) {
      next(error);
    }
  }

  static async findOrCreate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { fullName, phone, address } = req.body;
      if (!fullName) {
        return res.status(400).json({
          success: false,
          data: null,
          error: 'Tên khách hàng là bắt buộc'
        });
      }

      const customer = await CustomerService.findOrCreateCustomer(fullName, phone, address);
      res.status(200).json({
        success: true,
        data: customer,
        error: null
      });
    } catch (error: any) {
      next(error);
    }
  }

  static async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { limit = 100, offset = 0 } = req.query;
      const customers = await CustomerService.getAllCustomers(
        Number(limit) || 100,
        Number(offset) || 0
      );
      res.status(200).json({
        success: true,
        data: customers,
        error: null
      });
    } catch (error) {
      next(error);
    }
  }

  static async search(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { q } = req.query;
      const customers = await CustomerService.searchCustomers(q as string);
      res.status(200).json({
        success: true,
        data: customers,
        error: null
      });
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const customer = await CustomerService.getCustomerById(req.params.id);
      res.status(200).json({
        success: true,
        data: customer,
        error: null
      });
    } catch (error: any) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          data: null,
          error: 'Customer not found'
        });
      }
      next(error);
    }
  }

  static async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { firstName, lastName, fullName, email, phoneNumber, identityNumber, address, notes } = req.body;
      
      const updated = await CustomerService.updateCustomer(req.params.id, {
        firstName,
        lastName,
        fullName,
        email,
        phoneNumber,
        identityNumber,
        address,
        notes
      });

      res.status(200).json({
        success: true,
        data: updated,
        error: null
      });
    } catch (error: any) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          data: null,
          error: 'Customer not found'
        });
      }
      next(error);
    }
  }

  static async getHistory(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const history = await CustomerService.getCustomerHistory(req.params.id);
      res.status(200).json({
        success: true,
        data: history,
        error: null
      });
    } catch (error: any) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          data: null,
          error: 'Customer not found'
        });
      }
      next(error);
    }
  }

  static async delete(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const data = await CustomerService.deleteCustomer(id);
      res.status(200).json({
        success: true,
        data,
        error: null
      });
    } catch (error: any) {
      if (error.code === '23503') {
        return res.status(400).json({
          success: false,
          data: null,
          error: 'Không thể xóa khách hàng này vì họ có lịch sử giao dịch hoặc đơn hàng liên kết.'
        });
      }
      next(error);
    }
  }
}
