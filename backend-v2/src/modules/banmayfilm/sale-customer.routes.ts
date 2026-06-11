import { Router } from 'express';
import { SaleCustomerController } from './sale-customer.controller.js';
import { requireAuth, requireRole } from '../../middlewares/auth.middleware.js';

const router = Router();

router.use(requireAuth, requireRole('ADMIN', 'NHANVIENBAN'));

router.get('/', SaleCustomerController.getAll);
router.get('/:id', SaleCustomerController.getById);
router.post('/', SaleCustomerController.create);
router.put('/:id', SaleCustomerController.update);
router.delete('/:id', SaleCustomerController.remove);
router.get('/:id/history', SaleCustomerController.getHistory);

export default router;
