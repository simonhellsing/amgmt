import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabase';
import Layout from '../../components/Layout';
import Button from '../../components/Button';
import AuthWrapper from '../../components/AuthWrapper';
import FilePreviewModal from '../../components/FilePreviewModal';
import Spinner from '../../components/Spinner';
import IconButton from '../../components/IconButton';
import { Check, CheckCircle, CircleCheck, CircleDashed, Circle, Upload, Loader2, X, Trash2, RotateCcw, Download, Folder } from 'lucide-react';
import ToastContainer from '../../components/Toast';
import { useToast } from '../../lib/useToast';

interface Folder {
  id: string;
  name: string;
  description?: string | null;
  artist_id: string;
  artist: {
    name: string;
  };
}

interface FolderFile {
  id: string;
  name: string;
  file_type: string;
  file_size: number;
  file_url: string;
  created_at: string;
  status?: string;
}

export default function FolderDetailPage() {
  const router = useRouter();
  const { id } = router.query;

  const [folder, setFolder] = useState<Folder | null>(null);
  const [files, setFiles] = useState<FolderFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewFile, setPreviewFile] = useState<FolderFile | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [isClosingModal, setIsClosingModal] = useState(false);
  const [markingFinal, setMarkingFinal] = useState<string | null>(null);
  const [markingAllFinal, setMarkingAllFinal] = useState(false);
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploadingFromDrop, setIsUploadingFromDrop] = useState(false);

  const [newlyUploadedFiles, setNewlyUploadedFiles] = useState<Set<string>>(new Set());
  const [isAddingNewFile, setIsAddingNewFile] = useState(false);
  const [showToolbar, setShowToolbar] = useState(false);
  const [isCompletingAction, setIsCompletingAction] = useState(false);
  const [frozenStatusInfo, setFrozenStatusInfo] = useState<any>(null);
  const [keepToolbarStable, setKeepToolbarStable] = useState(false);
  const [frozenSelectedCount, setFrozenSelectedCount] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [imageLoadStates, setImageLoadStates] = useState<{ [key: string]: 'loading' | 'loaded' | 'error' }>({});
  const processedImages = useRef<Set<string>>(new Set());
  const { toasts, removeToast, success, error } = useToast();

  useEffect(() => {
    if (!id) return;

    const fetchFolder = async () => {
      // Fetch folder details with artist info
      const { data: folderData, error: folderError } = await supabase
        .from('folders')
        .select(`
          *,
          artist:artists(name)
        `)
        .eq('id', id)
        .single();

      if (folderError) {
        console.error('Error fetching folder:', folderError);
        setLoading(false);
        return;
      }

      setFolder(folderData);

      // Fetch files for this folder
      const { data: filesData, error: filesError } = await supabase
        .from('folder_files')
        .select(`
          file:deliverable_files(
            id,
            name,
            file_type,
            file_size,
            file_url,
            created_at,
            status
          )
        `)
        .eq('folder_id', id)
        .order('created_at', { ascending: false });

      if (filesError) {
        console.error('Error fetching files:', filesError);
        setFiles([]);
        setImageLoadStates({});
        processedImages.current.clear();
      } else {
        const folderFiles = (filesData || []).map((item: any) => item.file);
        console.log('Loaded files:', folderFiles);
        setFiles(folderFiles);
        
        // Initialize image load states for all image files
        const imageFiles = folderFiles.filter((file: any) => file.file_type.startsWith('image/'));
        if (imageFiles.length > 0) {
          console.log('Initializing image load states for:', imageFiles.map((f: any) => f.id));
          processedImages.current.clear(); // Clear processed images for fresh start
          const initialStates: { [key: string]: 'loading' | 'loaded' | 'error' } = {};
          imageFiles.forEach((file: any) => {
            initialStates[file.id] = 'loading';
          });
          setImageLoadStates(initialStates);
          
          // Fallback: if images don't trigger events within 3 seconds, mark them as loaded
          setTimeout(() => {
            setImageLoadStates(prev => {
              const newStates = { ...prev };
              imageFiles.forEach((file: any) => {
                if (newStates[file.id] === 'loading') {
                  console.log('Fallback: marking image as loaded:', file.id);
                  newStates[file.id] = 'loaded';
                  processedImages.current.add(file.id);
                }
              });
              return newStates;
            });
          }, 3000);
        }
      }

      setLoading(false);
    };

    fetchFolder();
  }, [id]);

  // Handle URL file parameter to auto-open file
  useEffect(() => {
    if (!router.isReady || files.length === 0 || isClosingModal) return;
    
    const fileId = router.query.file as string;
    if (fileId && !showPreview) {
      const targetFile = files.find(f => f.id === fileId);
      if (targetFile) {
        setPreviewFile(targetFile);
        setShowPreview(true);
      }
    }
  }, [router.isReady, router.query.file, files, showPreview, isClosingModal]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    console.log('handleFileSelect called with', selected.length, 'files');
    if (selected.length === 0) return;
    
    setSelectedFiles(selected);
    
    // Trigger upload immediately
    try {
      console.log('Starting upload for', selected.length, 'files');
      await handleFileUpload(selected);
      console.log('Upload completed successfully');
    } catch (error) {
      console.error('Error uploading files:', error);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length === 0) return;
    
    console.log('Setting isUploadingFromDrop to true');
    setIsUploadingFromDrop(true);
    setSelectedFiles(droppedFiles);
    
    // Trigger upload immediately
    try {
      console.log('Starting file upload...');
      await handleFileUpload(droppedFiles);
      console.log('File upload completed');
    } catch (error) {
      console.error('Error uploading files:', error);
    } finally {
      // Add a small delay to show the spinner
      console.log('Setting timeout to hide overlay');
      setTimeout(() => {
        console.log('Setting isUploadingFromDrop to false');
        setIsUploadingFromDrop(false);
      }, 1000);
    }
  };

  const handleImageLoad = (fileId: string) => {
    console.log('Image loaded successfully:', fileId);
    processedImages.current.add(fileId);
    setImageLoadStates(prev => ({
      ...prev,
      [fileId]: 'loaded'
    }));
  };

  const handleImageError = (fileId: string) => {
    console.log('Image failed to load:', fileId);
    processedImages.current.add(fileId);
    setImageLoadStates(prev => ({
      ...prev,
      [fileId]: 'error'
    }));
  };

  const handleImageStartLoad = (fileId: string) => {
    console.log('Image start loading:', fileId);
    // Only set to loading if we haven't already processed this image
    if (!processedImages.current.has(fileId)) {
      setImageLoadStates(prev => ({
        ...prev,
        [fileId]: 'loading'
      }));
    }
  };

  const handleFileUpload = async (filesToUpload?: File[]) => {
    const files = filesToUpload || selectedFiles;
    console.log('handleFileUpload called with', files.length, 'files');
    console.log('Folder:', folder?.id);
    if (files.length === 0 || !folder) {
      console.log('Early return - no files or no folder');
      return;
    }

    setUploading(true);
    const uploadedFiles: string[] = [];
    const failedFiles: string[] = [];

    try {
      for (const file of files) {
        // Upload file to Supabase Storage - use deliverable-files bucket for now
        const fileName = `${Date.now()}-${file.name}`;
        const filePath = `folder-files/${folder.id}/${fileName}`;
        const bucketName = 'deliverable-files';
        let publicUrl = '';

        console.log('Attempting to upload file:', {
          fileName,
          filePath,
          fileSize: file.size,
          fileType: file.type,
          bucket: bucketName
        });

        const { error: uploadError } = await supabase.storage
          .from(bucketName)
          .upload(filePath, file);

        if (uploadError) {
          console.error('Error uploading file:', uploadError);
          console.error('Upload error details:', {
            message: uploadError.message,
            error: uploadError
          });
          failedFiles.push(file.name);
          continue;
        }

        // Get public URL
        const { data: { publicUrl: url } } = supabase.storage
          .from(bucketName)
          .getPublicUrl(filePath);
        
        publicUrl = url;

        // Create file record in database
        const { data: insertedFile, error: dbError } = await supabase
          .from('deliverable_files')
          .insert({
            name: file.name,
            file_type: file.type || 'unknown',
            file_size: file.size,
            file_url: publicUrl,
            status: 'in_progress'
          })
          .select()
          .single();

        if (dbError) {
          console.error('Error creating file record:', dbError);
          failedFiles.push(file.name);
        } else if (insertedFile) {
          uploadedFiles.push(file.name);
          
          // Link file to folder
          const { error: linkError } = await supabase
            .from('folder_files')
            .insert({
              folder_id: folder.id,
              file_id: insertedFile.id
            });

          if (linkError) {
            console.error('Error linking file to folder:', linkError);
            failedFiles.push(file.name);
          } else {
            // Add to newly uploaded files set for immediate display
            setNewlyUploadedFiles(prev => new Set([...prev, insertedFile.id]));
            setIsAddingNewFile(true);
            // Set loading state for image files
            if (insertedFile.file_type.startsWith('image/')) {
              setImageLoadStates(prev => ({
                ...prev,
                [insertedFile.id]: 'loading'
              }));
            }
          }
        }
      }

      // Refresh files list
      const { data: filesData, error: filesError } = await supabase
        .from('folder_files')
        .select(`
          file:deliverable_files(
            id,
            name,
            file_type,
            file_size,
            file_url,
            created_at,
            status
          )
        `)
        .eq('folder_id', folder.id)
        .order('created_at', { ascending: false });

      if (!filesError && filesData) {
        console.log('Files refreshed after upload:', filesData.length, 'files');
        const folderFiles = filesData.map((item: any) => item.file);
        setFiles(folderFiles);
        
        // Initialize image load states for any new image files
        const imageFiles = folderFiles.filter((file: any) => file.file_type.startsWith('image/'));
        if (imageFiles.length > 0) {
          const newImageFiles = imageFiles.filter((file: any) => !imageLoadStates[file.id]);
          if (newImageFiles.length > 0) {
            setImageLoadStates(prev => {
              const newStates = { ...prev };
              newImageFiles.forEach((file: any) => {
                newStates[file.id] = 'loading';
              });
              return newStates;
            });
            
            // Fallback for new images
            setTimeout(() => {
              setImageLoadStates(prev => {
                const newStates = { ...prev };
                newImageFiles.forEach((file: any) => {
                  if (newStates[file.id] === 'loading') {
                    console.log('Fallback: marking new image as loaded:', file.id);
                    newStates[file.id] = 'loaded';
                    processedImages.current.add(file.id);
                  }
                });
                return newStates;
              });
            }, 3000);
          }
        }
      }

      setSelectedFiles([]);
      
      // Show toast notifications
      if (uploadedFiles.length > 0) {
        if (uploadedFiles.length === 1) {
          success(
            `"${uploadedFiles[0]}" has been uploaded`,
            undefined,
            <Upload className="w-5 h-5 text-green-400" />
          );
        } else {
          success(
            `${uploadedFiles.length} files have been uploaded`,
            undefined,
            <Upload className="w-5 h-5 text-green-400" />
          );
        }
      }

      if (failedFiles.length > 0) {
        error(
          `Failed to upload ${failedFiles.length} file${failedFiles.length > 1 ? 's' : ''}`,
          undefined,
          <X className="w-5 h-5 text-red-400" />
        );
      }
    } catch (err) {
      console.error('Error uploading files:', err);
      error('Failed to upload files');
    } finally {
      setUploading(false);
      setIsAddingNewFile(false);
      // Clear newly uploaded files after a delay
      setTimeout(() => {
        setNewlyUploadedFiles(new Set());
      }, 2000);
    }
  };

  const handleFileSelection = (fileId: string) => {
    console.log('Toggling file selection:', fileId);
    setSelectedFileIds(prev => {
      const newSelection = prev.includes(fileId) 
        ? prev.filter(id => id !== fileId)
        : [...prev, fileId];
      console.log('New selection:', newSelection);
      
      if (prev.length > 0 && newSelection.length === 0) {
        // Latch current button status and count before hiding toolbar
        setFrozenSelectedCount(prev.length);
        setKeepToolbarStable(true);
        setShowToolbar(false);
        setTimeout(() => {
          setKeepToolbarStable(false);
          setFrozenSelectedCount(null);
        }, 200);
      } else {
        // Show/hide toolbar based on selection
        setShowToolbar(newSelection.length > 0);
        // Reset frozen when user reselects
        if (newSelection.length > 0) {
          setFrozenSelectedCount(null);
          setKeepToolbarStable(false);
        }
      }
      
      return newSelection;
    });
  };

  const handleFileClick = (file: FolderFile) => {
    setPreviewFile(file);
    setShowPreview(true);
  };

  const handleFileUpdate = () => {
    // Refresh files list when a file is updated
    if (folder) {
      window.location.reload();
    }
  };

  const getCurrentFileIndex = () => {
    if (!previewFile || !files.length) return 0;
    return files.findIndex(f => f.id === previewFile.id);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getFileTypeDisplay = (fileType: string) => {
    if (fileType.startsWith('image/')) return 'Image';
    if (fileType.startsWith('video/')) return 'Video';
    if (fileType.startsWith('audio/')) return 'Audio';
    if (fileType.includes('pdf')) return 'PDF';
    if (fileType.includes('zip') || fileType.includes('rar')) return 'Archive';
    return 'File';
  };

  if (loading) {
    return (
      <AuthWrapper>
        <Layout>
          <div className="text-white">
            <div className="mb-6">
              <h1 className="text-2xl font-bold">Folder</h1>
            </div>
            <div className="flex items-center justify-center py-12">
              <Spinner size="lg" />
            </div>
          </div>
        </Layout>
      </AuthWrapper>
    );
  }

  if (!folder) {
    return (
      <AuthWrapper>
        <Layout>
          <div className="p-6 text-red-500">Folder not found.</div>
        </Layout>
      </AuthWrapper>
    );
  }

  return (
    <AuthWrapper>
      <Layout>
        <div className="text-white">
          {/* Files Section */}
          <div className="bg-gray-700 p-6 rounded-lg shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2.5">
                <Folder className="w-4 h-4 text-blue-400 flex-shrink-0" />
                <span className="text-white text-xl font-semibold">{folder.name}</span>
              </div>

              <div className="flex items-center gap-3">
                {files.length > 0 && (() => {
                  // Calculate total file size
                  const totalSize = files.reduce((sum, file) => sum + file.file_size, 0);
                  const formatSize = (bytes: number) => {
                    if (bytes === 0) return '0 B';
                    const k = 1024;
                    const sizes = ['B', 'KB', 'MB', 'GB'];
                    const i = Math.floor(Math.log(bytes) / Math.log(k));
                    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
                  };

                  return (
                    <span className="text-sm text-gray-300">
                      {files.length} file{files.length > 1 ? 's' : ''} · {formatSize(totalSize)}
                    </span>
                  );
                })()}
                <div className="flex items-center gap-2 ml-auto">
                  <input
                    type="file"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                    id="file-upload"
                  />
                  <Button
                    variant="primary"
                    size="sm"
                    className="flex items-center gap-2"
                    onClick={() => document.getElementById('file-upload')?.click()}
                    disabled={uploading}
                  >
                    {uploading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    Upload Files
                  </Button>
                </div>
              </div>
            </div>

            {files.length === 0 ? (
              <div 
                className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                  isDragOver 
                    ? 'border-blue-400 bg-blue-400 bg-opacity-10' 
                    : 'border-gray-600 hover:border-gray-500'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <Upload className="w-8 h-8 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-300 text-lg font-medium mb-1">Drop files here</p>
                <p className="text-gray-400 text-sm mb-4">
                  or{' '}
                  <button 
                    className="text-white underline hover:text-gray-300 transition-colors"
                    onClick={() => document.getElementById('file-upload')?.click()}
                  >
                    browse files
                  </button>
                  {' '}to upload
                </p>
              </div>
            ) : (
              <div 
                className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6 p-4 rounded-lg relative"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                {(isDragOver || isUploadingFromDrop) && (
                  <div className={`absolute inset-0 bg-gray-700/90 backdrop-blur-md rounded-lg z-50 flex flex-col items-center justify-center transition-all duration-500 border border-dashed border-white/30 ${
                    isUploadingFromDrop ? 'opacity-90' : 'opacity-100'
                  }`}>
                    <div className={`bg-white rounded-full p-3 shadow-md transition-all duration-500 ${
                      isUploadingFromDrop ? 'animate-bounce translate-y-4' : 'animate-bounce'
                    }`} style={{ backgroundColor: 'white' }}>
                      {isUploadingFromDrop ? (
                        <Loader2 className="w-5 h-5 text-gray-800 animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4 text-gray-700" />
                      )}
                    </div>
                    <p className={`text-white text-base font-normal mt-2 drop-shadow-lg transition-all duration-300 ${
                      isUploadingFromDrop ? 'opacity-0 translate-y-4' : 'opacity-100'
                    }`}>
                      Drop to upload
                    </p>
                  </div>
                )}
                {files.map((file, index) => (
                  <div 
                    key={file.id} 
                    className={`relative transition-all duration-600 ease-out`}
                    style={{
                      opacity: newlyUploadedFiles.has(file.id) ? '0.3' : '1'
                    }}
                  >
                    <div 
                      className="rounded-lg overflow-hidden cursor-pointer group relative transition-all duration-100 ease-out"
                      onClick={() => handleFileClick(file)}
                    >
                      <div className="aspect-square bg-gray-600 group-hover:bg-gray-500 flex items-center justify-center relative rounded-lg p-3 transition-colors duration-150">
                        {selectedFileIds.includes(file.id) && (
                          <div className="absolute inset-0 border-2 rounded-lg pointer-events-none" style={{ borderColor: '#0371DF' }}></div>
                        )}
                        
                        {/* Selection checkbox */}
                        <div 
                          className="absolute top-2 right-2 cursor-pointer transition-all z-10"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleFileSelection(file.id);
                          }}
                        >
                          {selectedFileIds.includes(file.id) ? (
                            <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ backgroundColor: '#0371DF' }}>
                              <Check className="w-3 h-3 text-white" />
                            </div>
                          ) : (
                            <div className="w-5 h-5 bg-gray-700 border border-gray-400 hover:border-gray-300 rounded-md transition-colors"></div>
                          )}
                        </div>
                        {file.file_type.startsWith('image/') ? (
                          <div className="w-full h-full flex items-center justify-center relative">
                            {(imageLoadStates[file.id] === 'loading' || imageLoadStates[file.id] === undefined) && (
                              <div className="absolute inset-0 flex items-center justify-center group-hover:bg-gray-500 bg-gray-600 rounded-lg transition-colors duration-150">
                                <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
                              </div>
                            )}
                            <img
                              src={file.file_url}
                              alt={file.name}
                              className={`max-w-full max-h-full object-contain transition-opacity duration-300 ${
                                imageLoadStates[file.id] === 'loaded' ? 'opacity-100' : 'opacity-0'
                              }`}
                              onLoad={() => handleImageLoad(file.id)}
                              onError={() => handleImageError(file.id)}
                              onLoadStart={() => handleImageStartLoad(file.id)}
                            />
                          </div>
                        ) : (
                          <div className="text-center">
                            <div className="text-3xl mb-2">
                              {file.file_type.includes('pdf') ? '📄' : 
                               file.file_type.includes('video') ? '🎥' : 
                               file.file_type.includes('audio') ? '🎵' : 
                               file.file_type.includes('zip') || file.file_type.includes('rar') ? '📦' : '📄'}
                            </div>
                            <div className="text-xs text-gray-300 font-medium">
                              {getFileTypeDisplay(file.file_type)}
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="p-3">
                        <h3 className="font-medium text-sm mb-1 truncate text-white">{file.name}</h3>
                        <p className="text-xs text-gray-400">
                          {getFileTypeDisplay(file.file_type)} • {formatFileSize(file.file_size)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* File Preview Modal */}
          <FilePreviewModal
            isOpen={showPreview}
            onClose={() => setShowPreview(false)}
            file={previewFile}
            releaseName={folder.name}
            deliverableName="Folder"
            artistName={folder.artist.name}
            coverUrl=""
            onFileUpdate={handleFileUpdate}
            allFiles={files}
            currentFileIndex={getCurrentFileIndex()}
            onFileChange={(newIndex: number) => {
              if (newIndex >= 0 && newIndex < files.length) {
                setPreviewFile(files[newIndex]);
              }
            }}
          />

          {/* Selection Toolbar */}
          <div className={`fixed left-0 right-0 z-50 flex justify-center transition-all duration-200 ease-out ${
            showToolbar ? 'bottom-6 opacity-100' : 'bottom-0 opacity-0 pointer-events-none'
          }`}>
            <div className="bg-gray-800 border border-gray-700 rounded-lg px-6 py-4 flex items-center gap-2 shadow-lg">
                {/* Close button */}
                <button
                  onClick={() => {
                    // Latch current toolbar snapshot so content persists during fade-out
                    setFrozenSelectedCount(selectedFileIds.length);
                    setKeepToolbarStable(true);
                    // Immediately clear selection so checkboxes/borders update right away
                    setSelectedFileIds([]);
                    // Trigger close after snapshot so toolbar fades with stable content
                    setShowToolbar(false);
                    setTimeout(() => {
                      // After fade, reset latches
                      setKeepToolbarStable(false);
                      setFrozenSelectedCount(null);
                    }, 200);
                  }}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>

                {/* Counter */}
                <span className="text-white text-sm font-medium mr-4">
                  {(frozenSelectedCount !== null ? frozenSelectedCount : selectedFileIds.length)} selected
                </span>

                {/* Select all button */}
                <button
                  onClick={() => {
                    const allSelected = selectedFileIds.length === files.length;
                    if (allSelected) {
                      // Deselect all
                      setSelectedFileIds([]);
                      setShowToolbar(false);
                    } else {
                      // Select all files
                      const allFileIds = files.map(file => file.id);
                      setSelectedFileIds(allFileIds);
                      setShowToolbar(true);
                    }
                  }}
                  className="flex items-center gap-2 text-white text-sm font-medium hover:text-gray-300 transition-colors mr-4"
                >
                  <div className="flex items-center">
                    {(() => {
                      const allSelected = selectedFileIds.length === files.length;
                      const someSelected = selectedFileIds.length > 0;
                      
                      if (allSelected) {
                        return (
                          <div className="w-4 h-4 rounded flex items-center justify-center" style={{ backgroundColor: '#0371DF' }}>
                            <Check className="w-2.5 h-2.5 text-white" />
                          </div>
                        );
                      } else if (someSelected) {
                        return (
                          <div className="w-4 h-4 rounded flex items-center justify-center" style={{ backgroundColor: '#0371DF' }}>
                            <div className="w-1.5 h-0.5 bg-white rounded"></div>
                          </div>
                        );
                      } else {
                        return (
                          <div className="w-4 h-4 bg-gray-700 border border-gray-400 hover:border-gray-300 rounded transition-colors"></div>
                        );
                      }
                    })()}
                  </div>
                  Select all
                </button>

                <div className="h-4 w-px bg-gray-600 mr-4"></div>

                {/* Action buttons - left side */}
                <div className="relative">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setShowDeleteConfirm(true);
                    }}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>

                  {/* Delete confirmation tooltip */}
                  {showDeleteConfirm && (
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 bg-gray-800 border border-gray-600 rounded-lg p-3 shadow-lg z-50">
                      <div className="text-white text-sm mb-3">
                        This will permanently delete {selectedFileIds.length} file{selectedFileIds.length > 1 ? 's' : ''}. This action cannot be undone.
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={async () => {
                            setShowDeleteConfirm(false);
                            
                            try {
                              // Get file URLs for storage deletion
                              const filesToDelete = files.filter(file => selectedFileIds.includes(file.id));
                              
                              // Delete files from folder_files table first
                              const { error: folderFilesError } = await supabase
                                .from('folder_files')
                                .delete()
                                .in('file_id', selectedFileIds);

                              if (folderFilesError) {
                                console.error('Error deleting files from folder_files:', folderFilesError);
                                error('Failed to delete files', 'An error occurred while deleting the files.');
                                return;
                              }

                              // Delete files from database
                              const { error: dbError } = await supabase
                                .from('deliverable_files')
                                .delete()
                                .in('id', selectedFileIds);

                              if (dbError) {
                                console.error('Error deleting files from database:', dbError);
                                error('Failed to delete files', 'An error occurred while deleting the files.');
                                return;
                              }

                              // Delete files from storage
                              for (const file of filesToDelete) {
                                try {
                                  // Extract filename from URL for storage deletion
                                  const urlParts = file.file_url.split('/');
                                  const fileName = urlParts[urlParts.length - 1];
                                  
                                  const { error: storageError } = await supabase.storage
                                    .from('deliverable-files')
                                    .remove([fileName]);

                                  if (storageError) {
                                    console.error('Error deleting file from storage:', storageError);
                                  }
                                } catch (err) {
                                  console.error('Error processing file for deletion:', err);
                                }
                              }

                              // Update local state
                              setFiles(prev => prev.filter(file => !selectedFileIds.includes(file.id)));
                              
                              // Clear selection and hide toolbar
                              setSelectedFileIds([]);
                              setShowToolbar(false);

                              // Show success toast
                              const deletedCount = filesToDelete.length;
                              if (deletedCount === 1) {
                                success(
                                  `"${filesToDelete[0].name}" has been deleted`,
                                  undefined,
                                  <Trash2 className="w-5 h-5 text-red-400" />
                                );
                              } else {
                                success(
                                  `${deletedCount} files have been deleted`,
                                  undefined,
                                  <Trash2 className="w-5 h-5 text-red-400" />
                                );
                              }

                              console.log('Successfully deleted files:', selectedFileIds);
                            } catch (err) {
                              console.error('Error deleting files:', err);
                              error('Failed to delete files', 'An unexpected error occurred.');
                            }
                          }}
                          className="flex-1"
                        >
                          Delete
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setShowDeleteConfirm(false)}
                          className="flex-1"
                        >
                          Cancel
                        </Button>
                      </div>
                      {/* Tooltip arrow */}
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-600"></div>
                    </div>
                  )}
                </div>

                {/* Download button - primary */}
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    // TODO: Implement download functionality
                    console.log('Download selected files:', selectedFileIds);
                  }}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
            </div>
          </div>

          <ToastContainer toasts={toasts} onClose={removeToast} />
        </div>
      </Layout>
    </AuthWrapper>
  );
}
