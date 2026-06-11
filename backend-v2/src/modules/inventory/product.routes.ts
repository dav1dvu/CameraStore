import { Router } from 'express';
import { ProductController } from './product.controller.js';
import { requireAuth, requireRole } from '../../middlewares/auth.middleware.js';

const router = Router();

// Secure all product routes with authentication (since it's a back-office/internal app)
router.use(requireAuth);

router.get('/', ProductController.searchProducts);
router.get('/:slug', ProductController.getProduct);

// CRUD routes for Products (Admins & Staff only)
router.post('/', requireRole('ADMIN', 'NHANVIENTHUE'), ProductController.createProduct);
router.put('/:id', requireRole('ADMIN', 'NHANVIENTHUE'), ProductController.updateProduct);
router.delete('/:id', requireRole('ADMIN', 'NHANVIENTHUE'), ProductController.deleteProduct);

// Price config management routes (Admin only)
router.post('/:productId/price-configs', requireRole('ADMIN'), ProductController.addPriceConfig);
router.delete('/price-configs/:id', requireRole('ADMIN'), ProductController.deletePriceConfig);

export default router;
