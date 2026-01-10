#!/usr/bin/env python3
import sys
import json

def main():
    print("Python is working correctly!")
    print(f"Python version: {sys.version}")
    
    # Check if we have required packages
    packages = ['torch', 'transformers', 'sentence_transformers', 'langchain', 'faiss', 'pypdf']
    
    results = []
    for package in packages:
        try:
            __import__(package.replace('_', ''))
            results.append(f"✅ {package}: OK")
        except ImportError:
            results.append(f"❌ {package}: MISSING")
    
    print("\nDependency check:")
    for result in results:
        print(f"  {result}")
    
    # Return as JSON for Node.js
    return json.dumps({
        "status": "success",
        "python_version": sys.version,
        "dependencies": results,
        "message": "Python environment check completed"
    })

if __name__ == "__main__":
    try:
        result = main()
        print(result)
    except Exception as e:
        error_result = json.dumps({
            "status": "error",
            "message": str(e)
        })
        print(error_result)
        sys.exit(1)