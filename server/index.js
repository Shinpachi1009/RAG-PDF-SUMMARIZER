const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const { processPDFWithRAG } = require('./pdfProcessor');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// CORS Configuration - Allow requests from Vercel and localhost
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
  process.env.FRONTEND_URL, // Add your Vercel URL in .env
  'https://ragpdf-mhx70e4h5-shinpachi1009s-projects.vercel.app/',
  'https://ragpdf-mhx70e4h5-shinpachi1009s-projects.vercel.app', // Replace with your actual Vercel URL
];

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Check if the origin is allowed
    if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.some(allowed => origin.includes(allowed))) {
      callback(null, true);
    } else {
      console.log('Blocked origin:', origin);
      callback(null, true); // Still allow for development - change to callback(new Error('Not allowed by CORS')) in production
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'ngrok-skip-browser-warning']
}));

// Middleware to log requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  console.log('Headers:', req.headers);
  next();
});

// Middleware
app.use(express.json());

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads');
    fs.ensureDirSync(uploadDir);
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: function (req, file, cb) {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'PDF RAG Summarizer API',
    message: 'Backend is running correctly'
  });
});

// Upload and process PDF
app.post('/api/analyze-pdf', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        error: 'No PDF file uploaded' 
      });
    }

    const pdfPath = req.file.path;
    const fileName = req.file.originalname;
    const fileSize = (req.file.size / 1024).toFixed(2) + ' KB';

    console.log(`Processing PDF: ${fileName} (${pdfPath})`);
    
    // Process PDF with RAG model
    const result = await processPDFWithRAG(pdfPath);
    
    console.log('Processing result:', {
      hasSummary: !!result.summary,
      hasOriginalText: !!result.originalText,
      summaryLength: result.summary?.length,
      originalTextLength: result.originalText?.length
    });
    
    // Log original text for debugging
    if (result.originalText && result.originalText.length > 0) {
      console.log('Original text available (first 500 chars):', result.originalText.substring(0, 500));
    } else {
      console.log('WARNING: No original text extracted');
    }
    
    // Store in history (simplified - in production use database)
    const historyItem = {
      id: Date.now(),
      fileName,
      fileSize,
      timestamp: new Date().toISOString(),
      summary: result.summary,
      originalText: result.originalText,
      metadata: result.metadata || {}
    };

    // Clean up the uploaded file after processing
    try {
      await fs.remove(pdfPath);
      console.log(`Cleaned up: ${pdfPath}`);
    } catch (cleanupError) {
      console.warn('Could not clean up file:', cleanupError.message);
    }

    res.json({
      success: true,
      message: 'PDF analyzed successfully',
      data: historyItem
    });

  } catch (error) {
    console.error('Error processing PDF:', error);
    
    // Clean up file on error
    if (req.file && req.file.path) {
      try {
        await fs.remove(req.file.path);
      } catch (cleanupError) {
        console.warn('Cleanup failed:', cleanupError.message);
      }
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to process PDF',
      details: error.message
    });
  }
});

// Get history (mock data for now)
app.get('/api/history', (req, res) => {
  // In production, retrieve from database
  const mockHistory = [
    {
      id: 1,
      fileName: "sample.pdf",
      fileSize: "2.4 MB",
      timestamp: "2025-01-15T10:30:00Z",
      summary: "This is a sample summary of the PDF document.",
      originalText: "This is sample original text from the PDF document. It shows how the original content will be displayed.",
      metadata: { pages: 24, language: "en" }
    }
  ];
  
  res.json(mockHistory);
});

// Get summary by ID
app.get('/api/summary/:id', (req, res) => {
  const id = parseInt(req.params.id);
  // In production, fetch from database
  res.json({
    id,
    summary: "Detailed summary would appear here.",
    originalText: "This is the original text content that was extracted from the PDF file.",
    diseaseType: "Example Disease",
    confidenceScore: "95%",
    description: "Detailed description of the disease...",
    prescription: ["Medication A", "Therapy B"],
    mitigation: ["Strategy 1", "Strategy 2"]
  });
});

// Delete history item
app.delete('/api/history/:id', (req, res) => {
  const id = parseInt(req.params.id);
  // In production, delete from database
  res.json({ success: true, message: `Item ${id} deleted` });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ 
      success: false,
      error: 'File upload error', 
      details: err.message 
    });
  }
  
  if (err.message === 'Only PDF files are allowed') {
    return res.status(400).json({
      success: false,
      error: 'Invalid file type',
      details: 'Please upload a PDF file'
    });
  }
  
  res.status(500).json({ 
    success: false,
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`📁 Uploads directory: ${path.join(__dirname, '../uploads')}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`\n🌐 To expose this server via ngrok, run:`);
  console.log(`   ngrok http ${PORT}`);
  console.log(`\n📝 Then update config.js with your ngrok URL\n`);
});

module.exports = app;