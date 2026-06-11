import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware.js';
import { CategoryService } from './category.service.js';

const createCategorySchema = z.object({
  name: z.string().min(1, 'Tên danh mục không được để trống'),
  slug: z.string().optional(),
  description: z.string().optional(),
  parentId: z.union([z.string(), z.number()]).transform(val => Number(val)).nullable().optional()
});

const updateCategorySchema = createCategorySchema.partial();

export class CategoryController {
  static async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const categories = await CategoryService.getCategories();
      res.status(200).json({
        success: true,
        data: categories,
        error: null
      });
    } catch (error) {
      next(error);
    }
  }

  static async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const staffId = req.user!.id;
      const parsed = createCategorySchema.safeParse(req.body);
      
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          data: null,
          error: parsed.error.errors.map(e => e.message).join(', ')
        });
      }

      const category = await CategoryService.createCategory({
        name: parsed.data.name,
        slug: parsed.data.slug,
        description: parsed.data.description
      }, staffId);

      res.status(201).json({
        success: true,
        data: category,
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
      const parsed = updateCategorySchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          data: null,
          error: parsed.error.errors.map(e => e.message).join(', ')
        });
      }

      const updated = await CategoryService.updateCategory(id, parsed.data, staffId);

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
          error: 'Không tìm thấy danh mục'
        });
      }
      next(error);
    }
  }

  static async delete(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id;
      const staffId = req.user!.id;

      await CategoryService.deleteCategory(id, staffId);

      res.status(200).json({
        success: true,
        data: { message: 'Xóa danh mục thành công' },
        error: null
      });
    } catch (error: any) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          data: null,
          error: 'Không tìm thấy danh mục'
        });
      }
      res.status(400).json({
        success: false,
        data: null,
        error: error.message || 'Không thể xóa danh mục'
      });
    }
  }
}
