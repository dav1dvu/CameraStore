import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware.js';
import { BookingService } from './booking.service.js';

const checkInSchema = z.object({
  accessories: z.array(z.string()).optional().default([]),
  deliveredBy: z.number().optional(),
  gioNhan: z.string().optional()
});

const returnAccessoriesSchema = z.object({
  accessories: z.array(z.string()).min(1, 'Danh sách phụ kiện trả không được trống')
});

export class BookingController {
  static async createBooking(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const staffId = req.user!.id;
      const customerId = req.body.customerId || req.body.userId;
      const productId = req.body.productId || req.body.cameraModelId;
      const { startDate, endDate, batteryProductId, batteryQuantity, depositAmount } = req.body;

      if (!customerId || !productId || !startDate || !endDate) {
        return res.status(400).json({
          success: false,
          data: null,
          error: 'Missing required parameters: customerId (or userId), productId (or cameraModelId), startDate, endDate'
        });
      }

      const start = new Date(startDate);
      const end = new Date(endDate);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return res.status(400).json({
          success: false,
          data: null,
          error: 'Invalid date format. Expected a valid date-time string (e.g. YYYY-MM-DD or YYYY-MM-DDTHH:MM)'
        });
      }

      const result = await BookingService.createBooking({
        staffId,
        customerId,
        productId,
        startDate,
        endDate,
        batteryProductId: batteryProductId ? Number(batteryProductId) : undefined,
        batteryQuantity: batteryQuantity ? Number(batteryQuantity) : undefined,
        depositAmount: depositAmount !== undefined && depositAmount !== null && depositAmount !== '' ? String(depositAmount) : undefined
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
        error: error.message || 'Booking conflict encountered'
      });
    }
  }

  static async getBooking(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const booking = await BookingService.getBookingDetails(req.params.id);

      res.status(200).json({
        success: true,
        data: booking,
        error: null
      });
    } catch (error) {
      next(error);
    }
  }

  static async listBookings(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { customerId, status } = req.query;
      const bookings = await BookingService.listAllBookings({
        customerId: customerId as string,
        status: status as string
      });
      res.status(200).json({
        success: true,
        data: bookings,
        error: null
      });
    } catch (error) {
      next(error);
    }
  }

  static async checkIn(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const bookingId = req.params.id;
      const staffId = req.user!.id;
      const parsed = checkInSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          data: null,
          error: parsed.error.errors.map(e => e.message).join(', ')
        });
      }

      const result = await BookingService.checkInBooking(
        bookingId,
        parsed.data.accessories,
        staffId,
        parsed.data.deliveredBy,
        parsed.data.gioNhan
      );
      res.status(200).json({
        success: true,
        data: result,
        error: null
      });
    } catch (error) {
      next(error);
    }
  }

  static async recordAccessoriesReturn(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const bookingId = req.params.id;
      const staffId = req.user!.id;
      const parsed = returnAccessoriesSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          data: null,
          error: parsed.error.errors.map(e => e.message).join(', ')
        });
      }

      const result = await BookingService.recordAccessoriesReturn(bookingId, parsed.data.accessories, staffId);
      res.status(200).json({
        success: true,
        data: result,
        error: null
      });
    } catch (error) {
      next(error);
    }
  }

  static async previewCancel(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const preview = await BookingService.previewCancellation(req.params.id);
      res.status(200).json({
        success: true,
        data: preview,
        error: null
      });
    } catch (error) {
      next(error);
    }
  }

  static async cancel(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await BookingService.cancelBooking(req.params.id);
      res.status(200).json({
        success: true,
        data: result,
        error: null
      });
    } catch (error) {
      next(error);
    }
  }

  static async extend(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { endDate } = req.body;

      if (!endDate) {
        return res.status(400).json({
          success: false,
          data: null,
          error: 'Missing required parameter: endDate'
        });
      }

      const end = new Date(endDate);
      if (isNaN(end.getTime())) {
        return res.status(400).json({
          success: false,
          data: null,
          error: 'Invalid date format. Expected a valid date-time string (e.g. YYYY-MM-DD or YYYY-MM-DDTHH:MM)'
        });
      }

      const result = await BookingService.extendBooking(req.params.id, endDate);
      res.status(200).json({
        success: true,
        data: result,
        error: null
      });
    } catch (error) {
      next(error);
    }
  }
}
