import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware.js';
import { ProfileService } from './profile.service.js';

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Mật khẩu hiện tại không được để trống'),
  newPassword: z.string().min(6, 'Mật khẩu mới phải có ít nhất 6 ký tự')
}).refine(data => data.newPassword !== data.currentPassword, {
  message: 'Mật khẩu mới không được trùng với mật khẩu hiện tại',
  path: ['newPassword']
});

export class ProfileController {
  static async getMe(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const profile = await ProfileService.getProfile(req.user!.id);
      res.status(200).json({
        success: true,
        data: profile,
        error: null
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateMe(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { fullName, phone, address, avatarUrl } = req.body;
      if (fullName === undefined && phone === undefined && address === undefined && avatarUrl === undefined) {
        return res.status(400).json({
          success: false,
          data: null,
          error: 'No valid profile update fields provided (fullName, phone, address, avatarUrl)'
        });
      }

      const updated = await ProfileService.updateProfile(req.user!.id, req.body);
      res.status(200).json({
        success: true,
        data: updated,
        error: null
      });
    } catch (error) {
      next(error);
    }
  }

  static async submitVerification(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { idNumber, frontImageUrl, backImageUrl, selfieUrl } = req.body;

      if (!idNumber || !frontImageUrl || !backImageUrl || !selfieUrl) {
        return res.status(400).json({
          success: false,
          data: null,
          error: 'Missing verification images or ID number'
        });
      }

      const cccdRegex = /^\d{12}$/;
      if (!cccdRegex.test(idNumber)) {
        return res.status(400).json({
          success: false,
          data: null,
          error: 'Invalid CCCD ID number. Must be exactly 12 digits.'
        });
      }

      const isSecureUrl = (url: string) => {
        try {
          return url.startsWith('https://');
        } catch {
          return false;
        }
      };

      if (!isSecureUrl(frontImageUrl) || !isSecureUrl(backImageUrl) || !isSecureUrl(selfieUrl)) {
        return res.status(400).json({
          success: false,
          data: null,
          error: 'Invalid image URLs. Front, back, and selfie images must be secure HTTPS URLs.'
        });
      }

      const result = await ProfileService.submitVerification({
        userId: req.user!.id,
        idNumber,
        frontImageUrl,
        backImageUrl,
        selfieUrl
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

  static async listVerifications(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const list = await ProfileService.listVerifications();
      res.status(200).json({
        success: true,
        data: list,
        error: null
      });
    } catch (error) {
      next(error);
    }
  }

  static async reviewVerification(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { status, rejectionReason } = req.body;
      const verifierId = req.user!.id;

      if (status !== 'VERIFIED' && status !== 'REJECTED') {
        return res.status(400).json({
          success: false,
          data: null,
          error: 'Invalid status. Must be VERIFIED or REJECTED'
        });
      }

      if (status === 'REJECTED' && (!rejectionReason || !rejectionReason.trim())) {
        return res.status(400).json({
          success: false,
          data: null,
          error: 'Rejection reason is required when rejecting a verification'
        });
      }

      const result = await ProfileService.reviewVerification(
        req.params.id,
        status,
        verifierId,
        rejectionReason
      );

      res.status(200).json({
        success: true,
        data: result,
        error: null
      });
    } catch (error: any) {
      if (error.message && error.message.includes('not found or is not in PENDING status')) {
        return res.status(409).json({
          success: false,
          data: null,
          error: error.message
        });
      }
      next(error);
    }
  }

  static async getLogs(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const logs = await ProfileService.getActivityLogs(req.user!.id);
      res.status(200).json({
        success: true,
        data: logs,
        error: null
      });
    } catch (error) {
      next(error);
    }
  }

  static async changePassword(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const email = req.user!.email;

      if (!email) {
        return res.status(400).json({
          success: false,
          data: null,
          error: 'Email không tồn tại trong thông tin tài khoản'
        });
      }

      const parsed = changePasswordSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          data: null,
          error: parsed.error.errors.map(e => e.message).join(', ')
        });
      }

      await ProfileService.changePassword(
        userId,
        email,
        parsed.data.currentPassword,
        parsed.data.newPassword
      );

      res.status(200).json({
        success: true,
        data: { message: 'Đổi mật khẩu thành công' },
        error: null
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        data: null,
        error: error.message || 'Đổi mật khẩu thất bại'
      });
    }
  }
}
