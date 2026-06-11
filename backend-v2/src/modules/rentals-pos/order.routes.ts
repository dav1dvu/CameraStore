import { Router } from 'express';
import { requireAuth, requireRole } from '../../middlewares/auth.middleware.js';
import { OrderController } from './order.controller.js';

const router = Router();

// All order routes require staff-level authentication
router.use(requireAuth);
router.use(requireRole('ADMIN', 'NHANVIENTHUE'));

router.post('/', OrderController.createOrder);
router.get('/', OrderController.listAllOrders);
router.get('/:id', OrderController.getOrder);

export default router;
