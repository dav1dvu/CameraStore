import { Router } from 'express';
import { RentalImportController } from './rental-import.controller.js';
import { requireAuth, requireRole } from '../../middlewares/auth.middleware.js';

const router = Router();

router.use(requireAuth, requireRole('ADMIN', 'NHANVIENTHUE'));

router.get('/', RentalImportController.getAll);
router.get('/summary', RentalImportController.getSummary);
router.post('/', RentalImportController.create);
router.put('/:id', RentalImportController.update);
router.delete('/:id', RentalImportController.remove);

export default router;
