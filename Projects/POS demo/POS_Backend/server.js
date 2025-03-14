import express from 'express';
import mongoose from 'mongoose';
import http from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
//import rateLimit from 'express-rate-limit'; // Rate limiting middleware, can be used to limit repeated requests to public APIs and/or endpoints such as password reset
import mongoSanitize from 'express-mongo-sanitize';
import xss from 'xss-clean';
import hpp from 'hpp';

// Admin routes
import authRoute from './routes/auth.route.js';
import companyRoute from './routes/company.route.js';
import supplierRoute from './routes/supplier.route.js';
import categoryRoute from './routes/category.route.js';
import themeRoute from './routes/theme.route.js';
import SellingTypeRoute from './routes/sellingtype.route.js';
import priceRoute from './routes/price.route.js';
import orderRoute from './routes/order.route.js';
import inventoryReportRoutes from './routes/inventory.report.route.js';

//import productRoute from './routes/product.route.js';
import shopRoute from './routes/shop.route.js';
import deviceRoute from './routes/device.route.js';
// Admin routes
import adminRoute from './routes/admin.route.js';
// POS system routes
import posRoute from './routes/pos.route.js';
//import dailyBalanceRoute from './routes/daily.balance.route.js';
// Temporary for Presentation Purpose only routes remember to remove this way of routing and use the above routes
import uomRoute from './routes/uom.route.js';
import productRoute from './routes/product.route.js';
import grnRoute from './routes/grn.route.js';
import customerRoute from './routes/customer.route.js'
import inventoryRoute from './routes/inventory.route.js'
import transactionsRoute from './routes/transactions.route.js'
import reportRoute from './routes/report.route.js'

// Utility imports
import { setupSocket } from './utils/socket.js';

// Load environment variables
dotenv.config();

const app = express();
const httpServer = http.createServer(app);

// Define the allowed origins
const allowedOrigins = [
  'https://savour-admin.netlify.app',   // Host Admin frontend
  'https://savour-street.netlify.app',  // Host POS frontend
  'http://localhost:3000',              // Development Local Admin frontend
  'http://localhost:5173',
  'https://savourpos.ceylonxcorporation.com', // This is the frontend making the request  // Development Local POS frontend
  'https://savourposapi.ceylonx.com',         // Ensure this backend domain is handled as well
  'https://savourposadmin.ceylonxcorporation.com',// Host Admin frontend
  'https://pos.imaginxmedia.com',
  'https://posadmin.imaginxmedia.com',
  'https://posdemoadmin.ceylonxcorporation.com',
  'https://posdemo.ceylonxcorporation.com',
  'https://ilukahangamapos.ceylonx.com',
  'https://ilukahangamaadmin.ceylonx.com'
  /*
  process.env.FRONTEND_ADMIN || 'http://localhost:3000',
  process.env.FRONTEND_POS || 'http://localhost:5173',
  */
];

// CORS options
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or Postman)
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Allow cookies or authorization headers
};

// Apply CORS middleware to Express
app.use(cors(corsOptions));

// Initialize Socket.IO with CORS settings
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT'],
    credentials: true, // Allow cookies or authorization headers
  },
});

/*
const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      const allowedOrigins = [
        process.env.FRONTEND_ADMIN || 'http://localhost:3000',
        process.env.FRONTEND_POS || 'http://localhost:5173',
        'http://localhost:3000',
        'http://localhost:5173',
      ];
      if (allowedOrigins.includes(origin) || !origin) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST', 'PUT'],
    credentials: true,
  },
});

app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = [
      process.env.FRONTEND_ADMIN || 'http://localhost:3000',
      process.env.FRONTEND_POS || 'http://localhost:5173',
      'http://localhost:3000',
      'http://localhost:5173',
    ];
    if (allowedOrigins.includes(origin) || !origin) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT'],
  credentials: true,
}));
*/

app.use(express.json());
app.use(cookieParser());

// Security middlewares
app.use(helmet()); // Set security-related HTTP headers
app.use(mongoSanitize()); // Sanitize data to prevent NoSQL injection
app.use(xss()); // Sanitize user input to prevent XSS attacks
app.use(hpp()); // Prevent HTTP parameter pollution

// Admin routes
app.use('/api/auth', authRoute);
app.use('/api/companies', companyRoute);
app.use('/api/shops', shopRoute);
app.use('/api/users', authRoute);
app.use('/api/suppliers', supplierRoute);
app.use('/api/categories', categoryRoute);
app.use('/api/themes', themeRoute);
app.use('/api/products', productRoute);
app.use('/api/devices', deviceRoute);
app.use('/api/uoms', uomRoute);
app.use('/api/grns', grnRoute);
app.use('/api/sellingTypes', SellingTypeRoute);
app.use('/api/prices', priceRoute);
app.use('/api/orders', orderRoute);
// Admin routes
app.use('/api/Admin', adminRoute);
// POS system routes
app.use('/api/POS', posRoute);
app.use('/api/customers', customerRoute);
app.use('/api/inventories', inventoryRoute);
app.use('/api/transactions', transactionsRoute);
app.use('/api/reports', reportRoute);
app.use('/api/inventoryReports', inventoryReportRoutes);

//app.use('/api/daily-balances', dailyBalanceRoute);

// Global error handler
app.use((err, req, res, next) => {
  const errorStatus = err.status || 500;
  const errorMessage = err.message || 'Something went wrong!';
  console.error(`Error: ${errorMessage}`);
  return res.status(errorStatus).json({ message: errorMessage });
});

// Setup WebSocket connections
setupSocket(io);

// Start server
const PORT = process.env.PORT || 8000;
httpServer.listen(PORT, () => {
  connectToDatabase();
  console.log(`Backend server is running on port ${PORT}!`);
});

export { io };

// Database connection
export const connectToDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGO);
    console.log('Connected to MongoDB!');
  } catch (error) {
    console.error('MongoDB Connection Error:', error);
  }
};
