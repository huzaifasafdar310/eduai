import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { rateLimit } from 'express-rate-limit';
import aiRoutes from './routes/ai';
import ocrRoutes from './routes/ocr';
import { authMiddleware } from './middleware/auth';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security Middlewares
app.use(helmet());
app.use(cors({ origin: '*' })); // Allow all origins for mobile clients
app.use(express.json({ limit: '10mb' })); // Increase limit for base64 images

// Rate Limiting
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  limit: 60, // 60 requests per windowMs
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
app.use(limiter);

// Health Check
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

// Proxy Routes (Protected)
app.use('/api/ai', authMiddleware, aiRoutes);
app.use('/api/ocr', authMiddleware, ocrRoutes);

app.listen(PORT, () => {
  console.log(`--- EduAI Backend Server Started ---`);
  console.log(`🚀 Server listening on port ${PORT}`);
  console.log(`🔒 Authentication: Shared Token (x-app-token)`);
  console.log(`-----------------------------------`);
});
