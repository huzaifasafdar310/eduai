import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { rateLimit } from 'express-rate-limit';
import aiRoutes from './routes/ai';
import ocrRoutes from './routes/ocr';
import profileRoutes from './routes/profile';
import keyRoutes from './routes/keys';
import { authMiddleware } from './middleware/auth';
import './types'; // Import expanded Request types

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// 1. Initial Security: Headers and Request Parsing
app.use(helmet());
app.use(express.json({ limit: '10mb' })); 

// 2. CORS Strategy: Secure for Mobile
// Since this is primarily a mobile API, we allow all origins (origin: true) 
// to ensure various networking stacks (including emulators/real devices) can connect.
app.use(cors({ origin: true })); 

/**
 * ⚡ User-Based Rate Limiting (Production-Grade)
 * Limits requests per authenticated User ID.
 * Falls back to IP for identify if auth fails or for public routes.
 */
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  limit: 60,               // 60 requests
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req: Request) => req.user?.id || req.ip || 'anonymous',
  handler: (req, res) => {
    res.status(429).json({ error: 'Too many requests. Please try again after a minute.' });
  }
});

// 3. Health Check (Public)
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

// 4. Protected Routes
// Middleware Order: Auth -> Limiter -> Routes
app.use('/api/user', authMiddleware, profileRoutes);
app.use('/api/keys', authMiddleware, limiter, keyRoutes);
app.use('/api/ai', authMiddleware, limiter, aiRoutes);
 app.use('/api/ocr', authMiddleware, limiter, ocrRoutes);

app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`--- EduAI Secure Backend Server Started ---`);
  console.log(`🚀 Server listening on 0.0.0.0:${PORT}`);
  console.log(`🔒 Authentication: Supabase JWT (Bearer Token)`);
  console.log(`🛑 Rate Limiting: User-Based (Key: req.user.id)`);
  console.log(`------------------------------------------`);
});
