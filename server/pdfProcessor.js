const PythonBridge = require('./pythonBRIDGE');
const fs = require('fs-extra');
const path = require('path');

class PDFProcessor {
  constructor() {
    this.pythonBridge = new PythonBridge();
    this.isEnvironmentReady = false;
  }

  async initialize() {
    if (!this.isEnvironmentReady) {
      console.log('Initializing Python environment...');
      try {
        await this.pythonBridge.setupEnvironment();
        await this.pythonBridge.installDependencies();
        this.isEnvironmentReady = true;
        console.log('✅ Python environment initialized successfully');
      } catch (error) {
        console.error('Failed to initialize Python environment:', error);
        throw error;
      }
    }
  }

  async process(pdfPath) {
    try {
      // Ensure environment is ready
      await this.initialize();
      
      console.log(`Processing PDF: ${pdfPath}`);
      
      // Check if file exists
      if (!await fs.pathExists(pdfPath)) {
        throw new Error(`PDF file not found: ${pdfPath}`);
      }

      // Process with RAG model
      const result = await this.pythonBridge.processPDF(pdfPath);
      
      if (!result) {
        throw new Error('Python script returned no result');
      }

      console.log('Python Bridge result:', {
        hasSummary: !!result.summary,
        hasOriginalText: !!result.originalText,
        summaryLength: result.summary?.length,
        originalTextLength: result.originalText?.length,
        isJson: result.isJson
      });

      // Parse the summary
      let summary = '';
      let originalText = '';
      let metadata = {};

      if (result.isJson) {
        // Already parsed JSON from PythonBridge
        summary = result.summary || 'No summary available';
        originalText = result.originalText || 'No original text extracted';
        metadata = result.metadata || {};
        console.log('✅ Using parsed JSON from PythonBridge');
      } else if (typeof result.summary === 'string') {
        // Try to parse as JSON if it's a string
        try {
          const parsed = JSON.parse(result.summary);
          if (parsed.summary) {
            summary = parsed.summary;
            originalText = parsed.originalText || '';
            metadata = parsed.metadata || {};
            console.log('✅ Parsed JSON from summary string');
          } else {
            summary = result.summary;
            originalText = '';
          }
        } catch (parseError) {
          summary = result.summary;
          originalText = '';
          console.warn('Could not parse summary as JSON:', parseError.message);
        }
      }

      // Extract metadata from PDF file
      const stats = await fs.stat(pdfPath);
      const fileSize = (stats.size / 1024).toFixed(2);
      
      // Prepare final result
      const processedResult = {
        summary: summary || 'No summary available',
        originalText: originalText || 'No original text extracted. Check console for details.',
        metadata: {
          fileSize: `${fileSize} KB`,
          processedAt: new Date().toISOString(),
          pages: metadata.pages || 'Unknown',
          chunks: metadata.chunks || 'Unknown',
          query: metadata.query || 'Summarize this document',
          diseaseType: this.extractDiseaseType(summary),
          confidenceScore: this.calculateConfidenceScore(summary),
          summaryLength: summary.length,
          originalTextLength: originalText.length,
          ...metadata
        },
        rawResult: result
      };

      console.log('Processing completed successfully');
      console.log('Generated summary length:', processedResult.summary.length);
      console.log('Original text length:', processedResult.originalText.length);
      console.log('Original text preview (first 500 chars):', processedResult.originalText.substring(0, 500));
      console.log('Metadata:', processedResult.metadata);

      return processedResult;
    } catch (error) {
      console.error('Error in PDFProcessor.process:', error);
      
      // Provide fallback result with helpful message
      if (await fs.pathExists(pdfPath)) {
        const stats = await fs.stat(pdfPath);
        const fileSize = (stats.size / 1024).toFixed(2);
        
        let errorMessage = error.message;
        
        if (error.message.includes('Python not found')) {
          errorMessage = 'Python is not installed or not in PATH. Please install Python 3.8+ and add it to PATH.';
        } else if (error.message.includes('torch') || error.message.includes('transformers')) {
          errorMessage = 'Python dependencies missing. Please install: pip install torch transformers sentence-transformers langchain faiss-cpu pypdf langchain-text-splitters';
        }
        
        return {
          summary: `Error: ${errorMessage}\n\nTo fix this:\n1. Ensure Python 3.8+ is installed\n2. Install dependencies: pip install torch transformers sentence-transformers langchain faiss-cpu pypdf\n3. Restart the application`,
          originalText: `Error details: ${error.message}`,
          metadata: {
            fileSize: `${fileSize} KB`,
            processedAt: new Date().toISOString(),
            pages: 'Unknown',
            error: error.message
          }
        };
      }
      
      throw error;
    }
  }

  extractDiseaseType(summary) {
    if (!summary) return 'General Document';
    
    const diseaseKeywords = [
      'cancer', 'diabetes', 'heart', 'stroke', 'pneumonia',
      'flu', 'covid', 'malaria', 'dengue', 'hypertension'
    ];
    
    const lowerSummary = summary.toLowerCase();
    for (const keyword of diseaseKeywords) {
      if (lowerSummary.includes(keyword)) {
        return keyword.charAt(0).toUpperCase() + keyword.slice(1);
      }
    }
    
    if (lowerSummary.includes('court') || lowerSummary.includes('judge') || 
        lowerSummary.includes('law') || lowerSummary.includes('legal')) {
      return 'Legal Document';
    }
    
    if (lowerSummary.includes('medical') || lowerSummary.includes('patient') || 
        lowerSummary.includes('treatment') || lowerSummary.includes('diagnosis')) {
      return 'Medical Document';
    }
    
    if (lowerSummary.includes('research') || lowerSummary.includes('study') || 
        lowerSummary.includes('experiment') || lowerSummary.includes('data')) {
      return 'Research Document';
    }
    
    return 'General Document';
  }

  calculateConfidenceScore(summary) {
    if (!summary) return '0%';
    
    const wordCount = summary.split(/\s+/).length;
    
    // Higher confidence for longer, more detailed summaries
    if (wordCount > 400) return '98%';
    if (wordCount > 300) return '95%';
    if (wordCount > 200) return '90%';
    if (wordCount > 150) return '85%';
    if (wordCount > 100) return '80%';
    if (wordCount > 75) return '75%';
    if (wordCount > 50) return '70%';
    if (wordCount > 30) return '65%';
    if (wordCount > 20) return '60%';
    if (wordCount > 10) return '55%';
    return '50%';
  }
}

// Create instance
const pdfProcessor = new PDFProcessor();

// Initialize on startup
pdfProcessor.initialize().catch(error => {
  console.error('Failed to initialize PDF processor:', error);
});

// Export the bound method
module.exports = {
  processPDFWithRAG: pdfProcessor.process.bind(pdfProcessor),
  PDFProcessor
};
