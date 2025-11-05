import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import { supabase, updateReleaseStatus } from '@/lib/supabase';
import Layout from '../../components/Layout';
import Button from '../../components/Button';
import AuthWrapper from '../../components/AuthWrapper';
import FilePreviewModal from '../../components/FilePreviewModal';
import Spinner from '../../components/Spinner';
import IconButton from '../../components/IconButton';
import { Check, CheckCircle, CircleCheck, CircleDashed, Circle, Upload, Loader2, X, Trash2, RotateCcw, Download, ArrowLeft, ChevronRight, MoreHorizontal, Copy, Edit } from 'lucide-react';
import ToastContainer from '../../components/Toast';
import { useToast } from '../../lib/useToast';
import { getUserHighestAccess } from '../../lib/accessControl';
import Breadcrumb from '../../components/Breadcrumb';
import Menu from '../../components/Menu';
import Card from '../../components/Card';
import Tooltip from '../../components/Tooltip';

interface Deliverable {
  id: string;
  name: string;
  type: string;
  description?: string | null;
  online_deadline?: string | null;
  offline_deadline?: string | null;
  status: string;
  release_id: string;
  release: {
    title: string;
    cover_url?: string | null;
    release_artists: Array<{
      artist: {
        name: string;
      };
    }>;
  };
}

interface DeliverableFile {
  id: string;
  name: string;
  file_type: string;
  file_size: number;
  file_url: string;
  created_at: string;
  status?: string;
}

export default function DeliverableDetailPage() {
  const router = useRouter();
  const { id } = router.query;

  const [deliverable, setDeliverable] = useState<Deliverable | null>(null);
  const [files, setFiles] = useState<DeliverableFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewFile, setPreviewFile] = useState<DeliverableFile | null>(null);
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
  const [showDeliverableMenu, setShowDeliverableMenu] = useState(false);
  const [imageLoadStates, setImageLoadStates] = useState<{ [key: string]: 'loading' | 'loaded' | 'error' }>({});
  const processedImages = useRef<Set<string>>(new Set());
  const [layoutPreference, setLayoutPreference] = useState<string>('simple');
  const { toasts, removeToast, success, error } = useToast();

  // Fetch layout preference
  useEffect(() => {
    const fetchLayoutPreference = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profileData, error } = await supabase
          .from('user_profiles')
          .select('layout_preference')
          .eq('id', user.id)
          .single();

        if (!error && profileData) {
          setLayoutPreference(profileData.layout_preference || 'simple');
        }
      } catch (error) {
        console.error('Error fetching layout preference:', error);
      }
    };

    fetchLayoutPreference();
    const handlePreferenceChange = () => fetchLayoutPreference();
    window.addEventListener('layoutPreferenceChanged', handlePreferenceChange);
    
    // Listen for file upload trigger from SimpleNavigation
    const handleTriggerUpload = () => {
      document.getElementById('file-upload')?.click();
    };
    window.addEventListener('triggerFileUpload', handleTriggerUpload);
    
    // Listen for deliverable actions
    const handleDuplicateDeliverable = (e: any) => {
      // TODO: Implement duplicate functionality
      console.log('Duplicate deliverable:', e.detail.deliverableId);
    };
    const handleDeleteDeliverable = (e: any) => {
      // TODO: Implement delete functionality
      console.log('Delete deliverable:', e.detail.deliverableId);
    };
    window.addEventListener('duplicateDeliverable', handleDuplicateDeliverable);
    window.addEventListener('deleteDeliverable', handleDeleteDeliverable);
    
    return () => {
      window.removeEventListener('layoutPreferenceChanged', handlePreferenceChange);
      window.removeEventListener('triggerFileUpload', handleTriggerUpload);
      window.removeEventListener('duplicateDeliverable', handleDuplicateDeliverable);
      window.removeEventListener('deleteDeliverable', handleDeleteDeliverable);
    };
  }, []);

  useEffect(() => {
    if (!id) return;

    const fetchDeliverable = async () => {
      let deliverableData: any = null;
      
      try {
        // First check if user has access to this deliverable (via release access)
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/login');
          return;
        }

        // Check if user has access to this deliverable
        const userAccess = await getUserHighestAccess(user.id, 'deliverable', id as string);
        if (!userAccess) {
          console.log('User does not have access to this deliverable');
          setHasAccess(false);
          setLoading(false);
          return;
        }

        setHasAccess(true);

        // Fetch deliverable details with release info
        const { data, error: deliverableError } = await supabase
          .from('deliverables')
          .select(`
            *,
            release:releases(
              title,
              cover_url,
              release_artists(
                artist:artists(name)
              )
            )
          `)
          .eq('id', id)
          .single();

        if (deliverableError) {
          console.error('Error fetching deliverable:', deliverableError);
          setLoading(false);
          return;
        }

        deliverableData = data;
      } catch (error) {
        console.error('Error in fetchDeliverable:', error);
        setHasAccess(false);
        setLoading(false);
        return;
      }

      if (!deliverableData) {
        console.error('No deliverable data found');
        setLoading(false);
        return;
      }

      setDeliverable(deliverableData);

      // Fetch files for this deliverable
      const { data: filesData, error: filesError } = await supabase
        .from('deliverable_files')
        .select('*')
        .eq('deliverable_id', id)
        .order('created_at', { ascending: false });

      if (filesError) {
        console.error('Error fetching files:', filesError);
        setFiles([]);
        setImageLoadStates({});
        processedImages.current.clear();
      } else {
        console.log('Loaded files:', filesData);
        setFiles(filesData || []);
        
        // Initialize image load states for all image files
        const imageFiles = (filesData || []).filter(file => file.file_type.startsWith('image/'));
        if (imageFiles.length > 0) {
          console.log('Initializing image load states for:', imageFiles.map(f => f.id));
          processedImages.current.clear(); // Clear processed images for fresh start
          const initialStates: { [key: string]: 'loading' | 'loaded' | 'error' } = {};
          imageFiles.forEach(file => {
            initialStates[file.id] = 'loading';
          });
          setImageLoadStates(initialStates);
          
          // Fallback: if images don't trigger events within 3 seconds, mark them as loaded
          setTimeout(() => {
            setImageLoadStates(prev => {
              const newStates = { ...prev };
              imageFiles.forEach(file => {
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

    fetchDeliverable();
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
    console.log('Deliverable:', deliverable?.id);
    if (files.length === 0 || !deliverable) {
      console.log('Early return - no files or no deliverable');
      return;
    }

    setUploading(true);
    const uploadedFiles: string[] = [];
    const failedFiles: string[] = [];

    try {
      for (const file of files) {
        // Upload file to Supabase Storage
        const fileName = `${Date.now()}-${file.name}`;
        const filePath = `deliverable-files/${deliverable.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('deliverable-files')
          .upload(filePath, file);

        if (uploadError) {
          console.error('Error uploading file:', uploadError);
          failedFiles.push(file.name);
          continue;
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('deliverable-files')
          .getPublicUrl(filePath);

        // Create file record in database
        const { data: insertedFile, error: dbError } = await supabase
          .from('deliverable_files')
          .insert({
            name: file.name,
            file_type: file.type || 'unknown',
            file_size: file.size,
            file_url: publicUrl,
            deliverable_id: deliverable.id,
            status: 'in_progress'
          })
          .select()
          .single();

        if (dbError) {
          console.error('Error creating file record:', dbError);
          failedFiles.push(file.name);
        } else if (insertedFile) {
          uploadedFiles.push(file.name);
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

      // Refresh files list
      const { data: filesData, error: filesError } = await supabase
        .from('deliverable_files')
        .select('*')
        .eq('deliverable_id', deliverable.id)
        .order('created_at', { ascending: false });

      if (!filesError && filesData) {
        console.log('Files refreshed after upload:', filesData.length, 'files');
        setFiles(filesData);
        
        // Initialize image load states for any new image files
        const imageFiles = filesData.filter(file => file.file_type.startsWith('image/'));
        if (imageFiles.length > 0) {
          const newImageFiles = imageFiles.filter(file => !imageLoadStates[file.id]);
          if (newImageFiles.length > 0) {
            setImageLoadStates(prev => {
              const newStates = { ...prev };
              newImageFiles.forEach(file => {
                newStates[file.id] = 'loading';
              });
              return newStates;
            });
            
            // Fallback for new images
            setTimeout(() => {
              setImageLoadStates(prev => {
                const newStates = { ...prev };
                newImageFiles.forEach(file => {
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
        
        // Update deliverable status using the refreshed files data
        const allFilesFinal = filesData.every(file => file.status === 'final');
        const newStatus = allFilesFinal ? 'final' : 'in_progress';
        console.log('Files after upload:', filesData.map(f => ({ id: f.id, status: f.status })));
        console.log('All files final:', allFilesFinal, 'New status:', newStatus);
        console.log('Current deliverable status:', deliverable?.status);
        console.log('Will update status?', deliverable && newStatus !== deliverable.status);
        
        if (deliverable && newStatus !== deliverable.status) {
          try {
            const { error } = await supabase
              .from('deliverables')
              .update({ status: newStatus })
              .eq('id', deliverable.id);

            if (error) {
              console.error('Error updating deliverable status:', error);
            } else {
              console.log('Successfully updated deliverable status to:', newStatus);
              setDeliverable(prev => prev ? { ...prev, status: newStatus } : null);
            }
          } catch (err) {
            console.error('Error updating deliverable status:', err);
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
        if (failedFiles.length === 1) {
          error(
            `Failed to upload "${failedFiles[0]}"`,
            'Please try again or check the file format.'
          );
        } else {
          error(
            `Failed to upload ${failedFiles.length} files`,
            'Please try again or check the file formats.'
          );
        }
      }
    } catch (err) {
      console.error('Error uploading files:', err);
      error('Upload failed', 'An unexpected error occurred while uploading files.');
    } finally {
      setUploading(false);
    }
  };

  const handleFileClick = (file: DeliverableFile) => {
    // Clear file selections and close toolbar when opening asset detail
    setSelectedFileIds([]);
    setShowToolbar(false);
    
    setPreviewFile(file);
    setShowPreview(true);
  };

  const handleFileUpdate = () => {
    // Refresh files list when a file is updated
    if (deliverable) {
      supabase
        .from('deliverable_files')
        .select('*')
        .eq('deliverable_id', deliverable.id)
        .order('created_at', { ascending: false })
        .then(({ data, error }) => {
          if (!error && data) {
            setFiles(data);
            
            // Initialize image load states for any new image files
            const imageFiles = data.filter(file => file.file_type.startsWith('image/'));
            if (imageFiles.length > 0) {
              setImageLoadStates(prev => {
                const newStates = { ...prev };
                imageFiles.forEach(file => {
                  if (!prev[file.id]) {
                    newStates[file.id] = 'loading';
                  }
                });
                return newStates;
              });
            }
          }
        });
    }
  };

  const handleMarkFileAsFinal = async (fileId: string) => {
    setMarkingFinal(fileId);
    try {
      const { error } = await supabase
        .from('deliverable_files')
        .update({ is_final: true })
        .eq('id', fileId);

      if (error) {
        console.error('Error marking file as final:', error);
      } else {
        // Update local state
        setFiles(prev => prev.map(file => 
          file.id === fileId ? { ...file, is_final: true } : file
        ));
      }
    } catch (err) {
      console.error('Error marking file as final:', err);
    } finally {
      setMarkingFinal(null);
    }
  };

  const handleMarkAllAsFinal = async () => {
    console.log('Marking all files as final for deliverable:', id);
    setMarkingAllFinal(true);
    try {
      const { error } = await supabase
        .from('deliverable_files')
        .update({ status: 'final' })
        .eq('deliverable_id', id);

      if (error) {
        console.error('Error marking all files as final:', error);
      } else {
        console.log('Successfully marked all files as final');
        // Refresh files from database to ensure we have the latest state
        const { data: refreshedFiles, error: refreshError } = await supabase
          .from('deliverable_files')
          .select('*')
          .eq('deliverable_id', id)
          .order('created_at', { ascending: false });

        if (refreshError) {
          console.error('Error refreshing files:', refreshError);
          // Fallback to local state update
          setFiles(prev => {
            const updated = prev.map(file => ({ ...file, status: 'final' }));
            console.log('Updated all files (fallback):', updated);
            return updated;
          });
        } else {
          console.log('Refreshed files from database:', refreshedFiles);
          setFiles(refreshedFiles || []);
          
          // Initialize image load states for any new image files
          if (refreshedFiles) {
            const imageFiles = refreshedFiles.filter(file => file.file_type.startsWith('image/'));
            if (imageFiles.length > 0) {
              setImageLoadStates(prev => {
                const newStates = { ...prev };
                imageFiles.forEach(file => {
                  if (!prev[file.id]) {
                    newStates[file.id] = 'loading';
                  }
                });
                return newStates;
              });
            }
          }
          
          // Update deliverable status using the refreshed files data
          if (refreshedFiles) {
            const allFilesFinal = refreshedFiles.every(file => file.status === 'final');
            const newStatus = allFilesFinal ? 'final' : 'in_progress';
            console.log('Files after update:', refreshedFiles.map(f => ({ id: f.id, status: f.status })));
            console.log('All files final:', allFilesFinal, 'New status:', newStatus);
            
            if (deliverable && newStatus !== deliverable.status) {
              try {
                const { error } = await supabase
                  .from('deliverables')
                  .update({ status: newStatus })
                  .eq('id', deliverable.id);

                if (error) {
                  console.error('Error updating deliverable status:', error);
                } else {
                  console.log('Successfully updated deliverable status to:', newStatus);
                  setDeliverable(prev => prev ? { ...prev, status: newStatus } : null);
                  // Update release status
                  updateReleaseStatus(deliverable.release_id);
                }
              } catch (err) {
                console.error('Error updating deliverable status:', err);
              }
            }
          }
        }
      }
    } catch (err) {
      console.error('Error marking all files as final:', err);
    } finally {
      setMarkingAllFinal(false);
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
        setFrozenStatusInfo(getSelectedFilesStatusInfo());
        setFrozenSelectedCount(prev.length);
        setKeepToolbarStable(true);
        setShowToolbar(false);
        setTimeout(() => {
          setKeepToolbarStable(false);
          setFrozenStatusInfo(null);
          setFrozenSelectedCount(null);
        }, 200);
      } else {
        // Show/hide toolbar based on selection
        setShowToolbar(newSelection.length > 0);
        // Reset frozen when user reselects
        if (newSelection.length > 0) {
          setFrozenSelectedCount(null);
          setFrozenStatusInfo(null);
          setKeepToolbarStable(false);
        }
      }
      
      return newSelection;
    });
  };

  const getSelectedFilesStatusInfo = () => {
    const selectedFiles = files.filter(file => selectedFileIds.includes(file.id));
    const finalFiles = selectedFiles.filter(file => file.status === 'final');
    const inProgressFiles = selectedFiles.filter(file => file.status === 'in_progress');
    const nonFinalFiles = selectedFiles.filter(file => file.status !== 'final');
    
    return {
      hasFinalFiles: finalFiles.length > 0,
      hasInProgressFiles: inProgressFiles.length > 0,
      hasNonFinalFiles: nonFinalFiles.length > 0,
      allSelectedAreFinal: selectedFiles.length > 0 && selectedFiles.every(file => file.status === 'final'),
      allSelectedAreInProgress: selectedFiles.length > 0 && selectedFiles.every(file => file.status === 'in_progress')
    };
  };

  const getEffectiveStatusInfo = () => {
    return frozenStatusInfo || getSelectedFilesStatusInfo();
  };

  const calculateDeliverableStatus = () => {
    console.log('Calculating deliverable status. Files:', files);
    console.log('File statuses:', files.map(f => ({ id: f.id, name: f.name, status: f.status })));
    
    if (files.length === 0) return 'in_progress';
    
    // Handle cases where status might be null, undefined, or empty
    const allFilesFinal = files.every(file => file.status === 'final');
    const hasNonFinalFiles = files.some(file => file.status !== 'final' && file.status !== null && file.status !== undefined);
    
    const newStatus = allFilesFinal ? 'final' : 'in_progress';
    console.log('Calculated status:', newStatus, 'All files final:', allFilesFinal, 'Has non-final files:', hasNonFinalFiles);
    return newStatus;
  };

  const updateDeliverableStatus = async () => {
    console.log('updateDeliverableStatus called');
    if (!deliverable) {
      console.log('No deliverable found');
      return;
    }
    
    console.log('Current deliverable status:', deliverable.status);
    const newStatus = calculateDeliverableStatus();
    console.log('New calculated status:', newStatus);
    
    if (newStatus === deliverable.status) {
      console.log('No status change needed');
      return; // No change needed
    }
    
    console.log('Updating deliverable status from', deliverable.status, 'to', newStatus);
    
    try {
      const { error } = await supabase
        .from('deliverables')
        .update({ status: newStatus })
        .eq('id', deliverable.id);

      if (error) {
        console.error('Error updating deliverable status:', error);
      } else {
        console.log('Successfully updated deliverable status to:', newStatus);
        // Update local state
        setDeliverable(prev => prev ? { ...prev, status: newStatus } : null);
        // Update release status
        updateReleaseStatus(deliverable.release_id);
      }
    } catch (err) {
      console.error('Error updating deliverable status:', err);
    }
  };

  const handleMarkSelectedAsFinal = async () => {
    if (selectedFileIds.length === 0) return;
    
    console.log('Marking selected files as final:', selectedFileIds);
    // Keep toolbar stable during the entire operation
    setKeepToolbarStable(true);
    setFrozenStatusInfo(getSelectedFilesStatusInfo());
    setMarkingAllFinal(true);
    setIsCompletingAction(true);
    try {
      const { error } = await supabase
        .from('deliverable_files')
        .update({ status: 'final' })
        .in('id', selectedFileIds);

      if (error) {
        console.error('Error marking selected files as final:', error);
      } else {
        console.log('Successfully marked selected files as final');
        // Refresh files from database to ensure we have the latest state
        const { data: refreshedFiles, error: refreshError } = await supabase
          .from('deliverable_files')
          .select('*')
          .eq('deliverable_id', id)
          .order('created_at', { ascending: false });

        if (refreshError) {
          console.error('Error refreshing files:', refreshError);
          // Fallback to local state update
          setFiles(prev => {
            const updated = prev.map(file => 
              selectedFileIds.includes(file.id) ? { ...file, status: 'final' } : file
            );
            console.log('Updated files (fallback):', updated);
            return updated;
          });
        } else {
          console.log('Refreshed files from database:', refreshedFiles);
          setFiles(refreshedFiles || []);
          
          // Initialize image load states for any new image files
          if (refreshedFiles) {
            const imageFiles = refreshedFiles.filter(file => file.file_type.startsWith('image/'));
            if (imageFiles.length > 0) {
              setImageLoadStates(prev => {
                const newStates = { ...prev };
                imageFiles.forEach(file => {
                  if (!prev[file.id]) {
                    newStates[file.id] = 'loading';
                  }
                });
                return newStates;
              });
            }
          }
          
          // Update deliverable status using the refreshed files data
          if (refreshedFiles) {
            const allFilesFinal = refreshedFiles.every(file => file.status === 'final');
            const newStatus = allFilesFinal ? 'final' : 'in_progress';
            console.log('Files after update:', refreshedFiles.map(f => ({ id: f.id, status: f.status })));
            console.log('All files final:', allFilesFinal, 'New status:', newStatus);
            
            if (deliverable && newStatus !== deliverable.status) {
              try {
                const { error } = await supabase
                  .from('deliverables')
                  .update({ status: newStatus })
                  .eq('id', deliverable.id);

                if (error) {
                  console.error('Error updating deliverable status:', error);
                } else {
                  console.log('Successfully updated deliverable status to:', newStatus);
                  setDeliverable(prev => prev ? { ...prev, status: newStatus } : null);
                  // Update release status
                  updateReleaseStatus(deliverable.release_id);
                }
              } catch (err) {
                console.error('Error updating deliverable status:', err);
              }
            }
          }
        }
        // Keep files selected, don't clear selection
        // setSelectedFileIds([]);
        // setShowToolbar(false);
        
        // Add delay before resetting action state to allow smooth animation
        setTimeout(() => {
          setIsCompletingAction(false);
          setFrozenStatusInfo(null);
          setKeepToolbarStable(false);
        }, 200); // Match toolbar animation duration
      }
    } catch (err) {
      console.error('Error marking selected files as final:', err);
    } finally {
      setMarkingAllFinal(false);
    }
  };

  const handleMarkSelectedAsInProgress = async () => {
    if (selectedFileIds.length === 0) return;
    
    console.log('Marking selected files as in progress:', selectedFileIds);
    // Keep toolbar stable during the entire operation
    setKeepToolbarStable(true);
    setFrozenStatusInfo(getSelectedFilesStatusInfo());
    setMarkingAllFinal(true);
    setIsCompletingAction(true);
    try {
      const { error } = await supabase
        .from('deliverable_files')
        .update({ status: 'in_progress' })
        .in('id', selectedFileIds);

      if (error) {
        console.error('Error marking selected files as in progress:', error);
      } else {
        console.log('Successfully marked selected files as in progress');
        // Refresh files from database to ensure we have the latest state
        const { data: refreshedFiles, error: refreshError } = await supabase
          .from('deliverable_files')
          .select('*')
          .eq('deliverable_id', id)
          .order('created_at', { ascending: false });

        if (refreshError) {
          console.error('Error refreshing files:', refreshError);
          // Fallback to local state update
          setFiles(prev => {
            const updated = prev.map(file => 
              selectedFileIds.includes(file.id) ? { ...file, status: 'in_progress' } : file
            );
            console.log('Updated files (fallback):', updated);
            return updated;
          });
        } else {
          console.log('Refreshed files from database:', refreshedFiles);
          setFiles(refreshedFiles || []);
          
          // Initialize image load states for any new image files
          if (refreshedFiles) {
            const imageFiles = refreshedFiles.filter(file => file.file_type.startsWith('image/'));
            if (imageFiles.length > 0) {
              setImageLoadStates(prev => {
                const newStates = { ...prev };
                imageFiles.forEach(file => {
                  if (!prev[file.id]) {
                    newStates[file.id] = 'loading';
                  }
                });
                return newStates;
              });
            }
          }
          
          // Update deliverable status using the refreshed files data
          if (refreshedFiles) {
            const allFilesFinal = refreshedFiles.every(file => file.status === 'final');
            const newStatus = allFilesFinal ? 'final' : 'in_progress';
            console.log('Files after update:', refreshedFiles.map(f => ({ id: f.id, status: f.status })));
            console.log('All files final:', allFilesFinal, 'New status:', newStatus);
            
            if (deliverable && newStatus !== deliverable.status) {
              try {
                const { error } = await supabase
                  .from('deliverables')
                  .update({ status: newStatus })
                  .eq('id', deliverable.id);

                if (error) {
                  console.error('Error updating deliverable status:', error);
                } else {
                  console.log('Successfully updated deliverable status to:', newStatus);
                  setDeliverable(prev => prev ? { ...prev, status: newStatus } : null);
                  // Update release status
                  updateReleaseStatus(deliverable.release_id);
                }
              } catch (err) {
                console.error('Error updating deliverable status:', err);
              }
            }
          }
        }
        // Keep files selected, don't clear selection
        // setSelectedFileIds([]);
        
        // Add delay before resetting action state to allow smooth animation
        setTimeout(() => {
          setIsCompletingAction(false);
          setFrozenStatusInfo(null);
          setKeepToolbarStable(false);
        }, 200); // Match toolbar animation duration
      }
    } catch (err) {
      console.error('Error marking selected files as in progress:', err);
    } finally {
      setMarkingAllFinal(false);
    }
  };

  const getCurrentFileIndex = () => {
    if (!previewFile) return 0;
    return files.findIndex(file => file.id === previewFile.id);
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
              <h1 className="text-2xl font-bold">Deliverable</h1>
            </div>
            <div className="flex items-center justify-center py-12">
              <Spinner size="lg" />
            </div>
          </div>
        </Layout>
      </AuthWrapper>
    );
  }

  if (hasAccess === false) {
    return (
      <AuthWrapper>
        <Layout>
          <div className="text-white">
            <div className="mb-6">
              <h1 className="text-2xl font-bold">Access Denied</h1>
            </div>
            <div className="text-center py-12">
              <p className="text-gray-400 text-lg mb-4">You don't have access to this deliverable</p>
              <p className="text-gray-500 mb-6">
                Contact your administrator to get access to this release and its deliverables.
              </p>
              <Button onClick={() => router.back()}>
                Go Back
              </Button>
            </div>
          </div>
        </Layout>
      </AuthWrapper>
    );
  }

  if (!deliverable) {
    return (
      <AuthWrapper>
        <Layout>
          <div className="p-6 text-red-500">Deliverable not found.</div>
        </Layout>
      </AuthWrapper>
    );
  }

  const artistNames = deliverable.release.release_artists
    ?.map((ra: any) => ra.artist.name).join(', ') || 'Unknown Artist';

  return (
    <AuthWrapper>
      <Layout>
        <div className="text-white">
          {/* Breadcrumb Header - Only show in complex layout */}
          {layoutPreference === 'complex' && (
            <div className="mb-6 flex items-center justify-between">
              <Breadcrumb
                items={[
                  {
                    label: deliverable.release.title,
                    href: `/releases/${deliverable.release_id}`
                  },
                  {
                    label: deliverable.name,
                    customContent: (
                      <div className="flex items-center gap-2">
                        {deliverable.status === 'final' ? (
                          <CircleCheck className="w-3 h-3 text-green-400" />
                        ) : deliverable.status === 'in_progress' ? (
                          <CircleDashed className="w-3 h-3 text-blue-400" />
                        ) : (
                          <Circle className="w-3 h-3 text-yellow-400" />
                        )}
                        <span>{deliverable.name}</span>
                      </div>
                    )
                  }
                ]}
                showBackButton={true}
                backButtonHref={`/releases/${deliverable.release_id}`}
              />
              <div className="flex items-center gap-2">
                <div className="relative">
                  <IconButton
                    variant="ghost"
                    size="sm"
                    icon={MoreHorizontal}
                    onClick={() => setShowDeliverableMenu(!showDeliverableMenu)}
                  />
                  <Menu
                    isOpen={showDeliverableMenu}
                    onClose={() => setShowDeliverableMenu(false)}
                    items={[
                      {
                        label: 'Edit',
                        icon: <Edit className="w-4 h-4 mr-2" />,
                        onClick: () => {
                          setShowDeliverableMenu(false);
                          // TODO: Open edit form
                        }
                      },
                      {
                        label: 'Duplicate',
                        icon: <Copy className="w-4 h-4 mr-2" />,
                        onClick: () => {
                          setShowDeliverableMenu(false);
                          // TODO: Implement duplicate
                        }
                      },
                      {
                        label: 'Delete',
                        icon: <Trash2 className="w-4 h-4 mr-2" />,
                        onClick: () => {
                          setShowDeliverableMenu(false);
                          setShowDeleteConfirm(true);
                        }
                      }
                    ]}
                    position="bottom"
                    align="right"
                  />
                </div>
                <input
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-upload"
                />
                <Button
                  variant="secondary"
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
                  Upload
                </Button>
              </div>
            </div>
          )}

          {/* Files Grid */}
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
                className="grid grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 lg:gap-4 -mx-4 relative"
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
                    style={{
                      opacity: newlyUploadedFiles.has(file.id) ? '0.3' : '1'
                    }}
                  >
                  <Card
                    onClick={() => handleFileClick(file)}
                    className="relative group"
                  >
                    {/* Selection checkbox */}
                    <div
                      className="absolute top-2 right-2 z-10 cursor-pointer transition-all"
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
                        <div className="w-5 h-5 bg-gray-700 border border-gray-400 hover:border-gray-300 rounded-md transition-colors opacity-0 group-hover:opacity-100"></div>
                      )}
                    </div>
                    
                    {/* Image Section */}
                    <div className="px-4 pt-4">
                      <div className="aspect-square bg-gray-700 relative overflow-hidden rounded-3xl flex items-center justify-center p-6">
                        {file.file_type.startsWith('image/') ? (
                          <>
                            {(imageLoadStates[file.id] === 'loading' || imageLoadStates[file.id] === undefined) && (
                              <div className="absolute inset-0 flex items-center justify-center bg-gray-700 rounded-3xl z-10">
                                <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
                              </div>
                            )}
                            <img
                              src={file.file_url}
                              alt={file.name}
                              className={`max-w-full max-h-full object-contain transition-opacity duration-300 ${
                                (imageLoadStates[file.id] === 'loading' || imageLoadStates[file.id] === undefined) ? 'opacity-0' : 'opacity-100'
                              }`}
                              onLoad={() => {
                                handleImageLoad(file.id);
                                setNewlyUploadedFiles(prev => {
                                  const newSet = new Set(prev);
                                  newSet.delete(file.id);
                                  return newSet;
                                });
                                setTimeout(() => {
                                  setIsAddingNewFile(false);
                                }, 40);
                              }}
                              onError={() => {
                                handleImageError(file.id);
                                setNewlyUploadedFiles(prev => {
                                  const newSet = new Set(prev);
                                  newSet.delete(file.id);
                                  return newSet;
                                });
                              }}
                              onLoadStart={() => handleImageStartLoad(file.id)}
                            />
                          </>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <svg className="w-12 h-12 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Content Section */}
                    <div className="px-4 pb-4 pt-3">
                      <div className="flex items-center justify-start gap-2">
                        <Tooltip content={file.status === 'final' ? 'Final' : 'In Progress'} delay={300} position="bottom">
                          <div className="cursor-pointer">
                            {file.status === 'final' ? (
                              <CircleCheck className="w-3 h-3 text-green-400" />
                            ) : (
                              <CircleDashed className="w-3 h-3 text-blue-400" />
                            )}
                          </div>
                        </Tooltip>
                        <h3 className="font-medium text-gray-300 group-hover:text-gray-200 text-xs truncate transition-colors flex-1 min-w-0">
                          {file.name}
                        </h3>
                      </div>
                      <p className="text-xs text-gray-400 truncate mt-0.5">
                        {getFileTypeDisplay(file.file_type)} • {formatFileSize(file.file_size)}
                      </p>
                    </div>
                  </Card>
                  </div>
                ))}
              </div>
            )}

        <FilePreviewModal
          isOpen={showPreview}
          onClose={() => {
            setIsClosingModal(true);
            setShowPreview(false);
            // Clean up URL parameters when closing modal using router
            router.replace(`/deliverables/${id}`, undefined, { shallow: true });
            // Reset the flag after a short delay to allow URL update to complete
            setTimeout(() => setIsClosingModal(false), 100);
          }}
          file={previewFile}
          releaseName={deliverable.release.title}
          deliverableName={deliverable.name}
          artistName={deliverable.release.release_artists?.[0]?.artist?.name}
          coverUrl={deliverable.release.cover_url || undefined}
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
                  setFrozenStatusInfo(getSelectedFilesStatusInfo());
                  setFrozenSelectedCount(selectedFileIds.length);
                  setKeepToolbarStable(true);
                  // Immediately clear selection so checkboxes/borders update right away
                  setSelectedFileIds([]);
                  // Trigger close after snapshot so toolbar fades with stable content
                  setShowToolbar(false);
                  setTimeout(() => {
                    // After fade, reset latches
                    setKeepToolbarStable(false);
                    setFrozenStatusInfo(null);
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

              {/* Single conditional Mark-as button with variable width; stays visible using latched status when closing */}
              {((keepToolbarStable ? frozenStatusInfo?.hasNonFinalFiles : getSelectedFilesStatusInfo().hasNonFinalFiles)) ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleMarkSelectedAsFinal}
                  disabled={markingAllFinal}
                  className="inline-flex items-center"
                >
                  {markingAllFinal ? (
                    <Spinner size="sm" />
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Mark as final
                    </>
                  )}
                </Button>
              ) : null}

              {((keepToolbarStable ? frozenStatusInfo?.allSelectedAreFinal : getSelectedFilesStatusInfo().allSelectedAreFinal)) ? (
                                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleMarkSelectedAsInProgress}
                    disabled={markingAllFinal}
                    className="inline-flex items-center"
                  >
                    <CircleDashed className="w-4 h-4 mr-2" />
                    Mark as in progress
                  </Button>
              ) : null}

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

        {/* Toast notifications */}
        <ToastContainer toasts={toasts} onClose={removeToast} />
        </div>
      </Layout>
    </AuthWrapper>
  );
} 