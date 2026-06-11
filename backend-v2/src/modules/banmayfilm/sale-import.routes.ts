import { Router } from 'express';
import { SaleImportController } from './sale-import.controller.js';
import { requireAuth, requireRole } from '../../middlewares/auth.middleware.js';

const router = Router();

router.use(requireAuth, requireRole('ADMIN', 'NHANVIENBAN'));

router.get('/', SaleImportController.getAll);
router.get('/summary', SaleImportController.getSummary);
router.post('/', SaleImportController.create);
router.put('/:id', SaleImportController.update);
router.delete('/:id', SaleImportController.remove);

export default router;
