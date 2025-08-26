const API_BASE_URL = 'http://localhost:5000/api';

// API service functions
export const api = {
  // Upload text input
  uploadText: async (text, docType) => {
    const response = await fetch(`${API_BASE_URL}/upload/text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text, docType }),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response.json();
  },

  // Upload document file
  uploadDocument: async (file, docType) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('docType', docType);

    const response = await fetch(`${API_BASE_URL}/upload/document`, {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response.json();
  },

  // Upload image file
  uploadImage: async (file, docType) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('docType', docType);

    const response = await fetch(`${API_BASE_URL}/upload/image`, {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response.json();
  },

  // Generate document
  generateDocument: async (documentId, docType) => {
    const response = await fetch(`${API_BASE_URL}/documents/${documentId}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ docType }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    
    return response.json();
  },

  // Regenerate document
  regenerateDocument: async (documentId) => {
    try {
      console.log(`[API] Regenerating document ${documentId}`);
      
      const response = await fetch(`${API_BASE_URL}/documents/${documentId}/regenerate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log(`[API] Document regenerated successfully`);
      return data;
    } catch (error) {
      console.error('[API] Regeneration error:', error);
      throw error;
    }
  },

  // Check if backend is available
  checkBackendHealth: async () => {
    try {
      const response = await fetch(`${API_BASE_URL.replace('/api', '')}/health`, {
        method: 'GET',
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }
};

// Helper function to determine file type and upload accordingly
export const uploadFile = async (file, docType) => {
  const fileType = file.type;
  
  if (fileType.startsWith('image/')) {
    return await api.uploadImage(file, docType);
  } else if (fileType.includes('document') || fileType.includes('pdf') || fileType.includes('text')) {
    return await api.uploadDocument(file, docType);
  } else {
    throw new Error('Unsupported file type');
  }
};

// Helper function to get document type from menu selection
export const getDocumentType = (menuItem) => {
  switch (menuItem) {
    case 'Generate BRD':
      return 'BRD';
    case 'Generate FRS':
      return 'FRS';
    case 'Generate SRS':
      return 'SRS';
    case 'Generate User Stories':
      return 'UserStory';
    default:
      return 'BRD';
  }
};

// Export regenerateDocument as a standalone function for easier import
export const regenerateDocument = api.regenerateDocument;