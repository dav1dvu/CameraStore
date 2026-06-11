import { Router } from 'express';
import { requireAuth, requireRole } from '../../middlewares/auth.middleware.js';
import { EquipmentController } from './equipment.controller.js';

const router = Router();

router.use(requireAuth);
router.use(requireRole('ADMIN', 'NHANVIENTHUE'));

router.get('/', EquipmentController.listEquipments);
router.put('/:id/status', EquipmentController.updateStatus);

export default router;
