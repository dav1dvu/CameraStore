import { Router } from 'express';
import { SaleProductController } from './sale-product.controller.js';
import { requireAuth, requireRole } from '../../middlewares/auth.middleware.js';

const router = Router();

router.use(requireAuth, requireRole('ADMIN', 'NHANVIENBAN'));

router.get('/', SaleProductController.getAll);
router.get('/:id', SaleProductController.getById);
router.post('/', SaleProductController.create);
router.put('/:id', SaleProductController.update);
router.delete('/:id', SaleProductController.remove);

export default router;
