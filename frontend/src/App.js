import React, { useState, useEffect } from 'react';
import rehypeRaw from 'rehype-raw'; 
import Login from './Login';
import { api, uploadFile, getDocumentType, regenerateDocument } from './api';
import ReactMarkdown from "react-markdown";
import htmlDocx from 'html-docx-js/dist/html-docx';
import html2pdf from "html2pdf.js";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [selectedMenu, setSelectedMenu] = useState('Generate BRD');
  const [context, setContext] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState([]);
  //const [reviewComments, setReviewComments] = useState('');
  const [generatedDocument, setGeneratedDocument] = useState('');
  const [isDocumentGenerated, setIsDocumentGenerated] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false); // Add this state
  const [currentDocumentId, setCurrentDocumentId] = useState(null); // Add this state
  const [error, setError] = useState('');
  const [backendStatus, setBackendStatus] = useState('checking');
  const [isEditing, setIsEditing] = useState(false);

  const menuItems = [
    'Generate BRD',
    'Generate FRS', 
    'Generate SRS',
    'Generate User Stories'
  ];

  const downloadAsDocx = () => {
    const element = document.getElementById('generated-document-content');
    if (!element) return;
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8"/>
          <title>Document</title>
        </head>
        <body>
          ${element.innerHTML}
        </body>
      </html>
    `;
    const docxBlob = htmlDocx.asBlob(html);
    const link = document.createElement('a');
    link.href = URL.createObjectURL(docxBlob);
    link.download = 'generated-document.docx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadAsPdf = async () => {
    const element = document.getElementById('generated-document-content');
    if (!element) return;
    
    // Convert all images to base64 to ensure they're included in PDF
    const images = element.querySelectorAll('img');
    const imagePromises = Array.from(images).map(img => {
      return new Promise((resolve) => {
        if (img.src.startsWith('data:')) {
          // Already base64, no conversion needed
          resolve();
          return;
        }
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const image = new Image();
        
        image.crossOrigin = 'anonymous';
        image.onload = () => {
          canvas.width = image.naturalWidth;
          canvas.height = image.naturalHeight;
          ctx.drawImage(image, 0, 0);
          
          try {
            const dataURL = canvas.toDataURL('image/png');
            img.src = dataURL;
          } catch (e) {
            console.warn('Could not convert image to base64:', e);
          }
          resolve();
        };
        
        image.onerror = () => {
          console.warn('Could not load image for PDF:', img.src);
          resolve();
        };
        
        image.src = img.src;
      });
    });
    
    try {
      // Wait for all images to be converted
      await Promise.all(imagePromises);
      
      // Add a small delay to ensure DOM updates
      await new Promise(resolve => setTimeout(resolve, 100));
      
      html2pdf()
        .set({
          margin: 0.5,
          filename: 'generated-document.pdf',
          html2canvas: { 
            scale: 2,
            useCORS: true,
            allowTaint: true,
            scrollX: 0,
            scrollY: 0,
            width: element.scrollWidth,
            height: element.scrollHeight
          },
          jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
        })
        .from(element)
        .save();
    } catch (error) {
      console.error('Error generating PDF:', error);
      // Fallback to original method if conversion fails
      html2pdf()
        .set({
          margin: 0.5,
          filename: 'generated-document.pdf',
          html2canvas: { scale: 2 },
          jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
        })
        .from(element)
        .save();
    }
  };

  const CustomImage = ({ src, alt }) => {
    return (
      <img 
        src={src} 
        alt={alt} 
        style={{ 
          maxWidth: "100%", 
          height: "auto",
          display: "block",
          margin: "10px 0"
        }}
        crossOrigin="anonymous"
        onError={(e) => {
          console.warn('Image failed to load:', src);
          e.target.style.display = 'none';
        }}
      />
    );
  };

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

  const clearAllContent = () => {
    setContext('');
    setUploadedFiles([]);
    //setReviewComments('');
    setGeneratedDocument('');
    setIsDocumentGenerated(false);
    setCurrentDocumentId(null); // Clear document ID
    setError('');
  };

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

      if (context.trim()) {
        const textResult = await api.uploadText(context, docType);
        documentId = textResult._id;
      } else if (uploadedFiles.length > 0) {
        documentId = uploadedFiles[0].backendId;
      } else {
        throw new Error('No content provided for generation');
      }

      const result = await api.generateDocument(documentId, docType);
      
      setGeneratedDocument(result.generatedContent);
      setIsDocumentGenerated(true);
      setCurrentDocumentId(documentId); // Store the document ID for regeneration
      setError('');
    } catch (error) {
      setError(error.message);
      setIsDocumentGenerated(false);
    } finally {
      setIsGenerating(false);
    }
  };

  // Add the regenerate function
  const handleRegenerate = async () => {
    if (!currentDocumentId) {
      setError('No document to regenerate. Please generate a document first.');
      return;
    }

    setIsRegenerating(true);
    setError('');

    try {
      const result = await regenerateDocument(currentDocumentId); // Use the imported function directly
      
      setGeneratedDocument(result.generatedContent);
      setError('');
      
      // Show success message briefly
      const successMessage = 'Document regenerated successfully with new content!';
      setError(''); // Clear any previous errors
      
      // You could also show a success notification here
      console.log('Document regenerated successfully');
      
    } catch (error) {
      setError(`Regeneration failed: ${error.message}`);
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleEditDocument = () => {
    setIsEditing(true);
  };

  const handleSaveDocument = () => {
    setIsEditing(false);
  };

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gray-800 text-white p-4 flex justify-between items-center">
        <div>
          <div className="text-lg font-semibold">Requirement Copilot</div>
          <div className="text-sm text-gray-300">{selectedMenu}</div>
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
        <div className="w-80 bg-white shadow-lg min-h-screen p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Document Generator</h2>
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

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
              {error}
            </div>
          )}

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Context
            </label>
            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Provide context here"
              className="w-full h-32 p-3 border border-gray-300 rounded-lg resize-none text-sm"
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload document with related information
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
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
                className={`inline-block px-3 py-2 rounded border cursor-pointer text-sm ${
                  isUploading 
                    ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                    : 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100'
                }`}
              >
                {isUploading ? 'Uploading...' : 'Browse files'}
              </label>
            </div>
            {uploadedFiles.map((file) => (
              <div key={file.id} className="flex items-center justify-between bg-gray-50 p-2 rounded mt-2">
                <span className="text-xs">{file.name} ({file.size})</span>
                <button
                  onClick={() => removeFile(file.id)}
                  className="text-red-500 hover:text-red-700 text-xs"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={handleGenerate}
            disabled={isGenerating || backendStatus !== 'connected'}
            className={`w-full font-semibold py-3 px-6 rounded-lg ${
              isGenerating || backendStatus !== 'connected'
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-orange-500 hover:bg-orange-600 text-white'
            }`}
          >
            {isGenerating ? 'Generating...' : 'Generate'}
          </button>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6">
          <div className="bg-white rounded-lg shadow-md p-6 h-full">
            {isDocumentGenerated && (
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4 flex justify-between items-center">
                <span>Document generated successfully</span>
                <div className="flex items-center space-x-2">
                  {!isEditing ? (
                    <button
                      onClick={handleEditDocument}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
                    >
                      ✏️ Edit
                    </button>
                  ) : (
                    <button
                      onClick={handleSaveDocument}
                      className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm"
                    >
                      💾 Save
                    </button>
                  )}
                  <button
                  onClick={downloadAsDocx}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded text-sm"
                  title="Download as DOCX"
                >
                  DOCX
                </button>
                <button
                  onClick={downloadAsPdf}
                  className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
                  title="Download as PDF"
                >
                  PDF
                </button>
                </div>
              </div>
            )}
            
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Generated Document</h2>
            
            {isDocumentGenerated ? (
              isEditing ? (
                <textarea
                  value={generatedDocument}
                  onChange={(e) => setGeneratedDocument(e.target.value)}
                  className="w-full h-96 p-4 border border-gray-300 rounded-lg resize-none text-sm font-mono"
                  placeholder="Edit your document here..."
                />
              ) : (
                <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg bg-gray-50">
                  <div id="generated-document-content" className="p-6 bg-white m-1 rounded-lg shadow-sm">
                    <ReactMarkdown
                      rehypePlugins={[rehypeRaw]}
                      components={{
                        // Headings with proper styling
                        h1: ({ children }) => (
                          <h1 className="text-3xl font-bold text-gray-900 mb-6 pb-2 border-b-2 border-gray-200">
                            {children}
                          </h1>
                        ),
                        h2: ({ children }) => (
                          <h2 className="text-2xl font-bold text-gray-800 mb-4 mt-8 pb-1 border-b border-gray-200">
                            {children}
                          </h2>
                        ),
                        h3: ({ children }) => (
                          <h3 className="text-xl font-bold text-gray-700 mb-3 mt-6">
                            {children}
                          </h3>
                        ),
                        h4: ({ children }) => (
                          <h4 className="text-lg font-bold text-gray-700 mb-2 mt-4">
                            {children}
                          </h4>
                        ),
                        h5: ({ children }) => (
                          <h5 className="text-base font-bold text-gray-600 mb-2 mt-3">
                            {children}
                          </h5>
                        ),
                        h6: ({ children }) => (
                          <h6 className="text-sm font-bold text-gray-600 mb-2 mt-3">
                            {children}
                          </h6>
                        ),
                        // Paragraphs with proper spacing
                        p: ({ children }) => (
                          <p className="text-gray-700 mb-4 leading-relaxed">
                            {children}
                          </p>
                        ),
                        // Lists with better styling
                        ul: ({ children }) => (
                          <ul className="list-disc list-inside mb-4 ml-4 space-y-1">
                            {children}
                          </ul>
                        ),
                        ol: ({ children }) => (
                          <ol className="list-decimal list-inside mb-4 ml-4 space-y-1">
                            {children}
                          </ol>
                        ),
                        li: ({ children }) => (
                          <li className="text-gray-700 leading-relaxed">
                            {children}
                          </li>
                        ),
                        // Code blocks
                        code: ({ inline, children }) => (
                          inline ? (
                            <code className="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono text-gray-800">
                              {children}
                            </code>
                          ) : (
                            <code className="block bg-gray-100 p-3 rounded-lg text-sm font-mono text-gray-800 overflow-x-auto mb-4">
                              {children}
                            </code>
                          )
                        ),
                        pre: ({ children }) => (
                          <pre className="bg-gray-100 p-4 rounded-lg mb-4 overflow-x-auto">
                            {children}
                          </pre>
                        ),
                        // Blockquotes
                        blockquote: ({ children }) => (
                          <blockquote className="border-l-4 border-gray-300 pl-4 py-2 mb-4 italic text-gray-600 bg-gray-50 rounded-r-lg">
                            {children}
                          </blockquote>
                        ),
                        // Tables
                        table: ({ children }) => (
                          <div className="overflow-x-auto mb-4">
                            <table className="min-w-full border border-gray-300 rounded-lg">
                              {children}
                            </table>
                          </div>
                        ),
                        thead: ({ children }) => (
                          <thead className="bg-gray-100">
                            {children}
                          </thead>
                        ),
                        th: ({ children }) => (
                          <th className="border border-gray-300 px-4 py-2 text-left font-bold text-gray-700">
                            {children}
                          </th>
                        ),
                        td: ({ children }) => (
                          <td className="border border-gray-300 px-4 py-2 text-gray-700">
                            {children}
                          </td>
                        ),
                        // Images
                        img: ({ node, ...props }) => <CustomImage {...props} />,
                        // Strong and emphasis
                        strong: ({ children }) => (
                          <strong className="font-bold text-gray-900">
                            {children}
                          </strong>
                        ),
                        em: ({ children }) => (
                          <em className="italic text-gray-700">
                            {children}
                          </em>
                        ),
                        // Horizontal rules
                        hr: () => (
                          <hr className="border-t-2 border-gray-200 my-8" />
                        ),
                      }}
                    >
                      {generatedDocument}
                    </ReactMarkdown>
                  </div>
                </div>
              )
            ) : (
              <div className="text-gray-500 text-center py-12">
                {backendStatus !== "connected"
                  ? "Backend not connected. Please start the backend server."
                  : "Generated document will appear here"}
              </div>
            )}

            {/* <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Provide your review comments to regenerate
              </label>
              <textarea
                value={reviewComments}
                onChange={(e) => setReviewComments(e.target.value)}
                placeholder="Enter feedback here"
                className="w-full h-24 p-3 border border-gray-300 rounded-lg resize-none"
              />
            </div> */}

            {/* Updated button section with regenerate button */}
            <div className="mt-4 flex space-x-3">
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">
                Back to Services
              </button>
              
              {/* Regenerate button - only show if document is generated */}
              {isDocumentGenerated && (
                <button
                  onClick={handleRegenerate}
                  disabled={isRegenerating || backendStatus !== 'connected'}
                  className={`px-4 py-2 rounded text-white font-medium ${
                    isRegenerating || backendStatus !== 'connected'
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {isRegenerating ? 'Regenerating...' : 'Regenerate'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;