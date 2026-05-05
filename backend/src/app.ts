import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { authRoutes } from './routes/auth.routes';
import { jobRoutes } from './routes/job.routes';
import { userRoutes } from './routes/user.routes';
import { teamRoutes } from './routes/team.routes';
import { customerRoutes } from './routes/customer.routes';

const app = express();

app.set('trust proxy', 1);

app.use(express.json({ limit: '200kb' }));
app.use(cookieParser());
app.use(
  cors({
    origin: (process.env.FRONTEND_URL ?? 'http://localhost:3000').split(',').map(s => s.trim()),
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use('/api/auth', authRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/users', userRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/customers', customerRoutes);

export { app };
