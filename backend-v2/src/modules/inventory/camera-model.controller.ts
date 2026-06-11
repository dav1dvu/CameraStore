import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware.js';
import { CameraModelService } from './camera-model.service.js';

const createCameraModelSchema = z.object({
  category_id: z.union([z.string(), z.number()]).transform(val => Number(val)).nullable().optional(),
  model_name: z.string().min(1, 'Tên mẫu máy ảnh không được để trống'),
  slug: z.string().optional(),
  brand: z.string().optional(),
  description: z.string().optional(),
  images: z.any().optional(),
  specs: z.any().optional(),
  rent_price_per_day: z.union([z.string(), z.number()]).transform(val => Number(val)),
  deposit_amount: z.union([z.string(), z.number()]).transform(val => Number(val)).optional(),
  sale_price: z.union([z.string(), z.number()]).transform(val => Number(val)).optional(),
  is_active: z.boolean().optional()
});

const updateCameraModelSchema = createCameraModelSchema.partial();

export class CameraModelController {
  static async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { categoryId, isActive } = req.query;
      
      const parsedIsActive = isActive !== undefined ? String(isActive) === 'true' : undefined;

      const models = await CameraModelService.listCameraModels({
        categoryId: categoryId ? Number(categoryId) : undefined,
        isActive: parsedIsActive
      });

      res.status(200).json({
        success: true,
        data: models,
        error: null
      });
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id;
      const model = await CameraModelService.getCameraModelById(id);

      res.status(200).json({
        success: true,
        data: model,
        error: null
      });
    } catch (error: any) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          data: null,
          error: 'Không tìm thấy mẫu máy ảnh này'
        });
      }
      next(error);
    }
  }

  static async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const staffId = req.user!.id;
      const parsed = createCameraModelSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          data: null,
          error: parsed.error.errors.map(e => e.message).join(', ')
        });
      }

      // Default depositAmount to rentPricePerDay if not provided
      const rentPrice = parsed.data.rent_price_per_day;
      const depositVal = parsed.data.deposit_amount !== undefined ? parsed.data.deposit_amount : rentPrice;

      const model = await CameraModelService.createCameraModel({
        categoryId: parsed.data.category_id,
        modelName: parsed.data.model_name,
        rentPricePerDay: rentPrice,
        depositAmount: depositVal,
        salePrice: parsed.data.sale_price,
        isActive: parsed.data.is_active
      }, staffId);

      res.status(201).json({
        success: true,
        data: model,
        error: null
      });
    } catch (error: any) {
      next(error);
    }
  }

  static async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id;
      const staffId = req.user!.id;
      const parsed = updateCameraModelSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          data: null,
          error: parsed.error.errors.map(e => e.message).join(', ')
        });
      }

      // Map parsed fields to Service payload
      const updates: any = {};
      if (parsed.data.category_id !== undefined) updates.categoryId = parsed.data.category_id;
      if (parsed.data.model_name !== undefined) updates.modelName = parsed.data.model_name;
      if (parsed.data.rent_price_per_day !== undefined) updates.rentPricePerDay = parsed.data.rent_price_per_day;
      if (parsed.data.deposit_amount !== undefined) updates.depositAmount = parsed.data.deposit_amount;
      if (parsed.data.sale_price !== undefined) updates.salePrice = parsed.data.sale_price;
      if (parsed.data.is_active !== undefined) updates.isActive = parsed.data.is_active;

      const updated = await CameraModelService.updateCameraModel(id, updates, staffId);

      res.status(200).json({
        success: true,
        data: updated,
        error: null
      });
    } catch (error: any) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          data: null,
          error: 'Không tìm thấy mẫu máy ảnh này'
        });
      }
      next(error);
    }
  }

  static async delete(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id;
      const staffId = req.user!.id;

      await CameraModelService.deleteCameraModel(id, staffId);

      res.status(200).json({
        success: true,
        data: { message: 'Xóa mẫu máy ảnh thành công' },
        error: null
      });
    } catch (error: any) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          data: null,
          error: 'Không tìm thấy mẫu máy ảnh này'
        });
      }
      res.status(400).json({
        success: false,
        data: null,
        error: error.message || 'Không thể xóa mẫu máy ảnh'
      });
    }
  }

  static async checkAvailability(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { start, end } = req.query;

      if (!start || !end) {
        return res.status(400).json({
          success: false,
          data: null,
          error: 'Thiếu tham số start và end (YYYY-MM-DD)'
        });
      }

      const result = await CameraModelService.checkAvailability(id, start as string, end as string);

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
