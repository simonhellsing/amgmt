import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
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
  AtSign
} from 'lucide-react';

interface DeliverableFile {
  id: string;
  name: string;
  file_type: string;
  file_size: number;
  file_url: string;
  created_at: string;
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
  deliverableName: string;
  artistName: string;
  releaseName: string;
  coverUrl: string;
}

export default function FilePreviewModal({
  isOpen,
  file,
  allFiles,
  currentFileIndex,
  onClose,
  onFileChange,
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
  
  // User tagging state
  const [userSuggestions, setUserSuggestions] = useState<UserSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [allUsers, setAllUsers] = useState<UserSuggestion[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  if (!isOpen || !file) {
    return null;
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-8" style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}>
      <div className="bg-gray-700 rounded-lg w-full h-full flex">
        <div className="flex-1 flex flex-col">
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
                variant="secondary"
                size="sm"
                icon={Share2}
              >
                Share
              </IconButton>
              <IconButton
                variant="ghost"
                size="sm"
                icon={X}
                onClick={onClose}
              />
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center relative">
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
            <div className="text-sm text-gray-300">
              <div className="font-medium">{currentFile?.name}</div>
            </div>
            <div className="flex items-center gap-3">
              <IconButton
                variant="secondary"
                size="sm"
                icon={Download}
              >
                Download
              </IconButton>
            </div>
          </div>
        </div>
        <div className="w-80 border-l border-gray-700 flex flex-col bg-gray-900">
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-white font-medium">Comments</h3>
              <span className="text-sm text-gray-400">(0)</span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="text-center py-8">
              <MessageCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">No comments yet</p>
              <p className="text-gray-500 text-xs">Be the first to comment!</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
