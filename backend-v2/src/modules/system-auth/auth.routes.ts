import { Router } from 'express';
import { AuthController } from './auth.controller.js';
import { requireAuth, requireRole } from '../../middlewares/auth.middleware.js';

const router = Router();

// Only ADMIN can register a new user/staff
router.post('/register', requireAuth, requireRole('ADMIN'), AuthController.register);
router.post('/signup', AuthController.signup);
router.post('/login', AuthController.login);
router.post('/logout', AuthController.logout);

// User status and reset password management
router.get('/users', requireAuth, requireRole('ADMIN'), AuthController.listUsers);
router.put('/users/:id/status', requireAuth, requireRole('ADMIN'), AuthController.updateUserStatus);
router.post('/users/:id/reset-password', requireAuth, requireRole('ADMIN'), AuthController.adminResetPassword);

export default router;
