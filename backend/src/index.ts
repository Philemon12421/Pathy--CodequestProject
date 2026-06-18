import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';

import authRoutes from './routes/auth';
import incidentRoutes from './routes/incidents';
import routeRoutes from './routes/routes';
import aiRoutes from './routes/ai';
import musicRoutes from './routes/music';
import adRoutes from './routes/ads';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/routes', routeRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/music', musicRoutes);
app.use('/api/ads', adRoutes);

app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

app.listen(PORT, () => {
  console.log(`🚀 SafeTrack API running on port ${PORT}`);
});
