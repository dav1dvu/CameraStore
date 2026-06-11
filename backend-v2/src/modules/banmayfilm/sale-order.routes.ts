import { Router } from 'express';
import { SaleOrderController } from './sale-order.controller.js';
import { requireAuth, requireRole } from '../../middlewares/auth.middleware.js';

const router = Router();

router.use(requireAuth, requireRole('ADMIN', 'NHANVIENBAN'));

router.get('/', SaleOrderController.getAll);
router.get('/summary', SaleOrderController.getSummary);
router.post('/', SaleOrderController.create);
router.put('/:id', SaleOrderController.update);
router.delete('/:id', SaleOrderController.remove);

export default router;
