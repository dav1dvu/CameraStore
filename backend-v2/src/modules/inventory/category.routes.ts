import { Router } from 'express';
import { requireAuth, requireRole } from '../../middlewares/auth.middleware.js';
import { CategoryController } from './category.controller.js';

const router = Router();

router.use(requireAuth);

router.get('/', CategoryController.list);
router.post('/', requireRole('ADMIN', 'NHANVIENTHUE'), CategoryController.create);
router.put('/:id', requireRole('ADMIN', 'NHANVIENTHUE'), CategoryController.update);
router.delete('/:id', requireRole('ADMIN', 'NHANVIENTHUE'), CategoryController.delete);

export default router;
