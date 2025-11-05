import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { createMentionNotifications } from '../lib/notificationUtils';
import Spinner from './Spinner';
import IconButton from './IconButton';
import AssetDetailHeader from './AssetDetailHeader';
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
  PanelRightOpen
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

  // Update currentIndex when currentFileIndex prop changes
  React.useEffect(() => {
    setCurrentIndex(currentFileIndex);
  }, [currentFileIndex]);

  // Get current user
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    };
    getCurrentUser();
  }, []);

  const currentFile = allFiles[currentIndex] || file;

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

  // Load comments when file changes
  useEffect(() => {
    if (currentFile) {
      loadComments();
    }
  }, [currentFile?.id]); // Only reload when file ID changes, not the entire file object

  const loadComments = async () => {
    if (!currentFile) return;
    
    setLoadingComments(true);
    try {
      const { data: commentsData, error } = await supabase
        .from('file_comments')
        .select('id, content, user_id, created_at, tagged_users')
        .eq('file_id', currentFile.id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading comments:', error);
        return;
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
        
        return {
          id: comment.id,
          content: comment.content,
          user_id: comment.user_id,
          user_name: userName,
          avatar_url: profile?.avatar_url || null,
          actual_name: profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.email?.split('@')[0] || 'Unknown User' : 'Unknown User',
          created_at: comment.created_at,
          tagged_users: comment.tagged_users || []
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

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = currentFile.file_url;
    link.download = currentFile.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

  const getFileTypeDisplay = (fileType: string) => {
    if (fileType.startsWith('image/')) return 'Image';
    if (fileType.startsWith('video/')) return 'Video';
    if (fileType.startsWith('audio/')) return 'Audio';
    if (fileType.includes('pdf')) return 'PDF';
    if (fileType.includes('zip') || fileType.includes('rar')) return 'Archive';
    return 'File';
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
        return;
      }

      // Get current user's profile data
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('avatar_url, first_name, last_name')
        .eq('id', user.id)
        .single();

      const taggedUserIds = extractTaggedUsers(newComment);

      const { data: newCommentData, error } = await supabase
        .from('file_comments')
        .insert({
          file_id: currentFile.id,
          user_id: user.id,
          content: newComment.trim(),
          tagged_users: taggedUserIds
        })
        .select('id, content, user_id, created_at, tagged_users')
        .single();

      if (error) {
        console.error('Error posting comment:', error);
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
        tagged_users: taggedUserIds
      };
      
      setComments(prev => [...prev, newCommentObj]);
      setNewComment('');
      setShowSuggestions(false);
      
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
    } catch (error) {
      console.error('Error posting comment:', error);
    } finally {
      setPostingComment(false);
    }
  };

  if (!isOpen || !file) {
    return null;
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-6" style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}>
      <div className="w-full h-full flex bg-transparent">
        <div className={`flex-1 flex flex-col bg-gray-700 ${commentsMinimized ? 'rounded-xl' : 'rounded-l-xl'}`}>
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
            <AssetDetailHeader
              deliverableName={deliverableName}
              artistName={artistName}
              releaseName={releaseName}
              coverUrl={coverUrl}
              className="flex-1"
            />
          <div className="flex items-center gap-4">
            <IconButton
              variant="ghost"
              size="sm"
                icon={MoreHorizontal}
              />
              {commentsMinimized && (
                <>
            <IconButton
                    variant="ghost"
              size="sm"
                    icon={PanelRightOpen}
                    onClick={() => toggleCommentsMinimized(false)}
                  />
            <IconButton
              variant="ghost"
              size="sm"
              icon={X}
              onClick={onClose}
            />
                </>
              )}
            </div>
          </div>
        <div className="flex-1 flex items-center justify-center relative">
          {/* Navigation Arrows */}
          <IconButton
            variant="secondary"
              size="sm"
            icon={ArrowLeft}
            onClick={handlePrevious}
            disabled={currentIndex === 0}
            className="absolute left-4 top-1/2 transform -translate-y-1/2"
          />
          <IconButton
            variant="secondary"
              size="sm"
            icon={ArrowRight}
            onClick={handleNext}
            disabled={currentIndex >= allFiles.length - 1}
            className="absolute right-4 top-1/2 transform -translate-y-1/2"
          />

          <div className="w-full h-full flex items-center justify-center p-4">
              {currentFile?.file_type.startsWith('image/') ? (
              <img
                src={currentFile.file_url}
                alt={currentFile.name}
                className="max-w-full max-h-full object-contain"
                style={{ maxHeight: 'calc(90vh - 200px)' }}
              />
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
        <div className="flex items-center justify-between p-4 border-t border-gray-700">
            <div className="flex items-center gap-4">
              {/* Status Icon Container - same size as cover image */}
              <div className="w-8 h-8 flex items-center justify-center flex-shrink-0">
                {currentFile?.status === 'final' ? (
                  <CircleCheck className="w-4 h-4 text-green-400" />
                ) : (
                  <CircleDashed className="w-4 h-4 text-blue-400" />
                )}
          </div>
          
              {/* File Info */}
              <div className="text-sm text-gray-300">
                <div className="font-medium">{currentFile?.name}</div>
                <div>{getFileTypeDisplay(currentFile?.file_type || '')} - {formatFileSize(currentFile?.file_size || 0)}</div>
              </div>
            </div>
          <div className="flex items-center gap-3">
              {currentFile?.status !== 'final' ? (
                <IconButton
                  variant="secondary"
                  size="sm"
                  icon={markingAsFinal ? Loader2 : CheckCircle}
                  onClick={handleMarkAsFinal}
                  disabled={markingAsFinal}
                >
                  {markingAsFinal ? 'Marking...' : 'Mark as final'}
                </IconButton>
              ) : (
                <IconButton
                  variant="secondary"
                  size="sm"
                  icon={markingAsFinal ? Loader2 : CircleDashed}
                  onClick={handleMarkAsInProgress}
                  disabled={markingAsFinal}
                >
                  {markingAsFinal ? 'Marking...' : 'Mark as in progress'}
                </IconButton>
              )}
            <IconButton
              variant="secondary"
                size="sm"
                icon={Share2}
              >
                Share
              </IconButton>
              <IconButton
                variant="primary"
              size="sm"
              icon={Download}
              onClick={handleDownload}
            >
              Download
            </IconButton>
            </div>
          </div>
        </div>

        {/* Comments Panel */}
        <div className={`${commentsMinimized ? 'w-0' : 'w-80'} flex flex-col bg-gray-900 rounded-r-xl transition-all duration-300 overflow-hidden`}>
          {!commentsMinimized && (
            <>
              <div className="px-4 py-4 flex items-center justify-between border-b border-gray-700 h-[73px]">
                <div className="flex items-center gap-2">
                  <h3 className="text-white font-medium">Comments</h3>
                  <span className="text-sm text-gray-400">({comments.length})</span>
                </div>
                <div className="flex items-center gap-2">
            <IconButton
                    variant="ghost"
              size="sm"
                    icon={PanelRightClose}
                    onClick={() => toggleCommentsMinimized(true)}
                  />
            <IconButton
              variant="ghost"
              size="sm"
                    icon={X}
                    onClick={onClose}
                  />
                </div>
              </div>

              <div className="comments-container flex-1 overflow-y-auto p-4 space-y-2">
                {loadingComments ? (
                  <div className="flex items-center justify-center py-8">
                    <Spinner size="sm" />
                  </div>
                ) : comments.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-400 text-sm">No comments yet</p>
                    <p className="text-gray-500 text-xs">Be the first to comment!</p>
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
                        <span className="text-gray-400 text-xs">{formatCommentDate(comment.created_at)}</span>
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

              {/* Comment Input */}
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
            </>
          )}
        </div>
      </div>
    </div>
  );
} 