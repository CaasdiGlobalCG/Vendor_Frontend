import config from '../config/env';
import authFetch from './authFetch';

/**
 * Upload a file to S3 via the backend API
 * @param {File} file - The file to upload
 * @param {string} email - The vendor's email
 * @param {string} documentType - The type of document (e.g., 'uploadDocument', 'isoCertificate')
 * @param {string} section - The section the document belongs to (e.g., 'complianceCertifications')
 * @returns {Promise<Object>} - The response from the server
 */
export const uploadFileToS3 = async (file, email, documentType, section) => {
  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), 60000); // 60 second timeout

  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('email', email);
    formData.append('documentType', documentType);
    formData.append('section', section);

    console.log('[FILE_UPLOAD_START]', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      email,
      documentType,
      section,
      timestamp: new Date().toISOString()
    });
    
    // Get auth token from localStorage if available
    const token = localStorage.getItem('authToken');
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Build URL with query parameters for debugging
    const uploadUrl = new URL('/api/files/upload', window.location.origin);
    uploadUrl.searchParams.append('email', email);
    uploadUrl.searchParams.append('documentType', documentType);
    uploadUrl.searchParams.append('section', section);

    console.log('[FETCH_REQUEST_STARTING]', {
      url: uploadUrl.toString(),
      method: 'POST',
      hasAuth: !!token,
      headers: headers
    });
    
    const response = await authFetch(uploadUrl.toString(), {
      method: 'POST',
      body: formData,
      credentials: 'include',
      headers: headers,
      signal: abortController.signal
    });

    clearTimeout(timeout);

    console.log('[FETCH_RESPONSE_RECEIVED]', {
      status: response.status,
      statusText: response.statusText,
      headers: {
        contentType: response.headers.get('content-type')
      }
    });

    if (!response.ok) {
      let errorMessage = 'Error uploading file';
      try {
        const errorText = await response.text();
        console.error('[UPLOAD_ERROR_RESPONSE]', errorText);
        
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorMessage;
        } catch (parseError) {
          errorMessage = `Error uploading file: ${response.status} ${response.statusText} - ${errorText}`;
        }
      } catch (e) {
        errorMessage = `Error uploading file: ${response.status} ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    const responseData = await response.json();
    console.log('[UPLOAD_SUCCESS_RESPONSE]', responseData);
    
    // Verify the response structure
    if (!responseData.success) {
      throw new Error(responseData.message || 'Upload returned success: false');
    }

    console.log('[FILE_UPLOAD_COMPLETE]', {
      url: responseData.data?.url,
      documentType: responseData.data?.documentType
    });

    return responseData;
  } catch (error) {
    clearTimeout(timeout);
    
    if (error.name === 'AbortError') {
      console.error('[UPLOAD_TIMEOUT]', 'Upload request timed out after 60 seconds');
      throw new Error('Upload request timed out. Please check your connection and try again.');
    }
    
    console.error('[FILE_UPLOAD_ERROR]', {
      message: error.message,
      name: error.name,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
};

/**
 * Delete a file from S3 via the backend API
 * @param {string} email - The vendor's email
 * @param {string} documentType - The type of document (e.g., 'uploadDocument', 'isoCertificate')
 * @param {string} section - The section the document belongs to (e.g., 'complianceCertifications')
 * @returns {Promise<Object>} - The response from the server
 */
export const deleteFileFromS3 = async (email, documentType, section) => {
  try {
    // Get auth token from localStorage if available
    const token = localStorage.getItem('authToken');
    const headers = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Use the full URL with the backend server port
    const response = await authFetch(`/api/files/delete`, {
      method: 'DELETE',
      headers: headers,
      body: JSON.stringify({
        email,
        documentType,
        section,
      }),
      credentials: 'include'
    });

    if (!response.ok) {
      let errorMessage = 'Error deleting file';
      try {
        const errorData = await response.json();
        console.error('Delete error response:', errorData);
        errorMessage = errorData.message || errorMessage;
      } catch (e) {
        // If response is not JSON, use status text
        errorMessage = `Error deleting file: ${response.status} ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    return await response.json();
  } catch (error) {
    console.error('Error deleting file:', error);
    throw error;
  }
};