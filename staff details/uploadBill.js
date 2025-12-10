// Supabase client initialization
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Configuration
const SUPABASE_URL = window.APP_CONFIG?.SUPABASE_URL || 'https://cwaayduboikqihempgbn.supabase.co';
const SUPABASE_KEY = window.APP_CONFIG?.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3YWF5ZHVib2lrcWloZW1wZ2JuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxNzI1MDMsImV4cCI6MjA4MDc0ODUwM30.mZULa8vhq_o4a6J631he9PCJy_iTwm2vhMWFtJ4AoCE';
const GEMINI_API_KEY = window.APP_CONFIG?.GEMINI_API_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Global variables
let selectedFile = null;
let fileUploadArea, fileInput, filePreview, fileName, fileSize, removeFileBtn;
let uploadBtn, uploadBtnText, uploadSpinner, progressContainer, progressFill;
let progressText, resultContainer, resultMessage, errorContainer;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Get DOM Elements
    fileUploadArea = document.getElementById('file-upload-area');
    fileInput = document.getElementById('file-input');
    filePreview = document.getElementById('file-preview');
    fileName = document.getElementById('file-name');
    fileSize = document.getElementById('file-size');
    removeFileBtn = document.getElementById('remove-file-btn');
    uploadBtn = document.getElementById('upload-btn');
    uploadBtnText = document.getElementById('upload-btn-text');
    uploadSpinner = document.getElementById('upload-spinner');
    progressContainer = document.getElementById('progress-container');
    progressFill = document.getElementById('progress-fill');
    progressText = document.getElementById('progress-text');
    resultContainer = document.getElementById('result-container');
    resultMessage = document.getElementById('result-message');
    errorContainer = document.getElementById('error-container');

    // Add Event Listeners
    fileUploadArea.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleFileSelect);
    removeFileBtn.addEventListener('click', clearFile);
    uploadBtn.addEventListener('click', handleUpload);

    // Drag and drop setup
    fileUploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        fileUploadArea.style.borderColor = 'var(--accent-blue)';
        fileUploadArea.style.background = 'rgba(56, 189, 248, 0.05)';
    });

    fileUploadArea.addEventListener('dragleave', () => {
        fileUploadArea.style.borderColor = 'var(--border-color)';
        fileUploadArea.style.background = 'rgba(255, 255, 255, 0.02)';
    });

    fileUploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        fileUploadArea.style.borderColor = 'var(--border-color)';
        fileUploadArea.style.background = 'rgba(255, 255, 255, 0.02)';

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFile(files[0]);
        }
    });
});

// File handling functions
function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        handleFile(file);
    }
}

function handleFile(file) {
    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
        showError('Invalid file type. Please upload JPG, PNG, or PDF files.');
        return;
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
        showError('File too large. Maximum size is 10MB.');
        return;
    }

    selectedFile = file;

    // Show preview
    fileName.textContent = file.name;
    fileSize.textContent = formatFileSize(file.size);
    filePreview.style.display = 'block';
    fileUploadArea.style.display = 'none';
    uploadBtn.disabled = false;

    clearError();
}

function clearFile() {
    selectedFile = null;
    fileInput.value = '';
    filePreview.style.display = 'none';
    fileUploadArea.style.display = 'flex';
    uploadBtn.disabled = true;
    resultContainer.style.display = 'none';
}

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

// Convert file to Base64 (needed for Gemini API)
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
            const base64String = reader.result.split(',')[1];
            resolve(base64String);
        };
        reader.onerror = (error) => reject(error);
    });
}

// Main upload and processing function
async function handleUpload() {
    if (!selectedFile) return;

    try {
        // Disable button and show spinner
        uploadBtn.disabled = true;
        uploadBtnText.textContent = 'Processing...';
        uploadSpinner.style.display = 'inline-block';
        progressContainer.style.display = 'block';

        // Step 1: Upload to Supabase Storage
        updateProgress(20, 'Uploading file to storage...');
        const fileUrl = await uploadToSupabase(selectedFile);

        // Step 2: Parse with Gemini AI
        updateProgress(50, 'Parsing document with AI...');
        const extractedData = await parseWithGemini(selectedFile);

        // Step 3: Insert into database
        updateProgress(80, 'Saving to database...');
        await saveToDB(extractedData, fileUrl);

        // Step 4: Show success
        updateProgress(100, 'Complete!');
        showSuccess(extractedData);

    } catch (error) {
        console.error('Upload error details:', error);
        showError(`Error: ${error.message}. Check console for details.`);
        resetUploadButton();
    }
}

// Upload file to Supabase Storage
async function uploadToSupabase(file) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${fileName}`;

    const { data, error } = await supabase.storage
        .from('bills')
        .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
        });

    if (error) {
        throw new Error(`Upload failed: ${error.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
        .from('bills')
        .getPublicUrl(filePath);

    return urlData.publicUrl;
}

// Parse document with Google Gemini
async function parseWithGemini(file) {
    if (!GEMINI_API_KEY) {
        throw new Error('Gemini API key not configured. Please add GEMINI_API_KEY to your config.');
    }

    // Convert file to Base64
    const base64Data = await fileToBase64(file);
    const mimeType = file.type;

    const requestBody = {
        contents: [{
            parts: [
                {
                    text: `Extract the following information from this bill/invoice image and return ONLY a valid JSON object. Do not include markdown formatting (like \`\`\`json).
                    
Required JSON Structure:
{
  "invoice_number": "string",
  "invoice_date": "YYYY-MM-DD",
  "place_of_service": "string",
  "place_of_supply": "string",
  "gst_number": "string",
  "customer_name": "string",
  "subtotal": number,
  "grand_total": number,
  "vehicle_number": "string",
  "items": [
    {
      "s_no": number,
      "item_code": "string",
      "hsn_code": "string",
      "job_type": "string",
      "quantity": number,
      "price": number,
      "taxable_amount": number,
      "igst_amount": number,
      "total_amount": number
    }
  ]
}

If any field is not found, use null for strings or 0 for numbers.`
                },
                {
                    inline_data: {
                        mime_type: mimeType,
                        data: base64Data
                    }
                }
            ]
        }]
    };

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Gemini API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();

    // Check if we got a valid response
    if (!data.candidates || data.candidates.length === 0 || !data.candidates[0].content) {
        throw new Error('No data returned from AI');
    }

    const content = data.candidates[0].content.parts[0].text;

    // Parse JSON response
    let parsedData;
    try {
        // Remove markdown code blocks if present
        const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || content.match(/```\n?([\s\S]*?)\n?```/);
        const jsonString = jsonMatch ? jsonMatch[1] : content;
        // Also remove any leading/trailing whitespace or accidental characters
        parsedData = JSON.parse(jsonString.trim().replace(/^`+|`+$/g, ''));
    } catch (e) {
        console.error('Failed to parse Gemini response:', content);
        throw new Error('Failed to parse AI response. Please try again.');
    }

    return parsedData;
}

// Save to database
async function saveToDB(data, fileUrl) {
    // Insert bill record
    const billData = {
        invoice_number: data.invoice_number,
        invoice_date: data.invoice_date,
        place_of_service: data.place_of_service,
        place_of_supply: data.place_of_supply,
        gst_number: data.gst_number,
        customer_name: data.customer_name,
        subtotal: data.subtotal,
        grand_total: data.grand_total,
        vehicle_number: data.vehicle_number,
        file_url: fileUrl
    };

    const { data: billRecord, error: billError } = await supabase
        .from('bills')
        .insert([billData])
        .select()
        .single();

    if (billError) {
        throw new Error(`Failed to save bill: ${billError.message}`);
    }

    // Insert bill items
    if (data.items && data.items.length > 0) {
        const itemsData = data.items.map(item => ({
            bill_id: billRecord.id,
            s_no: item.s_no,
            item_code: item.item_code,
            hsn_code: item.hsn_code,
            job_type: item.job_type,
            quantity: item.quantity,
            price: item.price,
            taxable_amount: item.taxable_amount,
            igst_amount: item.igst_amount,
            total_amount: item.total_amount
        }));

        const { error: itemsError } = await supabase
            .from('bill_items')
            .insert(itemsData);

        if (itemsError) {
            throw new Error(`Failed to save bill items: ${itemsError.message}`);
        }
    }

    return billRecord;
}

// UI Helper functions
function updateProgress(percent, text) {
    progressFill.style.width = percent + '%';
    progressText.textContent = text;
}

function showSuccess(data) {
    progressContainer.style.display = 'none';
    resultContainer.style.display = 'block';
    resultMessage.textContent = `Invoice #${data.invoice_number || 'N/A'} processed successfully! Customer: ${data.customer_name || 'N/A'}, Total: ₹${data.grand_total || 0}`;
    resetUploadButton();
}

function showError(message) {
    errorContainer.innerHTML = `<div class="error-message">${message}</div>`;
    setTimeout(() => {
        errorContainer.innerHTML = '';
    }, 30000);
}

function clearError() {
    errorContainer.innerHTML = '';
}

function resetUploadButton() {
    uploadBtn.disabled = false;
    uploadBtnText.textContent = 'Upload & Process';
    uploadSpinner.style.display = 'none';
}
