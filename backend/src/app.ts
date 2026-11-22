import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { companiesRouter } from './routes/companies';

export const app = express();

// Middleware
app.use(cors({
  origin: '*',
  exposedHeaders: ['Content-Disposition'],
}));
app.use(express.json({ limit: '10mb' }));

// Companies API (MongoDB CRUD)
app.use('/api/companies', companiesRouter);

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'quote-invoice-crud-api',
    timestamp: new Date().toISOString(),
  });
});

// Global Error Handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message,
  });
});
