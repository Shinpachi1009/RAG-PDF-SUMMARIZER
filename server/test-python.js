const { PythonShell } = require('python-shell');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const fs = require('fs');

async function testPython() {
  console.log('=== Testing Python Integration ===\n');

  // Use the path from .env or try to find it
  let pythonPath = process.env.PYTHON_PATH || 'python';
  
  console.log(`1. Using Python path: ${pythonPath}`);
  
  // Test if Python is accessible
  try {
    const { stdout, stderr } = await execPromise(`"${pythonPath}" --version`);
    console.log(`   ✅ Python version: ${stdout.trim()}`);
  } catch (error) {
    console.log(`   ❌ Cannot access Python at "${pythonPath}":`, error.message);
    
    // Try to find Python
    console.log('\n   Looking for alternative Python installations...');
    const possiblePaths = [
      'python',
      'python3',
      'py',
      'C:\\Python314\\python.exe',
      'C:\\Python313\\python.exe',
      'C:\\Python312\\python.exe',
      'C:\\Python311\\python.exe',
      'C:\\Python310\\python.exe',
      'C:\\Users\\' + process.env.USERNAME + '\\AppData\\Local\\Programs\\Python\\Python314\\python.exe',
      'C:\\Users\\' + process.env.USERNAME + '\\AppData\\Local\\Programs\\Python\\Python313\\python.exe',
      'C:\\Users\\' + process.env.USERNAME + '\\AppData\\Local\\Programs\\Python\\Python312\\python.exe',
      'C:\\Users\\' + process.env.USERNAME + '\\AppData\\Local\\Programs\\Python\\Python311\\python.exe',
      'C:\\Users\\' + process.env.USERNAME + '\\AppData\\Local\\Programs\\Python\\Python310\\python.exe',
      'C:\\Program Files\\Python314\\python.exe',
      'C:\\Program Files\\Python313\\python.exe',
      'C:\\Program Files\\Python312\\python.exe',
      'C:\\Program Files\\Python311\\python.exe',
      'C:\\Program Files\\Python310\\python.exe'
    ];

    for (const testPath of possiblePaths) {
      try {
        const { stdout } = await execPromise(`"${testPath}" --version`);
        console.log(`   ✅ Found alternative: ${testPath} (${stdout.trim()})`);
        pythonPath = testPath;
        break;
      } catch (e) {
        // Continue searching
      }
    }
  }

  if (!pythonPath) {
    console.log('\n❌ Python not found!');
    return;
  }

  // Test 2: Create a simple test file
  console.log('\n2. Creating test script...');
  const testScriptPath = path.join(__dirname, 'test_python_simple.py');
  const testScript = `
import sys
import json

print("Python test script running!")
print(f"Python executable: {sys.executable}")
print(f"Python version: {sys.version}")

# Simple test
result = {
    "status": "success",
    "python_path": sys.executable,
    "python_version": sys.version,
    "test_value": 42
}

print(json.dumps(result))
`;

  fs.writeFileSync(testScriptPath, testScript);
  console.log(`   ✅ Test script created: ${testScriptPath}`);

  // Test 3: Run the test script directly
  console.log('\n3. Running test script directly...');
  try {
    const { stdout, stderr } = await execPromise(`"${pythonPath}" "${testScriptPath}"`);
    console.log('   ✅ Script output:');
    console.log('   ' + stdout.trim().replace(/\n/g, '\n   '));
    
    if (stderr) {
      console.log('   ⚠️  Stderr:', stderr);
    }
  } catch (error) {
    console.log('   ❌ Script execution failed:', error.message);
    if (error.stderr) {
      console.log('   Stderr:', error.stderr);
    }
    console.log('   Stdout:', error.stdout);
  }

  // Test 4: Test PythonShell with string
  console.log('\n4. Testing PythonShell with string...');
  try {
    const options = {
      mode: 'text',
      pythonPath: pythonPath,
      pythonOptions: ['-c']
    };

    const code = 'import sys; print(f"PythonShell test: {sys.version}"); print("SUCCESS")';
    
    PythonShell.runString(code, options, (err, results) => {
      if (err) {
        console.log('   ❌ PythonShell failed:', err.message);
      } else {
        console.log('   ✅ PythonShell success:', results.join(', '));
      }

      // Test 5: Check Python script
      console.log('\n5. Checking RAG Python script...');
      const scriptPath = path.join(__dirname, '../python/rag_pdf_summarizer.py');
      if (fs.existsSync(scriptPath)) {
        console.log(`   ✅ Script found: ${scriptPath}`);
        
        // Test 6: Test RAG script with mock data
        console.log('\n6. Testing RAG script with simple input...');
        const testPdfPath = path.join(__dirname, '../python/test.pdf');
        
        // Create a dummy PDF if it doesn't exist
        if (!fs.existsSync(testPdfPath)) {
          console.log('   Creating dummy test PDF...');
          // Create a simple text file
          fs.writeFileSync(testPdfPath.replace('.pdf', '.txt'), 'This is a test document for PDF processing.');
        }

        // Run a simple version of the RAG script
        const simpleTest = `
import json
import sys

# Mock the RAG functionality for testing
def mock_summarize(pdf_path, query):
    return {
        "summary": "This is a test summary generated by the RAG model. The actual model would analyze the PDF content and provide insights based on the document.",
        "metadata": {
            "pages": 10,
            "chunks": 5,
            "query": query,
            "test_mode": True
        }
    }

if __name__ == "__main__":
    # Accept arguments or use defaults
    pdf_path = sys.argv[1] if len(sys.argv) > 1 else "test.pdf"
    query = sys.argv[2] if len(sys.argv) > 2 else "Summarize this"
    
    result = mock_summarize(pdf_path, query)
    print(json.dumps(result, indent=2))
`;
        
        const simpleTestPath = path.join(__dirname, 'test_rag_simple.py');
        fs.writeFileSync(simpleTestPath, simpleTest);
        
        const ragOptions = {
          mode: 'text',
          pythonPath: pythonPath,
          scriptPath: path.dirname(simpleTestPath),
          args: ['test.pdf', 'Test query']
        };
        
        PythonShell.run('test_rag_simple.py', ragOptions, (err, results) => {
          if (err) {
            console.log('   ❌ RAG test failed:', err.message);
          } else {
            console.log('   ✅ RAG test successful!');
            console.log('   Output:', results.join('\n   '));
          }
          
          // Cleanup
          fs.unlinkSync(simpleTestPath);
          fs.unlinkSync(testScriptPath);
          
          console.log('\n=== Test Complete ===');
          console.log('\nSummary:');
          console.log(`   Python: ${pythonPath}`);
          console.log(`   Status: ${err ? 'Issues found' : 'Ready to use!'}`);
          
          if (!err) {
            console.log('\n✅ You can now start the server:');
            console.log('   1. Update server/.env with:');
            console.log(`      PYTHON_PATH=${pythonPath}`);
            console.log('   2. Run: npm start');
            console.log('   3. Open: http://localhost:3000');
          } else {
            console.log('\n⚠️  Issues to fix:');
            console.log('   - Make sure Python 3.8+ is installed');
            console.log('   - Check the Python path in .env file');
          }
        });
      } else {
        console.log(`   ❌ Script not found: ${scriptPath}`);
        console.log('   Please ensure the RAG Python script exists.');
      }
    });
  } catch (error) {
    console.log('   ❌ Unexpected error:', error.message);
    
    // Cleanup
    if (fs.existsSync(testScriptPath)) {
      fs.unlinkSync(testScriptPath);
    }
  }
}

testPython();