import { Router } from 'express';
import { requireAuth, requireRole } from '../../middlewares/auth.middleware.js';
import { ReportingController } from './reporting.controller.js';

const router = Router();

router.use(requireAuth);
router.use(requireRole('ADMIN', 'NHANVIENTHUE', 'NHANVIENBAN'));

router.get('/revenue', ReportingController.getRevenue);
router.get('/top-rentals', ReportingController.getTopRentals);
router.get('/equipment-status', ReportingController.getEquipmentCondition);
router.get('/daily-history', ReportingController.getDailyHistory);
router.get('/order-history', ReportingController.getOrderHistory);
router.get('/order-history/summary', ReportingController.getOrderHistorySummary);
router.get('/consolidated-dashboard', ReportingController.getConsolidatedDashboard);
router.put('/order-history/:type/:id', ReportingController.updateOrderHistory);
router.delete('/order-history/:type/:id', ReportingController.deleteOrderHistory);

router.get('/film-developments', ReportingController.getFilmDevelopments);
router.post('/film-developments', ReportingController.createFilmDevelopment);
router.put('/film-developments/:id', ReportingController.updateFilmDevelopment);
router.delete('/film-developments/:id', ReportingController.deleteFilmDevelopment);

export default router;
