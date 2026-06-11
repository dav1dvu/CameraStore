import { Router } from 'express';
import { requireAuth, requireRole } from '../../middlewares/auth.middleware.js';
import { CameraModelController } from './camera-model.controller.js';

const router = Router();

router.use(requireAuth);

router.get('/', CameraModelController.list);
router.get('/:id/availability', CameraModelController.checkAvailability);
router.get('/:id', CameraModelController.getById);
router.post('/', requireRole('ADMIN', 'NHANVIENTHUE'), CameraModelController.create);
router.put('/:id', requireRole('ADMIN', 'NHANVIENTHUE'), CameraModelController.update);
router.delete('/:id', requireRole('ADMIN'), CameraModelController.delete);

export default router;
