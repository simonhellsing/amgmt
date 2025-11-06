import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { createMentionNotifications } from '../lib/notificationUtils';
import Spinner from './Spinner';
import IconButton from './IconButton';
import AssetDetailHeader from './AssetDetailHeader';
import Menu from './Menu';
import AudioWaveform from './AudioWaveform';
import WaveformIcon from './WaveformIcon';
import { 
  Download, 
  Check, 
  X, 
  ArrowLeft, 
  ArrowRight, 
  FileText, 
  MoreHorizontal,
  Share2,
  Loader2,
  Send,
  MessageCircle,
  ChevronRight,
  ChevronLeft,
  AtSign,
  CheckCircle,
  CircleCheck,
  CircleDashed,
  PanelRightClose,
  PanelRightOpen,
  Plus,
  Info,
  History,
  Clock,
  Tag,
  FileCheck,
  User,
  Calendar,
  Hash,
  Layers,
  ChevronLeft as MinimizeIcon,
  Trash2,
  Play,
  Music,
  ZoomIn,
  ZoomOut,
  Maximize
} from 'lucide-react';

interface DeliverableFile {
  id: string;
  name: string;
  file_type: string;
  file_size: number;
  file_url: string;
  created_at: string;
  status?: string;
  is_final?: boolean;
  version_number?: number;
  parent_file_id?: string | null;
  uploaded_by?: string | null;
  is_primary?: boolean;
  deliverable_id?: string;
}

interface FileVersion {
  id: string;
  name: string;
  file_url: string;
  file_type?: string;
  file_size?: number;
  version_number: number;
  created_at: string;
  is_primary: boolean;
  status?: string;
}

interface FileTag {
  id: string;
  tag: string;
  created_at: string;
}

interface UsageRight {
  id: string;
  owner_name: string;
  owner_type: string;
  rights_description?: string | null;
  valid_from?: string | null;
  valid_until?: string | null;
  created_at: string;
}

interface HistoryItem {
  id: string;
  action_type: string;
  action_description: string;
  performed_by?: string | null;
  created_at: string;
  metadata?: any;
  performer_name?: string;
}

interface Comment {
  id: string;
  content: string;
  user_id: string;
  user_name: string;
  avatar_url?: string | null;
  actual_name: string;
  created_at: string;
  tagged_users?: string[];
  version_number?: number;
  container_file_id?: string;
}

interface UserSuggestion {
  id: string;
  name: string;
  email: string;
  avatar_url?: string | null;
}

interface FilePreviewModalProps {
  isOpen: boolean;
  file: DeliverableFile | null;
  allFiles: DeliverableFile[];
  currentFileIndex: number;
  onClose: () => void;
  onFileChange: (index: number) => void;
  onFileUpdate?: () => void;
  deliverableName: string;
  artistName: string;
  releaseName: string;
  coverUrl?: string;
}

export default function FilePreviewModal({ 
  isOpen, 
  file,
  allFiles,
  currentFileIndex,
  onClose, 
  onFileChange,
  onFileUpdate,
  deliverableName,
  artistName,
  releaseName,
  coverUrl
}: FilePreviewModalProps) {
  const [markingAsFinal, setMarkingAsFinal] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(currentFileIndex);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [postingComment, setPostingComment] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentsMinimized, setCommentsMinimized] = useState(false);
  const [savedScrollPosition, setSavedScrollPosition] = useState(0);
  
  // Version management state
  const [showVersionPanel, setShowVersionPanel] = useState(false);
  const [versionPanelManuallyOpened, setVersionPanelManuallyOpened] = useState(false);
  const [versions, setVersions] = useState<FileVersion[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
  const [uploadingVersion, setUploadingVersion] = useState(false);
  const [versionMenuOpen, setVersionMenuOpen] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [newlyCreatedVersion, setNewlyCreatedVersion] = useState<FileVersion | null>(null);
  
  // Tab state
  const [activeTab, setActiveTab] = useState<'comments' | 'information'>('comments');
  
  // Information tab state
  const [tags, setTags] = useState<FileTag[]>([]);
  const [newTag, setNewTag] = useState('');
  const [loadingTags, setLoadingTags] = useState(false);
  const [usageRights, setUsageRights] = useState<UsageRight[]>([]);
  const [loadingUsageRights, setLoadingUsageRights] = useState(false);
  const [fileInfo, setFileInfo] = useState<any>(null);
  
  // History tab state
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  // Zoom and pan state for images
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Functions to handle scroll position preservation
  const saveScrollPosition = () => {
    const commentsContainer = document.querySelector('.comments-container');
    if (commentsContainer) {
      setSavedScrollPosition(commentsContainer.scrollTop);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      const commentsContainer = document.querySelector('.comments-container');
      if (commentsContainer) {
        commentsContainer.scrollTop = commentsContainer.scrollHeight;
      }
    }, 50); // Small delay to ensure DOM is updated
  };

  const scrollToComment = (commentId: string) => {
    setTimeout(() => {
      const commentElement = document.getElementById(`comment-${commentId}`);
      if (commentElement) {
        commentElement.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
        
        // Add highlight effect
        commentElement.style.backgroundColor = 'rgba(59, 130, 246, 0.2)';
        setTimeout(() => {
          commentElement.style.backgroundColor = '';
        }, 2000);
      }
    }, 100);
  };

  const toggleCommentsMinimized = (minimize: boolean) => {
    if (minimize) {
      // Save scroll position before hiding
      saveScrollPosition();
    }
    setCommentsMinimized(minimize);
    
    if (!minimize) {
      // Always scroll to bottom when showing comments to see latest
      scrollToBottom();
    }
  };
  
  // User tagging state
  const [userSuggestions, setUserSuggestions] = useState<UserSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [allUsers, setAllUsers] = useState<UserSuggestion[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const inputRef = useRef<HTMLDivElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });

  // Track the container root ID we're viewing to prevent switching to different assets
  const [viewingContainerRootId, setViewingContainerRootId] = useState<string | null>(null);

  // Update currentIndex when currentFileIndex prop changes
  React.useEffect(() => {
    setCurrentIndex(currentFileIndex);
  }, [currentFileIndex]);
  
  // When allFiles updates, ensure we're still viewing the same container
  // This prevents switching to a different asset when a new version is uploaded
  const allFilesRef = React.useRef(allFiles);
  React.useEffect(() => {
    // Only update if allFiles actually changed (not just a re-render)
    const filesChanged = JSON.stringify(allFiles.map(f => f.id)) !== JSON.stringify(allFilesRef.current.map(f => f.id));
    if (filesChanged) {
      allFilesRef.current = allFiles;
      
      if (viewingContainerRootId && allFiles.length > 0) {
        // Find the primary version of the container we're viewing
        const primaryFile = allFiles.find(f => 
          (f.parent_file_id === viewingContainerRootId && f.is_primary === true) ||
          (f.id === viewingContainerRootId && f.is_primary === true)
        );
        
        if (primaryFile) {
          const currentFileId = allFiles[currentIndex]?.id;
          if (primaryFile.id !== currentFileId) {
            const newIndex = allFiles.findIndex(f => f.id === primaryFile.id);
            if (newIndex >= 0 && newIndex !== currentIndex) {
              console.log('Updating to new primary version index:', newIndex, 'container:', viewingContainerRootId);
              setCurrentIndex(newIndex);
              if (onFileChange) {
                onFileChange(newIndex);
              }
            }
          }
        }
      }
    }
  }, [allFiles, viewingContainerRootId, currentIndex, onFileChange]);

  // Get current user
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    };
    getCurrentUser();
  }, []);

  const currentFile = allFiles[currentIndex] || file;
  
  // Set the viewing container root ID when file changes
  React.useEffect(() => {
    if (currentFile) {
      const containerRoot = currentFile.parent_file_id || currentFile.id;
      if (containerRoot !== viewingContainerRootId) {
        setViewingContainerRootId(containerRoot);
      }
    }
  }, [currentFile?.id, currentFile?.parent_file_id, viewingContainerRootId]);
  
  // Reset zoom and pan when file changes
  useEffect(() => {
    setZoomLevel(1);
    setPanPosition({ x: 0, y: 0 });
  }, [currentFile?.id]);
  
  // Zoom handlers
  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.25, 4)); // Max 4x zoom
  };
  
  const handleZoomOut = () => {
    setZoomLevel(prev => {
      const newZoom = Math.max(prev - 0.25, 1); // Min 1x zoom
      if (newZoom === 1) {
        // Reset pan when zoom returns to 1x
        setPanPosition({ x: 0, y: 0 });
      }
      return newZoom;
    });
  };
  
  // Pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoomLevel > 1 && displayedFile?.file_type?.startsWith('image/')) {
      e.preventDefault();
      setIsPanning(true);
      const containerRef = isFullscreen ? fullscreenImageContainerRef : imageContainerRef;
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        // Store the initial mouse position relative to the container and current pan position
        setPanStart({ 
          x: e.clientX - rect.left - panPosition.x, 
          y: e.clientY - rect.top - panPosition.y 
        });
      } else {
        setPanStart({ 
          x: e.clientX - panPosition.x, 
          y: e.clientY - panPosition.y 
        });
      }
    }
  };
  
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning && zoomLevel > 1) {
      e.preventDefault();
      const containerRef = isFullscreen ? fullscreenImageContainerRef : imageContainerRef;
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        // Calculate new pan position based on mouse movement
        const newX = e.clientX - rect.left - panStart.x;
        const newY = e.clientY - rect.top - panStart.y;
        setPanPosition({ x: newX, y: newY });
      } else {
        const newX = e.clientX - panStart.x;
        const newY = e.clientY - panStart.y;
        setPanPosition({ x: newX, y: newY });
      }
    }
  };
  
  const handleMouseUp = () => {
    setIsPanning(false);
  };
  
  // Also handle mouse leave to stop panning
  const handleMouseLeave = () => {
    setIsPanning(false);
  };
  
  // Fullscreen container ref
  const fullscreenContainerRef = useRef<HTMLDivElement>(null);
  const fullscreenImageContainerRef = useRef<HTMLDivElement>(null);
  
  // Fullscreen handlers
  const handleFullscreen = async () => {
    if (!displayedFile?.file_type?.startsWith('image/')) return;
    
    const container = fullscreenContainerRef.current;
    if (!container) return;
    
    try {
      if (!document.fullscreenElement) {
        await container.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (error) {
      console.error('Error toggling fullscreen:', error);
    }
  };
  
  const handleExitFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (error) {
      console.error('Error exiting fullscreen:', error);
    }
  };
  
  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);
  
  // Global mouse event listeners for panning
  useEffect(() => {
    if (isPanning) {
      const handleGlobalMouseMove = (e: MouseEvent) => {
        if (isPanning && zoomLevel > 1 && imageContainerRef.current) {
          const rect = imageContainerRef.current.getBoundingClientRect();
          // Calculate new pan position based on mouse movement
          const newX = e.clientX - rect.left - panStart.x;
          const newY = e.clientY - rect.top - panStart.y;
          setPanPosition({ x: newX, y: newY });
        }
      };
      
      const handleGlobalMouseUp = () => {
        setIsPanning(false);
      };
      
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        document.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
  }, [isPanning, panStart, zoomLevel]);
  
  // Get the displayed file - use selected version if available
  // This ensures the preview updates immediately when a version is selected
  const displayedFile = (() => {
    if (selectedVersion) {
      // First check if there's a newly created version that matches (for immediate preview update)
      if (newlyCreatedVersion && newlyCreatedVersion.id === selectedVersion) {
        console.log('Using newly created version for preview:', {
          id: newlyCreatedVersion.id,
          name: newlyCreatedVersion.name,
          file_url: newlyCreatedVersion.file_url,
          selectedVersion: selectedVersion
        });
        // Create a new object with only the version data, don't spread currentFile
        // This ensures we're showing the correct file
        return {
          ...currentFile,
          id: newlyCreatedVersion.id,
          name: newlyCreatedVersion.name,
          file_url: newlyCreatedVersion.file_url, // Critical: use the version's file_url
          file_type: newlyCreatedVersion.file_type,
          file_size: newlyCreatedVersion.file_size,
          version_number: newlyCreatedVersion.version_number,
          is_primary: newlyCreatedVersion.is_primary,
          parent_file_id: newlyCreatedVersion.parent_file_id,
          deliverable_id: currentFile.deliverable_id, // Preserve deliverable_id
          status: newlyCreatedVersion.status || currentFile.status
        } as DeliverableFile;
      }
      
      // Otherwise check the versions array
      if (versions.length > 0) {
        const selectedVersionData = versions.find(v => v.id === selectedVersion);
        if (selectedVersionData) {
          console.log('Using version from array for preview:', {
            id: selectedVersionData.id,
            name: selectedVersionData.name,
            file_url: selectedVersionData.file_url,
            selectedVersion: selectedVersion
          });
          // Create a new object with only the version data, don't spread currentFile
          // This ensures we're showing the correct file
          return {
            ...currentFile,
            id: selectedVersionData.id,
            name: selectedVersionData.name,
            file_url: selectedVersionData.file_url, // Critical: use the version's file_url
            file_type: selectedVersionData.file_type,
            file_size: selectedVersionData.file_size,
            version_number: selectedVersionData.version_number,
            is_primary: selectedVersionData.is_primary,
            parent_file_id: selectedVersionData.parent_file_id,
            deliverable_id: currentFile.deliverable_id, // Preserve deliverable_id
            status: selectedVersionData.status || currentFile.status
          } as DeliverableFile;
        }
      }
    }
    return currentFile;
  })();

  // Load all users for tagging suggestions
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const { data: profiles, error } = await supabase
          .from('user_profiles')
          .select('id, first_name, last_name, email, avatar_url');

        if (error) {
          console.error('Error loading users for tagging:', error);
          return;
        }

        if (profiles) {
          const users: UserSuggestion[] = profiles.map(profile => ({
            id: profile.id,
            name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.email.split('@')[0],
            email: profile.email,
            avatar_url: profile.avatar_url
          }));
          setAllUsers(users);
        }
      } catch (error) {
        console.error('Error in loadUsers:', error);
      }
    };

    loadUsers();
  }, []);

  // Track the last container root ID to detect when a new asset is opened (not just a version change)
  const [lastContainerRootId, setLastContainerRootId] = useState<string | null>(null);
  
  // Reset version panel when modal opens or when a new asset (container) is opened
  useEffect(() => {
    if (!isOpen) {
      // Reset the manual flag when modal closes
      setVersionPanelManuallyOpened(false);
      setLastContainerRootId(null);
      return;
    }
    
    if (!currentFile) return;
    
    // Calculate the container root ID for the current file
    const containerRootId = currentFile.parent_file_id || currentFile.id;
    
    // If this is a new asset container (different from last container), close the version panel
    // But don't close if the user manually opened it (e.g., during version upload)
    if (containerRootId !== lastContainerRootId) {
      // Only close if it wasn't manually opened (user might have opened it before switching files)
      if (!versionPanelManuallyOpened) {
        setShowVersionPanel(false);
      }
      setLastContainerRootId(containerRootId);
    } else if (isOpen && !lastContainerRootId && containerRootId) {
      // First time opening the modal with this asset
      setShowVersionPanel(false);
      setLastContainerRootId(containerRootId);
    }
  }, [isOpen, currentFile?.id, currentFile?.parent_file_id, lastContainerRootId, versionPanelManuallyOpened]);

  // Load comments when file changes
  useEffect(() => {
    if (currentFile) {
      loadComments();
      loadVersions();
      loadTags();
      loadUsageRights();
      loadHistory();
      loadFileInfo();
    }
  }, [currentFile?.id]); // Only reload when file ID changes, not the entire file object
  
  // Load versions
  const loadVersions = async () => {
    if (!currentFile) return;
    
    setLoadingVersions(true);
    try {
      // Get container root ID (the original file that acts as the container)
      // The container root is the file with no parent_file_id in this version chain
      let containerRootId = currentFile.id;
      
      // If current file has a parent_file_id, that parent is the container root
      // Otherwise, current file IS the container root
      if (currentFile.parent_file_id) {
        containerRootId = currentFile.parent_file_id;
        
        // Verify the parent is actually the root (should have parent_file_id = null)
        const { data: parentFile } = await supabase
          .from('deliverable_files')
          .select('id, parent_file_id')
          .eq('id', currentFile.parent_file_id)
          .single();
        
        if (parentFile && parentFile.parent_file_id) {
          // Parent also has a parent - this shouldn't happen, but find the actual root
          console.warn('Parent file has a parent - finding actual root');
          containerRootId = parentFile.parent_file_id;
        }
      }
      
      console.log('Loading versions for container root:', containerRootId, 'currentFile.id:', currentFile.id, 'currentFile.parent_file_id:', currentFile.parent_file_id);
      
      // First, get the deliverable_id if we don't have it
      let deliverableId = currentFile.deliverable_id;
      if (!deliverableId) {
        const { data: fileData } = await supabase
          .from('deliverable_files')
          .select('deliverable_id')
          .eq('id', currentFile.id)
          .single();
        deliverableId = fileData?.deliverable_id;
      }
      
      // Get all versions in this container
      // We need to get:
      // 1. The container root itself (id = containerRootId)
      // 2. All files that have parent_file_id = containerRootId
      // Also filter by deliverable_id to ensure we only get versions from the same deliverable
      let query = supabase
        .from('deliverable_files')
        .select('id, name, file_url, file_type, file_size, version_number, created_at, is_primary, status, deliverable_id, parent_file_id')
        .or(`id.eq.${containerRootId},parent_file_id.eq.${containerRootId}`);
      
      // Only filter by deliverable_id if we have it
      if (deliverableId) {
        query = query.eq('deliverable_id', deliverableId);
      }
      
      const { data: versionsData, error } = await query.order('version_number', { ascending: false });
      
      if (error) {
        // If columns don't exist yet, just show current file as single version
        console.warn('Error loading versions (migration may not be run):', error);
        setVersions([{
          id: currentFile.id,
          name: currentFile.name,
          file_url: currentFile.file_url,
          file_type: currentFile.file_type,
          file_size: currentFile.file_size,
          version_number: 1,
          created_at: currentFile.created_at,
          is_primary: true,
          status: currentFile.status
        }]);
        setSelectedVersion(currentFile.id);
        return;
      }
      
      if (versionsData && versionsData.length > 0) {
        console.log('Loaded versions:', versionsData.length, versionsData.map(v => ({ id: v.id, version: v.version_number, is_primary: v.is_primary })));
        
        // Remove duplicates by ID (in case the query returns duplicates)
        const uniqueVersions = versionsData.reduce((acc, version) => {
          if (!acc.find(v => v.id === version.id)) {
            acc.push(version);
          }
          return acc;
        }, [] as typeof versionsData);
        
        console.log('Unique versions after deduplication:', uniqueVersions.length);
        setVersions(uniqueVersions as FileVersion[]);
        
        // Only set selected version if it's not already set (preserve user selection)
        // This allows handleSetAsPrimary and handleAddVersion to set the selection first
        if (!selectedVersion) {
          // Set primary version as selected, or current file if it's in the list
          const primaryVersion = uniqueVersions.find(v => v.is_primary);
          if (primaryVersion) {
            console.log('Setting primary version as selected:', primaryVersion.id);
            setSelectedVersion(primaryVersion.id);
          } else if (uniqueVersions.find(v => v.id === currentFile.id)) {
            console.log('Setting current file as selected:', currentFile.id);
            setSelectedVersion(currentFile.id);
          } else {
            // If current file is not in the list, select the first version
            console.log('Setting first version as selected:', uniqueVersions[0].id);
            setSelectedVersion(uniqueVersions[0].id);
          }
        } else {
          // Verify the selected version is still in the list, if not, select primary
          const selectedVersionExists = uniqueVersions.find(v => v.id === selectedVersion);
          if (!selectedVersionExists) {
            const primaryVersion = uniqueVersions.find(v => v.is_primary);
            if (primaryVersion) {
              setSelectedVersion(primaryVersion.id);
            } else {
              setSelectedVersion(uniqueVersions[0].id);
            }
          } else {
            // If the selected version exists in the loaded data, clear the temp version
            // The preview will now use the data from the versions array
            setNewlyCreatedVersion(null);
          }
        }
      } else {
        console.log('No versions found, using current file as single version');
        // No versions found, use current file as single version
        setVersions([{
          id: currentFile.id,
          name: currentFile.name,
          file_url: currentFile.file_url,
          file_type: currentFile.file_type,
          file_size: currentFile.file_size,
          version_number: currentFile.version_number || 1,
          created_at: currentFile.created_at,
          is_primary: true,
          status: currentFile.status
        }]);
        setSelectedVersion(currentFile.id);
      }
    } catch (error) {
      console.error('Error loading versions:', error);
      // Fallback to single version
      setVersions([{
        id: currentFile.id,
        name: currentFile.name,
        file_url: currentFile.file_url,
        file_type: currentFile.file_type,
        file_size: currentFile.file_size,
        version_number: 1,
        created_at: currentFile.created_at,
        is_primary: true,
        status: currentFile.status
      }]);
    } finally {
      setLoadingVersions(false);
    }
  };
  
  // Load tags
  const loadTags = async () => {
    if (!currentFile) return;
    
    setLoadingTags(true);
    try {
      const { data: tagsData, error } = await supabase
        .from('file_tags')
        .select('id, tag, created_at')
        .eq('file_id', currentFile.id)
        .order('created_at', { ascending: false });
      
      if (error) {
        // Table may not exist yet - migration not run
        console.warn('Error loading tags (migration may not be run):', error);
        setTags([]);
        return;
      }
      
      if (tagsData) {
        setTags(tagsData);
      } else {
        setTags([]);
      }
    } catch (error) {
      console.error('Error loading tags:', error);
      setTags([]);
    } finally {
      setLoadingTags(false);
    }
  };
  
  // Load usage rights
  const loadUsageRights = async () => {
    if (!currentFile) return;
    
    setLoadingUsageRights(true);
    try {
      const { data: rightsData, error } = await supabase
        .from('file_usage_rights')
        .select('*')
        .eq('file_id', currentFile.id)
        .order('created_at', { ascending: false });
      
      if (error) {
        // Table may not exist yet - migration not run
        console.warn('Error loading usage rights (migration may not be run):', error);
        setUsageRights([]);
        return;
      }
      
      if (rightsData) {
        setUsageRights(rightsData);
      } else {
        setUsageRights([]);
      }
    } catch (error) {
      console.error('Error loading usage rights:', error);
      setUsageRights([]);
    } finally {
      setLoadingUsageRights(false);
    }
  };
  
  // Load history
  const loadHistory = async () => {
    if (!currentFile) return;
    
    setLoadingHistory(true);
    try {
      const { data: historyData, error } = await supabase
        .from('file_history')
        .select('*')
        .eq('file_id', currentFile.id)
        .order('created_at', { ascending: false });
      
      if (error) {
        // Table may not exist yet - migration not run
        console.warn('Error loading history (migration may not be run):', error);
        setHistory([]);
        return;
      }
      
      if (historyData) {
        // Get performer names
        const userIds = [...new Set(historyData.map(h => h.performed_by).filter(Boolean))];
        const { data: userProfiles } = await supabase
          .from('user_profiles')
          .select('id, first_name, last_name, email')
          .in('id', userIds);
        
        const userMap = new Map();
        if (userProfiles) {
          userProfiles.forEach(profile => {
            const name = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.email?.split('@')[0] || 'Unknown';
            userMap.set(profile.id, name);
          });
        }
        
        const formattedHistory: HistoryItem[] = historyData.map(item => ({
          ...item,
          performer_name: item.performed_by ? userMap.get(item.performed_by) || 'Unknown' : 'System'
        }));
        
        setHistory(formattedHistory);
      } else {
        setHistory([]);
      }
    } catch (error) {
      console.error('Error loading history:', error);
      setHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };
  
  // Load file info
  const loadFileInfo = async () => {
    if (!currentFile) return;
    
    try {
      const { data: fileData, error } = await supabase
        .from('deliverable_files')
        .select('uploaded_by, created_at')
        .eq('id', currentFile.id)
        .single();
      
      if (error) {
        // Column may not exist yet - migration not run
        console.warn('Error loading file info (migration may not be run):', error);
        setFileInfo({
          created_at: currentFile.created_at
        });
        return;
      }
      
      if (fileData?.uploaded_by) {
        const { data: uploaderProfile } = await supabase
          .from('user_profiles')
          .select('first_name, last_name, email')
          .eq('id', fileData.uploaded_by)
          .single();
        
        setFileInfo({
          ...fileData,
          uploader_name: uploaderProfile 
            ? `${uploaderProfile.first_name || ''} ${uploaderProfile.last_name || ''}`.trim() || uploaderProfile.email?.split('@')[0] || 'Unknown'
            : 'Unknown'
        });
      } else {
        setFileInfo({
          ...fileData,
          created_at: fileData?.created_at || currentFile.created_at
        });
      }
    } catch (error) {
      console.error('Error loading file info:', error);
      setFileInfo({
        created_at: currentFile.created_at
      });
    }
  };
  
  // Handle version selection
  const handleVersionSelect = (versionId: string) => {
    setSelectedVersion(versionId);
    // The displayedFile will automatically update based on selectedVersion
    // No need to change currentIndex or call onFileChange - just update the selected version
    // The preview will show the selected version via displayedFile
  };
  
  // Handle download version
  const handleDownloadVersion = (version: FileVersion) => {
    if (!version.file_url) {
      console.error('No file URL for version:', version.id);
      alert('Error: No file URL available for this version');
      return;
    }
    
    // Create a temporary link and trigger download
    const link = document.createElement('a');
    link.href = version.file_url;
    link.download = version.name || `version-${version.version_number}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  // Handle set as primary version
  const handleSetAsPrimary = async (versionId: string) => {
    if (!currentFile) return;
    
    try {
      // Get the container root ID (the original file that acts as the container)
      let containerRootId = currentFile.parent_file_id || currentFile.id;
      
      // If current file has a parent, verify it's the actual root
      if (currentFile.parent_file_id) {
        const { data: parentFile } = await supabase
          .from('deliverable_files')
          .select('id, parent_file_id')
          .eq('id', currentFile.parent_file_id)
          .single();
        
        if (parentFile && parentFile.parent_file_id) {
          containerRootId = parentFile.parent_file_id;
        }
      }
      
      let deliverableId = currentFile.deliverable_id;
      if (!deliverableId) {
        const { data: fileData } = await supabase
          .from('deliverable_files')
          .select('deliverable_id')
          .eq('id', currentFile.id)
          .single();
        deliverableId = fileData?.deliverable_id;
      }
      
      console.log('Setting version as primary:', versionId, 'in container:', containerRootId);
      
      // Set all versions in this container to not primary (filter by deliverable_id)
      if (deliverableId) {
        await supabase
          .from('deliverable_files')
          .update({ is_primary: false })
          .or(`id.eq.${containerRootId},parent_file_id.eq.${containerRootId}`)
          .eq('deliverable_id', deliverableId);
      } else {
        await supabase
          .from('deliverable_files')
          .update({ is_primary: false })
          .or(`id.eq.${containerRootId},parent_file_id.eq.${containerRootId}`);
      }
      
      // Set selected version as primary
      await supabase
        .from('deliverable_files')
        .update({ is_primary: true })
        .eq('id', versionId);
      
      // Get the version data to update current file
      const { data: newPrimaryVersion } = await supabase
        .from('deliverable_files')
        .select('*')
        .eq('id', versionId)
        .single();
      
      // Set the selected version immediately so the preview updates right away
      setSelectedVersion(versionId);
      
      // Reload versions (this won't override our selection since selectedVersion is already set)
      await loadVersions();
      
      // The displayedFile will update automatically based on selectedVersion
      
      // Notify parent to refresh file list first (this will update allFiles)
      // The parent will filter to show only primary versions, so the new primary will appear
      if (onFileUpdate) {
        onFileUpdate();
      }
      
      // After a short delay, update the current file index to point to the new primary version
      // This ensures when the modal closes, the new primary version is shown
      setTimeout(() => {
        if (newPrimaryVersion && onFileChange) {
          // Find the new primary version in the updated allFiles list
          // Since the parent filters to show only primary versions, the new primary should be in the list
          const newPrimaryIndex = allFiles.findIndex(f => f.id === versionId);
          if (newPrimaryIndex >= 0) {
            setCurrentIndex(newPrimaryIndex);
            onFileChange(newPrimaryIndex);
          }
        }
      }, 100);
    } catch (error) {
      console.error('Error setting primary version:', error);
    }
  };
  
  // Handle add new version
  const handleAddVersion = async (file: File) => {
    if (!currentFile) {
      console.error('No current file selected');
      return;
    }
    
    setUploadingVersion(true);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error('Error getting user:', userError);
        alert('You must be logged in to upload a new version');
        setUploadingVersion(false);
        return;
      }
      
      // Get deliverable_id from current file
      const { data: fileData, error: fileDataError } = await supabase
        .from('deliverable_files')
        .select('deliverable_id')
        .eq('id', currentFile.id)
        .single();
      
      if (fileDataError || !fileData?.deliverable_id) {
        console.error('Could not find deliverable_id:', fileDataError);
        alert('Error: Could not find deliverable information');
        setUploadingVersion(false);
        return;
      }
      
      // Upload file to Supabase Storage
      const fileName = `${Date.now()}-${file.name}`;
      const filePath = `deliverable-files/${fileData.deliverable_id}/${fileName}`;
      
      console.log('Uploading file to:', filePath);
      const { error: uploadError } = await supabase.storage
        .from('deliverable-files')
        .upload(filePath, file);
      
      if (uploadError) {
        console.error('Error uploading version:', uploadError);
        alert(`Error uploading file: ${uploadError.message}`);
        setUploadingVersion(false);
        return;
      }
      
      console.log('File uploaded successfully');
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('deliverable-files')
        .getPublicUrl(filePath);
      
      // Determine the container root ID (the original file that acts as the container)
      // The container root is the file with no parent_file_id in this version chain
      // If current file has a parent_file_id, that parent is the container root
      // Otherwise, current file IS the container root
      let containerRootId = currentFile.parent_file_id || currentFile.id;
      
      // If current file has a parent, we need to verify that parent is the actual root
      // (it should have parent_file_id = null)
      if (currentFile.parent_file_id) {
        const { data: parentFile } = await supabase
          .from('deliverable_files')
          .select('id, parent_file_id')
          .eq('id', currentFile.parent_file_id)
          .single();
        
        if (parentFile && parentFile.parent_file_id) {
          // Parent also has a parent, so we need to find the actual root
          // This shouldn't happen in normal operation, but let's handle it
          containerRootId = parentFile.parent_file_id;
        }
      }
      
      console.log('Container root ID for new version:', containerRootId, 'current file:', currentFile.id, 'current file parent:', currentFile.parent_file_id);
      
      // Get all existing versions in this container to calculate next version number
      // Filter by deliverable_id to ensure we only count versions from the same deliverable
      const { data: existingVersions } = await supabase
        .from('deliverable_files')
        .select('version_number, id, parent_file_id')
        .or(`id.eq.${containerRootId},parent_file_id.eq.${containerRootId}`)
        .eq('deliverable_id', fileData.deliverable_id);
      
      const maxVersion = existingVersions && existingVersions.length > 0
        ? Math.max(...existingVersions.map(v => v.version_number || 1))
        : 1;
      
      const nextVersionNumber = maxVersion + 1;
      console.log('Creating version', nextVersionNumber, 'max existing version:', maxVersion, 'in container:', containerRootId);
      
      // Check if versioning columns exist by trying to update is_primary
      // If this fails, versioning isn't set up yet
      let hasVersioning = false;
      try {
        // Set all versions in this container to not primary
        const { error: updateError } = await supabase
          .from('deliverable_files')
          .update({ is_primary: false })
          .or(`id.eq.${containerRootId},parent_file_id.eq.${containerRootId}`)
          .eq('deliverable_id', fileData.deliverable_id); // Also filter by deliverable_id
        
        if (!updateError) {
          hasVersioning = true;
        } else {
          console.warn('Versioning columns may not exist:', updateError);
        }
      } catch (e) {
        console.warn('Versioning not available:', e);
      }
      
      // Create new version record
      // Include versioning fields only if they exist
      const insertData: any = {
        name: file.name,
        file_type: file.type || 'unknown',
        file_size: file.size,
        file_url: publicUrl,
        deliverable_id: fileData.deliverable_id,
        status: 'in_progress'
      };
      
      // Only add versioning fields if versioning is available
      if (hasVersioning) {
        insertData.version_number = nextVersionNumber;
        // parent_file_id should always point to the container root
        insertData.parent_file_id = containerRootId;
        insertData.uploaded_by = user.id;
        insertData.is_primary = true;
        console.log('Inserting with versioning fields:', { version_number: nextVersionNumber, parent_file_id: containerRootId, is_primary: true });
      }
      
      const { data: newVersion, error: dbError } = await supabase
        .from('deliverable_files')
        .insert(insertData)
        .select('*')
        .single();
      
      if (dbError) {
        console.error('Error creating version record:', dbError);
        alert(`Error creating version: ${dbError.message}`);
        setUploadingVersion(false);
        return;
      }
      
      if (!newVersion) {
        console.error('Failed to create version record');
        alert('Error: Failed to create version record');
        setUploadingVersion(false);
        return;
      }
      
      console.log('Version created successfully:', {
        id: newVersion.id,
        name: newVersion.name,
        file_url: newVersion.file_url,
        publicUrl: publicUrl,
        version_number: newVersion.version_number,
        is_primary: newVersion.is_primary
      });
      
      // Log history for the new version (if history table exists)
      if (hasVersioning) {
        try {
          await supabase
            .from('file_history')
            .insert({
              file_id: newVersion.id,
              action_type: 'version_created',
              action_description: `Version ${nextVersionNumber} created`,
              performed_by: user.id,
              metadata: { version_number: nextVersionNumber }
            });
        } catch (historyError) {
          // History table may not exist - that's okay
          console.warn('Could not log history:', historyError);
        }
      }
      
      // Reload versions and select the new version (if versioning is available)
      if (hasVersioning) {
        // Ensure we use the correct file_url - the database should have it, but fallback to publicUrl
        // The database insert should return the file_url we inserted, but let's be defensive
        const versionFileUrl = newVersion.file_url || publicUrl;
        
        console.log('Setting up new version for preview:', {
          newVersionId: newVersion.id,
          newVersionName: newVersion.name,
          newVersionFileUrl: newVersion.file_url,
          publicUrl: publicUrl,
          versionFileUrl: versionFileUrl,
          currentFileId: currentFile.id,
          currentFileName: currentFile.name,
          currentFileUrl: currentFile.file_url
        });
        
        // Set the selected version immediately so preview updates right away
        setSelectedVersion(newVersion.id);
        
        // Create a temporary version object for immediate preview update using actual DB data
        // Make absolutely sure we're using the correct file_url
        const tempVersion: FileVersion = {
          id: newVersion.id,
          name: newVersion.name || file.name,
          file_url: versionFileUrl, // Use the correct file_url - this is critical
          file_type: newVersion.file_type || file.type || 'unknown',
          file_size: newVersion.file_size || file.size,
          version_number: nextVersionNumber,
          created_at: newVersion.created_at || new Date().toISOString(),
          is_primary: true,
          status: newVersion.status || 'in_progress',
          parent_file_id: newVersion.parent_file_id || null
        };
        
        console.log('Created temp version object:', {
          id: tempVersion.id,
          name: tempVersion.name,
          file_url: tempVersion.file_url
        });
        
        // Set as newly created version for immediate preview
        setNewlyCreatedVersion(tempVersion);
        
        // Ensure version panel stays open after upload
        if (!showVersionPanel) {
          setShowVersionPanel(true);
          setVersionPanelManuallyOpened(true);
        }
        
        // Reload versions from database (this will replace the array with fresh data)
        console.log('Reloading versions...');
        await loadVersions();
        loadHistory();
        
        // Keep newlyCreatedVersion until we're sure the versions array has the correct data
        // The displayedFile will use newlyCreatedVersion if selectedVersion matches
      } else {
        // If versioning isn't available, just refresh the file list
        console.log('Versioning not available - refreshing file list');
      }
      
      // Notify parent to refresh file list
      // The viewingContainerRootId state will ensure we stay on the same container
      if (onFileUpdate) {
        onFileUpdate();
      }
      
      setUploadingVersion(false);
    } catch (error) {
      console.error('Error adding version:', error);
      alert(`Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setUploadingVersion(false);
    }
  };
  
  // Handle add tag
  const handleAddTag = async () => {
    if (!newTag.trim() || !currentFile) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { error } = await supabase
        .from('file_tags')
        .insert({
          file_id: currentFile.id,
          tag: newTag.trim(),
          created_by: user.id
        });
      
      if (error) {
        console.error('Error adding tag:', error);
        return;
      }
      
      setNewTag('');
      loadTags();
    } catch (error) {
      console.error('Error adding tag:', error);
    }
  };
  
  // Handle delete tag
  const handleDeleteTag = async (tagId: string) => {
    try {
      const { error } = await supabase
        .from('file_tags')
        .delete()
        .eq('id', tagId);
      
      if (error) {
        console.error('Error deleting tag:', error);
        return;
      }
      
      loadTags();
    } catch (error) {
      console.error('Error deleting tag:', error);
    }
  };

  const loadComments = async () => {
    if (!currentFile) return;
    
    setLoadingComments(true);
    try {
      // Get the container root ID for this asset
      const containerRootId = currentFile.parent_file_id || currentFile.id;
      
      // Load comments for all versions in this container
      // Try to use container_file_id first (new way), fallback to file_id for backward compatibility
      let query = supabase
        .from('file_comments')
        .select('id, content, user_id, created_at, tagged_users, version_number, container_file_id, file_id');
      
      // Try to filter by container_file_id first (if column exists)
      try {
        const { data: commentsByContainer, error: containerError } = await query
          .eq('container_file_id', containerRootId)
          .order('created_at', { ascending: true });
        
        if (!containerError && commentsByContainer) {
          // Successfully loaded by container - format and return
          const { data: { user: currentUser } } = await supabase.auth.getUser();
          
          const userIds = [...new Set(commentsByContainer.map(comment => comment.user_id))];
          
          const { data: userProfiles, error: profilesError } = await supabase
            .from('user_profiles')
            .select('id, first_name, last_name, email, avatar_url')
            .in('id', userIds);
          
          if (profilesError) {
            console.error('Error fetching user profiles:', profilesError);
          }
          
          const userProfileMap = new Map();
          if (userProfiles) {
            userProfiles.forEach(profile => {
              userProfileMap.set(profile.id, profile);
            });
          }
          
          const formattedComments: Comment[] = commentsByContainer.map(comment => {
            let userName = 'Unknown User';
            const profile = userProfileMap.get(comment.user_id);
            
            if (comment.user_id === currentUser?.id) {
              userName = 'You';
            } else {
              if (profile) {
                const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
                userName = fullName || profile.email?.split('@')[0] || 'Unknown User';
              } else {
                userName = `User ${comment.user_id.slice(0, 8)}`;
              }
            }
            
            return {
              id: comment.id,
              content: comment.content,
              user_id: comment.user_id,
              user_name: userName,
              avatar_url: profile?.avatar_url || null,
              actual_name: profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.email?.split('@')[0] || 'Unknown User' : 'Unknown User',
              created_at: comment.created_at,
              tagged_users: comment.tagged_users || [],
              version_number: comment.version_number || undefined,
              container_file_id: comment.container_file_id || undefined
            };
          });
          
          setComments(formattedComments);
          setLoadingComments(false);
          return;
        }
      } catch (e) {
        // container_file_id column doesn't exist yet - fall through to old method
        console.warn('container_file_id column may not exist, using fallback:', e);
      }
      
      // Fallback: Load comments for all versions in the container
      // Get all version IDs in this container
      const { data: versionFiles } = await supabase
        .from('deliverable_files')
        .select('id')
        .or(`id.eq.${containerRootId},parent_file_id.eq.${containerRootId}`);
      
      const versionIds = versionFiles?.map(f => f.id) || [currentFile.id];
      
      const { data: commentsData, error } = await query
        .in('file_id', versionIds)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading comments:', error);
        setLoadingComments(false);
        return;
      }
      
      if (!commentsData) {
        setComments([]);
        setLoadingComments(false);
        return;
      }

      // Get version numbers for comments that reference file_id
      const versionMap = new Map<string, number>();
      if (commentsData && commentsData.length > 0) {
        const fileIds = [...new Set(commentsData.map(c => c.file_id).filter(Boolean))];
        if (fileIds.length > 0) {
          const { data: fileVersions } = await supabase
            .from('deliverable_files')
            .select('id, version_number')
            .in('id', fileIds);
          
          if (fileVersions) {
            fileVersions.forEach(f => {
              versionMap.set(f.id, f.version_number || 1);
            });
          }
        }
      }

      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      const userIds = [...new Set(commentsData.map(comment => comment.user_id))];
      
      const { data: userProfiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('id, first_name, last_name, email, avatar_url')
        .in('id', userIds);
      
      if (profilesError) {
        console.error('Error fetching user profiles:', profilesError);
      }
      
      const userProfileMap = new Map();
      if (userProfiles) {
        userProfiles.forEach(profile => {
          userProfileMap.set(profile.id, profile);
        });
      }
      
      const formattedComments: Comment[] = commentsData.map(comment => {
        let userName = 'Unknown User';
        const profile = userProfileMap.get(comment.user_id);
        
        if (comment.user_id === currentUser?.id) {
          userName = 'You';
        } else {
          if (profile) {
            const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
            userName = fullName || profile.email?.split('@')[0] || 'Unknown User';
          } else {
            userName = `User ${comment.user_id.slice(0, 8)}`;
          }
        }
        
        // Get version_number from comment data or from versionMap
        const versionNumber = comment.version_number || (comment.file_id ? versionMap.get(comment.file_id) : undefined);
        
        return {
          id: comment.id,
          content: comment.content,
          user_id: comment.user_id,
          user_name: userName,
          avatar_url: profile?.avatar_url || null,
          actual_name: profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.email?.split('@')[0] || 'Unknown User' : 'Unknown User',
          created_at: comment.created_at,
          tagged_users: comment.tagged_users || [],
          version_number: versionNumber,
          container_file_id: comment.container_file_id || undefined
        };
      });

      setComments(formattedComments);
      
      // Check for URL hash to scroll to specific comment, otherwise scroll to bottom
      const hash = window.location.hash;
      const commentIdMatch = hash.match(/#comment-(.+)/);
      
      if (commentIdMatch) {
        const commentId = commentIdMatch[1];
        scrollToComment(commentId);
      } else {
        // Auto-scroll to bottom when comments are loaded (default behavior)
        setTimeout(() => {
          const commentsContainer = document.querySelector('.comments-container');
          if (commentsContainer) {
            commentsContainer.scrollTop = commentsContainer.scrollHeight;
          }
        }, 100);
      }
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setLoadingComments(false);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      onFileChange(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < allFiles.length - 1) {
      setCurrentIndex(currentIndex + 1);
      onFileChange(currentIndex + 1);
    }
  };

  const handleDownload = async () => {
    try {
      // Fetch the file as a blob
      const response = await fetch(currentFile.file_url);
      const blob = await response.blob();
      
      // Create a blob URL and trigger download
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = currentFile.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the blob URL
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Error downloading file:', error);
      // Fallback to opening in new tab if download fails
      window.open(currentFile.file_url, '_blank');
    }
  };

  const handleMarkAsFinal = async () => {
    if (!currentFile) return;
    
    setMarkingAsFinal(true);
    try {
      const { error } = await supabase
        .from('deliverable_files')
        .update({ status: 'final' })
        .eq('id', currentFile.id);

      if (error) {
        console.error('Error marking file as final:', error);
      } else {
        // Call the parent's update function to refresh the file list
        if (onFileUpdate) {
          onFileUpdate();
        }
      }
    } catch (err) {
      console.error('Error marking file as final:', err);
    } finally {
      setMarkingAsFinal(false);
    }
  };

  const handleMarkAsInProgress = async () => {
    if (!currentFile) return;
    
    setMarkingAsFinal(true);
    try {
      const { error } = await supabase
        .from('deliverable_files')
        .update({ status: 'in_progress' })
        .eq('id', currentFile.id);

      if (error) {
        console.error('Error marking file as in progress:', error);
      } else {
        // Call the parent's update function to refresh the file list
        if (onFileUpdate) {
          onFileUpdate();
        }
      }
    } catch (err) {
      console.error('Error marking file as in progress:', err);
    } finally {
      setMarkingAsFinal(false);
    }
  };

  const formatCommentDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    return date.toLocaleDateString();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getFileTypeDisplay = (fileType: string, fileName?: string) => {
    // Try to get extension from file name first
    if (fileName) {
      const parts = fileName.split('.');
      if (parts.length > 1) {
        const extension = parts[parts.length - 1].toLowerCase();
        return extension.toUpperCase();
      }
    }
    
    // Fallback to extracting from MIME type
    if (fileType.includes('/')) {
      const parts = fileType.split('/');
      if (parts.length > 1) {
        const subtype = parts[1].toLowerCase();
        // Handle common MIME type mappings
        if (subtype.includes('jpeg') || subtype.includes('jpg')) return 'JPEG';
        if (subtype.includes('png')) return 'PNG';
        if (subtype.includes('gif')) return 'GIF';
        if (subtype.includes('webp')) return 'WEBP';
        if (subtype.includes('svg')) return 'SVG';
        if (subtype.includes('mp4')) return 'MP4';
        if (subtype.includes('mov')) return 'MOV';
        if (subtype.includes('webm')) return 'WEBM';
        if (subtype.includes('mp3')) return 'MP3';
        if (subtype.includes('wav')) return 'WAV';
        if (subtype.includes('ogg')) return 'OGG';
        if (subtype.includes('m4a')) return 'M4A';
        if (subtype.includes('pdf')) return 'PDF';
        if (subtype.includes('zip')) return 'ZIP';
        if (subtype.includes('rar')) return 'RAR';
        // Return the subtype in uppercase if no specific mapping
        return subtype.split(';')[0].split('+')[0].toUpperCase();
      }
    }
    
    return 'FILE';
  };

  // Handle @ mention detection
  const handleCommentChange = (value: string) => {
    setNewComment(value);
    
    const lastAtSymbol = value.lastIndexOf('@');
    if (lastAtSymbol !== -1) {
      const textAfterAt = value.slice(lastAtSymbol + 1);
      const hasSpaceAfterAt = textAfterAt.includes(' ');
      
      if (hasSpaceAfterAt) {
        setShowSuggestions(false);
        setUserSuggestions([]);
        return;
      }
      
      const query = textAfterAt.toLowerCase();
      
      if (query.length >= 0) { // Changed from > 0 to >= 0 to show suggestions immediately after @
        const filtered = allUsers.filter(user => 
          user.name.toLowerCase().includes(query) || 
          user.email.toLowerCase().includes(query)
        );
        setUserSuggestions(filtered);
        setShowSuggestions(filtered.length > 0);
        setSuggestionIndex(0);
        console.log('Showing suggestions:', filtered.length > 0, filtered); // Debug log
        
        // Calculate dropdown position
        if (filtered.length > 0 && inputRef.current) {
          const rect = inputRef.current.getBoundingClientRect();
          setDropdownPosition({
            top: rect.top - 8, // 8px above the input
            left: rect.left,
            width: rect.width
          });
        }
      } else {
        setShowSuggestions(false);
        setUserSuggestions([]);
      }
    } else {
      setShowSuggestions(false);
      setUserSuggestions([]);
    }
  };

  // Handle suggestion selection
  const selectSuggestion = (user: UserSuggestion) => {
    const lastAtSymbol = newComment.lastIndexOf('@');
    const beforeAt = newComment.slice(0, lastAtSymbol);
    const afterAt = newComment.slice(lastAtSymbol + 1);
    const afterSpace = afterAt.indexOf(' ') !== -1 ? afterAt.slice(afterAt.indexOf(' ')) : '';
    
    const newValue = `${beforeAt}@${user.name} ${afterSpace}`;
    
    setNewComment(newValue);
    setShowSuggestions(false);
    setSuggestionIndex(0);
    setUserSuggestions([]);
    
    // Update the contentEditable div with styled content
    if (inputRef.current) {
      let styledContent = newValue;
      allUsers.forEach(u => {
        const mention = `@${u.name}`;
        if (styledContent.includes(mention)) {
          styledContent = styledContent.replace(
            mention,
            `<span style="color: #60A5FA;">@${u.name}</span>`
          );
        }
      });
      
      // Convert newlines to <br> tags for display
      styledContent = styledContent.replace(/\n/g, '<br>');
      
      inputRef.current.innerHTML = styledContent;
      
      // Position cursor at the end
      const range = document.createRange();
      const selection = window.getSelection();
      range.selectNodeContents(inputRef.current);
      range.collapse(false);
      selection?.removeAllRanges();
      selection?.addRange(range);
      
      inputRef.current.focus();
    }
  };

  // Handle keyboard navigation in suggestions
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showSuggestions) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSuggestionIndex(prev => (prev + 1) % userSuggestions.length);
        return;
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSuggestionIndex(prev => (prev - 1 + userSuggestions.length) % userSuggestions.length);
        return;
      } else if (e.key === 'Enter') {
        e.preventDefault();
        selectSuggestion(userSuggestions[suggestionIndex]);
        return;
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setShowSuggestions(false);
        return;
      }
    }
    
    if (e.key === 'Enter' && !e.shiftKey && !showSuggestions) {
      e.preventDefault();
      postComment();
      return;
    }
  };

  // Extract tagged users from comment content
  const extractTaggedUsers = (content: string): string[] => {
    console.log('🔍 Extracting tagged users from content:', content);
    console.log('🔍 All users available:', allUsers);
    
    // Updated regex to handle multi-word names: capture name after @ until word boundary, comma, period, or end
    const atMentionRegex = /@([a-zA-Z0-9\s]+?)(?=\s*[@,.!?]|\s*$)/g;
    const matches = content.match(atMentionRegex);
    if (!matches) {
      console.log('🔍 No @ mentions found in content');
      return [];
    }
    
    console.log('🔍 Found @ mentions:', matches);
    
    const taggedUsers = matches.map(match => {
      const name = match.slice(1).trim().toLowerCase(); // Remove @ and trim whitespace, make lowercase
      console.log('🔍 Looking for user with name:', name);
      
      // Try exact match first
      let user = allUsers.find(u => u.name.toLowerCase() === name);
      console.log('🔍 Exact match result:', user);
      
      // If no exact match, try partial match
      if (!user) {
        user = allUsers.find(u => 
          u.name.toLowerCase().includes(name) || 
          u.email.toLowerCase().includes(name)
        );
        console.log('🔍 Partial match result:', user);
      }
      
      const userId = user?.id || '';
      console.log('🔍 Final user ID for', name, ':', userId);
      return userId;
    }).filter(id => id);
    
    console.log('🔍 Final extracted tagged user IDs:', taggedUsers);
    return taggedUsers;
  };

  const postComment = async () => {
    if (!newComment.trim() || !currentFile) return;
    
    setPostingComment(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.error('User not authenticated');
        alert('You must be logged in to post comments');
        setPostingComment(false);
        return;
      }

      // Get current user's profile data
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('avatar_url, first_name, last_name')
        .eq('id', user.id)
        .single();

      const taggedUserIds = extractTaggedUsers(newComment);

      // Get the container root ID and current version number
      const containerRootId = currentFile.parent_file_id || currentFile.id;
      const currentVersionNumber = displayedFile?.version_number || currentFile?.version_number || 1;
      
      // Prepare insert data - start with basic fields
      const insertData: any = {
        file_id: currentFile.id, // Keep file_id for backward compatibility
        user_id: user.id,
        content: newComment.trim(),
        tagged_users: taggedUserIds
      };
      
      // Try to add versioning fields
      insertData.container_file_id = containerRootId;
      insertData.version_number = currentVersionNumber;

      // Try inserting with versioning fields first
      let { data: newCommentData, error } = await supabase
        .from('file_comments')
        .insert(insertData)
        .select('id, content, user_id, created_at, tagged_users, version_number, container_file_id')
        .single();

      // If error indicates missing columns, try again without versioning fields
      if (error && (error.message.includes('column') || error.message.includes('does not exist') || error.code === 'PGRST116')) {
        console.warn('Versioning columns may not exist, trying without them:', error.message);
        const { data: fallbackData, error: fallbackError } = await supabase
        .from('file_comments')
        .insert({
          file_id: currentFile.id,
          user_id: user.id,
          content: newComment.trim(),
          tagged_users: taggedUserIds
        })
        .select('id, content, user_id, created_at, tagged_users')
        .single();

        if (fallbackError) {
          console.error('Error posting comment:', fallbackError);
          alert('Error posting comment: ' + fallbackError.message);
          setPostingComment(false);
          return;
        }
        
        newCommentData = fallbackData;
        error = null;
      } else if (error) {
        console.error('Error posting comment:', error);
        alert('Error posting comment: ' + error.message);
        setPostingComment(false);
        return;
      }

      const newCommentObj: Comment = {
        id: newCommentData.id,
        content: newCommentData.content,
        user_id: newCommentData.user_id,
        user_name: 'You',
        avatar_url: userProfile?.avatar_url || null,
        actual_name: 'You',
        created_at: newCommentData.created_at,
        tagged_users: taggedUserIds,
        version_number: newCommentData.version_number || currentVersionNumber,
        container_file_id: newCommentData.container_file_id || containerRootId
      };
      
      // Add comment to state immediately for instant feedback
      setComments(prev => [...prev, newCommentObj]);
      setNewComment('');
      setShowSuggestions(false);
      
      // Reload comments after a short delay to ensure consistency with database
      // This ensures we get the latest comments and proper version numbers
      setTimeout(() => {
        loadComments();
      }, 500);
      
      // Create notifications for mentioned users
      if (taggedUserIds.length > 0) {
        console.log('🔔 Creating notifications for tagged users:', taggedUserIds);
        const commentAuthorName = userProfile?.first_name && userProfile?.last_name 
          ? `${userProfile.first_name} ${userProfile.last_name}`
          : user.email?.split('@')[0] || 'Someone';
        
        console.log('🔔 Comment author name:', commentAuthorName);
        console.log('🔔 Comment content:', newComment.trim());
        console.log('🔔 File ID:', currentFile.id);
        console.log('🔔 Comment ID:', newCommentData.id);
        
        try {
          await createMentionNotifications(
            taggedUserIds,
            newCommentData.id,
            currentFile.id,
            commentAuthorName,
            newComment.trim()
          );
          console.log('✅ Notifications created successfully');
        } catch (error) {
          console.error('❌ Error creating notifications:', error);
        }
      } else {
        console.log('🔔 No tagged users found, skipping notification creation');
      }
      
      // Clear the contentEditable div
      if (inputRef.current) {
        inputRef.current.innerHTML = '';
      }
      
      // Auto-scroll to bottom after a short delay to ensure the new comment is rendered
      setTimeout(() => {
        const commentsContainer = document.querySelector('.comments-container');
        if (commentsContainer) {
          commentsContainer.scrollTop = commentsContainer.scrollHeight;
        }
      }, 100);
    } catch (error: any) {
      console.error('Error posting comment:', error);
      alert('Error posting comment: ' + (error?.message || 'An unexpected error occurred. Please try again.'));
      setPostingComment(false);
    }
  };

  if (!isOpen || !file) {
    return null;
  }

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center z-[70] p-6" style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}>
      {/* Header Bar - Above modal box */}
      <div className="w-full max-w-[calc(100vw-3rem)] flex items-center justify-between p-4 bg-gray-800 rounded-t-xl border-b border-gray-700">
            {/* File Info - Replaces AssetDetailHeader */}
            <div className="flex items-center gap-4 flex-1">
              {/* Status Icon */}
              <div className="w-8 h-8 flex items-center justify-center flex-shrink-0">
                {currentFile?.status === 'final' ? (
                  <CircleCheck className="w-4 h-4 text-green-400" />
                ) : (
                  <CircleDashed className="w-4 h-4 text-blue-400" />
                )}
              </div>
              
              {/* File Info */}
              <div className="text-sm text-gray-300 min-w-0">
                <div className="font-medium truncate">{currentFile?.name}</div>
                <div className="text-gray-400 truncate">
                  {getFileTypeDisplay(currentFile?.file_type || '', currentFile?.name)} · {formatFileSize(currentFile?.file_size || 0)}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {/* Mark as final/in progress button */}
              {currentFile?.status !== 'final' ? (
                <IconButton
                  variant="ghost"
                  size="sm"
                  icon={markingAsFinal ? Loader2 : CheckCircle}
                  onClick={handleMarkAsFinal}
                  disabled={markingAsFinal}
                >
                  {markingAsFinal ? 'Marking...' : 'Mark as final'}
                </IconButton>
              ) : (
                <IconButton
                  variant="ghost"
                  size="sm"
                  icon={markingAsFinal ? Loader2 : CircleDashed}
                  onClick={handleMarkAsInProgress}
                  disabled={markingAsFinal}
                >
                  {markingAsFinal ? 'Marking...' : 'Mark as in progress'}
                </IconButton>
              )}
              {/* Share button */}
              <IconButton
                variant="ghost"
                size="sm"
                icon={Share2}
              >
                Share
              </IconButton>
              {/* Vertical Divider */}
              <div className="h-6 w-px bg-gray-600 ml-2"></div>
              {/* Navigation Arrows */}
              <div className="flex items-center gap-1.5 ml-2">
                <IconButton
                  variant="ghost"
                  size="sm"
                  icon={ArrowLeft}
                  onClick={handlePrevious}
                  disabled={currentIndex === 0}
                />
                <IconButton
                  variant="ghost"
                  size="sm"
                  icon={ArrowRight}
                  onClick={handleNext}
                  disabled={currentIndex >= allFiles.length - 1}
                />
              </div>
              {/* Vertical Divider */}
              <div className="h-6 w-px bg-gray-600 ml-2"></div>
            <IconButton
              variant="ghost"
              size="sm"
                icon={X}
                onClick={onClose}
                className="ml-2"
              />
            </div>
      </div>

      <div className="w-full max-w-[calc(100vw-3rem)] flex-1 flex bg-transparent" style={{ maxHeight: 'calc(100vh - 8rem)', minHeight: 0 }}>
        <div className={`${showVersionPanel ? 'w-44' : 'w-0'} bg-gray-800 border-r border-gray-700 rounded-bl-xl flex flex-col flex-shrink-0 relative transition-all duration-300 overflow-hidden`} style={{ maxHeight: '100%', minHeight: 0, zIndex: 60 }}>
            <div className="p-4 pb-2 flex-shrink-0">
              <div className="flex items-center justify-between" style={{ minHeight: '28px' }}>
                <h3 className="text-white font-medium text-xs">Current version</h3>
                <div className="h-5 flex items-center">
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleAddVersion(file);
                        // Reset input so same file can be selected again
                        if (fileInputRef.current) {
                          fileInputRef.current.value = '';
                        }
                      }
                    }}
                    disabled={uploadingVersion}
                  />
            <IconButton
                    variant="ghost"
              size="sm"
                    icon={uploadingVersion ? Loader2 : Plus}
                    className="!h-5 !w-5 !p-0 !rounded-sm"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (fileInputRef.current && !uploadingVersion) {
                        fileInputRef.current.click();
                      }
                    }}
                    disabled={uploadingVersion}
                  />
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-4 pb-4 pt-0 space-y-4 min-h-0" style={{ overflowX: 'visible', position: 'relative', zIndex: 1 }}>
              {loadingVersions ? (
                <div className="flex items-center justify-center py-8">
                  <Spinner size="sm" />
                </div>
              ) : versions.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-400 text-sm">No versions yet</p>
                </div>
              ) : (
                <>
                  {/* Current Version */}
                  {(() => {
                    // Find the primary version (or the selected version if manually selected)
                    const primaryVersion = versions.find(v => v.is_primary === true);
                    const currentVersion = selectedVersion 
                      ? versions.find(v => v.id === selectedVersion) || primaryVersion || versions[0]
                      : primaryVersion || versions[0];
                    if (!currentVersion) return null;
                    
                    return (
                      <div className="space-y-2">
                        <div className="relative bg-gray-700 rounded-lg border-2 border-blue-500 w-32" style={{ overflow: 'visible' }}>
                          {/* Version Tag - Top Left */}
                          <div className="absolute top-2 left-2 bg-blue-500 text-white text-xs px-2 py-0.5 rounded font-medium z-10">
                            V{currentVersion.version_number}
                          </div>
                          
                          {/* More Menu Button - Top Right */}
                          {versions.length > 1 && (
                            <div className="absolute top-2 right-2" style={{ zIndex: 100 }}>
                              <div className="relative" style={{ zIndex: 100 }}>
            <div className="bg-black/60 hover:bg-black/80 rounded-sm h-5 w-5 flex items-center justify-center">
            <IconButton
              variant="ghost"
              size="sm"
                                    icon={MoreHorizontal}
                                    className="!bg-transparent !h-5 !w-5 !p-0"
                                    data-menu-trigger={currentVersion.id}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setVersionMenuOpen(versionMenuOpen === currentVersion.id ? null : currentVersion.id);
                                    }}
                                  />
                                </div>
                                <Menu
                                  isOpen={versionMenuOpen === currentVersion.id}
                                  onClose={() => setVersionMenuOpen(null)}
                                  position="bottom"
                                  align="left"
                                  triggerId={currentVersion.id}
                                  items={[
                                    {
                                      label: 'Set as current',
                                      onClick: () => {
                                        handleSetAsPrimary(currentVersion.id);
                                        setVersionMenuOpen(null);
                                      },
                                      icon: <CheckCircle className="w-4 h-4 mr-2" />
                                    },
                                    {
                                      label: 'Download version',
                                      onClick: () => {
                                        handleDownloadVersion(currentVersion);
                                        setVersionMenuOpen(null);
                                      },
                                      icon: <Download className="w-4 h-4 mr-2" />
                                    },
                                    {
                                      label: 'Delete version',
                                      onClick: () => {
                                        // TODO: Implement delete version
                                        setVersionMenuOpen(null);
                                      },
                                      icon: <Trash2 className="w-4 h-4 mr-2" />
                                    }
                                  ]}
                                />
                              </div>
                            </div>
                          )}
                          
                          <div className="p-4 overflow-hidden rounded">
                            {currentVersion.file_type?.startsWith('image/') ? (
                              <img
                                src={currentVersion.file_url}
                                alt={currentVersion.name}
                                className="w-full aspect-square object-cover rounded"
                              />
                            ) : currentVersion.file_type?.startsWith('video/') ? (
                              <div className="w-full aspect-square bg-gray-600 rounded relative overflow-hidden">
                                <video
                                  src={currentVersion.file_url}
                                  className="w-full h-full object-cover"
                                  muted
                                  preload="metadata"
                                />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                  <div className="bg-black/60 rounded-full p-2">
                                    <Play className="w-6 h-6 text-white fill-white" />
            </div>
          </div>
                              </div>
                            ) : currentVersion.file_type?.startsWith('audio/') ? (
                              <div className="w-full aspect-square bg-gray-600 rounded flex items-center justify-center">
                                <WaveformIcon className="text-gray-400" size={32} />
                              </div>
                            ) : (
                              <div className="w-full aspect-square bg-gray-600 flex items-center justify-center rounded">
                                <FileText className="w-6 h-6 text-gray-400" />
                              </div>
                            )}
                          </div>
                        </div>
                        {/* File Type and Size */}
                        <div className="text-xs text-gray-400">
                          {getFileTypeDisplay(currentVersion.file_type || '', currentVersion.name)} · {formatFileSize((currentVersion.file_size || currentFile?.file_size || 0))}
                        </div>
                      </div>
                    );
                  })()}
                  
                  {/* Older Versions */}
                  {(() => {
                    // Find the primary version (or the selected version if manually selected)
                    const primaryVersion = versions.find(v => v.is_primary === true);
                    const currentVersion = selectedVersion 
                      ? versions.find(v => v.id === selectedVersion) || primaryVersion || versions[0]
                      : primaryVersion || versions[0];
                    const currentVersionId = currentVersion?.id;
                    const olderVersions = versions.filter(v => v.id !== currentVersionId);
                    if (olderVersions.length === 0) return null;
                    
                    return (
                      <>
                        <hr className="my-4 border-gray-700" />
                        <h3 className="text-white font-medium text-xs mb-4">Older versions</h3>
                        <div className="space-y-3">
                          {olderVersions.map((version) => (
                            <div key={version.id} className="space-y-2">
                              <div className="relative bg-gray-700 rounded-lg w-32" style={{ overflow: 'visible' }}>
                                {/* Version Tag - Top Left */}
                                <div className="absolute top-2 left-2 bg-gray-800 text-white text-xs px-2 py-0.5 rounded font-medium z-10">
                                  V{version.version_number}
                                </div>
                                
                                {/* More Menu Button - Top Right */}
                                <div className="absolute top-2 right-2" style={{ zIndex: 100 }}>
                                  <div className="relative" style={{ zIndex: 100 }}>
            <div className="bg-black/60 hover:bg-black/80 rounded-sm h-5 w-5 flex items-center justify-center">
           <IconButton
                variant="ghost"
               size="sm"
                                        icon={MoreHorizontal}
                                        className="!bg-transparent !h-5 !w-5 !p-0"
                                        data-menu-trigger={version.id}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setVersionMenuOpen(versionMenuOpen === version.id ? null : version.id);
                                        }}
                                      />
                                    </div>
                                    <Menu
                                      isOpen={versionMenuOpen === version.id}
                                      onClose={() => setVersionMenuOpen(null)}
                                      position="bottom"
                                      align="left"
                                      triggerId={version.id}
                                      items={[
                                        {
                                          label: 'Set as current',
                                          onClick: () => {
                                            handleSetAsPrimary(version.id);
                                            setVersionMenuOpen(null);
                                          },
                                          icon: <CheckCircle className="w-4 h-4 mr-2" />
                                        },
                                        {
                                          label: 'Download version',
                                          onClick: () => {
                                            handleDownloadVersion(version);
                                            setVersionMenuOpen(null);
                                          },
                                          icon: <Download className="w-4 h-4 mr-2" />
                                        },
                                        {
                                          label: 'Delete version',
                                          onClick: () => {
                                            // TODO: Implement delete version
                                            setVersionMenuOpen(null);
                                          },
                                          icon: <Trash2 className="w-4 h-4 mr-2" />
                                        }
                                      ]}
                                    />
                                  </div>
                                </div>
                                
                                <div className="p-4 overflow-hidden rounded">
                                  {version.file_type?.startsWith('image/') ? (
                                    <img
                                      src={version.file_url}
                                      alt={version.name}
                                      className="w-full aspect-square object-cover rounded"
                                    />
                                  ) : version.file_type?.startsWith('video/') ? (
                                    <div className="w-full aspect-square bg-gray-600 rounded relative overflow-hidden">
                                      <video
                                        src={version.file_url}
                                        className="w-full h-full object-cover"
                                        muted
                                        preload="metadata"
                                      />
                                      <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                        <div className="bg-black/60 rounded-full p-2">
                                          <Play className="w-6 h-6 text-white fill-white" />
                                        </div>
                                      </div>
                                    </div>
                                  ) : version.file_type?.startsWith('audio/') ? (
                                    <div className="w-full aspect-square bg-gray-600 rounded flex items-center justify-center">
                                      <WaveformIcon className="text-gray-400" size={32} />
                                    </div>
                                  ) : (
                                    <div className="w-full aspect-square bg-gray-600 flex items-center justify-center rounded">
                                      <FileText className="w-6 h-6 text-gray-400" />
                                    </div>
                                  )}
                                </div>
                              </div>
                              {/* File Type and Size */}
                              <div className="text-xs text-gray-400">
                                {getFileTypeDisplay(version.file_type || '', version.name)} · {formatFileSize((version.file_size || allFiles.find(f => f.id === version.id)?.file_size || 0))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    );
                  })()}
                </>
              )}
            </div>
          </div>
        <div className={`flex-1 flex flex-col bg-gray-700 ${commentsMinimized && !showVersionPanel ? 'rounded-b-xl' : showVersionPanel ? 'rounded-bl-xl' : 'rounded-bl-xl'} transition-all duration-300 relative`} style={{ maxHeight: '100%', minHeight: 0, overflow: 'hidden', zIndex: 50 }}>
          {/* Version Button - Top left corner of preview area */}
          <div className="absolute top-4 left-4 z-10">
            <button
              onClick={() => {
                const newState = !showVersionPanel;
                setShowVersionPanel(newState);
                setVersionPanelManuallyOpened(newState);
              }}
              className="px-3 py-1.5 bg-gray-600 hover:bg-gray-500 text-white text-xs font-medium rounded-md transition-colors cursor-pointer flex items-center gap-2"
            >
              {showVersionPanel ? (
                <>
                  <PanelRightOpen className="w-4 h-4" />
                  <span>V{displayedFile?.version_number || currentFile?.version_number || 1}</span>
                </>
              ) : (
                <>
                  <Layers className="w-4 h-4" />
                  <span>V{displayedFile?.version_number || currentFile?.version_number || 1}</span>
                </>
              )}
            </button>
          </div>
          {/* Expand button when right panel is minimized - Top right corner */}
          {commentsMinimized && (
            <div className="absolute top-4 right-4 z-10">
          <IconButton
            variant="secondary"
              size="sm"
                icon={PanelRightOpen}
                onClick={() => setCommentsMinimized(false)}
              />
            </div>
          )}
        <div className="flex-1 flex items-center justify-center relative" style={{ minHeight: 0, overflow: 'hidden' }}>
          {/* Fullscreen Container - Always in DOM but only visible when fullscreen */}
          {displayedFile?.file_type?.startsWith('image/') && (
            <div
              ref={fullscreenContainerRef}
              className={`${isFullscreen ? 'fixed inset-0 bg-gray-900 z-[100] flex flex-col' : 'hidden'}`}
            >
            {isFullscreen && displayedFile?.file_type?.startsWith('image/') && (
              <>
                {/* Close Fullscreen Button - Top Right */}
                <div className="absolute top-4 right-4 z-10">
                  <IconButton
                    variant="secondary"
                    size="sm"
                    icon={X}
                    onClick={handleExitFullscreen}
                  />
                </div>
                {/* Zoom Controls - Bottom Center */}
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10">
                  <div className="flex items-center gap-2 bg-gray-800/90 backdrop-blur-sm rounded-md px-2 h-8 border border-gray-700">
                    <IconButton
                      variant="ghost"
                      size="sm"
                      icon={ZoomOut}
                      onClick={handleZoomOut}
                      disabled={zoomLevel <= 1}
                      className="!bg-transparent hover:!bg-gray-700"
                    />
                    <span className="text-white text-sm font-medium min-w-[3rem] text-center">
                      {Math.round(zoomLevel * 100)}%
                    </span>
                    <IconButton
                      variant="ghost"
                      size="sm"
                      icon={ZoomIn}
                      onClick={handleZoomIn}
                      disabled={zoomLevel >= 4}
                      className="!bg-transparent hover:!bg-gray-700"
                    />
                  </div>
                </div>
                {/* Fullscreen Image Container */}
                <div 
                  ref={fullscreenImageContainerRef}
                  className="flex-1 flex items-center justify-center relative overflow-hidden p-8"
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseLeave}
                  style={{ cursor: zoomLevel > 1 ? (isPanning ? 'grabbing' : 'grab') : 'default' }}
                >
                  <div 
                    className="w-full h-full flex items-center justify-center"
                    style={{ 
                      transform: `translate(${panPosition.x}px, ${panPosition.y}px) scale(${zoomLevel})`,
                      transition: isPanning ? 'none' : 'transform 0.1s ease-out',
                      transformOrigin: 'center center'
                    }}
                  >
                    <img
                      src={displayedFile.file_url}
                      alt={displayedFile.name}
                      className="max-w-full max-h-full object-contain select-none"
                      draggable={false}
                    />
                  </div>
                </div>
              </>
            )}
            </div>
          )}
          
          <div 
            ref={imageContainerRef}
            className="w-full h-full flex items-center justify-center p-4 relative overflow-hidden"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
            style={{ cursor: zoomLevel > 1 && displayedFile?.file_type?.startsWith('image/') ? (isPanning ? 'grabbing' : 'grab') : 'default' }}
          >
              {displayedFile?.file_type?.startsWith('image/') ? (
              <div 
                className="w-full h-full flex items-center justify-center"
                style={{ 
                  transform: `translate(${panPosition.x}px, ${panPosition.y}px) scale(${zoomLevel})`,
                  transition: isPanning ? 'none' : 'transform 0.1s ease-out',
                  transformOrigin: 'center center'
                }}
              >
                <img
                  src={displayedFile.file_url}
                  alt={displayedFile.name}
                  className="max-w-full max-h-full object-contain select-none"
                  style={{ maxHeight: 'calc(90vh - 200px)' }}
                  draggable={false}
                />
              </div>
            ) : displayedFile?.file_type?.startsWith('video/') ? (
              <video
                src={displayedFile.file_url}
                controls
                className="max-w-full max-h-full object-contain"
                style={{ maxHeight: 'calc(90vh - 200px)' }}
                preload="metadata"
              >
                Your browser does not support the video tag.
              </video>
            ) : displayedFile?.file_type?.startsWith('audio/') ? (
              <div className="w-full max-w-4xl flex flex-col items-center justify-center p-8">
                <div className="bg-gray-800 rounded-lg p-8 mb-6">
                  <Music className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                </div>
                <div className="w-full mb-4">
                  <AudioWaveform
                    audioUrl={displayedFile.file_url}
                    audioElement={audioElement}
                    width={800}
                    height={120}
                    barColor="#4B5563"
                    progressColor="#3B82F6"
                  />
                </div>
                <audio
                  ref={(el) => {
                    audioRef.current = el;
                    setAudioElement(el);
                  }}
                  src={displayedFile.file_url}
                  controls
                  className="w-full max-w-md"
                  preload="metadata"
                >
                  Your browser does not support the audio tag.
                </audio>
                <p className="text-gray-400 text-sm mt-4">{displayedFile.name}</p>
              </div>
            ) : (
              <div className="w-full h-full max-h-[calc(90vh-200px)] bg-gray-800 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-400">Preview not available for this file type</p>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center p-4 absolute bottom-0 left-0 right-0 z-10">
            <div className="flex items-center gap-4">
              {/* Zoom Controls - Images only */}
              {displayedFile?.file_type?.startsWith('image/') && (
                <div className="flex items-center gap-2 bg-gray-600 rounded-md px-2 h-8">
                  <IconButton
                    variant="ghost"
                    size="sm"
                    icon={ZoomOut}
                    onClick={handleZoomOut}
                    disabled={zoomLevel <= 1}
                    className="!bg-transparent hover:!bg-gray-500"
                  />
                  <span className="text-white text-sm font-medium min-w-[3rem] text-center">
                    {Math.round(zoomLevel * 100)}%
                  </span>
                  <IconButton
                    variant="ghost"
                    size="sm"
                    icon={ZoomIn}
                    onClick={handleZoomIn}
                    disabled={zoomLevel >= 4}
                    className="!bg-transparent hover:!bg-gray-500"
                  />
                </div>
              )}
            </div>
            {/* Center - Download button (absolutely positioned to be truly centered) */}
            <div className="absolute left-1/2 transform -translate-x-1/2">
              <IconButton
                variant="primary"
                size="sm"
                icon={Download}
                onClick={handleDownload}
              >
                Download
              </IconButton>
            </div>
            {/* Right - Fullscreen button */}
            <div className="flex items-center ml-auto">
              {displayedFile?.file_type?.startsWith('image/') && (
                <IconButton
                  variant="secondary"
                  size="sm"
                  icon={Maximize}
                  onClick={handleFullscreen}
                />
              )}
            </div>
          </div>
        </div>

        {/* Comments Panel */}
        <div className={`${commentsMinimized ? 'w-0' : 'w-80'} flex flex-col bg-gray-900 ${commentsMinimized ? '' : 'rounded-br-xl'} transition-all duration-300 overflow-hidden relative`}>
          {/* Expand button when minimized */}
          {commentsMinimized && (
            <div className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-full z-10">
              <IconButton
                variant="secondary"
                size="sm"
                icon={PanelRightOpen}
                onClick={() => setCommentsMinimized(false)}
              />
            </div>
          )}
          {!commentsMinimized && (
            <React.Fragment>
              <div className="px-4 py-4 border-b border-gray-700">
                {/* Tabs */}
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setActiveTab('comments')}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer flex items-center gap-2 ${
                        activeTab === 'comments'
                          ? 'bg-gray-700 text-white'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      <span>Comments</span>
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                        activeTab === 'comments'
                          ? 'bg-gray-600 text-white'
                          : 'bg-gray-700 text-gray-400'
                      }`}>
                        {comments.length}
                      </span>
                    </button>
                    <button
                      onClick={() => setActiveTab('information')}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                        activeTab === 'information'
                          ? 'bg-gray-700 text-white'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      Information
                    </button>
                </div>
            <IconButton
                    variant="ghost"
              size="sm"
                    icon={PanelRightClose}
                    onClick={() => toggleCommentsMinimized(true)}
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                {/* Comments Tab */}
                {activeTab === 'comments' && (
                    <div className={`comments-container ${comments.length === 0 ? 'flex flex-col items-center justify-center min-h-full' : 'space-y-2'}`}>
                {loadingComments ? (
                  <div className="flex items-center justify-center py-8">
                    <Spinner size="sm" />
                  </div>
                ) : comments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center">
                    <MessageCircle className="w-8 h-8 text-gray-400 mb-1.5" />
                    <p className="text-gray-400 text-xs">No comments yet</p>
                  </div>
                ) : (
                  comments.map((comment) => (
                    <div key={comment.id} id={`comment-${comment.id}`} className="bg-gray-800 rounded-lg p-3">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="flex-shrink-0">
                            {comment.avatar_url ? (
                              <img
                                src={comment.avatar_url}
                                alt={comment.user_name}
                                className="w-5 h-5 rounded-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                }}
                              />
                            ) : null}
                            <div className={`w-5 h-5 bg-gray-600 rounded-full flex items-center justify-center ${comment.avatar_url ? 'hidden' : ''}`}>
                              <span className="text-xs text-gray-300 font-medium">
                                {(comment.actual_name || comment.user_name || 'U').charAt(0).toUpperCase()}
                              </span>
                            </div>
                          </div>
                          <span className="text-white font-medium text-sm">{comment.user_name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                        <span className="text-gray-400 text-xs">{formatCommentDate(comment.created_at)}</span>
                          {comment.version_number && (
                            <span className="bg-gray-700 text-gray-300 text-[10px] px-1 py-0.5 rounded font-medium">
                              V{comment.version_number}
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-gray-300 text-sm whitespace-pre-wrap">
                        {(() => {
                          let styledContent = comment.content;
                          
                          // First, handle tagged users by ID (more reliable)
                          if (comment.tagged_users && comment.tagged_users.length > 0) {
                            console.log('Processing tagged users:', comment.tagged_users);
                            console.log('Available users:', allUsers);
                                                          comment.tagged_users.forEach(taggedUserId => {
                                const taggedUser = allUsers.find(u => u.id === taggedUserId);
                                console.log(`Looking for tagged user ID ${taggedUserId}:`, taggedUser);
                                if (taggedUser) {
                                  console.log(`User name: "${taggedUser.name}", Comment content: "${styledContent}"`);
                                const isCurrentUser = taggedUser.id === currentUser?.id;
                                
                                // Find and replace the specific @mention for this user
                                // The issue is that the user name is "simon" but the comment shows "@Simon Roessler"
                                // We need to match the actual @mention pattern in the comment
                                // Let's use a more flexible approach to match any @mention that could be this user
                                const escapedName = taggedUser.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                                // Match @ followed by the name (case insensitive) and include spaces and additional words
                                const mentionRegex = new RegExp(`@${escapedName}\\s+\\w+|@${escapedName}`, 'gi');
                                
                                console.log(`Trying to replace mention with regex: ${mentionRegex}`);
                                console.log(`Original content: "${styledContent}"`);
                                console.log(`Looking for pattern: @${taggedUser.name}...`);
                                
                                // Test if the regex actually matches
                                const testMatch = styledContent.match(mentionRegex);
                                console.log(`Regex test match:`, testMatch);
                                
                                if (testMatch && testMatch.length > 0) {
                                  // Get the actual matched text (preserves original case)
                                  const actualMention = testMatch[0];
                                  console.log(`Actual matched mention: "${actualMention}"`);
                                  
                                  // The issue is that the regex only matches @Simon, not @Simon Roessler
                                  // Let's find the full @mention by looking for the pattern that starts with the matched text
                                  // We need to match the entire @mention including spaces and the full name
                                  // Let's try a different approach - match the entire @mention pattern including spaces
                                  const fullMentionMatch = styledContent.match(new RegExp(`@${escapedName}\\s+\\w+|@${escapedName}`, 'gi'));
                                  console.log(`Full mention match:`, fullMentionMatch);
                                  
                                  if (fullMentionMatch && fullMentionMatch.length > 0) {
                                    const fullMention = fullMentionMatch[0];
                                    console.log(`Full mention to replace: "${fullMention}"`);
                                    
                                    if (isCurrentUser) {
                                      const replacement = `<span class="text-blue-400 font-medium px-1 rounded" style="background-color: rgba(30, 58, 138, 0.9);">${fullMention}</span>`;
                                      styledContent = styledContent.replace(fullMention, replacement);
                                      console.log(`Replaced with: "${styledContent}"`);
                                    } else {
                                      const replacement = `<span class="text-blue-400 font-medium px-1 rounded" style="background-color: rgba(59, 130, 246, 0.2);">${fullMention}</span>`;
                                      styledContent = styledContent.replace(fullMention, replacement);
                                      console.log(`Replaced with: "${styledContent}"`);
                                    }
                                  }
                                }
                              }
                            });
                          } else {
                            // Fallback: try to match by current user names
                            allUsers.forEach(user => {
                              const mention = `@${user.name}`;
                              if (styledContent.includes(mention)) {
                                const isCurrentUser = user.id === currentUser?.id;
                                
                                if (isCurrentUser) {
                                  const escapedName = user.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                                  styledContent = styledContent.replace(
                                    new RegExp(`@${escapedName}\\b`, 'g'),
                                    `<span class="text-blue-400 font-medium px-1 rounded" style="background-color: rgba(30, 58, 138, 0.9);">@${user.name}</span>`
                                  );
                                } else {
                                  const escapedName = user.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                                  styledContent = styledContent.replace(
                                    new RegExp(`@${escapedName}\\b`, 'g'),
                                    `<span class="text-blue-400 font-medium">@${user.name}</span>`
                                  );
                                }
                              }
                            });
                          }
                          
                          return <span dangerouslySetInnerHTML={{ __html: styledContent }} />;
                        })()}
                      </p>
                    </div>
                  ))
                )}
              </div>
                )}

                {/* Information Tab */}
                {activeTab === 'information' && (
                  <div className="space-y-6">
                    {/* Title Section */}
                    <div>
                      <h4 className="text-white font-medium mb-2">{currentFile?.name}</h4>
                      <p className="text-gray-400 text-sm">
                        {getFileTypeDisplay(currentFile?.file_type || '', currentFile?.name)} · {formatFileSize(currentFile?.file_size || 0)}
                      </p>
                    </div>

                    {/* Status and Version Section */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          {currentFile?.status === 'final' ? (
                            <CircleCheck className="w-4 h-4 text-green-400" />
                          ) : (
                            <CircleDashed className="w-4 h-4 text-blue-400" />
                          )}
                          <span className="text-gray-300 text-sm capitalize">{currentFile?.status || 'in_progress'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Hash className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-300 text-sm">V{currentFile?.version_number || 1}</span>
                        </div>
                      </div>
                    </div>

                    {/* Tags Section */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Tag className="w-4 h-4 text-gray-400" />
                        <h4 className="text-white font-medium">Tags</h4>
                      </div>
                      {loadingTags ? (
                        <Spinner size="sm" />
                      ) : (
                        <div className="space-y-2">
                          <div className="flex flex-wrap gap-2 mb-3">
                            {tags.map((tag) => (
                              <div
                                key={tag.id}
                                className="flex items-center gap-2 bg-gray-700 px-3 py-1.5 rounded-lg"
                              >
                                <span className="text-gray-300 text-sm">{tag.tag}</span>
                                <button
                                  onClick={() => handleDeleteTag(tag.id)}
                                  className="text-gray-400 hover:text-white transition-colors cursor-pointer"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={newTag}
                              onChange={(e) => setNewTag(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleAddTag();
                                }
                              }}
                              placeholder="Add a tag..."
                              className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <IconButton
                              variant="secondary"
                              size="sm"
                              icon={Plus}
                              onClick={handleAddTag}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Usage Rights Section */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <FileCheck className="w-4 h-4 text-gray-400" />
                        <h4 className="text-white font-medium">Usage Rights</h4>
                      </div>
                      {loadingUsageRights ? (
                        <Spinner size="sm" />
                      ) : (
                        <div className="space-y-3">
                          {usageRights.length === 0 ? (
                            <p className="text-gray-400 text-sm">No usage rights defined</p>
                          ) : (
                            usageRights.map((right) => (
                              <div key={right.id} className="bg-gray-800 rounded-lg p-3">
                                <div className="flex items-start justify-between mb-2">
                                  <div>
                                    <div className="text-white font-medium text-sm">{right.owner_name}</div>
                                    <div className="text-gray-400 text-xs capitalize">{right.owner_type}</div>
                                  </div>
                                </div>
                                {right.rights_description && (
                                  <p className="text-gray-300 text-sm mb-2">{right.rights_description}</p>
                                )}
                                {(right.valid_from || right.valid_until) && (
                                  <div className="flex items-center gap-4 text-xs text-gray-400">
                                    {right.valid_from && (
                                      <span>From: {new Date(right.valid_from).toLocaleDateString()}</span>
                                    )}
                                    {right.valid_until && (
                                      <span>Until: {new Date(right.valid_until).toLocaleDateString()}</span>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))
                          )}
                          <button className="w-full bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white text-sm font-medium transition-colors cursor-pointer">
                            Add Usage Right
                          </button>
                        </div>
                      )}
                    </div>

                    {/* File Information Section */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Info className="w-4 h-4 text-gray-400" />
                        <h4 className="text-white font-medium">File Information</h4>
                      </div>
                      <div className="space-y-2">
                        {fileInfo?.uploader_name && (
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-300 text-sm">Uploaded by: {fileInfo.uploader_name}</span>
                          </div>
                        )}
                        {fileInfo?.created_at && (
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-300 text-sm">
                              Upload date: {new Date(fileInfo.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Comment Input - Only show for Comments tab */}
              {activeTab === 'comments' && (
              <div className="p-4 border-t border-gray-700">
                <div className="relative bg-gray-800 border border-gray-600 rounded-lg min-h-[80px] max-h-[320px] overflow-hidden">
                  {/* User Avatar */}
                  <div className="absolute top-3 left-3 z-10">
                    {(() => {
                      const currentUserProfile = currentUser ? allUsers.find(u => u.id === currentUser.id) : null;
                      const avatarUrl = currentUserProfile?.avatar_url;
                      
                      if (avatarUrl) {
                        return (
                          <img
                            src={avatarUrl}
                            alt="Your avatar"
                            className="w-5 h-5 rounded-full object-cover"
                          />
                        );
                      } else {
                        return (
                          <div className="w-5 h-5 bg-gray-600 rounded-full flex items-center justify-center">
                            <span className="text-xs text-gray-300 font-medium">
                              {currentUserProfile?.name?.charAt(0).toUpperCase() || 'U'}
                            </span>
                          </div>
                        );
                      }
                    })()}
                  </div>
                  
                  {/* Input Field */}
                  <div
                    ref={inputRef}
                    contentEditable
                    suppressContentEditableWarning={true}
                    onInput={(e) => {
                      const text = e.currentTarget.textContent || '';
                      setNewComment(text);
                      handleCommentChange(text);
                    }}
                    onKeyDown={handleKeyDown}
                    className="w-full h-full pl-12 pr-4 py-3 text-white text-sm focus:outline-none resize-none overflow-y-auto"
                    style={{ 
                      whiteSpace: 'pre-wrap',
                      wordWrap: 'break-word',
                      minHeight: '80px',
                      maxHeight: '320px'
                    }}
                    data-placeholder="Write a comment, type @ to tag users..."
                  />
                  {!newComment && (
                    <div className="absolute top-3 left-12 text-gray-400 text-sm pointer-events-none">
                      Write a comment, type @ to tag users...
                    </div>
                  )}
                  
                  {/* Send Button Row */}
                  <div className="absolute bottom-2 right-2">
                    <IconButton
                      variant="primary"
                      size="sm"
                      icon={postingComment ? Loader2 : Send}
                      onClick={postComment}
                      disabled={!newComment.trim() || postingComment}
                      className="!h-6 !w-6" // Override to keep send button smaller
                    />
                  </div>
          </div>
          
                {/* User Suggestions Dropdown - Positioned above input */}
                {showSuggestions && (
                  <div 
                    className="fixed bg-gray-800 border border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto"
                    style={{
                      zIndex: 99999,
                      top: `${dropdownPosition.top}px`,
                      left: `${dropdownPosition.left}px`,
                      width: `${dropdownPosition.width}px`,
                      transform: 'translateY(-100%)' // Position above the input
                    }}
                  >
                    <div className="p-2 border-b border-gray-600 text-xs text-gray-400">
                      Select a user to mention:
                    </div>
                    {userSuggestions.map((user, index) => (
                      <button
                        key={user.id}
                        onClick={() => selectSuggestion(user)}
                        className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-700 transition-colors cursor-pointer ${
                          index === suggestionIndex ? 'bg-gray-700' : ''
                        }`}
                      >
                                                    <div className="flex-shrink-0">
                              {user.avatar_url ? (
                                <img
                                  src={user.avatar_url}
                                  alt={user.name}
                                  className="w-5 h-5 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-5 h-5 bg-gray-600 rounded-full flex items-center justify-center">
                                  <span className="text-xs text-gray-300 font-medium">
                                    {user.name.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                              )}
                            </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-white text-sm font-semibold truncate">{user.name}</div>
                          <div className="text-gray-400 text-xs font-medium truncate">{user.email}</div>
                        </div>
                        <AtSign className="w-4 h-4 text-blue-400 flex-shrink-0" />
                      </button>
                    ))}
                  </div>
                )}
          </div>
              )}
            </React.Fragment>
          )}
        </div>
      </div>
    </div>
  );
} 