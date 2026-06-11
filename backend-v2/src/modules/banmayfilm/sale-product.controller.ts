import { Request, Response, NextFunction } from 'express';
import { SaleProductService } from './sale-product.service.js';

export class SaleProductController {
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await SaleProductService.getAllProducts();
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await SaleProductService.getProductById(req.params.id);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await SaleProductService.createProduct(req.body);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await SaleProductService.updateProduct(req.params.id, req.body);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async remove(req: Request, res: Response, next: NextFunction) {
    try {
      await SaleProductService.deleteProduct(req.params.id);
      res.json({ success: true, message: 'Đã xóa sản phẩm thành công' });
    } catch (err) {
      next(err);
    }
  }
}
