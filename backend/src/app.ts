import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { generateInvoicePdf } from './pdfGenerator';
import { DocumentData } from './types';
import { companiesRouter } from './routes/companies';

export const app = express();

// Middleware
app.use(cors({
  origin: '*',
  exposedHeaders: ['Content-Disposition'],
}));
app.use(express.json({ limit: '10mb' }));

// Companies API (MongoDB)
app.use('/api/companies', companiesRouter);

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'quote-invoice-pdf-generator-api',
    timestamp: new Date().toISOString(),
  });
});

// Single Unified Generate & Stream PDF Endpoint
app.post('/api/generate-pdf', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = req.body as DocumentData;

    if (!data || !data.documentType) {
      res.status(400).json({ error: 'Invalid payload: documentType is required' });
      return;
    }

    const docType = data.documentType.toUpperCase() === 'QUOTE' ? 'QUOTE' : 'INVOICE';
    const docNumber = (data.documentNumber || (docType === 'QUOTE' ? 'QT-000001' : 'INV-000001')).replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `${docType}_${docNumber}.pdf`;

    const pdfBuffer = await generateInvoicePdf(data);

    const isPreview = req.query.preview === 'true' || req.query.disposition === 'inline';
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `${isPreview ? 'inline' : 'attachment'}; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.byteLength);

    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error generating PDF:', error);
    next(error);
  }
});

// Global Error Handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message,
  });
});
