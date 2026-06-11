import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware.js';
import { FeedbackService } from './feedback.service.js';

export class FeedbackController {
  static async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const staffId = req.user!.id;
      const { customerId, bookingId, orderId, type, content } = req.body;

      if (!type || !['FEEDBACK', 'COMPLAINT', 'SUGGESTION'].includes(type)) {
        return res.status(400).json({
          success: false,
          data: null,
          error: "Invalid feedback type. Expected: 'FEEDBACK', 'COMPLAINT', or 'SUGGESTION'"
        });
      }

      if (!content || !content.trim()) {
        return res.status(400).json({
          success: false,
          data: null,
          error: 'Feedback content is required'
        });
      }

      const result = await FeedbackService.createFeedback({
        customerId,
        bookingId,
        orderId,
        type,
        content,
        staffId
      });

      res.status(201).json({
        success: true,
        data: result,
        error: null
      });
    } catch (error: any) {
      next(error);
    }
  }

  static async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { type, resolved, customerId, limit, offset } = req.query;

      const parsedLimit = limit ? Number(limit) : 50;
      const parsedOffset = offset ? Number(offset) : 0;

      if (isNaN(parsedLimit) || parsedLimit <= 0) {
        return res.status(400).json({
          success: false,
          data: null,
          error: 'Invalid limit value'
        });
      }

      if (isNaN(parsedOffset) || parsedOffset < 0) {
        return res.status(400).json({
          success: false,
          data: null,
          error: 'Invalid offset value'
        });
      }

      let parsedResolved: boolean | undefined = undefined;
      if (resolved !== undefined) {
        parsedResolved = resolved === 'true';
      }

      const result = await FeedbackService.listFeedbacks({
        type: type as string,
        resolved: parsedResolved,
        customerId: customerId as string,
        limit: parsedLimit,
        offset: parsedOffset
      });

      res.status(200).json({
        success: true,
        data: result.feedbacks,
        error: null
      });
    } catch (error) {
      next(error);
    }
  }

  static async resolve(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const resolvedById = req.user!.id;
      const feedbackId = req.params.id;

      const result = await FeedbackService.resolveFeedback(feedbackId, resolvedById);

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
