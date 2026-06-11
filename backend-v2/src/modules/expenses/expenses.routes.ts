import { Router } from 'express';
import { ExpenseController } from './expenses.controller.js';
import { requireAuth } from '../../middlewares/auth.middleware.js';
import { supabaseAdmin } from '../../config/supabase.js';

const router = Router();

router.use(requireAuth);

const checkExpenseAccess = async (req: any, res: any, next: any) => {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }

  if (user.role === 'ADMIN') {
    return next();
  }

  let businessType = req.query.type || req.body.businessType;

  if (!businessType && req.params.id) {
    try {
      const { data } = await supabaseAdmin
        .from('expenses')
        .select('business_type')
        .eq('id', Number(req.params.id))
        .single();
      if (data) {
        businessType = data.business_type;
      }
    } catch (err) {
      console.error('Error fetching expense business type:', err);
    }
  }

  if (!businessType) {
    if (req.method === 'POST') {
      return next();
    }
    return res.status(400).json({ success: false, error: 'Cannot determine business type' });
  }

  if (user.role === 'NHANVIENBAN' && businessType === 'BANMAYFILM') {
    return next();
  }

  if (user.role === 'NHANVIENTHUE' && businessType === 'MUONMAYCHUT') {
    return next();
  }

  return res.status(403).json({
    success: false,
    error: 'Forbidden: You do not have access to this business type expenses'
  });
};

router.get('/', checkExpenseAccess, ExpenseController.getAll);
router.get('/summary', checkExpenseAccess, ExpenseController.getSummary);
router.post('/', checkExpenseAccess, ExpenseController.create);
router.put('/:id', checkExpenseAccess, ExpenseController.update);
router.delete('/:id', checkExpenseAccess, ExpenseController.remove);

export default router;
