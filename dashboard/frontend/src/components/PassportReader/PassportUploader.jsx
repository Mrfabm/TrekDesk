import React, { useState } from 'react';

const PassportUploader = ({ onUpload, onExtract }) => {
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploadProgress, setUploadProgress] = useState({});

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setError('');
    
    // Validate each file
    const validFiles = selectedFiles.filter(file => {
      const validTypes = [
        'image/jpeg', 
        'image/png', 
        'image/bmp', 
        'application/pdf',
        'image/tiff',
        'image/gif'
      ];
      
      // Check file type
      if (!validTypes.includes(file.type)) {
        setError(`${file.name}: Please upload a valid image (JPG, PNG, BMP, TIFF, GIF) or PDF file`);
        return false;
      }

      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError(`${file.name}: File size should be less than 10MB`);
        return false;
      }

      return true;
    });

    if (validFiles.length > 0) {
      setFiles(prevFiles => [...prevFiles, ...validFiles]);
      
      // Create previews for images
      validFiles.forEach(file => {
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onloadend = () => {
            setPreviews(prev => [...prev, { name: file.name, url: reader.result }]);
          };
          reader.readAsDataURL(file);
        } else if (file.type === 'application/pdf') {
          // Add a PDF icon preview
          setPreviews(prev => [...prev, { 
            name: file.name, 
            url: '/pdf-icon.png',
            isPdf: true 
          }]);
        }
      });
    }
  };

  const handleUpload = async () => {
    setIsLoading(true);
    setError('');
    const successfulUploads = [];

    try {
        // Upload files
        for (const file of files) {
            const formData = new FormData();
            formData.append('files', file);

            try {
                const response = await fetch('http://localhost:8000/api/passport/upload', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: formData
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.detail || 'Upload failed');
                }

                const uploadResult = await response.json();
                console.log('Upload result:', uploadResult);

                // Add successful uploads to our list
                uploadResult.forEach(result => {
                    if (result.status === 'success') {
                        successfulUploads.push({
                            filename: result.filename,
                            path: result.path
                        });
                        setUploadProgress(prev => ({ 
                            ...prev, 
                            [result.filename]: 'success' 
                        }));
                    } else {
                        setUploadProgress(prev => ({ 
                            ...prev, 
                            [result.filename]: 'error' 
                        }));
                        throw new Error(result.error || 'Upload failed');
                    }
                });

            } catch (e) {
                console.error(`Error uploading ${file.name}:`, e);
                setUploadProgress(prev => ({ 
                    ...prev, 
                    [file.name]: 'error' 
                }));
                throw e;
            }
        }

        // If we have successful uploads, extract data
        if (successfulUploads.length > 0) {
            onUpload(successfulUploads);

            // Extract data from uploaded files
            const extractResponse = await fetch('http://localhost:8000/api/passport/extract', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    file_paths: successfulUploads.map(f => f.path)
                })
            });

            if (!extractResponse.ok) {
                const errorData = await extractResponse.json();
                console.error('Extraction error response:', errorData);
                throw new Error(errorData.detail || 'Data extraction failed');
            }

            const extractedData = await extractResponse.json();
            console.log('Extraction response:', extractedData);
            
            const results = [];

            for (const uploadedFile of successfulUploads) {
                const fileResult = extractedData[uploadedFile.path];
                console.log(`Processing extraction result for ${uploadedFile.filename}:`, fileResult);
                
                if (fileResult) {
                    setUploadProgress(prev => ({ 
                        ...prev, 
                        [uploadedFile.filename]: fileResult.status 
                    }));

                    // Get the data from the response
                    const data = fileResult.data || {};
                    console.log('Extracted data:', data);

                    // Format dates to YYYY-MM-DD
                    const formatDate = (dateStr) => {
                        if (!dateStr) return '';
                        try {
                            const date = new Date(dateStr);
                            return date.toISOString().split('T')[0];
                        } catch (e) {
                            return dateStr;
                        }
                    };

                    results.push({
                        extractedData: {
                            full_name: data.full_name || '',
                            date_of_birth: formatDate(data.date_of_birth) || '',
                            passport_number: data.passport_number || '',
                            passport_expiry: formatDate(data.passport_expiry) || '',
                            nationality: data.nationality || ''
                        },
                        fileName: uploadedFile.filename,
                        status: fileResult.status || 'incomplete',
                        missingFields: fileResult.missing_fields || [],
                        error: fileResult.error
                    });
                }
            }

            // Pass all results to parent
            if (results.length > 0) {
                onExtract(results);
            }
        }

    } catch (error) {
        console.error('Upload/extraction error:', error);
        setError(error.message);
    } finally {
        setIsLoading(false);
    }
  };

  const removeFile = (fileName) => {
    setFiles(files.filter(f => f.name !== fileName));
    setPreviews(previews.filter(p => p.name !== fileName));
    setUploadProgress(prev => {
      const { [fileName]: removed, ...rest } = prev;
      return rest;
    });
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="text-red-500 text-sm">{error}</div>
      )}
      
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
        <label className="block text-center cursor-pointer">
          <input
            type="file"
            className="hidden"
            onChange={handleFileChange}
            accept=".jpg,.jpeg,.png,.bmp,.pdf,.tiff,.gif"
            multiple
          />
          <div className="space-y-2">
            <div className="text-gray-600">
              Click or drag files to upload
            </div>
            <p className="text-xs text-gray-500">
              JPG, PNG, BMP, TIFF, GIF, or PDF up to 10MB each
            </p>
          </div>
        </label>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="mt-4 space-y-2">
          {files.map((file, index) => (
            <div key={file.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                {/* Preview */}
                <div className="w-12 h-12 flex-shrink-0">
                  {previews.find(p => p.name === file.name)?.url && (
                    <img
                      src={previews.find(p => p.name === file.name)?.url}
                      alt={file.name}
                      className="w-full h-full object-cover rounded"
                    />
                  )}
                </div>
                
                {/* File Info */}
                <div>
                  <p className="text-sm font-medium text-gray-900">{file.name}</p>
                  <p className="text-xs text-gray-500">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>

              {/* Status/Remove */}
              <div className="flex items-center space-x-2">
                {uploadProgress[file.name] && (
                  <span className={`text-sm ${
                    uploadProgress[file.name] === 'success' ? 'text-green-500' :
                    uploadProgress[file.name] === 'error' ? 'text-red-500' :
                    'text-blue-500'
                  }`}>
                    {uploadProgress[file.name]}
                  </span>
                )}
                <button
                  onClick={() => removeFile(file.name)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          ))}

          {/* Upload Button */}
          <div className="mt-4">
            <button
              onClick={handleUpload}
              disabled={isLoading || files.length === 0}
              className={`w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white 
                ${isLoading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}
                focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
            >
              {isLoading ? 'Processing...' : 'Process Documents'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PassportUploader; 