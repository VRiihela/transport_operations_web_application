import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { authRoutes } from './routes/auth.routes';
import { jobRoutes } from './routes/job.routes';
import { userRoutes } from './routes/user.routes';

const app = express();

app.set('trust proxy', 1);

app.use(express.json({ limit: '200kb' }));
app.use(cookieParser());
app.use(
  cors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use('/api/auth', authRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/users', userRoutes);

export { app };
