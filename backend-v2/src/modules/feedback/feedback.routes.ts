import { Router } from 'express';
import { requireAuth, requireRole } from '../../middlewares/auth.middleware.js';
import { FeedbackController } from './feedback.controller.js';

const router = Router();

// All feedback routes require authentication
router.use(requireAuth);

// All staff can list or log new feedback
router.get('/', requireRole('ADMIN', 'NHANVIENBAN', 'NHANVIENTHUE'), FeedbackController.list);
router.post('/', requireRole('ADMIN', 'NHANVIENBAN', 'NHANVIENTHUE'), FeedbackController.create);

// Resolving complaints/issues is limited to Managers/Admins
router.post('/:id/resolve', requireRole('ADMIN'), FeedbackController.resolve);

export default router;
