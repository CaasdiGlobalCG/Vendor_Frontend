/**
 * AWS Textract OCR service client
 * Communicates with backend to process cheque images
 */

import axios from 'axios';
import { parseChequeData } from './chequeParser';

/**
 * Process cheque image using AWS Textract
 * @param {File} imageFile - The cheque image file
 * @param {string} userEmail - User email for tracking
 * @returns {Promise} - Result with extracted account details
 */
export const processChequeOCR = async (imageFile, userEmail) => {
  try {
    // Validate file
    if (!imageFile) {
      throw new Error('No file provided');
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/tiff'];
    if (!validTypes.includes(imageFile.type)) {
      throw new Error('Invalid file type. Please upload JPG, PNG, WebP, or TIFF image.');
    }

    // Validate file size (max 5MB for Textract)
    if (imageFile.size > 5 * 1024 * 1024) {
      throw new Error('File size too large. Maximum 5MB allowed.');
    }

    // Prepare form data
    const formData = new FormData();
    formData.append('file', imageFile);
    formData.append('userEmail', userEmail);

    // Call backend OCR endpoint using relative path
    // This will work on both localhost and staging domains
    const response = await axios.post(`/api/ocr/process-cheque`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      timeout: 30000 // 30 second timeout
    });

    // Parse response
    if (response.data.success && response.data.textractData) {
      const parsedData = parseChequeData(response.data.textractData.Blocks || []);
      
      return {
        success: true,
        data: parsedData,
        rawTextractResponse: response.data.textractData,
        processedAt: new Date().toISOString()
      };
    } else {
      throw new Error(response.data.error || 'Failed to process image');
    }
  } catch (error) {
    console.error('OCR Processing Error:', error);
    
    // Handle specific error types
    let errorMessage = 'Failed to process cheque image';
    
    if (error.response?.status === 400) {
      errorMessage = error.response.data.error || 'Invalid file or parameters';
    } else if (error.response?.status === 401) {
      errorMessage = 'Authentication failed. Please log in again.';
    } else if (error.response?.status === 500) {
      errorMessage = 'Server error. Please try again later.';
    } else if (error.code === 'ECONNABORTED') {
      errorMessage = 'Processing timeout. Image may be too large or connection slow.';
    } else if (error.message) {
      errorMessage = error.message;
    }

    return {
      success: false,
      error: errorMessage,
      details: error.response?.data?.details || null
    };
  }
};

/**
 * Validate AWS Textract service availability
 * @returns {Promise<boolean>}
 */
export const checkOCRServiceAvailability = async () => {
  try {
    const response = await axios.get(`/api/ocr/health`, {
      timeout: 5000
    });
    return response.data.available === true;
  } catch (error) {
    console.warn('OCR service unavailable:', error.message);
    return false;
  }
};
