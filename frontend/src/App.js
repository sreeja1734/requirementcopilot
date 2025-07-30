import React, { useState, useEffect } from 'react';
import './App.css';
import Login from './Login';
import { api, uploadFile, getDocumentType } from './api';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [selectedMenu, setSelectedMenu] = useState('Generate BRD');
  const [context, setContext] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [reviewComments, setReviewComments] = useState('');
  const [generatedDocument, setGeneratedDocument] = useState('');
  const [isDocumentGenerated, setIsDocumentGenerated] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [backendStatus, setBackendStatus] = useState('checking');

  const menuItems = [
    'Generate BRD',
    'Generate FRS', 
    'Generate SRS',
    'Generate User Stories'
  ];

  // Check backend health on component mount
  useEffect(() => {
    checkBackendHealth();
  }, []);

  const checkBackendHealth = async () => {
    try {
      const isHealthy = await api.checkBackendHealth();
      setBackendStatus(isHealthy ? 'connected' : 'disconnected');
    } catch (error) {
      setBackendStatus('disconnected');
    }
  };

  const handleLogin = (userData) => {
    setUser(userData);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setUser(null);
    setIsAuthenticated(false);
    setSelectedMenu('Generate BRD');
    clearAllContent();
  };

  // Function to clear all content
  const clearAllContent = () => {
    setContext('');
    setUploadedFiles([]);
    setReviewComments('');
    setGeneratedDocument('');
    setIsDocumentGenerated(false);
    setError('');
  };

  // Handle menu selection change
  const handleMenuChange = (newMenu) => {
    if (newMenu !== selectedMenu) {
      setSelectedMenu(newMenu);
      clearAllContent();
    }
  };

  const handleFileUpload = async (event) => {
    const files = Array.from(event.target.files);
    setIsUploading(true);
    setError('');

    try {
      const docType = getDocumentType(selectedMenu);
      const uploadPromises = files.map(async (file) => {
        try {
          const result = await uploadFile(file, docType);
          return {
            name: file.name,
            size: (file.size / 1024).toFixed(1) + 'KB',
            id: result._id,
            backendId: result._id,
            file: file
          };
        } catch (error) {
          throw new Error(`Failed to upload ${file.name}: ${error.message}`);
        }
      });

      const uploadedFileResults = await Promise.all(uploadPromises);
      setUploadedFiles([...uploadedFiles, ...uploadedFileResults]);
    } catch (error) {
      setError(error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const removeFile = (fileId) => {
    setUploadedFiles(uploadedFiles.filter(file => file.id !== fileId));
  };

  const handleGenerate = async () => {
    if (!context.trim() && uploadedFiles.length === 0) {
      setError('Please provide context or upload files before generating');
      return;
    }

    setIsGenerating(true);
    setError('');

    try {
      const docType = getDocumentType(selectedMenu);
      let documentId;

      console.log('Generation Debug:', {
        hasContext: !!context.trim(),
        contextLength: context.trim().length,
        uploadedFilesCount: uploadedFiles.length,
        docType: docType
      });

      // Upload context if provided
      if (context.trim()) {
        console.log('Using text context for generation');
        const textResult = await api.uploadText(context, docType);
        documentId = textResult._id;
        console.log('Text uploaded with ID:', documentId);
      } else if (uploadedFiles.length > 0) {
        // Use the first uploaded file only if no context is provided
        console.log('Using uploaded file for generation');
        documentId = uploadedFiles[0].backendId;
        console.log('Using file ID:', documentId);
      } else {
        throw new Error('No content provided for generation');
      }

      // Generate document
      console.log('Generating document with ID:', documentId);
      const result = await api.generateDocument(documentId, docType);
      
      setGeneratedDocument(result.generatedContent);
      setIsDocumentGenerated(true);
      setError('');
      console.log('Document generated successfully');
    } catch (error) {
      console.error('Generation error:', error);
      setError(error.message);
      setIsDocumentGenerated(false);
    } finally {
      setIsGenerating(false);
    }
  };

  // Show login page if not authenticated
  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gray-800 text-white p-4 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <div>
            <div className="text-lg font-semibold">Requirement Copilot</div>
            <div className="text-sm text-gray-300">{selectedMenu}</div>
          </div>
        </div>
        <div className="text-center">
          <div className="text-lg">Welcome {user?.name || 'User'}</div>
          <div className="text-xs text-gray-300">
            Backend: {backendStatus === 'connected' ? '🟢 Connected' : '🔴 Disconnected'}
          </div>
        </div>
        <button 
          onClick={handleLogout}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
        >
          Logout
        </button>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <div className="w-80 bg-white shadow-lg min-h-screen">
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-6">Document Generator</h2>
            
            {/* Navigation Menu */}
            <nav className="mb-8">
              {menuItems.map((item) => (
                <div
                  key={item}
                  className={`mb-2 cursor-pointer p-3 rounded-lg transition-colors ${
                    selectedMenu === item
                      ? 'bg-gray-100 border-l-4 border-blue-500 text-blue-600'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                  onClick={() => handleMenuChange(item)}
                >
                  {item}
                </div>
              ))}
            </nav>

            {/* Error Display */}
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
                {error}
              </div>
            )}

            {/* Context Input */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Context
              </label>
              <textarea
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder="Provide context here"
                className="w-full h-32 p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>

            {/* File Upload */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload document with related information
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                <div className="text-gray-500 mb-2 text-sm">Drag and drop file here</div>
                <div className="text-xs text-gray-400 mb-3">
                  Limit 200MB per file • TXT, DOCX, PDF, PNG, JPG, JPEG
                </div>
                <input
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                  accept=".txt,.docx,.pdf,.png,.jpg,.jpeg"
                  disabled={isUploading}
                />
                <label
                  htmlFor="file-upload"
                  className={`inline-block px-3 py-2 rounded border cursor-pointer transition-colors text-sm ${
                    isUploading 
                      ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                      : 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100'
                  }`}
                >
                  {isUploading ? 'Uploading...' : 'Browse files'}
                </label>
              </div>
              
              {/* Uploaded Files */}
              {uploadedFiles.map((file) => (
                <div key={file.id} className="flex items-center justify-between bg-gray-50 p-2 rounded mt-2">
                  <div className="flex items-center">
                    <span className="text-gray-600 mr-2">📄</span>
                    <span className="text-xs">{file.name}</span>
                    <span className="text-xs text-gray-400 ml-2">{file.size}</span>
                  </div>
                  <button
                    onClick={() => removeFile(file.id)}
                    className="text-red-500 hover:text-red-700 text-xs"
                    disabled={isUploading}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={isGenerating || backendStatus !== 'connected'}
              className={`w-full font-semibold py-3 px-6 rounded-lg transition-colors ${
                isGenerating || backendStatus !== 'connected'
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-orange-500 hover:bg-orange-600 text-white'
              }`}
            >
              {isGenerating ? 'Generating...' : 'Generate'}
            </button>
          </div>
        </div>

        {/* Main Content - Document Display */}
        <div className="flex-1 p-6">
          <div className="bg-white rounded-lg shadow-md p-6 h-full">
            {isDocumentGenerated && (
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
                Document generated successfully
              </div>
            )}
            
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Generated Document</h2>
            
            {isDocumentGenerated ? (
              <div className="custom-scrollbar max-h-96 overflow-y-auto">
                <pre className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed">
                  {generatedDocument}
                </pre>
              </div>
            ) : (
              <div className="text-gray-500 text-center py-12">
                {backendStatus !== 'connected' 
                  ? 'Backend not connected. Please start the backend server.'
                  : 'Generated document will appear here'
                }
              </div>
            )}

            {/* Review Comments */}
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Provide your review comments to regenerate
              </label>
              <textarea
                value={reviewComments}
                onChange={(e) => setReviewComments(e.target.value)}
                placeholder="Enter feedback here"
                className="w-full h-24 p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <button className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded border border-blue-500">
              Back to Services
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
