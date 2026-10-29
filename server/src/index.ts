import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import fs from 'fs';
import { config } from './config/env.js';
import { startScheduler } from './services/schedulerService.js';

import authRoutes from './routes/authRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import emailRoutes from './routes/emailRoutes.js';
import integrationRoutes from './routes/integrationRoutes.js';
import campaignRoutes from './routes/campaignRoutes.js';
import sequenceRoutes from './routes/sequenceRoutes.js';
import contactRoutes from './routes/contactRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import webhookRoutes from './routes/webhookRoutes.js';

const app = express();

// Security and middleware
app.use(helmet({
  contentSecurityPolicy: false, // For easier dev iframe / asset preview
}));

app.use(cors({
  origin: true,
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Healthcheck
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'MailPilot AI Server',
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/emails', emailRoutes);
app.use('/api/integrations', integrationRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/sequences', sequenceRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/webhooks', webhookRoutes);

const clientDistPath = fs.existsSync(path.resolve(process.cwd(), 'client/dist'))
  ? path.resolve(process.cwd(), 'client/dist')
  : path.resolve(process.cwd(), '../client/dist');

// Serve client static production bundle if present
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[Global Error]', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
  });
});

const server = app.listen(config.port, () => {
  console.log(`=========================================`);
  console.log(`🚀 MailPilot AI Backend running on port ${config.port}`);
  console.log(`   Frontend CORS allowed: ${config.corsOrigin}`);
  console.log(`=========================================`);
  
  // Start durable background job worker
  startScheduler();
});

export default app;
