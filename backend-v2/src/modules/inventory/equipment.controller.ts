import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware.js';
import { EquipmentService } from './equipment.service.js';

export class EquipmentController {
  static async listEquipments(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      // 1. Double check permission (Staff/Admin required)
      if (req.user!.role !== 'ADMIN' && req.user!.role !== 'NHANVIENTHUE') {
        return res.status(403).json({
          success: false,
          data: null,
          error: 'Forbidden: Insufficient privileges'
        });
      }

      const { status, productId, limit, offset } = req.query;

      const parsedLimit = limit ? Number(limit) : 50;
      const parsedOffset = offset ? Number(offset) : 0;

      if (isNaN(parsedLimit) || parsedLimit <= 0) {
        return res.status(400).json({
          success: false,
          data: null,
          error: 'Invalid limit value. Must be a positive integer.'
        });
      }

      if (isNaN(parsedOffset) || parsedOffset < 0) {
        return res.status(400).json({
          success: false,
          data: null,
          error: 'Invalid offset value. Must be a non-negative integer.'
        });
      }

      const result = await EquipmentService.listAllEquipments({
        status: status as string,
        productId: productId as string,
        limit: parsedLimit,
        offset: parsedOffset
      });

      res.status(200).json({
        success: true,
        data: result,
        error: null
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      // 1. Double check permission (Staff/Admin required)
      if (req.user!.role !== 'ADMIN' && req.user!.role !== 'NHANVIENTHUE') {
        return res.status(403).json({
          success: false,
          data: null,
          error: 'Forbidden: Insufficient privileges'
        });
      }

      const { status, notes } = req.body;
      const { id } = req.params;

      if (!status) {
        return res.status(400).json({
          success: false,
          data: null,
          error: 'Missing required parameter: status'
        });
      }

      const validStatuses = ['AVAILABLE', 'RENTED', 'MAINTENANCE', 'DAMAGED'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          data: null,
          error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
        });
      }

      const staffId = req.user!.id;
      const result = await EquipmentService.updateEquipmentStatus(id, status, notes || 'Status updated via admin console', staffId);

      res.status(200).json({
        success: true,
        data: result,
        error: null
      });
    } catch (error: any) {
      if (error.message && error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          data: null,
          error: error.message
        });
      }
      next(error);
    }
  }
}
