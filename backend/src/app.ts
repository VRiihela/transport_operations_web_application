import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { authRoutes } from './routes/auth.routes';

const app = express();

app.set('trust proxy', 1);

app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());
app.use(
  cors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use('/api/auth', authRoutes);

export { app };
