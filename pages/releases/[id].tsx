import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import { supabase, updateReleaseStatus } from '@/lib/supabase';
import { motion } from 'framer-motion';
import { usePageTransition } from '@/lib/pageTransition';
import Layout from '../../components/Layout';
import Button from '../../components/Button';
import AuthWrapper from '../../components/AuthWrapper';
import NewDeliverableForm from '../../components/NewDeliverableForm';
import ReleaseEditForm from '../../components/ReleaseEditForm';
import ShareAccessModal from '../../components/ShareAccessModal';
import Menu from '../../components/Menu';
import Spinner from '../../components/Spinner';
import Card from '../../components/Card';
import Tooltip from '../../components/Tooltip';
import { Music, MoreHorizontal, ChevronDown, FileText, Circle, CircleDashed, CircleCheck, Check, Edit, Trash2, RotateCcw, Plus, X, Copy, Share, List, Grid3x3, Upload, Loader2 } from 'lucide-react';
import IconButton from '../../components/IconButton';
import BlurredHeader from '../../components/BlurredHeader';
import ToastContainer from '../../components/Toast';
import { useToast } from '../../lib/useToast';
import { canCurrentUserPerformAction, Permission } from '../../lib/accessControl';

interface Release {
  id: string;
  title: string;
  cover_url?: string | null;
  type: string;
  status: string;
  catalog_number?: string | null;
}

interface Artist {
  id: string;
  name: string;
  image_url?: string | null;
}

interface Deliverable {
  id: string;
  name: string;
  type: string;
  description?: string | null;
  online_deadline?: string | null;
  offline_deadline?: string | null;
  status: string;
  created_at: string;
  deliverable_files?: DeliverableFile[];
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

export default function ReleaseDetailPage() {
  const router = useRouter();
  const { clickedReleaseId, setTransitioning, setClickedReleaseId } = usePageTransition();
  const { id } = router.query;
  
  useEffect(() => {
    // Reset transition state after animation completes
    const timer = setTimeout(() => {
      setTransitioning(false);
      setClickedReleaseId(null);
    }, 500);
    return () => clearTimeout(timer);
  }, [setTransitioning, setClickedReleaseId]);

  const [release, setRelease] = useState<Release | null>(null);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [showDeliverableForm, setShowDeliverableForm] = useState(false);
  const [deliverableStatusLoading, setDeliverableStatusLoading] = useState<string | null>(null);
  const [showReleaseMenu, setShowReleaseMenu] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showDeliverableMenu, setShowDeliverableMenu] = useState<string | null>(null);
  const [deliverableToEdit, setDeliverableToEdit] = useState<any>(null);
  const [deliverableToDelete, setDeliverableToDelete] = useState<any>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showReleaseEditForm, setShowReleaseEditForm] = useState(false);
  const [showReleaseDeleteModal, setShowReleaseDeleteModal] = useState(false);
  const [releaseDeleteLoading, setReleaseDeleteLoading] = useState(false);
  const [addingDefaultDeliverables, setAddingDefaultDeliverables] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [selectedDeliverableIds, setSelectedDeliverableIds] = useState<string[]>([]);
  const [showSelectionToolbar, setShowSelectionToolbar] = useState(false);
  const [bulkOperationLoading, setBulkOperationLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [viewMode, setViewMode] = useState<'gallery' | 'list'>('gallery');
  const [draggedOverDeliverableId, setDraggedOverDeliverableId] = useState<string | null>(null);
  const [uploadingToDeliverable, setUploadingToDeliverable] = useState<string | null>(null);
  
  // Permission states
  const [permissions, setPermissions] = useState<{
    canView: boolean;
    canEdit: boolean;
    canManageAccess: boolean;
    canInviteUsers: boolean;
    canCreateDeliverables: boolean;
    canEditDeliverables: boolean;
    canDeleteDeliverables: boolean;
    canOverrideApprovals: boolean;
  }>({
    canView: false,
    canEdit: false,
    canManageAccess: false,
    canInviteUsers: false,
    canCreateDeliverables: false,
    canEditDeliverables: false,
    canDeleteDeliverables: false,
    canOverrideApprovals: false,
  });
  
  const { toasts, removeToast, success, error } = useToast();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      // Check if user is admin (you can customize this logic based on your admin system)
      if (user) {
        // For now, we'll consider any authenticated user as admin
        // You can replace this with your actual admin check logic
        setIsAdmin(true);
      }
    };
    getUser();
  }, []);

  // Load user permissions
  useEffect(() => {
    if (!id) return;

    const loadPermissions = async () => {
      try {
        const [
          canView,
          canEdit,
          canManageAccess,
          canInviteUsers,
          canCreateDeliverables,
          canEditDeliverables,
          canDeleteDeliverables,
          canOverrideApprovals
        ] = await Promise.all([
          canCurrentUserPerformAction('view', 'release', id as string),
          canCurrentUserPerformAction('upload_files', 'release', id as string),
          canCurrentUserPerformAction('manage_access', 'release', id as string),
          canCurrentUserPerformAction('invite_users', 'release', id as string),
          canCurrentUserPerformAction('create_deliverables', 'release', id as string),
          canCurrentUserPerformAction('edit_deliverables', 'release', id as string),
          canCurrentUserPerformAction('delete_deliverables', 'release', id as string),
          canCurrentUserPerformAction('override_approvals', 'release', id as string)
        ]);

        setPermissions({
          canView,
          canEdit,
          canManageAccess,
          canInviteUsers,
          canCreateDeliverables,
          canEditDeliverables,
          canDeleteDeliverables,
          canOverrideApprovals
        });
      } catch (error) {
        console.error('Error loading permissions:', error);
        // Default to no permissions on error
        setPermissions({
          canView: false,
          canEdit: false,
          canManageAccess: false,
          canInviteUsers: false,
          canCreateDeliverables: false,
          canEditDeliverables: false,
          canDeleteDeliverables: false,
          canOverrideApprovals: false,
        });
      }
    };

    loadPermissions();
  }, [id]);

  useEffect(() => {
    if (!id) return;

    const fetchRelease = async () => {
      // Fetch release details
      const { data: releaseData, error: releaseError } = await supabase
        .from('releases')
        .select('id, title, cover_url, type, status, catalog_number')
        .eq('id', id)
        .single();

      if (releaseError) {
        console.error('Error fetching release:', releaseError);
        setLoading(false);
        return;
      }

      setRelease(releaseData);

      // Fetch associated artists
      const { data: artistData, error: artistError } = await supabase
        .from('release_artists')
        .select('artist:artists(id, name, image_url)')
        .eq('release_id', id);

      if (artistError) {
        console.error('Error fetching artists:', artistError);
        setArtists([]);
      } else {
        setArtists((artistData || []).map((row: any) => row.artist));
      }

      // Fetch deliverables
      const { data: deliverableData, error: deliverableError } = await supabase
        .from('deliverables')
        .select('*')
        .eq('release_id', id)
        .order('created_at', { ascending: false });

      if (deliverableError) {
        console.error('Error fetching deliverables:', deliverableError);
        setDeliverables([]);
      } else {
        console.log('Raw deliverables data:', deliverableData);
        
        // OPTIMIZED: Fetch all files for all deliverables in one query
        const deliverableIds = (deliverableData || []).map(d => d.id);
        let filesMap: { [key: string]: any[] } = {};
        
        if (deliverableIds.length > 0) {
          const { data: allFiles, error: filesError } = await supabase
            .from('deliverable_files')
            .select('*')
            .in('deliverable_id', deliverableIds)
            .order('created_at', { ascending: false });

          if (!filesError && allFiles) {
            // Group files by deliverable_id and take first 4 per deliverable (for gallery view)
            allFiles.forEach(file => {
              if (!filesMap[file.deliverable_id]) {
                filesMap[file.deliverable_id] = [];
              }
              if (filesMap[file.deliverable_id].length < 4) {
                filesMap[file.deliverable_id].push(file);
              }
            });
          }
        }
        
        // Attach files to deliverables
        const deliverablesWithFiles = (deliverableData || []).map(deliverable => ({
          ...deliverable,
          deliverable_files: filesMap[deliverable.id] || []
        }));

        // Sort deliverables: non-final first, then final deliverables
        const sortedDeliverables = deliverablesWithFiles.sort((a, b) => {
          const aIsFinal = a.status === 'final';
          const bIsFinal = b.status === 'final';
          
          // Non-final deliverables come first
          if (aIsFinal && !bIsFinal) return 1;
          if (!aIsFinal && bIsFinal) return -1;
          
          // If both have same status, sort by creation date (newest first)
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
        
        setDeliverables(sortedDeliverables);
      }

      setLoading(false);
    };

    fetchRelease();
  }, [id]);


  const handleDeliverableStatusChange = async (deliverableId: string, newStatus: string) => {
    setDeliverableStatusLoading(deliverableId);
    
    try {
      // Update deliverable status
      const { error: deliverableError } = await supabase
        .from('deliverables')
        .update({ status: newStatus })
        .eq('id', deliverableId);

      if (deliverableError) {
        console.error('Error updating deliverable status:', deliverableError);
        return;
      }

      // Update local state and re-sort
      setDeliverables(prev => {
        const updated = prev.map(d => 
          d.id === deliverableId 
            ? { ...d, status: newStatus }
            : d
        );
        
        // Re-sort: non-final first, then final deliverables
        return updated.sort((a, b) => {
          const aIsFinal = a.status === 'final';
          const bIsFinal = b.status === 'final';
          
          // Non-final deliverables come first
          if (aIsFinal && !bIsFinal) return 1;
          if (!aIsFinal && bIsFinal) return -1;
          
          // If both have same status, sort by creation date (newest first)
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
      });

      // Update release status based on all deliverables
      await updateReleaseStatus(id as string);

    } catch (err) {
      console.error('Error updating deliverable status:', err);
    } finally {
      setDeliverableStatusLoading(null);
    }
  };

  const handleMarkAllAssetsAsFinal = async (deliverableId: string) => {
    setDeliverableStatusLoading(deliverableId);
    
    try {
      // First, mark all files in the deliverable as final
      const { error: filesError } = await supabase
        .from('deliverable_files')
        .update({ status: 'final' })
        .eq('deliverable_id', deliverableId);

      if (filesError) {
        console.error('Error marking files as final:', filesError);
        return;
      }

      // Get the updated files to check if all are final
      const { data: updatedFiles, error: filesRefreshError } = await supabase
        .from('deliverable_files')
        .select('*')
        .eq('deliverable_id', deliverableId);

      if (filesRefreshError) {
        console.error('Error refreshing files:', filesRefreshError);
        return;
      }

      // Check if all files are final and update deliverable status accordingly
      const allFilesFinal = updatedFiles && updatedFiles.length > 0 && updatedFiles.every(file => file.status === 'final');
      const newDeliverableStatus = allFilesFinal ? 'final' : 'in_progress';

      // Update the deliverable status
      const { error: deliverableError } = await supabase
        .from('deliverables')
        .update({ status: newDeliverableStatus })
        .eq('id', deliverableId);

      if (deliverableError) {
        console.error('Error updating deliverable status:', deliverableError);
        return;
      }

      // Refresh the deliverables list to get the updated status
      const { data: updatedDeliverables, error: refreshError } = await supabase
        .from('deliverables')
        .select('*')
        .eq('release_id', id)
        .order('created_at', { ascending: false });

      if (refreshError) {
        console.error('Error refreshing deliverables:', refreshError);
        return;
      }

      // Update local state with the refreshed data
      setDeliverables(updatedDeliverables || []);

      // Update release status based on all deliverables
      await updateReleaseStatus(id as string);

    } catch (err) {
      console.error('Error marking all assets as final:', err);
    } finally {
      setDeliverableStatusLoading(null);
    }
  };



  const calculateReleaseStatus = () => {
    if (!deliverables || deliverables.length === 0) {
      return 'not_started';
    }

    const hasInProgress = deliverables.some(d => d.status === 'in_progress');
    const allFinal = deliverables.every(d => d.status === 'final');

    if (allFinal) {
      return 'final';
    } else if (hasInProgress) {
      return 'in_progress';
    } else {
      return 'not_started';
    }
  };

  const getStatusDisplayName = (status: string | null | undefined) => {
    switch (status) {
      case 'not_started':
        return 'Draft';
      case 'in_progress':
        return 'In progress';
      case 'final':
        return 'Completed';
      default:
        return 'Draft';
    }
  };

  const getStatusValue = (displayName: string) => {
    switch (displayName) {
      case 'Draft':
        return 'not_started';
      case 'In progress':
        return 'in_progress';
      case 'Completed':
        return 'final';
      default:
        return 'not_started';
    }
  };

  const getDeliverableTypeDisplay = (type: string) => {
    switch (type) {
      case 'pack':
        return 'Asset Pack';
      case 'folder':
        return 'Folder';
      case 'file':
        return 'Single File';
      case 'other':
        return 'Other';
      default:
        return type;
    }
  };

  const getDeliverableStatusDisplay = (status: string) => {
    switch (status) {
      case 'not_started':
        return 'Not Started';
      case 'in_progress':
        return 'In Progress';
      case 'completed':
        return 'Completed';
      case 'final':
        return 'Final';
      default:
        return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'not_started':
        return <Circle className="w-4 h-4 text-yellow-400" />;
      case 'in_progress':
        return <CircleDashed className="w-4 h-4 text-blue-400" />;
      case 'completed':
        return <CircleCheck className="w-4 h-4 text-green-400" />;
      case 'final':
        return <CircleCheck className="w-4 h-4 text-green-400" />;
      default:
        return <Circle className="w-4 h-4 text-yellow-400" />;
    }
  };

  const handleDeliverableCreated = () => {
    // Refresh deliverables list
    if (id) {
      supabase
        .from('deliverables')
        .select('*')
        .eq('release_id', id)
        .order('created_at', { ascending: false })
        .then(async ({ data, error }) => {
          if (!error && data) {
            setDeliverables(data);
            // Update release status based on new deliverables
            await updateReleaseStatus(id as string);
            
            // Show success toast
            success(
              'Deliverable has been created',
              undefined,
              <Plus className="w-5 h-5 text-green-400" />
            );
          }
        });
    }
  };

  const handleDeleteDeliverable = async () => {
    if (!deliverableToDelete) return;
    
    setDeleteLoading(true);
    try {
      // Delete the deliverable (this will cascade delete associated files)
      const { error } = await supabase
        .from('deliverables')
        .delete()
        .eq('id', deliverableToDelete.id);

      if (error) {
        console.error('Error deleting deliverable:', error);
        throw new Error('Failed to delete deliverable');
      }

      // Update local state
      setDeliverables(prev => prev.filter(d => d.id !== deliverableToDelete.id));
      
      // Update release status based on remaining deliverables
      await updateReleaseStatus(id as string);
      
      // Show success toast
      success(
        `"${deliverableToDelete.name}" has been deleted`,
        undefined,
        <Trash2 className="w-5 h-5 text-red-400" />
      );
      
      setDeliverableToDelete(null);
    } catch (err) {
      console.error('Error deleting deliverable:', err);
      error('Failed to delete deliverable', 'Please try again or contact support if the issue persists.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDeleteRelease = async () => {
    if (!release) return;
    
    setReleaseDeleteLoading(true);
    try {
      // Delete the release (this will cascade delete associated deliverables and files)
      const { error } = await supabase
        .from('releases')
        .delete()
        .eq('id', release.id);

      if (error) {
        console.error('Error deleting release:', error);
        throw new Error('Failed to delete release');
      }

      // Redirect to releases list
      router.push('/releases');
    } catch (err) {
      console.error('Error deleting release:', err);
      // You might want to show an error message to the user here
    } finally {
      setReleaseDeleteLoading(false);
    }
  };

  const handleDeliverableSelection = (deliverableId: string) => {
    console.log('Toggling deliverable selection:', deliverableId);
    setSelectedDeliverableIds(prev => {
      const newSelection = prev.includes(deliverableId) 
        ? prev.filter(id => id !== deliverableId)
        : [...prev, deliverableId];
      console.log('New selection:', newSelection);
      
      // Show/hide toolbar based on selection
      setShowSelectionToolbar(newSelection.length > 0);
      
      return newSelection;
    });
  };

  const handleSelectAllDeliverables = () => {
    const allSelected = selectedDeliverableIds.length === deliverables.length;
    if (allSelected) {
      // Deselect all
      setSelectedDeliverableIds([]);
      setShowSelectionToolbar(false);
    } else {
      // Select all deliverables
      const allDeliverableIds = deliverables.map(deliverable => deliverable.id);
      setSelectedDeliverableIds(allDeliverableIds);
      setShowSelectionToolbar(true);
    }
  };

  const handleBulkDeleteDeliverables = async () => {
    if (selectedDeliverableIds.length === 0) return;
    
    setBulkOperationLoading(true);
    try {
      // Delete the deliverables (this will cascade delete associated files)
      const { error } = await supabase
        .from('deliverables')
        .delete()
        .in('id', selectedDeliverableIds);

      if (error) {
        console.error('Error deleting deliverables:', error);
        throw new Error('Failed to delete deliverables');
      }

      // Get deliverable names for toast
      const deletedDeliverables = deliverables.filter(d => selectedDeliverableIds.includes(d.id));

      // Update local state
      setDeliverables(prev => prev.filter(d => !selectedDeliverableIds.includes(d.id)));
      
      // Clear selection and hide toolbar
      setSelectedDeliverableIds([]);
      setShowSelectionToolbar(false);
      
      // Update release status based on remaining deliverables
      await updateReleaseStatus(id as string);
      
      // Show success toast
      if (deletedDeliverables.length === 1) {
        success(
          `"${deletedDeliverables[0].name}" has been deleted`,
          undefined,
          <Trash2 className="w-5 h-5 text-red-400" />
        );
      } else {
        success(
          `${deletedDeliverables.length} deliverables have been deleted`,
          undefined,
          <Trash2 className="w-5 h-5 text-red-400" />
        );
      }
      
    } catch (err) {
      console.error('Error deleting deliverables:', err);
      error('Failed to delete deliverables', 'Please try again or contact support if the issue persists.');
    } finally {
      setBulkOperationLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleUploadToDeliverable = async (deliverableId: string, files: File[]) => {
    if (files.length === 0) return;
    
    setUploadingToDeliverable(deliverableId);
    const uploadedFiles: string[] = [];
    const failedFiles: string[] = [];

    try {
      for (const file of files) {
        // Upload file to Supabase Storage
        const fileName = `${Date.now()}-${file.name}`;
        const filePath = `deliverable-files/${deliverableId}/${fileName}`;

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
            deliverable_id: deliverableId,
            status: 'in_progress'
          })
          .select()
          .single();

        if (dbError) {
          console.error('Error creating file record:', dbError);
          failedFiles.push(file.name);
        } else if (insertedFile) {
          uploadedFiles.push(file.name);
        }
      }

      // Refresh deliverables to show new files
      if (id) {
        const deliverableIds = deliverables.map(d => d.id);
        if (deliverableIds.length > 0) {
          const { data: allFiles } = await supabase
            .from('deliverable_files')
            .select('*')
            .in('deliverable_id', deliverableIds)
            .order('created_at', { ascending: false });

          if (allFiles) {
            const filesMap: { [key: string]: any[] } = {};
            allFiles.forEach(file => {
              if (!filesMap[file.deliverable_id]) {
                filesMap[file.deliverable_id] = [];
              }
              if (filesMap[file.deliverable_id].length < 4) {
                filesMap[file.deliverable_id].push(file);
              }
            });

            setDeliverables(prev => prev.map(d => ({
              ...d,
              deliverable_files: filesMap[d.id] || []
            })));
          }
        }
      }

      // Show success/error toasts
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
      setUploadingToDeliverable(null);
    }
  };

  const handleDuplicateDeliverables = async () => {
    if (selectedDeliverableIds.length === 0) return;
    
    setBulkOperationLoading(true);
    try {
      const selectedDeliverables = deliverables.filter(d => selectedDeliverableIds.includes(d.id));
      
      // Create duplicates of selected deliverables
      const duplicateData = selectedDeliverables.map(deliverable => ({
        name: `${deliverable.name} (Copy)`,
        type: deliverable.type,
        description: deliverable.description,
        online_deadline: deliverable.online_deadline,
        offline_deadline: deliverable.offline_deadline,
        release_id: release!.id,
        status: 'in_progress'
      }));

      const { error } = await supabase
        .from('deliverables')
        .insert(duplicateData);

      if (error) {
        console.error('Error duplicating deliverables:', error);
        throw new Error('Failed to duplicate deliverables');
      }

      // Refresh deliverables list
      const { data: refreshedDeliverables, error: refreshError } = await supabase
        .from('deliverables')
        .select('*')
        .eq('release_id', release!.id)
        .order('created_at', { ascending: false });

      if (refreshError) {
        console.error('Error refreshing deliverables:', refreshError);
      } else {
        // Sort deliverables: non-final first, then final deliverables
        const sortedDeliverables = (refreshedDeliverables || []).sort((a, b) => {
          const aIsFinal = a.status === 'final';
          const bIsFinal = b.status === 'final';
          
          // Non-final deliverables come first
          if (aIsFinal && !bIsFinal) return 1;
          if (!aIsFinal && bIsFinal) return -1;
          
          // If both have same status, sort by creation date (newest first)
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
        
        setDeliverables(sortedDeliverables);
      }

      // Clear selection and hide toolbar
      setSelectedDeliverableIds([]);
      setShowSelectionToolbar(false);
      
      // Show success toast
      if (selectedDeliverables.length === 1) {
        success(
          `"${selectedDeliverables[0].name}" has been duplicated`,
          undefined,
          <Plus className="w-5 h-5 text-green-400" />
        );
      } else {
        success(
          `${selectedDeliverables.length} deliverables have been duplicated`,
          undefined,
          <Plus className="w-5 h-5 text-green-400" />
        );
      }
      
    } catch (err) {
      console.error('Error duplicating deliverables:', err);
      error('Failed to duplicate deliverables', 'Please try again or contact support if the issue persists.');
    } finally {
      setBulkOperationLoading(false);
    }
  };

  const handleMarkAllAssetsAsFinalBulk = async () => {
    if (selectedDeliverableIds.length === 0) return;
    
    setBulkOperationLoading(true);
    try {
      // First, check if there are any files to update
      const { data: existingFiles, error: checkError } = await supabase
        .from('deliverable_files')
        .select('id')
        .in('deliverable_id', selectedDeliverableIds);

      if (checkError) {
        console.error('Error checking existing files:', checkError);
        throw new Error(`Failed to check existing files: ${checkError.message}`);
      }

      if (!existingFiles || existingFiles.length === 0) {
        // No files to update, just update deliverable statuses to final
        console.log('No files found to mark as final, updating deliverable statuses directly');
      } else {
        // Mark all files in the selected deliverables as final
        const { error: filesError } = await supabase
          .from('deliverable_files')
          .update({ status: 'final' })
          .in('deliverable_id', selectedDeliverableIds);

        if (filesError) {
          console.error('Error marking files as final:', filesError);
          console.error('Error details:', {
            message: filesError.message,
            details: filesError.details,
            hint: filesError.hint,
            code: filesError.code
          });
          throw new Error(`Failed to mark files as final: ${filesError.message}`);
        }
      }

      // Get all files for the selected deliverables to check their status
      const { data: allFiles, error: filesCheckError } = await supabase
        .from('deliverable_files')
        .select('*')
        .in('deliverable_id', selectedDeliverableIds);

      if (filesCheckError) {
        console.error('Error checking files status:', filesCheckError);
        throw new Error('Failed to check files status');
      }

      // Group files by deliverable and determine which deliverables should be marked as final
      const deliverableFileCounts: { [key: string]: { total: number; final: number } } = {};
      
      allFiles?.forEach(file => {
        if (!deliverableFileCounts[file.deliverable_id]) {
          deliverableFileCounts[file.deliverable_id] = { total: 0, final: 0 };
        }
        deliverableFileCounts[file.deliverable_id].total++;
        if (file.status === 'final') {
          deliverableFileCounts[file.deliverable_id].final++;
        }
      });

      // Update deliverable statuses based on their files
      const deliverablesToUpdate = selectedDeliverableIds.map(deliverableId => {
        const fileCount = deliverableFileCounts[deliverableId];
        // If no files exist, mark as final (since we're marking "all assets as final")
        const shouldBeFinal = !fileCount || fileCount.total === 0 || fileCount.total === fileCount.final;
        return { id: deliverableId, status: shouldBeFinal ? 'final' : 'in_progress' };
      });

      // Update deliverables in batches
      for (const deliverable of deliverablesToUpdate) {
        const { error: deliverableError } = await supabase
          .from('deliverables')
          .update({ status: deliverable.status })
          .eq('id', deliverable.id);

        if (deliverableError) {
          console.error('Error updating deliverable status:', deliverableError);
        }
      }

      // Refresh the deliverables list
      const { data: updatedDeliverables, error: refreshError } = await supabase
        .from('deliverables')
        .select('*')
        .eq('release_id', id)
        .order('created_at', { ascending: false });

      if (refreshError) {
        console.error('Error refreshing deliverables:', refreshError);
      } else {
        setDeliverables(updatedDeliverables || []);
      }
      
      // Clear selection and hide toolbar
      setSelectedDeliverableIds([]);
      setShowSelectionToolbar(false);
      
      // Update release status based on updated deliverables
      await updateReleaseStatus(id as string);
      
      // Show success toast
      const selectedCount = selectedDeliverableIds.length;
      success(
        `All assets in ${selectedCount} deliverable${selectedCount > 1 ? 's' : ''} marked as final`,
        undefined,
        <Check className="w-5 h-5 text-green-400" />
      );
      
    } catch (err) {
      console.error('Error marking assets as final:', err);
      error('Failed to mark assets as final', 'Please try again or contact support if the issue persists.');
    } finally {
      setBulkOperationLoading(false);
    }
  };

  const handleAddDefaultDeliverables = async () => {
    if (!release) return;
    
    setAddingDefaultDeliverables(true);
    try {
      const defaultDeliverables = [
        { name: 'Single Artwork', type: 'folder' },
        { name: 'Keystone Photos', type: 'folder' },
        { name: 'Press-Photos', type: 'folder' },
        { name: 'SoMe Photo Bank', type: 'folder' },
        { name: 'Illustration / Graphics', type: 'folder' },
        { name: 'Video Assets', type: 'folder' }
      ];

      // Insert all default deliverables
      const { data: insertedDeliverables, error } = await supabase
        .from('deliverables')
        .insert(
          defaultDeliverables.map(deliverable => ({
            name: deliverable.name,
            type: deliverable.type,
            release_id: release.id,
            status: 'in_progress'
          }))
        )
        .select();

      if (error) {
        console.error('Error creating default deliverables:', error);
        throw new Error('Failed to create default deliverables');
      }

      // Refresh deliverables list
      const { data: refreshedDeliverables, error: refreshError } = await supabase
        .from('deliverables')
        .select('*')
        .eq('release_id', release.id)
        .order('created_at', { ascending: false });

      if (refreshError) {
        console.error('Error refreshing deliverables:', refreshError);
      } else {
        // Sort deliverables: non-final first, then final deliverables
        const sortedDeliverables = (refreshedDeliverables || []).sort((a, b) => {
          const aIsFinal = a.status === 'final';
          const bIsFinal = b.status === 'final';
          
          // Non-final deliverables come first
          if (aIsFinal && !bIsFinal) return 1;
          if (!aIsFinal && bIsFinal) return -1;
          
          // If both have same status, sort by creation date (newest first)
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
        
        setDeliverables(sortedDeliverables);
      }

      // Update release status based on new deliverables
      await updateReleaseStatus(id as string);
      
      // Show success toast
      success(
        `${defaultDeliverables.length} suggested deliverables have been added`,
        undefined,
        <Plus className="w-5 h-5 text-green-400" />
      );

    } catch (err) {
      console.error('Error adding suggested deliverables:', err);
      error('Failed to add suggested deliverables', 'Please try again or contact support if the issue persists.');
    } finally {
      setAddingDefaultDeliverables(false);
    }
  };

  if (loading) {
    return (
      <AuthWrapper>
        <Layout>
          <div className="text-white">
            <div className="mb-6">
              <h1 className="text-2xl font-bold">Release</h1>
            </div>
            <div className="flex items-center justify-center py-12">
              <Spinner size="lg" />
            </div>
          </div>
        </Layout>
      </AuthWrapper>
    );
  }

  if (!release) {
    return (
      <AuthWrapper>
        <Layout>
          <div className="p-6 text-red-500">Release not found.</div>
        </Layout>
      </AuthWrapper>
    );
  }

  return (
    <AuthWrapper>
      <Layout>
        <motion.div 
          className="text-white"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, ease: "easeIn" }}
        >
          <BlurredHeader imageUrl={release.cover_url}>
            <div className="flex items-end space-x-8">
              {/* Cover Image */}
              <div className="flex-shrink-0">
                {release.cover_url ? (
                  <div
                    data-release-thumbnail={release.id}
                    className="w-48 h-48 relative overflow-hidden rounded-3xl"
                  >
                    <Image
                      src={release.cover_url}
                      alt={release.title}
                      fill
                      className="object-cover rounded-3xl"
                    />
                  </div>
                ) : (
                  <div
                    data-release-thumbnail={release.id}
                    className="w-48 h-48 bg-gray-500 rounded-3xl flex items-center justify-center text-gray-400"
                  >
                    <Music className="w-28 h-28" />
                  </div>
                )}
              </div>

              {/* Release Info */}
              <div className="flex-1 flex flex-col justify-end">
                <div className="flex items-end justify-between mb-4">
                  <div className="flex flex-col">
                    <h1 className="text-3xl font-bold mb-2">{release.title}</h1>
                    
                    {artists.length > 0 && (
                      <div className="flex items-center gap-2">
                        {artists.map((artist: Artist, index: number) => (
                          <button
                            key={artist.id}
                            onClick={() => router.push(`/artists/${artist.id}`)}
                            className="flex items-center gap-2 px-1.5 py-1 pr-3 rounded-full transition-colors cursor-pointer text-sm"
                            style={{
                              backgroundColor: 'rgba(255, 255, 255, 0.12)'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.24)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.12)';
                            }}
                          >
                            {/* Artist Avatar */}
                            <div className="flex-shrink-0">
                              {artist.image_url ? (
                                <img
                                  src={artist.image_url}
                                  alt={artist.name}
                                  className="w-5 h-5 rounded-full object-cover"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                  }}
                                />
                              ) : null}
                              <div className={`w-5 h-5 rounded-full bg-gray-600 flex items-center justify-center ${artist.image_url ? 'hidden' : ''}`}>
                                <span className="text-xs text-gray-300 font-medium">
                                  {artist.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            </div>
                            <span className="text-sm text-white">{artist.name}</span>
                          </button>
                        ))}
                        
                        {/* Release Type */}
                        {release.type && (
                          <>
                            <span className="text-white text-xs">·</span>
                            <span className="text-sm text-white capitalize">{release.type}</span>
                          </>
                        )}
                      </div>
                    )}
                    
                    {release.catalog_number && (
                      <div className="mt-2 text-sm">
                        <span className="text-gray-400">Catalog: </span>
                        <span>{release.catalog_number}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {/* Share Button - Only show if user can manage access */}
                    {permissions.canManageAccess && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setShowShareModal(true)}
                        className="flex items-center gap-2"
                      >
                        <Share className="w-4 h-4" />
                        Share
                      </Button>
                    )}
                    
                    {/* Add Menu - Only show if user can create deliverables */}
                    {permissions.canCreateDeliverables && (
                      <div className="relative">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => setShowAddMenu(!showAddMenu)}
                          className="flex items-center gap-2"
                        >
                          Add
                          <ChevronDown className="w-4 h-4" />
                        </Button>
                        
                        <Menu
                          isOpen={showAddMenu}
                          onClose={() => setShowAddMenu(false)}
                          items={[
                            {
                              label: 'Add deliverable',
                              onClick: () => {
                                setShowAddMenu(false);
                                setShowDeliverableForm(true);
                              }
                            },
                            {
                              label: 'Add suggested deliverables',
                              onClick: () => {
                                setShowAddMenu(false);
                                handleAddDefaultDeliverables();
                              }
                            }
                          ]}
                          position="bottom"
                          align="right"
                        />
                      </div>
                    )}
                    
                    {/* Three Dots Menu - Only show if user has edit permissions */}
                    {(permissions.canEdit || permissions.canDeleteDeliverables) && (
                      <div className="relative">
                        <IconButton
                          variant="ghost"
                          size="sm"
                          icon={MoreHorizontal}
                          onClick={() => setShowReleaseMenu(!showReleaseMenu)}
                          className="h-8 w-8"
                        />
                        
                        <Menu
                          isOpen={showReleaseMenu}
                          onClose={() => setShowReleaseMenu(false)}
                          items={[
                            ...(permissions.canEdit ? [{
                              label: 'Edit release',
                              onClick: () => {
                                setShowReleaseMenu(false);
                                setShowReleaseEditForm(true);
                              },
                              icon: <Edit className="w-4 h-4 mr-2" />
                            }] : []),
                            ...(permissions.canDeleteDeliverables ? [{
                              label: 'Delete release',
                              onClick: () => {
                                setShowReleaseMenu(false);
                                setShowReleaseDeleteModal(true);
                              },
                              icon: <Trash2 className="w-4 h-4 mr-2" />
                            }] : [])
                          ]}
                          position="bottom"
                          align="right"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </BlurredHeader>

          {/* Deliverables Section */}
          <div 
            className="blurred-header-full-width py-6 overflow-visible"
            style={{
              marginLeft: 'calc(50% - 50vw)',
              marginRight: 'calc(50% - 50vw)',
              width: '100vw',
              position: 'relative'
            }}
          >
            <div className="px-6 lg:px-[16%]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Deliverables</h2>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    // Filter dropdown functionality can be added here
                  }}
                  className="flex items-center gap-1.5"
                >
                  Filter
                  <ChevronDown className="w-4 h-4" />
                </Button>
                <div className="flex items-center gap-1 border border-gray-600 rounded-md overflow-hidden">
                  <button
                    onClick={() => setViewMode('gallery')}
                    className={`px-3 py-1.5 transition-colors ${
                      viewMode === 'gallery'
                        ? 'bg-gray-700 text-white'
                        : 'bg-transparent text-gray-400 hover:text-white hover:bg-gray-800'
                    }`}
                    aria-label="Gallery view"
                  >
                    <Grid3x3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`px-3 py-1.5 transition-colors ${
                      viewMode === 'list'
                        ? 'bg-gray-700 text-white'
                        : 'bg-transparent text-gray-400 hover:text-white hover:bg-gray-800'
                    }`}
                    aria-label="List view"
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
            
            {deliverables.length === 0 ? (
              <div className="p-12 text-center">
                <FileText className="w-8 h-8 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-300 text-lg font-medium mb-1">No deliverables yet</p>
                <p className="text-gray-400 text-sm mb-6">
                  {permissions.canCreateDeliverables 
                    ? 'Add asset packs and folders here' 
                    : 'No deliverables have been created for this release'
                  }
                </p>
                
                {permissions.canCreateDeliverables && (
                  <div className="flex flex-col items-center gap-3">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleAddDefaultDeliverables}
                      disabled={addingDefaultDeliverables}
                      loading={addingDefaultDeliverables}
                    >
                      Add suggested deliverables
                    </Button>
                    
                    <div className="text-sm text-gray-400">
                      or{' '}
                      <button 
                        className="text-white underline hover:text-gray-300 transition-colors"
                        onClick={() => setShowDeliverableForm(true)}
                      >
                        create new deliverable
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : viewMode === 'gallery' ? (
              <div className="grid grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 lg:gap-4 -mx-4">
                {[...deliverables].sort((a, b) => {
                  // Sort by days till offline deadline (lowest first)
                  const getDaysTillOffline = (deliverable: Deliverable) => {
                    if (!deliverable.offline_deadline) return Infinity; // No deadline goes to end
                    const offlineDate = new Date(deliverable.offline_deadline);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    offlineDate.setHours(0, 0, 0, 0);
                    return Math.ceil((offlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                  };
                  
                  const daysA = getDaysTillOffline(a);
                  const daysB = getDaysTillOffline(b);
                  
                  return daysA - daysB;
                }).map((deliverable) => {
                  // Filter for image files only and get first 4 for gallery view
                  const imageFiles = deliverable.deliverable_files?.filter(f => f.file_type.startsWith('image/')) || [];
                  const firstFourImages = imageFiles.slice(0, 4);
                  // Ensure we always have an array with 4 elements (fill with undefined if needed)
                  const displayImages = [...firstFourImages, ...Array(Math.max(0, 4 - firstFourImages.length)).fill(undefined)];
                  
                  return (
                    <div
                      key={deliverable.id}
                      className={`relative group ${
                        draggedOverDeliverableId === deliverable.id 
                          ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-gray-800 rounded-3xl' 
                          : ''
                      } ${
                        uploadingToDeliverable === deliverable.id
                          ? 'opacity-75'
                          : ''
                      }`}
                      onDragOver={(e: React.DragEvent) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDraggedOverDeliverableId(deliverable.id);
                      }}
                      onDragLeave={(e: React.DragEvent) => {
                        e.preventDefault();
                        e.stopPropagation();
                        // Only clear if we're leaving the card entirely
                        const rect = e.currentTarget.getBoundingClientRect();
                        const x = e.clientX;
                        const y = e.clientY;
                        if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
                          setDraggedOverDeliverableId(null);
                        }
                      }}
                      onDrop={async (e: React.DragEvent) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDraggedOverDeliverableId(null);
                        
                        const droppedFiles = Array.from(e.dataTransfer.files) as File[];
                        if (droppedFiles.length === 0) return;
                        
                        await handleUploadToDeliverable(deliverable.id, droppedFiles);
                      }}
                    >
                    <Card
                      onClick={() => router.push(`/deliverables/${deliverable.id}`)}
                      className="relative group"
                    >
                      {/* Selection checkbox */}
                      <div
                        className="absolute top-2 right-2 z-10 cursor-pointer transition-all"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeliverableSelection(deliverable.id);
                        }}
                      >
                        {selectedDeliverableIds.includes(deliverable.id) ? (
                          <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ backgroundColor: '#0371DF' }}>
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 bg-gray-700 border border-gray-400 hover:border-gray-300 rounded-md transition-colors opacity-0 group-hover:opacity-100"></div>
                        )}
                      </div>
                      
                      {/* Image Section */}
                      <div className="px-4 pt-4">
                        <div className="aspect-square bg-gray-700 relative overflow-hidden rounded-3xl">
                          {uploadingToDeliverable === deliverable.id && (
                            <div className="absolute inset-0 bg-gray-900/80 backdrop-blur-sm flex items-center justify-center z-20 rounded-3xl">
                              <div className="flex flex-col items-center gap-2">
                                <Loader2 className="w-8 h-8 text-white animate-spin" />
                                <p className="text-white text-sm">Uploading...</p>
                              </div>
                            </div>
                          )}
                          {draggedOverDeliverableId === deliverable.id && uploadingToDeliverable !== deliverable.id && (
                            <div className="absolute inset-0 bg-blue-500/20 backdrop-blur-sm flex items-center justify-center z-10 rounded-3xl border-2 border-blue-500 border-dashed">
                              <div className="flex flex-col items-center gap-2">
                                <Upload className="w-8 h-8 text-blue-400" />
                                <p className="text-blue-400 text-sm font-medium">Drop to upload</p>
                              </div>
                            </div>
                          )}
                          <div className="grid grid-cols-2 grid-rows-2 h-full w-full gap-2.5 p-6">
                            {displayImages.map((imageFile, idx) => {
                              return (
                                <div key={idx} className="relative overflow-hidden rounded-md aspect-square">
                                  {imageFile ? (
                                    <Image
                                      src={imageFile.file_url}
                                      alt={imageFile.name}
                                      fill
                                      className="object-cover"
                                      quality={85}
                                    />
                                  ) : (
                                    <div className="w-full h-full bg-gray-600 rounded-md"></div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                      
                      {/* Content Section */}
                      <div className="px-4 pb-4 pt-3">
                        <div className="flex items-center justify-start gap-2">
                          <Tooltip content={getDeliverableStatusDisplay(deliverable.status)} delay={300} position="bottom">
                            <div className="cursor-pointer">
                              {(() => {
                                switch (deliverable.status) {
                                  case 'not_started':
                                    return <Circle className="w-3 h-3 text-yellow-400" />;
                                  case 'in_progress':
                                    return <CircleDashed className="w-3 h-3 text-blue-400" />;
                                  case 'completed':
                                    return <CircleCheck className="w-3 h-3 text-green-400" />;
                                  case 'final':
                                    return <CircleCheck className="w-3 h-3 text-green-400" />;
                                  default:
                                    return <Circle className="w-3 h-3 text-yellow-400" />;
                                }
                              })()}
                            </div>
                          </Tooltip>
                          <h3 className="font-medium text-gray-300 group-hover:text-gray-200 text-xs truncate transition-colors flex-1 min-w-0">
                            {deliverable.name}
                          </h3>
                        </div>
                        {deliverable.offline_deadline && (() => {
                          const offlineDate = new Date(deliverable.offline_deadline);
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          offlineDate.setHours(0, 0, 0, 0);
                          const daysRemaining = Math.ceil((offlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                          
                          return (
                            <p className="text-xs text-gray-400 truncate mt-0.5">
                              {daysRemaining > 0 
                                ? `${daysRemaining}d till offline`
                                : daysRemaining === 0
                                  ? 'Due today'
                                  : `${Math.abs(daysRemaining)}d overdue`
                              }
                            </p>
                          );
                        })()}
                      </div>
                    </Card>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="overflow-visible">
                <table className="w-full border-separate" style={{ borderSpacing: '0 1px' }}>
                  <thead>
                    <tr className="border-b border-gray-800">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-300">Name</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-300">Status</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-300">Offline</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-300">Online</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-300">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deliverables.map((deliverable) => (
                      <tr 
                        key={deliverable.id} 
                        className={`hover:bg-gray-800 cursor-pointer group transition-colors duration-100 rounded-xl ${
                          selectedDeliverableIds.includes(deliverable.id) ? 'bg-gray-800' : ''
                        } ${
                          draggedOverDeliverableId === deliverable.id 
                            ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-gray-800' 
                            : ''
                        } ${
                          uploadingToDeliverable === deliverable.id
                            ? 'opacity-75'
                            : ''
                        }`}
                        onClick={() => router.push(`/deliverables/${deliverable.id}`)}
                        onDragOver={(e: React.DragEvent) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setDraggedOverDeliverableId(deliverable.id);
                        }}
                        onDragLeave={(e: React.DragEvent) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const rect = e.currentTarget.getBoundingClientRect();
                          const x = e.clientX;
                          const y = e.clientY;
                          if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
                            setDraggedOverDeliverableId(null);
                          }
                        }}
                        onDrop={async (e: React.DragEvent) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setDraggedOverDeliverableId(null);
                          
                          const droppedFiles = Array.from(e.dataTransfer.files) as File[];
                          if (droppedFiles.length === 0) return;
                          
                          await handleUploadToDeliverable(deliverable.id, droppedFiles);
                        }}
                      >
                        <td className="py-3 px-4 rounded-l-xl relative">
                          {uploadingToDeliverable === deliverable.id && (
                            <div className="absolute inset-0 bg-gray-900/80 backdrop-blur-sm flex items-center justify-center z-20 rounded-l-xl">
                              <div className="flex items-center gap-2">
                                <Loader2 className="w-5 h-5 text-white animate-spin" />
                                <p className="text-white text-sm">Uploading...</p>
                              </div>
                            </div>
                          )}
                          {draggedOverDeliverableId === deliverable.id && uploadingToDeliverable !== deliverable.id && (
                            <div className="absolute inset-0 bg-blue-500/20 backdrop-blur-sm flex items-center justify-center z-10 rounded-l-xl border-2 border-blue-500 border-dashed">
                              <div className="flex items-center gap-2">
                                <Upload className="w-5 h-5 text-blue-400" />
                                <p className="text-blue-400 text-sm font-medium">Drop to upload</p>
                              </div>
                            </div>
                          )}
                          <div className="flex items-center gap-3">
                            {/* Status icon with checkbox overlay */}
                            <div className="w-8 h-8 rounded flex items-center justify-center relative">
                              {/* Checkbox - appears on top of status icon on hover */}
                              <div
                                className="absolute inset-0 flex items-center justify-center cursor-pointer transition-all duration-150 z-10"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeliverableSelection(deliverable.id);
                                }}
                              >
                                {selectedDeliverableIds.includes(deliverable.id) ? (
                                  <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ backgroundColor: '#0371DF' }}>
                                    <Check className="w-3 h-3 text-white" />
                                  </div>
                                ) : (
                                  <div className="w-5 h-5 bg-gray-700 border border-gray-400 hover:border-gray-300 rounded-md transition-colors opacity-0 group-hover:opacity-100"></div>
                                )}
                              </div>
                              
                              {/* Status icon - always visible behind checkbox */}
                              {getStatusIcon(deliverable.status)}
                            </div>
                            <div className="flex gap-0.5 relative">
                              {/* Show first 3 file thumbnails stacked */}
                              {deliverable.deliverable_files && deliverable.deliverable_files.slice(0, 3).map((file, index) => (
                                <div 
                                  key={file.id} 
                                  className={`w-6 h-6 rounded border-3 flex items-center justify-center ${
                                    selectedDeliverableIds.includes(deliverable.id) 
                                      ? 'border-gray-800' 
                                      : 'border-gray-900 group-hover:border-gray-800'
                                  }`}
                                  style={{ 
                                    zIndex: 3 - index,
                                    marginLeft: index > 0 ? '-8px' : '0'
                                  }}
                                >
                                  <div className="w-5 h-5 bg-gray-600 rounded overflow-hidden">
                                    {file.file_type.startsWith('image/') ? (
                                      <Image
                                        src={file.file_url}
                                        alt={file.name}
                                        width={20}
                                        height={20}
                                        className="w-full h-full object-cover"
                                        quality={85}
                                      />
                                    ) : (
                                      <div className="w-full h-full bg-gray-500 flex items-center justify-center">
                                        <svg className="w-3 h-3 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                                        </svg>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                              {/* Show placeholder thumbnails if less than 3 files */}
                              {(!deliverable.deliverable_files || deliverable.deliverable_files.length < 3) && 
                                Array.from({ length: Math.max(0, 3 - (deliverable.deliverable_files?.length || 0)) }).map((_, index) => (
                                  <div 
                                    key={`placeholder-${index}`} 
                                    className={`w-6 h-6 rounded border-3 flex items-center justify-center ${
                                      selectedDeliverableIds.includes(deliverable.id) 
                                        ? 'border-gray-800' 
                                        : 'border-gray-900 group-hover:border-gray-800'
                                    }`}
                                    style={{ 
                                      zIndex: 3 - (deliverable.deliverable_files?.length || 0) - index,
                                      marginLeft: (deliverable.deliverable_files?.length || 0) + index > 0 ? '-8px' : '0'
                                    }}
                                  >
                                    <div className="w-5 h-5 bg-gray-600 group-hover:bg-gray-500 rounded transition-colors"></div>
                                  </div>
                                ))
                              }
                            </div>
                            <span className="text-white text-sm">{deliverable.name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {/* Status text */}
                          <span className="text-gray-300 text-sm">
                            {getDeliverableStatusDisplay(deliverable.status)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-300 text-sm">
                          {deliverable.offline_deadline ? new Date(deliverable.offline_deadline).toLocaleDateString() : '-'}
                        </td>
                        <td className="py-3 px-4 text-gray-300 text-sm">
                          {deliverable.online_deadline ? new Date(deliverable.online_deadline).toLocaleDateString() : '-'}
                        </td>
                        <td className="py-3 px-4 rounded-r-xl text-right">
                          <div className="relative" style={{ zIndex: showDeliverableMenu === deliverable.id ? 10000 : 'auto' }}>
                            <IconButton
                              variant="ghost"
                              size="sm"
                              icon={MoreHorizontal}
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowDeliverableMenu(showDeliverableMenu === deliverable.id ? null : deliverable.id);
                              }}
                              className="h-8 w-8"
                            />
                            
                            <Menu
                              isOpen={showDeliverableMenu === deliverable.id}
                              onClose={() => setShowDeliverableMenu(null)}
                              className="overflow-visible"
                              items={
                                deliverable.status === 'final' 
                                  ? [
                                      ...(permissions.canOverrideApprovals ? [{
                                        label: 'Mark all assets as in progress',
                                        onClick: () => {
                                          handleDeliverableStatusChange(deliverable.id, 'in_progress');
                                          setShowDeliverableMenu(null);
                                        },
                                        icon: <RotateCcw className="w-4 h-4 mr-2" />
                                      }] : []),
                                      ...(permissions.canEditDeliverables ? [{
                                        label: 'Edit deliverable',
                                        onClick: () => {
                                          setDeliverableToEdit(deliverable);
                                          setShowDeliverableMenu(null);
                                          setShowDeliverableForm(true);
                                        },
                                        icon: <Edit className="w-4 h-4 mr-2" />
                                      }] : []),
                                      ...(permissions.canDeleteDeliverables ? [{
                                        label: 'Delete deliverable',
                                        onClick: () => {
                                          setDeliverableToDelete(deliverable);
                                          setShowDeliverableMenu(null);
                                        },
                                        icon: <Trash2 className="w-4 h-4 mr-2" />
                                      }] : [])
                                    ]
                                  : [
                                      ...(permissions.canOverrideApprovals ? [{
                                        label: 'Mark all assets as final',
                                        onClick: () => {
                                          handleMarkAllAssetsAsFinal(deliverable.id);
                                          setShowDeliverableMenu(null);
                                        },
                                        icon: <Check className="w-4 h-4 mr-2" />
                                      }] : []),
                                      ...(permissions.canEditDeliverables ? [{
                                        label: 'Edit deliverable',
                                        onClick: () => {
                                          setDeliverableToEdit(deliverable);
                                          setShowDeliverableMenu(null);
                                          setShowDeliverableForm(true);
                                        },
                                        icon: <Edit className="w-4 h-4 mr-2" />
                                      }] : []),
                                      ...(permissions.canDeleteDeliverables ? [{
                                        label: 'Delete deliverable',
                                        onClick: () => {
                                          setDeliverableToDelete(deliverable);
                                          setShowDeliverableMenu(null);
                                        },
                                        icon: <Trash2 className="w-4 h-4 mr-2" />
                                      }] : [])
                                    ]
                              }
                              position="bottom"
                              align="right"
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            </div>
          </div>
        </motion.div>

        <NewDeliverableForm
          isOpen={showDeliverableForm}
          onClose={() => {
            setShowDeliverableForm(false);
            setDeliverableToEdit(null);
          }}
          releaseId={release.id}
          releaseTitle={release.title}
          onDeliverableCreated={handleDeliverableCreated}
          deliverableToEdit={deliverableToEdit}
        />

        <ReleaseEditForm
          isOpen={showReleaseEditForm}
          onClose={() => setShowReleaseEditForm(false)}
          release={release}
          onReleaseUpdated={() => {
            // Refresh the page to show updated data
            window.location.reload();
          }}
        />

        {/* Delete Confirmation Modal */}
        {deliverableToDelete && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-700 p-6 rounded-lg w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-white">Delete Deliverable</h2>
                <button
                  onClick={() => setDeliverableToDelete(null)}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="mb-6">
                <p className="text-gray-300 mb-2">
                  Are you sure you want to delete <span className="font-semibold text-white">{deliverableToDelete.name}</span>?
                </p>
                <p className="text-sm text-gray-400">
                  This action cannot be undone. All asset files within this deliverable will be deleted permanently.
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="danger"
                  onClick={handleDeleteDeliverable}
                  disabled={deleteLoading}
                  loading={deleteLoading}
                  className="flex-1"
                >
                  {deleteLoading ? 'Deleting...' : 'Delete'}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setDeliverableToDelete(null)}
                  disabled={deleteLoading}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Release Delete Confirmation Modal */}
        {showReleaseDeleteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-700 p-6 rounded-lg w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-white">Delete Release</h2>
                <button
                  onClick={() => setShowReleaseDeleteModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="mb-6">
                <p className="text-gray-300 mb-2">
                  Are you sure you want to delete <span className="font-semibold text-white">{release?.title}</span>?
                </p>
                <p className="text-sm text-gray-400">
                  This action cannot be undone. All deliverables and asset files within this release will be deleted permanently.
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="danger"
                  onClick={handleDeleteRelease}
                  disabled={releaseDeleteLoading}
                  loading={releaseDeleteLoading}
                  className="flex-1"
                >
                  {releaseDeleteLoading ? 'Deleting...' : 'Delete'}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setShowReleaseDeleteModal(false)}
                  disabled={releaseDeleteLoading}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Selection Toolbar */}
        <div className={`fixed left-0 right-0 z-[60] flex justify-center transition-all duration-200 ease-out ${
          showSelectionToolbar ? 'bottom-6 opacity-100' : 'bottom-0 opacity-0 pointer-events-none'
        }`}>
          <div className="bg-gray-800 border border-gray-700 rounded-lg px-6 py-4 flex items-center gap-2 shadow-lg">
            {/* Close button */}
            <button
              onClick={() => {
                setSelectedDeliverableIds([]);
                setShowSelectionToolbar(false);
              }}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Counter */}
            <span className="text-white text-sm font-medium mr-4">
              {selectedDeliverableIds.length} selected
            </span>

            {/* Select all button */}
            <button
              onClick={handleSelectAllDeliverables}
              className="flex items-center gap-2 text-white text-sm font-medium hover:text-gray-300 transition-colors mr-4"
            >
              <div className="flex items-center">
                {(() => {
                  const allSelected = selectedDeliverableIds.length === deliverables.length;
                  const someSelected = selectedDeliverableIds.length > 0;
                  
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

            {/* Action buttons - Only show if user has permissions */}
            {permissions.canDeleteDeliverables && (
              <div className="relative">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>

              {/* Delete confirmation tooltip */}
              {showDeleteConfirm && (
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 bg-gray-800 border border-gray-600 rounded-lg p-3 shadow-lg z-50">
                  <div className="text-white text-sm mb-3">
                    This will permanently delete {selectedDeliverableIds.length} deliverable{selectedDeliverableIds.length > 1 ? 's' : ''}. This action cannot be undone.
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={handleBulkDeleteDeliverables}
                      disabled={bulkOperationLoading}
                      className="flex-1"
                    >
                      Delete
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setShowDeleteConfirm(false)}
                      disabled={bulkOperationLoading}
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
            )}

            {permissions.canCreateDeliverables && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleDuplicateDeliverables}
                disabled={bulkOperationLoading}
              >
                <Copy className="w-4 h-4 mr-2" />
                Duplicate
              </Button>
            )}

            {/* Edit button - only available when 1 deliverable is selected and user can edit */}
            {selectedDeliverableIds.length === 1 && permissions.canEditDeliverables && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  const selectedDeliverable = deliverables.find(d => d.id === selectedDeliverableIds[0]);
                  if (selectedDeliverable) {
                    setDeliverableToEdit(selectedDeliverable);
                    setShowDeliverableForm(true);
                    setSelectedDeliverableIds([]);
                    setShowSelectionToolbar(false);
                  }
                }}
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
            )}

            {permissions.canOverrideApprovals && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleMarkAllAssetsAsFinalBulk}
                disabled={bulkOperationLoading}
              >
                {bulkOperationLoading ? (
                  <Spinner size="sm" />
                ) : (
                  <>
                    <CircleCheck className="w-4 h-4 mr-2" />
                    Mark all assets as final
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
        
        <ShareAccessModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          resourceType="release"
          resourceId={id as string}
          resourceName={release?.title || ''}
          resourceDescription={artists[0]?.name ? `by ${artists[0].name}` : undefined}
        />
        
        <ToastContainer toasts={toasts} onClose={removeToast} />
      </Layout>
    </AuthWrapper>
  );
} 