import { Request, Response, NextFunction } from 'express';
import { SaleEmployeeService } from './sale-employee.service.js';

export class SaleEmployeeController {
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await SaleEmployeeService.getAllEmployees();
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await SaleEmployeeService.getEmployeeById(Number(req.params.id));
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await SaleEmployeeService.createEmployee(req.body);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await SaleEmployeeService.updateEmployee(Number(req.params.id), req.body);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async remove(req: Request, res: Response, next: NextFunction) {
    try {
      await SaleEmployeeService.deleteEmployee(Number(req.params.id));
      res.json({ success: true, message: 'Đã xóa nhân viên thành công' });
    } catch (err) {
      next(err);
    }
  }
}
