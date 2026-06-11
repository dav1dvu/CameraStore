import { Router } from 'express';
import { requireAuth, requireRole } from '../../middlewares/auth.middleware.js';
import { ProfileController } from './profile.controller.js';

const router = Router();

router.use(requireAuth);

router.get('/me', ProfileController.getMe);
router.put('/me', ProfileController.updateMe);
router.get('/me/logs', ProfileController.getLogs);
router.post('/me/change-password', ProfileController.changePassword);

// Admin/Manager endpoints for reviewing user (e.g. staff) verifications
router.get('/verifications', requireRole('ADMIN'), ProfileController.listVerifications);
router.post('/verifications/:id/review', requireRole('ADMIN'), ProfileController.reviewVerification);

export default router;
