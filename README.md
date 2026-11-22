# Quote & Invoice PDF Generator

A centralized web application to generate, preview, and download custom **Quotes** and **Invoices** matching your exact document layout. Built with **React (TypeScript)** on the frontend and a **Node.js (Express + Puppeteer)** backend configured for **AWS Lambda** deployment using `serverless-http`.

---

## 🚀 Features

- **Exact Document Layout Match**:
  - **Sender Profile**: Business name, address lines, mobile, email, and GSTIN.
  - **Doc Header**: Clean **QUOTE** or **INVOICE** title badge with Quote/Invoice # and Date.
  - **Bill To**: Customer name, street address, city/state/PIN, phone, email, and GSTIN.
  - **Line Items Grid**:
    - Item Name & multi-line Description.
    - **3 Optional Fields**: **HSN/SAC Code**, **CGST %**, and **IGST %**.
    - Quantity, Rate, and auto-computed Line Amount ($Qty \times Rate$).
    - Padded empty rows (up to 14 rows minimum) to maintain full-page invoice height just like your sample.
  - **Financial Summary**: Sub Total, optional CGST / SGST / IGST tax breakdowns, and Grand Total with double underline.
  - **Footer Terms**: Customizable notes and GST disclosure (e.g. *"Note: 18% GST will applicable to above items. Thanks for shopping with us."*).
- **Interactive Live Preview**: Real-time print-ready A4 preview updates dynamically as you type.
- **Direct PDF Generation via Puppeteer**: Generates crisp, print-ready PDF files and streams them to the client for instant download or in-browser printing.
- **Local Profile Persistence**: Save your sender details to `localStorage` with one click so you never have to re-type them.
- **One-Click Sample Loader**: Pre-loaded with your exact *"A to Z Sports & Fitness"* template for immediate testing.
- **AWS Lambda Ready**: Wrapped with `serverless-http` and `@sparticuz/chromium` for serverless deployment.

---

## 📁 Project Architecture

```
Quote_invoice_generator/
├── backend/
│   ├── src/
│   │   ├── app.ts            # Express application with routes & CORS
│   │   ├── pdfGenerator.ts   # Puppeteer PDF engine (handles Lambda & local Chrome)
│   │   ├── types.ts          # TypeScript interfaces for Invoice/Quote payload
│   │   ├── lambda.ts         # serverless-http AWS Lambda handler
│   │   └── server.ts         # Local development server entrypoint (PORT 5000)
│   ├── serverless.yml        # AWS Lambda deployment configuration
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header.tsx                 # Header with Quote/Invoice switch, Download & Print
│   │   │   ├── DocumentMetaForm.tsx       # Doc #, Date, Due Date, HSN & Tax Toggles
│   │   │   ├── BusinessDetailsForm.tsx    # Sender details with "Save as Default"
│   │   │   ├── CustomerDetailsForm.tsx    # Bill To details
│   │   │   ├── LineItemsTable.tsx         # Item rows, Qty, Rate, HSN, CGST, IGST, Amount
│   │   │   ├── SummaryAndNotes.tsx        # Subtotal, Tax Breakdown, Total, Notes
│   │   │   └── LiveSpreadsheetPreview.tsx # Live A4 Print Preview
│   │   ├── types/
│   │   │   └── invoice.ts                 # Shared document types
│   │   ├── utils/
│   │   │   ├── defaultData.ts             # Initial "A to Z Sports" sample template
│   │   │   └── exportPdf.ts               # API client for PDF download & new tab printing
│   │   ├── App.tsx
│   │   └── index.css                      # Tailwind CSS v4 styling
│   ├── vite.config.ts                     # Vite config with API proxy
│   └── package.json
├── package.json                           # Root convenience scripts
└── README.md
```

---

## 🏃 Quick Start (Local Development)

### 1. Start the Backend API (Port 5000)
Open a terminal in the root directory:
```bash
bun run dev:backend
# or: cd backend && bun run dev
```
The backend starts at `http://localhost:5000` (Health check: `http://localhost:5000/api/health`). It uses your local Chrome or Edge browser automatically.

### 2. Start the Frontend (Port 5173)
Open another terminal:
```bash
bun run dev:frontend
# or: cd frontend && bun run dev
```
Open your browser at **`http://localhost:5173`**.

---

## ☁️ AWS Lambda Deployment

The backend is configured to deploy directly to **AWS Lambda** behind API Gateway using `serverless-http` and `@sparticuz/chromium`.

### Prerequisites
1. AWS CLI configured with credentials (`aws configure`).
2. Serverless Framework installed (`npm install -g serverless`).

### Deployment Steps
```bash
cd backend

# Build the TypeScript production bundle
bun run build

# Deploy to AWS Lambda
serverless deploy
```

### Lambda Configuration Highlights:
- **Memory**: Set to `1024MB` or `2048MB` (Chromium requires adequate memory for fast rendering).
- **Timeout**: `30s`.
- **Binary Media Types**: Configured for `application/pdf` so API Gateway streams the binary PDF without corruption.
- **Handler**: `dist/lambda.handler` using `serverless-http`.

---

## 🔌 API Endpoints

### 1. `POST /api/generate-pdf`
Receives document JSON payload, renders via Puppeteer, and streams the binary `.pdf` file.

**Response Headers:**
- `Content-Type: application/pdf`
- `Content-Disposition: attachment; filename="QUOTE_QT-000017.pdf"`

### 2. `POST /api/preview-html`
Returns the rendered raw HTML string for instant iframe previews.

### 3. `GET /api/health`
Returns `{ "status": "ok", "service": "quote-invoice-pdf-generator-api" }`.
