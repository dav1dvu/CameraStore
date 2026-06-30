import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware.js';
import { TransactionService } from './transaction.service.js';

export class TransactionController {
  static async settle(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { bookingId, isDamaged, damageCharge, notes, receivedBy, ngayTra, gioTra } = req.body;

      if (!bookingId) {
        return res.status(400).json({
          success: false,
          data: null,
          error: 'bookingId is required for security deposit settlement'
        });
      }

      const chargeNum = Number(damageCharge || 0);
      if (isNaN(chargeNum) || chargeNum < 0) {
        return res.status(400).json({
          success: false,
          data: null,
          error: 'damageCharge must be a non-negative number'
        });
      }

      const result = await TransactionService.settleDeposit({
        bookingId,
        isDamaged: !!isDamaged,
        damageCharge: chargeNum,
        notes: notes || 'Returned',
        receivedBy: receivedBy ? Number(receivedBy) : undefined,
        ngayTra,
        gioTra
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

  static async getInvoice(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await TransactionService.generateQRInvoice(req.params.id);
      res.status(200).json({
        success: true,
        data: result,
        error: null
      });
    } catch (error) {
      next(error);
    }
  }

  static async confirm(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await TransactionService.confirmPayment(req.params.id);
      res.status(200).json({
        success: true,
        data: result,
        error: null
      });
    } catch (error) {
      next(error);
    }
  }

  static async listTransactions(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { type, status, bookingId, orderId, userId, limit, offset } = req.query;

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

      const result = await TransactionService.listTransactions({
        type: type as string,
        status: status as string,
        bookingId: bookingId as string,
        orderId: orderId as string,
        userId: userId as string,
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

  static async getReceipt(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const receipt = await TransactionService.getReceiptDetails(id);

      // Mock Send Email to Customer
      console.log(`[SMTP MOCK] Sending transaction receipt email for Transaction ID: ${id} to ${receipt.profiles?.full_name || 'Customer'}`);
      
      res.status(200).json({
        success: true,
        data: {
          receipt,
          emailSent: true,
          recipientEmail: receipt.profiles?.email || 'customer@example.com'
        },
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
