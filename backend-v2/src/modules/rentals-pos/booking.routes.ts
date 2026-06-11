import { Router } from 'express';
import { requireAuth, requireRole } from '../../middlewares/auth.middleware.js';
import { BookingController } from './booking.controller.js';

const router = Router();

// All booking routes require staff-level authentication
router.use(requireAuth);
router.use(requireRole('ADMIN', 'NHANVIENTHUE'));

router.post('/', BookingController.createBooking);
router.get('/', BookingController.listBookings);
router.get('/:id', BookingController.getBooking);
router.post('/:id/preview-cancel', BookingController.previewCancel);
router.post('/:id/cancel', BookingController.cancel);
router.post('/:id/extend', BookingController.extend);
router.post('/:id/checkin', BookingController.checkIn);
router.post('/:id/return-accessories', BookingController.recordAccessoriesReturn);

export default router;
