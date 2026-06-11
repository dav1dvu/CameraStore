import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import authRoutes from './modules/system-auth/auth.routes.js';
import productRoutes from './modules/inventory/product.routes.js';
import bookingRoutes from './modules/rentals-pos/booking.routes.js';
import transactionRoutes from './modules/finance/transaction.routes.js';
import profileRoutes from './modules/profile-logs/profile.routes.js';
import orderRoutes from './modules/rentals-pos/order.routes.js';
import equipmentRoutes from './modules/inventory/equipment.routes.js';
import customerRoutes from './modules/customer-crm/customer.routes.js';
import feedbackRoutes from './modules/feedback/feedback.routes.js';
import categoryRoutes from './modules/inventory/category.routes.js';
import cameraModelRoutes from './modules/inventory/camera-model.routes.js';
import reportingRoutes from './modules/reporting/reporting.routes.js';
import employeeRoutes from './modules/employee/employee.routes.js';
import expensesRoutes from './modules/expenses/expenses.routes.js';
import saleEmployeeRoutes from './modules/banmayfilm/sale-employee.routes.js';
import saleOrderRoutes from './modules/banmayfilm/sale-order.routes.js';
import saleProductRoutes from './modules/banmayfilm/sale-product.routes.js';
import saleImportRoutes from './modules/banmayfilm/sale-import.routes.js';
import saleCustomerRoutes from './modules/banmayfilm/sale-customer.routes.js';
import rentalImportRoutes from './modules/inventory/rental-import.routes.js';
import { errorHandler } from './middlewares/error.middleware.js';


const app = express();

// CORS configuration - whitelist allowed origins
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  process.env.FRONTEND_URL
].filter(Boolean) as string[];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, server-to-server)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`[CORS] Blocked request from origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());
app.use(morgan('dev'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date() });
});
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date() });
});

// Mounted Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/profiles', profileRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/equipments', equipmentRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/feedbacks', feedbackRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/camera-models', cameraModelRoutes);
app.use('/api/reports', reportingRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/expenses', expensesRoutes);
app.use('/api/sale-employees', saleEmployeeRoutes);
app.use('/api/sale-orders', saleOrderRoutes);
app.use('/api/sale-products', saleProductRoutes);
app.use('/api/sale-imports', saleImportRoutes);
app.use('/api/sale-customers', saleCustomerRoutes);
app.use('/api/rental-imports', rentalImportRoutes);

// Catch-all route handler for 404s
app.use((req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`) as any;
  error.statusCode = 404;
  next(error);
});

// Centralized error handler
app.use(errorHandler);

export default app;
