import serverless from 'serverless-http';
import { app } from './app';

// AWS Lambda handler wrapping the Express application
export const handler = serverless(app, {
  binary: [
    'application/pdf',
    'application/octet-stream',
  ],
});
