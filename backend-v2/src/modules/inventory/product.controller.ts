import { Request, Response, NextFunction } from 'express';
import { ProductService } from './product.service.js';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware.js';

export class ProductController {
  static async searchProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        q,
        category,
        brand,
        minPrice,
        maxPrice,
        minRentalPrice,
        maxRentalPrice,
        priceType,
        inStock,
        sortBy,
        limit,
        offset
      } = req.query;

      // Parse and validate numeric inputs (Bug #6)
      const parsedMinPrice = minPrice !== undefined ? Number(minPrice) : undefined;
      if (parsedMinPrice !== undefined && (isNaN(parsedMinPrice) || parsedMinPrice < 0)) {
        return res.status(400).json({ success: false, data: null, error: 'Invalid minPrice value' });
      }

      const parsedMaxPrice = maxPrice !== undefined ? Number(maxPrice) : undefined;
      if (parsedMaxPrice !== undefined && (isNaN(parsedMaxPrice) || parsedMaxPrice < 0)) {
        return res.status(400).json({ success: false, data: null, error: 'Invalid maxPrice value' });
      }

      const parsedMinRentalPrice = minRentalPrice !== undefined ? Number(minRentalPrice) : undefined;
      if (parsedMinRentalPrice !== undefined && (isNaN(parsedMinRentalPrice) || parsedMinRentalPrice < 0)) {
        return res.status(400).json({ success: false, data: null, error: 'Invalid minRentalPrice value' });
      }

      const parsedMaxRentalPrice = maxRentalPrice !== undefined ? Number(maxRentalPrice) : undefined;
      if (parsedMaxRentalPrice !== undefined && (isNaN(parsedMaxRentalPrice) || parsedMaxRentalPrice < 0)) {
        return res.status(400).json({ success: false, data: null, error: 'Invalid maxRentalPrice value' });
      }

      const parsedLimit = limit !== undefined ? Number(limit) : undefined;
      if (parsedLimit !== undefined && (isNaN(parsedLimit) || parsedLimit <= 0)) {
        return res.status(400).json({ success: false, data: null, error: 'Invalid limit value' });
      }

      const parsedOffset = offset !== undefined ? Number(offset) : undefined;
      if (parsedOffset !== undefined && (isNaN(parsedOffset) || parsedOffset < 0)) {
        return res.status(400).json({ success: false, data: null, error: 'Invalid offset value' });
      }

      const parsedInStock = inStock !== undefined ? String(inStock) === 'true' : undefined;

      const result = await ProductService.searchAndFilter({
        q: q ? String(q) : undefined,
        category: category ? String(category) : undefined,
        brand: brand ? String(brand) : undefined,
        minPrice: parsedMinPrice,
        maxPrice: parsedMaxPrice,
        minRentalPrice: parsedMinRentalPrice,
        maxRentalPrice: parsedMaxRentalPrice,
        priceType: priceType ? (String(priceType) as any) : undefined,
        inStock: parsedInStock,
        sortBy: sortBy ? String(sortBy) : undefined,
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

  static async getProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const product = await ProductService.getProductBySlug(req.params.slug);
      res.status(200).json({
        success: true,
        data: product,
        error: null
      });
    } catch (error) {
      next(error);
    }
  }



  static async createProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const product = await ProductService.createProduct(req.body);
      res.status(201).json({
        success: true,
        data: product,
        error: null
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const product = await ProductService.updateProduct(req.params.id, req.body);
      res.status(200).json({
        success: true,
        data: product,
        error: null
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteProduct(req: Request, res: Response, next: NextFunction) {
    try {
      await ProductService.deleteProduct(req.params.id);
      res.status(200).json({
        success: true,
        data: { message: 'Product deleted successfully' },
        error: null
      });
    } catch (error) {
      next(error);
    }
  }

  static async addPriceConfig(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      // 1. Double check permission (Only Admin allowed)
      if (req.user!.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          data: null,
          error: 'Forbidden: Only Admins can modify pricing configurations'
        });
      }

      const { productId } = req.params;
      const { minDays, maxDays, pricePerDay, depositPercentage } = req.body;

      const pMinDays = Number(minDays);
      const pMaxDays = Number(maxDays);
      const pPrice = Number(pricePerDay);
      const pDeposit = Number(depositPercentage !== undefined ? depositPercentage : 100);

      if (isNaN(pMinDays) || !Number.isInteger(pMinDays) || pMinDays <= 0) {
        return res.status(400).json({
          success: false,
          data: null,
          error: 'minDays must be a positive integer'
        });
      }

      if (isNaN(pMaxDays) || !Number.isInteger(pMaxDays) || pMaxDays <= 0) {
        return res.status(400).json({
          success: false,
          data: null,
          error: 'maxDays must be a positive integer'
        });
      }

      if (pMinDays > pMaxDays) {
        return res.status(400).json({
          success: false,
          data: null,
          error: 'minDays must be less than or equal to maxDays'
        });
      }

      if (isNaN(pPrice) || pPrice < 0) {
        return res.status(400).json({
          success: false,
          data: null,
          error: 'pricePerDay must be a non-negative number'
        });
      }

      if (isNaN(pDeposit) || pDeposit < 0 || pDeposit > 100) {
        return res.status(400).json({
          success: false,
          data: null,
          error: 'depositPercentage must be a number between 0 and 100'
        });
      }

      const result = await ProductService.createPriceConfig(productId, {
        minDays: pMinDays,
        maxDays: pMaxDays,
        pricePerDay: pPrice,
        depositPercentage: pDeposit
      });

      res.status(201).json({
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

  static async deletePriceConfig(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      // 1. Double check permission (Only Admin allowed)
      if (req.user!.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          data: null,
          error: 'Forbidden: Only Admins can modify pricing configurations'
        });
      }

      const { id } = req.params;
      await ProductService.removePriceConfig(id);

      res.status(200).json({
        success: true,
        data: { message: 'Price config removed successfully' },
        error: null
      });
    } catch (error) {
      next(error);
    }
  }
}
