import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';
import { Bell, MessageSquare, FileText, Users, X, Check } from 'lucide-react';

interface Notification {
  id: string;
  user_id: string;
  type: 'mention' | 'comment' | 'file_upload' | 'deliverable_update';
  title: string;
  message: string;
  related_file_id?: string;
  related_deliverable_id?: string;
  related_comment_id?: string;
  created_at: string;
  read: boolean;
  metadata?: any;
}

interface NotificationMenuProps {
  isOpen: boolean;
  onClose: () => void;
  position?: 'top' | 'bottom' | 'right';
  align?: 'left' | 'right';
  buttonRef?: React.RefObject<HTMLButtonElement>;
  onNotificationUpdate?: () => void;
}

export default function NotificationMenu({ isOpen, onClose, position = 'bottom', align = 'right', buttonRef, onNotificationUpdate }: NotificationMenuProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const router = useRouter();

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  useEffect(() => {
    // Set up real-time subscription for new notifications
    const setupSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const channel = supabase
        .channel('notifications')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        }, (payload) => {
          console.log('🔔 New notification received:', payload);
          console.log('🔔 Notification user_id:', payload.new?.user_id);
          console.log('🔔 Current user_id:', user.id);
          console.log('🔔 onNotificationUpdate function exists:', !!onNotificationUpdate);
          
          const newNotification = payload.new as Notification;
          setNotifications(prev => [newNotification, ...prev]);
          setUnreadCount(prev => prev + 1);
          
          // Notify parent to update its count
          if (onNotificationUpdate) {
            console.log('🔔 Calling onNotificationUpdate callback...');
            onNotificationUpdate();
            console.log('🔔 onNotificationUpdate callback completed');
          } else {
            console.log('🔔 No onNotificationUpdate callback provided');
          }
        })
        .subscribe((status) => {
          console.log('🔔 Notification subscription status:', status);
        });

      return channel;
    };

    let channel: any;
    setupSubscription().then(ch => {
      channel = ch;
    });

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [onNotificationUpdate]);

  const fetchNotifications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('No user found for notifications');
        return;
      }

      console.log('Fetching notifications for user:', user.id);
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error fetching notifications:', error);
        return;
      }

      console.log('Fetched notifications:', data);
      setNotifications(data || []);
      setUnreadCount(data?.filter(n => !n.read).length || 0);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) {
        console.error('Error marking notification as read:', error);
        return;
      }

      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
      
      // Notify parent to update its count
      if (onNotificationUpdate) {
        onNotificationUpdate();
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);

      if (error) {
        console.error('Error marking all notifications as read:', error);
        return;
      }

      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
      
      // Notify parent to update its count
      if (onNotificationUpdate) {
        onNotificationUpdate();
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    
    // Mark as read
    if (!notification.read) {
      await markAsRead(notification.id);
    }

    // Navigate based on notification type and available related IDs
    if (notification.related_comment_id) {
      // For comment mentions, find the file that contains this comment
      const { data: commentData, error: commentError } = await supabase
        .from('comments')
        .select('file_id')
        .eq('id', notification.related_comment_id)
        .single();

      if (commentData?.file_id) {
        // Find the deliverable for this file
        const { data: fileData, error: fileError } = await supabase
          .from('deliverable_files')
          .select('deliverable_id')
          .eq('id', commentData.file_id)
          .single();

        if (fileData?.deliverable_id) {
          // Navigate to deliverable with comment ID in URL hash for scrolling
          const url = `/deliverables/${fileData.deliverable_id}?file=${commentData.file_id}#comment-${notification.related_comment_id}`;
          router.push(url);
        }
      } else {
        // Fallback: try to navigate to the file directly if we have related_file_id
        if (notification.related_file_id) {
          const { data: fileData } = await supabase
            .from('deliverable_files')
            .select('deliverable_id')
            .eq('id', notification.related_file_id)
            .single();

          if (fileData) {
            const url = `/deliverables/${fileData.deliverable_id}?file=${notification.related_file_id}`;
            router.push(url);
          }
        }
      }
    } else if (notification.related_file_id) {
      // Find the deliverable for this file
      const { data: fileData } = await supabase
        .from('deliverable_files')
        .select('deliverable_id')
        .eq('id', notification.related_file_id)
        .single();

      if (fileData) {
        const url = `/deliverables/${fileData.deliverable_id}?file=${notification.related_file_id}`;
        router.push(url);
      }
    } else if (notification.related_deliverable_id) {
      const url = `/deliverables/${notification.related_deliverable_id}`;
      router.push(url);
    }
    onClose();
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'mention':
        return <Users className="w-4 h-4 text-blue-400" />;
      case 'comment':
        return <MessageSquare className="w-4 h-4 text-green-400" />;
      case 'file_upload':
        return <FileText className="w-4 h-4 text-purple-400" />;
      case 'deliverable_update':
        return <FileText className="w-4 h-4 text-orange-400" />;
      default:
        return <Bell className="w-4 h-4 text-gray-400" />;
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  if (!isOpen) return null;

  const getPositionClasses = () => {
    if (position === 'right') {
      return 'left-[268px] top-6';
    }
    return `${align === 'right' ? 'right-4' : 'left-4'} ${position === 'bottom' ? 'top-20' : 'bottom-20'}`;
  };

  return (
    <div className="fixed inset-0 z-50" onClick={onClose}>
      <div 
        className={`absolute ${getPositionClasses()} w-80 bg-gray-800 border border-gray-700 rounded-lg shadow-xl`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h3 className="text-white font-medium">Notifications</h3>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-gray-400 hover:text-white transition-colors"
              >
                Mark all read
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="max-h-96 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-gray-400">
              Loading notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-700">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 cursor-pointer transition-colors hover:bg-gray-700 ${
                    !notification.read ? 'bg-gray-700/50' : ''
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-white">
                          {notification.title}
                        </p>
                        <div className="flex items-center gap-2">
                          {!notification.read && (
                            <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                          )}
                          <span className="text-xs text-gray-400">
                            {formatTimeAgo(notification.created_at)}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-300 mt-1">
                        {notification.message}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="p-3 border-t border-gray-700">
            <button
              onClick={() => router.push('/notifications')}
              className="w-full text-center text-sm text-gray-400 hover:text-white transition-colors"
            >
              View all notifications
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
