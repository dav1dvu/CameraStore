import { Request, Response, NextFunction } from 'express';
import { SaleImportService } from './sale-import.service.js';

export class SaleImportController {
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const { month, year, limit, offset } = req.query;
      const m = month ? Number(month) : undefined;
      const y = year ? Number(year) : undefined;
      const l = limit ? Number(limit) : 10;
      const o = offset ? Number(offset) : 0;

      const data = await SaleImportService.getImports(m, y, l, o);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await SaleImportService.createImport(req.body);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await SaleImportService.updateImport(Number(req.params.id), req.body);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async remove(req: Request, res: Response, next: NextFunction) {
    try {
      await SaleImportService.deleteImport(Number(req.params.id));
      res.json({ success: true, message: 'Đã xóa bản ghi nhập kho thành công' });
    } catch (err) {
      next(err);
    }
  }

  static async getSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const { month, year } = req.query;
      if (!month || !year) {
        return res.status(400).json({ success: false, message: 'month và year là bắt buộc để lấy tổng kết nhập kho' });
      }

      const data = await SaleImportService.getImportsSummary(Number(month), Number(year));
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
}
