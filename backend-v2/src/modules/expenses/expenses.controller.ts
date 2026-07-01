import { Request, Response, NextFunction } from 'express';
import { ExpenseService } from './expenses.service.js';

export class ExpenseController {
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const { type, month, year } = req.query;
      if (!type || (type !== 'MUONMAYCHUT' && type !== 'BANMAYFILM')) {
        return res.status(400).json({ success: false, message: 'businessType type là bắt buộc (MUONMAYCHUT hoặc BANMAYFILM)' });
      }

      const m = month ? Number(month) : undefined;
      const y = year ? Number(year) : undefined;

      const data = await ExpenseService.getExpenses(type as 'MUONMAYCHUT' | 'BANMAYFILM', m, y);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await ExpenseService.createExpense(req.body);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await ExpenseService.updateExpense(Number(req.params.id), req.body);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async remove(req: Request, res: Response, next: NextFunction) {
    try {
      await ExpenseService.deleteExpense(Number(req.params.id));
      res.json({ success: true, message: 'Đã xóa phát sinh thành công' });
    } catch (err) {
      next(err);
    }
  }

  static async getSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const { type, month, year } = req.query;
      if (!type || (type !== 'MUONMAYCHUT' && type !== 'BANMAYFILM')) {
        return res.status(400).json({ success: false, message: 'businessType type là bắt buộc' });
      }
      if (!month || !year) {
        return res.status(400).json({ success: false, message: 'month và year là bắt buộc để lấy tổng kết' });
      }

      const data = await ExpenseService.getExpenseSummaryByPaidBy(
        type as 'MUONMAYCHUT' | 'BANMAYFILM',
        Number(month),
        Number(year)
      );
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
}
