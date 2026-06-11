import { Router } from 'express';
import { requireAuth, requireRole } from '../../middlewares/auth.middleware.js';
import { CustomerController } from './customer.controller.js';

const router = Router();

// All customer routes require authentication and staff-level roles
router.use(requireAuth);
router.use(requireRole('ADMIN', 'NHANVIENTHUE'));

router.post('/', CustomerController.create);
router.post('/find-or-create', CustomerController.findOrCreate);
router.get('/', CustomerController.list);
router.get('/search', CustomerController.search);
router.get('/:id', CustomerController.getById);
router.put('/:id', CustomerController.update);
router.get('/:id/history', CustomerController.getHistory);
router.delete('/:id', CustomerController.delete);

export default router;
