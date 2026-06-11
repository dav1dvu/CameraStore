import { Router } from 'express';
import { SaleEmployeeController } from './sale-employee.controller.js';
import { requireAuth, requireRole } from '../../middlewares/auth.middleware.js';

const router = Router();

router.use(requireAuth, requireRole('ADMIN', 'NHANVIENBAN'));

router.get('/', SaleEmployeeController.getAll);
router.get('/:id', SaleEmployeeController.getById);
router.post('/', SaleEmployeeController.create);
router.put('/:id', SaleEmployeeController.update);
router.delete('/:id', SaleEmployeeController.remove);

export default router;
