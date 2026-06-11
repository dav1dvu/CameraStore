import { Request, Response, NextFunction } from 'express';
import { EmployeeService } from './employee.service.js';

export class EmployeeController {
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await EmployeeService.getAllEmployees();
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await EmployeeService.getEmployeeById(Number(req.params.id));
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await EmployeeService.createEmployee(req.body);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await EmployeeService.updateEmployee(Number(req.params.id), req.body);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async remove(req: Request, res: Response, next: NextFunction) {
    try {
      await EmployeeService.deleteEmployee(Number(req.params.id));
      res.json({ success: true, message: 'Đã xóa nhân viên thành công' });
    } catch (err) {
      next(err);
    }
  }
}
