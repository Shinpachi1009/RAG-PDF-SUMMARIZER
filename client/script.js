document.addEventListener('DOMContentLoaded', function() {
    // Navigation
    const navLinks = document.querySelectorAll('nav a');
    const sections = document.querySelectorAll('section');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('data-target');
            
            // Hide all sections
            sections.forEach(section => {
                section.style.display = 'none';
            });
            
            // Show target section
            document.getElementById(targetId).style.display = 'block';
            
            // Update active nav link
            navLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');
            
            // Close mobile menu if open
            const navMenu = document.getElementById('navMenu');
            navMenu.classList.remove('show');
        });
    });

    // Hamburger menu toggle
    const menuToggle = document.querySelector('.menu-toggle');
    const navMenu = document.getElementById('navMenu');
    
    if (menuToggle) {
        menuToggle.addEventListener('click', function() {
            navMenu.classList.toggle('show');
        });
    }

    // File upload handling
    const pdfInput = document.getElementById('pdfInput');
    const uploadBtn = document.getElementById('uploadBtn');
    const analyzeBtn = document.getElementById('analyzePdfBtn');
    const pdfFileName = document.getElementById('pdfFileName');
    const pdfFileSize = document.getElementById('pdfFileSize');
    const pdfPreviewContainer = document.querySelector('.pdf-preview-container');
    const loadingSpinner = document.getElementById('loadingSpinner');

    // Trigger file input when upload button is clicked
    uploadBtn.addEventListener('click', () => pdfInput.click());

    // Handle file selection
    pdfInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file && file.type === 'application/pdf') {
            updateFilePreview(file);
            analyzeBtn.disabled = false;
        } else {
            resetFilePreview();
            analyzeBtn.disabled = true;
            alert('Please select a valid PDF file.');
        }
    });

    // Update file preview
    function updateFilePreview(file) {
        pdfFileName.textContent = file.name;
        pdfFileSize.textContent = `${(file.size / 1024).toFixed(2)} KB`;
        pdfPreviewContainer.classList.add('has-pdf');
    }

    // Reset file preview
    function resetFilePreview() {
        pdfFileName.textContent = 'No PDF selected';
        pdfFileSize.textContent = '';
        pdfPreviewContainer.classList.remove('has-pdf');
        pdfInput.value = '';
    }

    // Analyze PDF
    analyzeBtn.addEventListener('click', async function() {
        const file = pdfInput.files[0];
        if (!file) {
            alert('Please select a PDF file first.');
            return;
        }

        // Show loading spinner
        loadingSpinner.style.display = 'flex';
        analyzeBtn.disabled = true;
        analyzeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analyzing...';

        const formData = new FormData();
        formData.append('pdf', file);

        try {
            const response = await fetch('/api/analyze-pdf', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || `HTTP error! status: ${response.status}`);
            }

            if (result.success) {
                console.log('Analysis result received:', {
                    hasData: !!result.data,
                    hasOriginalText: !!result.data?.originalText,
                    originalTextLength: result.data?.originalText?.length
                });
                
                // Store in history
                addToHistory(result.data);
                
                // Show results section
                showAnalysisResults(result.data);
                
                // Reset file input
                resetFilePreview();
            } else {
                throw new Error(result.error || 'Analysis failed');
            }
        } catch (error) {
            console.error('Error analyzing PDF:', error);
            alert(`Failed to analyze PDF: ${error.message}`);
        } finally {
            // Hide loading spinner
            loadingSpinner.style.display = 'none';
            analyzeBtn.disabled = false;
            analyzeBtn.innerHTML = '<i class="fas fa-search"></i> Analyze PDF';
        }
    });

    // Show analysis results
    function showAnalysisResults(data) {
        const resultsSection = document.getElementById('resultsSection');
        const diseaseType = document.getElementById('diseaseType');
        const confidenceScore = document.getElementById('confidenceScore');
        const diseaseDescription = document.getElementById('diseaseDescription');
        const prescriptionList = document.getElementById('prescription');
        const mitigationList = document.getElementById('mitigation');
        
        // Update results with data from backend
        diseaseType.textContent = data.metadata?.diseaseType || 'General Document';
        confidenceScore.textContent = data.metadata?.confidenceScore || 'High';
        
        // Update description with longer summary
        const fullSummary = data.summary || 'No description available.';
        diseaseDescription.textContent = fullSummary;
        
        // Remove existing original text section if it exists
        const existingOriginalTextSection = resultsSection.querySelector('.original-text-section');
        if (existingOriginalTextSection) {
            existingOriginalTextSection.remove();
        }
        
        // Create original text section
        const originalTextSection = document.createElement('div');
        originalTextSection.className = 'original-text-section';
        
        // Check if we have original text
        if (data.originalText && data.originalText.length > 0) {
            console.log('Displaying original text, length:', data.originalText.length);
            
            // Show preview of original text (first 1000 chars)
            const displayText = data.originalText.length > 1000 ? 
                data.originalText.substring(0, 1000) + '...' : 
                data.originalText;
            
            originalTextSection.innerHTML = `
                <h4>Original PDF Content (Preview):</h4>
                <div class="original-text-container">
                    <p id="originalTextContent" class="original-text-content">${displayText}</p>
                </div>
                ${data.originalText.length > 1000 ? `
                    <button id="toggleOriginalText" class="btn view-more-btn">
                        <i class="fas fa-chevron-down"></i> Show Full Original Text
                    </button>
                ` : ''}
            `;
            
            // Add toggle functionality if needed
            if (data.originalText.length > 1000) {
                setTimeout(() => {
                    const toggleBtn = document.getElementById('toggleOriginalText');
                    const originalTextContent = document.getElementById('originalTextContent');
                    
                    if (toggleBtn) {
                        toggleBtn.addEventListener('click', function() {
                            const icon = this.querySelector('i');
                            
                            if (originalTextContent.textContent.length < data.originalText.length) {
                                // Show full text
                                originalTextContent.textContent = data.originalText;
                                icon.className = 'fas fa-chevron-up';
                                this.innerHTML = '<i class="fas fa-chevron-up"></i> Show Less';
                            } else {
                                // Show preview
                                originalTextContent.textContent = displayText;
                                icon.className = 'fas fa-chevron-down';
                                this.innerHTML = '<i class="fas fa-chevron-down"></i> Show Full Original Text';
                            }
                        });
                    }
                }, 100);
            }
        } else {
            console.log('No original text to display');
            originalTextSection.innerHTML = `
                <h4>Original PDF Content:</h4>
                <div class="original-text-container">
                    <p class="original-text-content" style="color: #999; font-style: italic;">
                        No original text was extracted from the PDF. This could be because:
                        <ul style="margin: 10px 0 10px 20px;">
                            <li>The PDF is image-based (scanned document)</li>
                            <li>The PDF is password protected</li>
                            <li>The PDF contains no extractable text</li>
                            <li>There was an error during text extraction</li>
                        </ul>
                        Check the console for detailed extraction logs.
                    </p>
                </div>
            `;
        }
        
        // Insert after description section
        const descriptionSection = resultsSection.querySelector('.result-description');
        descriptionSection.insertAdjacentElement('afterend', originalTextSection);
        
        // Clear and populate lists
        prescriptionList.innerHTML = '';
        mitigationList.innerHTML = '';
        
        // Add sample prescription items
        const samplePrescriptions = [
            "Consult with a specialist for detailed analysis",
            "Review document thoroughly for accuracy",
            "Follow up with additional research if needed"
        ];
        
        samplePrescriptions.forEach(item => {
            const li = document.createElement('li');
            li.textContent = item;
            prescriptionList.appendChild(li);
        });
        
        // Add sample mitigation strategies
        const sampleMitigations = [
            "Verify information from multiple sources",
            "Keep document organized and accessible",
            "Regularly update analysis with new information"
        ];
        
        sampleMitigations.forEach(item => {
            const li = document.createElement('li');
            li.textContent = item;
            mitigationList.appendChild(li);
        });
        
        // Show results section
        resultsSection.style.display = 'block';
        resultsSection.scrollIntoView({ behavior: 'smooth' });
    }

    // Add to history
    function addToHistory(item) {
        const historyList = document.getElementById('historyList');
        const noHistoryMessage = document.getElementById('noHistoryMessage');
        
        // Hide "no history" message
        noHistoryMessage.style.display = 'none';
        
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        historyItem.dataset.id = item.id;
        
        // Create preview of original text (first 200 chars)
        const originalTextPreview = item.originalText ? 
            item.originalText.substring(0, 200) + (item.originalText.length > 200 ? '...' : '') : 
            'No original text available';
        
        historyItem.innerHTML = `
            <div class="history-item-header">
                <div class="history-details">
                    <strong>File:</strong> ${item.fileName}<br>
                    <strong>Size:</strong> ${item.fileSize}<br>
                    <strong>Processed:</strong> ${new Date(item.timestamp).toLocaleString()}
                </div>
                <button class="btn view-details-btn" onclick="toggleDetails(this)">
                    <i class="fas fa-chevron-down"></i> View Details
                </button>
            </div>
            <div class="history-expanded-details">
                <div class="history-item-content">
                    <strong>Summary:</strong>
                    <p>${item.summary.substring(0, 300)}${item.summary.length > 300 ? '...' : ''}</p>
                    
                    <strong>Original Content (Preview):</strong>
                    <p class="original-text-preview">${originalTextPreview}</p>
                    
                    <div class="history-stats">
                        <small>Summary Length: ${item.summary?.length || 0} characters</small><br>
                        <small>Original Text: ${item.originalText?.length || 0} characters</small>
                    </div>
                </div>
            </div>
        `;
        
        historyList.insertBefore(historyItem, historyList.firstChild);
    }

    // Load history on page load
    async function loadHistory() {
        try {
            const response = await fetch('/api/history');
            const history = await response.json();
            
            const historyList = document.getElementById('historyList');
            const noHistoryMessage = document.getElementById('noHistoryMessage');
            
            if (history.length === 0) {
                noHistoryMessage.style.display = 'block';
            } else {
                noHistoryMessage.style.display = 'none';
                history.forEach(item => addToHistory(item));
            }
        } catch (error) {
            console.error('Error loading history:', error);
        }
    }

    // Global function for toggling details
    window.toggleDetails = function(button) {
        const historyItem = button.closest('.history-item');
        const details = historyItem.querySelector('.history-expanded-details');
        const icon = button.querySelector('i');
        
        if (details.style.display === 'flex') {
            details.style.display = 'none';
            icon.className = 'fas fa-chevron-down';
            button.innerHTML = '<i class="fas fa-chevron-down"></i> View Details';
        } else {
            details.style.display = 'flex';
            icon.className = 'fas fa-chevron-up';
            button.innerHTML = '<i class="fas fa-chevron-up"></i> Hide Details';
        }
    };

    // Share results button
    document.querySelector('.share-btn').addEventListener('click', function() {
        const resultsSection = document.getElementById('resultsSection');
        const textToShare = `
Disease Type: ${document.getElementById('diseaseType').textContent}
Confidence Score: ${document.getElementById('confidenceScore').textContent}
Description: ${document.getElementById('diseaseDescription').textContent.substring(0, 500)}${document.getElementById('diseaseDescription').textContent.length > 500 ? '...' : ''}
        `.trim();
        
        if (navigator.share) {
            navigator.share({
                title: 'PDF Analysis Results',
                text: textToShare,
                url: window.location.href
            });
        } else {
            // Fallback: copy to clipboard
            navigator.clipboard.writeText(textToShare).then(() => {
                alert('Results copied to clipboard!');
            });
        }
    });

    // Load history when page loads
    loadHistory();

    // Feature card click handler
    document.getElementById('uploadPdfCard').addEventListener('click', function() {
        pdfInput.click();
    });
});
