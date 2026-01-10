import os
import sys
import json
from pypdf import PdfReader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from sentence_transformers import SentenceTransformer
import numpy as np
import faiss
from transformers import pipeline
import re

# Function to log to stderr (not stdout)
def log_info(message):
    print(f"[INFO] {message}", file=sys.stderr)

def extract_text_from_pdf(pdf_path):
    """Extract text from PDF file"""
    try:
        log_info(f"Reading PDF: {pdf_path}")
        reader = PdfReader(pdf_path)
        text = ""
        for i, page in enumerate(reader.pages):
            page_text = page.extract_text()
            if page_text.strip():
                text += f"--- Page {i+1} ---\n{page_text}\n\n"
        return text, len(reader.pages)
    except Exception as e:
        log_info(f"Failed to extract text: {str(e)}")
        raise

def split_into_chunks(text, chunk_size=1000, chunk_overlap=200):
    """Split text into chunks for processing"""
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size, chunk_overlap=chunk_overlap
    )
    chunks = splitter.split_text(text)
    log_info(f"Split into {len(chunks)} chunks")
    return chunks

def build_faiss_index(chunks):
    """Create embeddings and build FAISS index"""
    log_info("Creating embeddings...")
    embedder = SentenceTransformer("all-MiniLM-L6-v2")
    embeddings = embedder.encode(chunks, show_progress_bar=False)
    
    log_info("Building FAISS index...")
    index = faiss.IndexFlatL2(embeddings.shape[1])
    index.add(np.array(embeddings))
    return embedder, index

def retrieve(query, embedder, index, chunks, top_k=5):
    """Retrieve relevant chunks based on query"""
    query_emb = embedder.encode([query])
    D, I = index.search(query_emb, top_k)
    return [chunks[i] for i in I[0]]

def clean_text(text):
    """Clean extracted text"""
    # Remove excessive whitespace
    text = re.sub(r'\s+', ' ', text)
    # Remove multiple newlines
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()

def summarize_with_rag(pdf_path, query="Provide a detailed summary of this document"):
    """Main function to summarize PDF using RAG"""
    try:
        # Extract text from PDF
        text, page_count = extract_text_from_pdf(pdf_path)
        
        # Clean the extracted text
        cleaned_text = clean_text(text)
        log_info(f"Extracted {len(cleaned_text)} characters from PDF")
        
        if not cleaned_text.strip():
            return {
                "summary": "No text could be extracted from the PDF document.",
                "originalText": "",
                "metadata": {
                    "pages": page_count,
                    "chunks": 0,
                    "query": query
                }
            }
        
        # Store original text (first 15000 chars for preview)
        original_text_preview = cleaned_text[:15000]
        if len(cleaned_text) > 15000:
            original_text_preview += "...\n[Content truncated. Full document contains {} characters]".format(len(cleaned_text))
        
        # Split into chunks
        chunks = split_into_chunks(cleaned_text)
        
        if len(chunks) == 0:
            return {
                "summary": "Document was processed but no meaningful content was found.",
                "originalText": original_text_preview,
                "metadata": {
                    "pages": page_count,
                    "chunks": 0,
                    "query": query
                }
            }
        
        # Build FAISS index
        embedder, index = build_faiss_index(chunks)
        
        # Initialize summarization model
        log_info("Loading summarization model...")
        try:
            # Try BART for better quality summaries
            generator = pipeline("summarization", model="facebook/bart-large-cnn")
            model_type = "bart"
            log_info("Using BART-large-cnn model for detailed summaries")
        except Exception as e:
            try:
                # Try distilbart
                generator = pipeline("summarization", model="sshleifer/distilbart-cnn-12-6")
                model_type = "distilbart"
                log_info(f"Using distilbart model: {str(e)}")
            except Exception as e2:
                # Fallback to any available model
                log_info(f"Trying default summarization model: {str(e2)}")
                generator = pipeline("summarization")
                model_type = "default"
        
        # Retrieve relevant chunks - get more chunks for longer summary
        context_chunks = retrieve(query, embedder, index, chunks, top_k=8)
        context = "\n".join(context_chunks)
        
        # Prepare context for summarization
        prompt = context[:3000]
        
        # Generate longer, more detailed summary
        log_info("Generating detailed summary...")
        try:
            if model_type == "bart":
                # BART can handle longer inputs and generate longer outputs
                summary_result = generator(
                    prompt, 
                    max_length=400,
                    min_length=150,
                    do_sample=False,
                    num_beams=4,
                    length_penalty=1.0
                )
            else:
                # For other models
                summary_result = generator(
                    prompt[:2000], 
                    max_length=300,
                    min_length=100,
                    do_sample=False
                )
            
            # Extract summary text
            summary = summary_result[0]["summary_text"].strip()
            
            # If summary is too short, try to generate additional points
            if len(summary.split()) < 100 and len(chunks) > 0:
                log_info("Summary is short, generating additional details...")
                
                # Get additional context for more detail
                additional_chunks = retrieve("key points important details", embedder, index, chunks, top_k=4)
                additional_context = "\n".join(additional_chunks)[:1500]
                
                if additional_context:
                    # Generate additional details
                    detail_result = generator(
                        additional_context,
                        max_length=200,
                        min_length=80,
                        do_sample=False
                    )
                    
                    if detail_result and len(detail_result) > 0:
                        details = detail_result[0]["summary_text"].strip()
                        summary = f"{summary}\n\nAdditional Details:\n{details}"
            
        except Exception as e:
            log_info(f"Summary generation failed: {str(e)}")
            # Fallback: use first few chunks as summary
            fallback_summary = "\n".join(chunks[:3])[:1000]
            summary = f"Key points from document:\n\n{fallback_summary}"
        
        # Prepare result - include original text directly in JSON
        result = {
            "summary": summary,
            "originalText": original_text_preview,
            "metadata": {
                "pages": page_count,
                "chunks": len(chunks),
                "query": query,
                "model_type": model_type,
                "summary_length": len(summary),
                "original_length": len(cleaned_text),
                "original_preview_length": len(original_text_preview)
            }
        }
        
        return result
        
    except Exception as e:
        log_info(f"Error in summarize_with_rag: {str(e)}")
        return {
            "error": str(e),
            "type": type(e).__name__
        }

def main():
    """Main entry point - ONLY outputs JSON to stdout"""
    if len(sys.argv) < 2:
        error_result = {
            "error": "No PDF path provided"
        }
        # Only JSON goes to stdout
        print(json.dumps(error_result))
        sys.exit(1)
    
    pdf_path = sys.argv[1]
    query = sys.argv[2] if len(sys.argv) > 2 else "Provide a detailed summary of this document"
    
    if not os.path.exists(pdf_path):
        error_result = {
            "error": f"PDF file not found: {pdf_path}"
        }
        print(json.dumps(error_result))
        sys.exit(1)
    
    try:
        # Process the PDF
        result = summarize_with_rag(pdf_path, query)
        
        # Print ONLY JSON output to stdout
        print(json.dumps(result))
        
    except Exception as e:
        error_result = {
            "error": str(e),
            "type": type(e).__name__
        }
        print(json.dumps(error_result))
        sys.exit(1)

if __name__ == "__main__":
    main()
