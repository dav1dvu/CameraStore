import { Router } from 'express';
import { EmployeeController } from './employee.controller.js';
import { requireAuth, requireRole } from '../../middlewares/auth.middleware.js';

const router = Router();

router.use(requireAuth, requireRole('ADMIN', 'NHANVIENTHUE', 'NHANVIENBAN'));

router.get('/', EmployeeController.getAll);
router.get('/:id', EmployeeController.getById);
router.post('/', EmployeeController.create);
router.put('/:id', EmployeeController.update);
router.delete('/:id', EmployeeController.remove);

export default router;
