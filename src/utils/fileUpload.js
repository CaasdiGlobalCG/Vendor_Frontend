import config from '../config/env';

/**
 * Upload a file to S3 via the backend API
 * @param {File} file - The file to upload
 * @param {string} email - The vendor's email
 * @param {string} documentType - The type of document (e.g., 'uploadDocument', 'isoCertificate')
 * @param {string} section - The section the document belongs to (e.g., 'complianceCertifications')
 * @returns {Promise<Object>} - The response from the server
 */
export const uploadFileToS3 = async (file, email, documentType, section) => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('email', email);
    formData.append('documentType', documentType);
    formData.append('section', section);

    console.log('Uploading file:', {
      fileName: file.name,
      email,
      documentType,
      section
    });
    
    // Use the full URL with the backend server port
    const response = await fetch(`/api/files/upload`, {
      method: 'POST',
      body: formData,
      credentials: 'include'
    });

    if (!response.ok) {
      let errorMessage = 'Error uploading file';
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch (e) {
        // If response is not JSON, use status text
        errorMessage = `Error uploading file: ${response.status} ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    return await response.json();
  } catch (error) {
    console.error('Error uploading file:', error);
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
    // Use the full URL with the backend server port
    const response = await fetch(`/api/files/delete`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
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