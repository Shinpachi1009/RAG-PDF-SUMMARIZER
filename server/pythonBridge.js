const { PythonShell } = require('python-shell');
const path = require('path');
const fs = require('fs-extra');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

class PythonBridge {
  constructor() {
    // IMPORTANT: do NOT call async function here
    this.pythonPath = process.env.PYTHON_PATH || null;
    this.scriptPath = path.join(__dirname, '../python/rag_pdf_summarizer.py');
  }

  async detectPythonPath() {
    console.log('Detecting Python executable...');

    // Try common Python paths you may be using
    const possiblePaths = [
      'C:\\Users\\uriur\\anaconda3\\python.exe'
    ];

    for (const pythonPath of possiblePaths) {
      try {
        console.log(`Trying Python path: ${pythonPath}`);
        const { stdout } = await execPromise(`"${pythonPath}" --version`);
        console.log(`✅ Found Python: ${stdout.trim()}`);
        return pythonPath;
      } catch (error) {}
    }

    // Check if 'py' exists (Windows launcher)
    try {
      const { stdout } = await execPromise('py --version');
      console.log(`✅ Found Python via py launcher: ${stdout.trim()}`);
      return 'py';
    } catch (error) {
      console.warn('py launcher not found');
    }

    // Use where python
    try {
      const { stdout } = await execPromise('where python');
      const lines = stdout.split('\n').filter(line => line.trim().endsWith('.exe'));
      if (lines.length > 0) {
        console.log(`✅ Found Python via 'where': ${lines[0].trim()}`);
        return lines[0].trim();
      }
    } catch (error) {
      console.warn('Could not find Python via "where" command');
    }

    throw new Error('Python not found. Please install Python 3.8+ or set PYTHON_PATH in .env');
  }

  async setupEnvironment() {
    console.log('Checking Python environment...');

    // Auto-detect Python if not already detected
    if (!this.pythonPath) {
      this.pythonPath = await this.detectPythonPath();
    }

    // Check Python version
    try {
      const { stdout } = await execPromise(`"${this.pythonPath}" --version`);
      console.log(`Python version: ${stdout.trim()}`);
    } catch (error) {
      throw new Error(`Python not accessible: ${error.message}`);
    }

    // Check if Python script exists
    if (!await fs.pathExists(this.scriptPath)) {
      throw new Error(`Python script not found: ${this.scriptPath}`);
    }

    console.log('✅ Python environment is ready');
    return true;
  }

  async installDependencies() {
    console.log('Checking Python dependencies...');

    const requirementsPath = path.join(__dirname, '../python/requirements.txt');

    if (await fs.pathExists(requirementsPath)) {
      console.log('Installing Python dependencies...');
      try {
        await execPromise(
          `"${this.pythonPath}" -m pip install -r "${requirementsPath}"`
        );
        console.log('✅ Dependencies installed successfully');
        return true;
      } catch (error) {
        console.warn('⚠️ Could not install dependencies:', error.message);
        console.log('Install manually using:');
        console.log(
          `"${this.pythonPath}" -m pip install torch transformers sentence-transformers langchain faiss-cpu pypdf langchain-text-splitters`
        );
        return false;
      }
    }

    return true;
  }

  async processPDF(pdfPath, query = "Summarize this document") {
    return new Promise((resolve, reject) => {
        console.log(`Starting Python process for: ${pdfPath}`);
        console.log(`Using Python: ${this.pythonPath}`);

        const options = {
            mode: 'text',
            pythonPath: this.pythonPath,
            pythonOptions: ['-u'],
            scriptPath: path.join(__dirname, '../python'),
            args: [pdfPath, query],
            encoding: 'utf8',
            maxBuffer: 1024 * 1024 * 10 // 10MB buffer for larger outputs
        };

        const pyshell = new PythonShell('rag_pdf_summarizer.py', options);

        let output = '';
        let errorOutput = '';

        pyshell.on('message', message => {
            console.log('Python stdout message received');
            output += message + '\n';
        });

        pyshell.on('stderr', stderr => {
            // Log messages go to stderr
            console.log('Python stderr:', stderr.trim());
            errorOutput += stderr;
        });

        pyshell.end((err, code, signal) => {
            console.log('Python process ended:', { code, signal });

            if (err) {
                console.error('PythonShell error:', err);
                reject(new Error(`Python script error: ${err.message}`));
                return;
            }

            try {
                const trimmed = output.trim();
                
                if (!trimmed) {
                    throw new Error('Python script returned empty output');
                }

                console.log('Raw Python output:', trimmed);
                const parsed = JSON.parse(trimmed);

                // Handle different response formats
                if (parsed.error) {
                    // If there's an error field, reject
                    throw new Error(`Python script error: ${parsed.error}`);
                } else if (parsed.summary) {
                    // Success with summary
                    console.log('Python result parsed successfully:', {
                        hasSummary: !!parsed.summary,
                        hasOriginalText: !!parsed.originalText,
                        summaryLength: parsed.summary?.length,
                        originalTextLength: parsed.originalText?.length
                    });
                    
                    resolve({
                        summary: parsed.summary,
                        originalText: parsed.originalText || '',
                        metadata: parsed.metadata || {},
                        rawOutput: output,
                        warnings: errorOutput,
                        isJson: true
                    });
                } else {
                    // Unexpected format, but still resolve with what we have
                    resolve({
                        summary: JSON.stringify(parsed),
                        originalText: '',
                        metadata: {},
                        rawOutput: output,
                        warnings: errorOutput,
                        isJson: true
                    });
                }
            } catch (parseError) {
                console.error('Failed to parse output:', parseError.message);
                console.error('Raw output was:', output);
                
                // Even if parsing fails, try to return something useful
                resolve({
                    summary: output || 'No summary generated',
                    originalText: '',
                    metadata: {},
                    rawOutput: output,
                    warnings: errorOutput,
                    isJson: false
                });
            }
        });

        pyshell.on('error', error => {
            console.error('PythonShell process error:', error);
            reject(new Error(`Failed to start Python process: ${error.message}`));
        });
    });
  }
}

module.exports = PythonBridge;
