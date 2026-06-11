import { Router } from 'express';
import { requireAuth, requireRole } from '../../middlewares/auth.middleware.js';
import { TransactionController } from './transaction.controller.js';

const router = Router();

// All transaction routes require staff-level authentication
router.use(requireAuth);
router.use(requireRole('ADMIN', 'NHANVIENBAN', 'NHANVIENTHUE'));

router.get('/', TransactionController.listTransactions);
router.post('/settle', TransactionController.settle);
router.get('/:id/qr', TransactionController.getInvoice);
router.get('/:id/receipt', TransactionController.getReceipt);
router.post('/:id/confirm', TransactionController.confirm);

export default router;
