import puppeteer, { Browser } from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import fs from 'fs';
import path from 'path';
import { DocumentData } from './types';
import { renderInvoiceWithHandlebars } from './templates/invoiceTemplate';

// Locate the Chromium Brotli binary files in AWS Lambda
function getChromiumBinPath(): string | undefined {
  const candidatePaths = [
    path.join('/var/task', 'bin'),
    path.join(process.cwd(), 'bin'),
    path.join('/var/task', 'node_modules', '@sparticuz', 'chromium', 'bin'),
    path.join(process.cwd(), 'node_modules', '@sparticuz', 'chromium', 'bin'),
  ];
  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }
  return undefined;
}

// Helper to find a suitable Chromium/Chrome executable
async function getExecutablePath(): Promise<string> {
  // If running in AWS Lambda
  if (process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.LAMBDA_TASK_ROOT) {
    const binPath = getChromiumBinPath();
    return await chromium.executablePath(binPath);
  }

  // If custom path provided in environment
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }

  // Windows standard Chrome / Edge paths
  const standardPaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  ];

  for (const p of standardPaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }

  // Fallback to chromium's bundled path if available
  try {
    const chromPath = await chromium.executablePath();
    if (chromPath) return chromPath;
  } catch {
    // ignore
  }

  throw new Error(
    'No Chrome or Edge browser executable found. Please install Chrome or set PUPPETEER_EXECUTABLE_PATH.'
  );
}

// Generate HTML using Handlebars template
export function generateInvoiceHtml(data: DocumentData): string {
  return renderInvoiceWithHandlebars(data);
}

// Generate PDF Buffer using Puppeteer
export async function generateInvoicePdf(data: DocumentData): Promise<Buffer> {
  const executablePath = await getExecutablePath();
  const isLambda = Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.LAMBDA_TASK_ROOT);

  let browser: Browser;
  if (isLambda) {
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath,
      headless: chromium.headless,
    });
  } else {
    browser = await puppeteer.launch({
      executablePath,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
    });
  }

  try {
    const page = await browser.newPage();
    const html = generateInvoiceHtml(data);

    await page.setContent(html, {
      waitUntil: 'networkidle0',
    });

    const pdfUint8Array = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '8mm',
        right: '8mm',
        bottom: '8mm',
        left: '8mm',
      },
    });

    return Buffer.from(pdfUint8Array);
  } finally {
    await browser.close();
  }
}
