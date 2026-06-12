import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ReportingService } from './reporting.service.js';

const revenueReportSchema = z.object({
  year: z.coerce.number().int().min(2000, 'Năm không hợp lệ').max(2100, 'Năm không hợp lệ'),
  period: z.enum(['monthly', 'quarterly']).optional().default('monthly')
});

const topRentalsSchema = z.object({
  limit: z.coerce.number().int().positive().optional().default(10)
});

export class ReportingController {
  static async getRevenue(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = revenueReportSchema.safeParse(req.query);

      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          data: null,
          error: parsed.error.errors.map(e => e.message).join(', ')
        });
      }

      const report = await ReportingService.getRevenueReport(
        parsed.data.year,
        parsed.data.period
      );

      res.status(200).json({
        success: true,
        data: report,
        error: null
      });
    } catch (error) {
      next(error);
    }
  }

  static async getTopRentals(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = topRentalsSchema.safeParse(req.query);

      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          data: null,
          error: parsed.error.errors.map(e => e.message).join(', ')
        });
      }

      const list = await ReportingService.getTopRentals(parsed.data.limit);

      res.status(200).json({
        success: true,
        data: list,
        error: null
      });
    } catch (error) {
      next(error);
    }
  }

  static async getEquipmentCondition(req: Request, res: Response, next: NextFunction) {
    try {
      const report = await ReportingService.getEquipmentConditionReport();

      res.status(200).json({
        success: true,
        data: report,
        error: null
      });
    } catch (error) {
      next(error);
    }
  }

  static async getDailyHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const list = await ReportingService.getDailyHistory();
      res.status(200).json({
        success: true,
        data: list,
        error: null
      });
    } catch (error) {
      next(error);
    }
  }

  static async getOrderHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = Number(req.query.limit) || 10;
      const offset = Number(req.query.offset) || 0;
      const month = req.query.month ? Number(req.query.month) : undefined;
      const year = req.query.year ? Number(req.query.year) : undefined;

      const result = await ReportingService.getOrderHistory(limit, offset, month, year, (req as any).user?.role);
      res.status(200).json({
        success: true,
        data: result,
        error: null
      });
    } catch (error: any) {
      next(error);
    }
  }

  static async getOrderHistorySummary(req: Request, res: Response, next: NextFunction) {
    try {
      const month = req.query.month ? Number(req.query.month) : undefined;
      const year = req.query.year ? Number(req.query.year) : undefined;

      if (!month || !year) {
        return res.status(400).json({ success: false, message: 'month và year là bắt buộc để lấy tổng kết' });
      }

      const result = await ReportingService.getOrderHistorySummary(month, year, (req as any).user?.role);
      res.status(200).json({
        success: true,
        data: result,
        error: null
      });
    } catch (error: any) {
      next(error);
    }
  }

  static async updateOrderHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const { type, id } = req.params;
      if ((req as any).user?.role === 'NHANVIENTHUE' && type === 'order') {
        return res.status(403).json({ success: false, error: 'Quyền hạn không hợp lệ: Không thể chỉnh sửa đơn bán đứt!' });
      }
      const result = await ReportingService.updateOrderHistoryItem(type, id, req.body);
      res.status(200).json({
        success: true,
        data: result,
        error: null
      });
    } catch (error: any) {
      next(error);
    }
  }

  static async deleteOrderHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const { type, id } = req.params;
      if ((req as any).user?.role === 'NHANVIENTHUE' && type === 'order') {
        return res.status(403).json({ success: false, error: 'Quyền hạn không hợp lệ: Không thể xóa đơn bán đứt!' });
      }
      const result = await ReportingService.deleteOrderHistoryItem(type, id);
      res.status(200).json({
        success: true,
        data: result,
        error: null
      });
    } catch (error: any) {
      next(error);
    }
  }

  static async getConsolidatedDashboard(req: Request, res: Response, next: NextFunction) {
    try {
      const now = new Date();
      const month = req.query.month ? Number(req.query.month) : now.getMonth() + 1;
      const year = req.query.year ? Number(req.query.year) : now.getFullYear();

      const result = await ReportingService.getConsolidatedDashboard(month, year);
      res.status(200).json({
        success: true,
        data: result,
        error: null
      });
    } catch (error: any) {
      next(error);
    }
  }

  static async getFilmDevelopments(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await ReportingService.getFilmDevelopments();
      res.status(200).json({
        success: true,
        data: result,
        error: null
      });
    } catch (error: any) {
      next(error);
    }
  }

  static async createFilmDevelopment(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await ReportingService.createFilmDevelopment(req.body);
      res.status(201).json({
        success: true,
        data: result,
        error: null
      });
    } catch (error: any) {
      next(error);
    }
  }

  static async updateFilmDevelopment(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ success: false, message: 'ID không hợp lệ' });
      }
      const result = await ReportingService.updateFilmDevelopment(id, req.body);
      res.status(200).json({
        success: true,
        data: result,
        error: null
      });
    } catch (error: any) {
      next(error);
    }
  }

  static async deleteFilmDevelopment(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ success: false, message: 'ID không hợp lệ' });
      }
      const result = await ReportingService.deleteFilmDevelopment(id);
      res.status(200).json({
        success: true,
        data: result,
        error: null
      });
    } catch (error: any) {
      next(error);
    }
  }
}
