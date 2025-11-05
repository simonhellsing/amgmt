import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';
import { createTestNotification } from '../lib/notificationUtils';
import Layout from '../components/Layout';
import AuthWrapper from '../components/AuthWrapper';
import Spinner from '../components/Spinner';
import Button from '../components/Button';
import { Bell, MessageSquare, FileText, Users, Check, Trash2, Filter } from 'lucide-react';

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

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'mentions'>('all');
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const [creatingTest, setCreatingTest] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchNotifications();
  }, [filter]);

  const fetchNotifications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (filter === 'unread') {
        query = query.eq('read', false);
      } else if (filter === 'mentions') {
        query = query.eq('type', 'mention');
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching notifications:', error);
        return;
      }

      setNotifications(data || []);
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
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    setMarkingAllRead(true);
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
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    } finally {
      setMarkingAllRead(false);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) {
        console.error('Error deleting notification:', error);
        return;
      }

      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const deleteAllRead = async () => {
    setDeletingAll(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', user.id)
        .eq('read', true);

      if (error) {
        console.error('Error deleting read notifications:', error);
        return;
      }

      setNotifications(prev => prev.filter(n => !n.read));
    } catch (error) {
      console.error('Error deleting read notifications:', error);
    } finally {
      setDeletingAll(false);
    }
  };

  const createTestNotificationHandler = async () => {
    setCreatingTest(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await createTestNotification(user.id);
      await fetchNotifications(); // Refresh the list
    } catch (error) {
      console.error('Error creating test notification:', error);
    } finally {
      setCreatingTest(false);
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
      }
    } else if (notification.related_file_id) {
      // Find the deliverable for this file
      const { data: fileData } = await supabase
        .from('deliverable_files')
        .select('deliverable_id')
        .eq('id', notification.related_file_id)
        .single();

      if (fileData) {
        router.push(`/deliverables/${fileData.deliverable_id}?file=${notification.related_file_id}`);
      }
    } else if (notification.related_deliverable_id) {
      router.push(`/deliverables/${notification.related_deliverable_id}`);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'mention':
        return <Users className="w-5 h-5 text-blue-400" />;
      case 'comment':
        return <MessageSquare className="w-5 h-5 text-green-400" />;
      case 'file_upload':
        return <FileText className="w-5 h-5 text-purple-400" />;
      case 'deliverable_update':
        return <FileText className="w-5 h-5 text-orange-400" />;
      default:
        return <Bell className="w-5 h-5 text-gray-400" />;
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

  const unreadCount = notifications.filter(n => !n.read).length;
  const readCount = notifications.filter(n => n.read).length;

  if (loading) {
    return (
      <AuthWrapper>
        <Layout>
          <div className="text-white">
            <div className="mb-6">
              <h1 className="text-2xl font-bold">Notifications</h1>
            </div>
            <div className="flex items-center justify-center py-12">
              <Spinner size="lg" />
            </div>
          </div>
        </Layout>
      </AuthWrapper>
    );
  }

  return (
    <AuthWrapper>
      <Layout>
        <div className="text-white">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold">Notifications</h1>
              <div className="flex items-center gap-3">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={createTestNotificationHandler}
                  disabled={creatingTest}
                  loading={creatingTest}
                >
                  Create Test
                </Button>
                {unreadCount > 0 && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={markAllAsRead}
                    disabled={markingAllRead}
                    loading={markingAllRead}
                  >
                    Mark all read
                  </Button>
                )}
                {readCount > 0 && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={deleteAllRead}
                    disabled={deletingAll}
                    loading={deletingAll}
                  >
                    Clear read
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="mb-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-400">Filter:</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-3 py-1 rounded text-sm transition-colors ${
                    filter === 'all' 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  All ({notifications.length})
                </button>
                <button
                  onClick={() => setFilter('unread')}
                  className={`px-3 py-1 rounded text-sm transition-colors ${
                    filter === 'unread' 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  Unread ({unreadCount})
                </button>
                <button
                  onClick={() => setFilter('mentions')}
                  className={`px-3 py-1 rounded text-sm transition-colors ${
                    filter === 'mentions' 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  Mentions ({notifications.filter(n => n.type === 'mention').length})
                </button>
              </div>
            </div>
          </div>

          {/* Notifications List */}
          <div className="bg-gray-800 rounded-lg">
            {notifications.length === 0 ? (
              <div className="p-12 text-center">
                <Bell className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-300 text-lg font-medium mb-2">No notifications</p>
                <p className="text-gray-400 text-sm">
                  {filter === 'all' 
                    ? "You're all caught up!" 
                    : filter === 'unread' 
                    ? "No unread notifications" 
                    : "No mention notifications"
                  }
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-700">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-6 transition-colors hover:bg-gray-700 ${
                      !notification.read ? 'bg-gray-700/50' : ''
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 mt-1">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="text-white font-medium">
                                {notification.title}
                              </h3>
                              {!notification.read && (
                                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                              )}
                            </div>
                            <p className="text-gray-300 text-sm mb-3">
                              {notification.message}
                            </p>
                            <div className="flex items-center gap-4">
                              <span className="text-xs text-gray-400">
                                {formatTimeAgo(notification.created_at)}
                              </span>
                              <div className="flex items-center gap-2">
                                {!notification.read && (
                                  <button
                                    onClick={() => markAsRead(notification.id)}
                                    className="text-xs text-gray-400 hover:text-white transition-colors"
                                  >
                                    Mark as read
                                  </button>
                                )}
                                <button
                                  onClick={() => deleteNotification(notification.id)}
                                  className="text-xs text-gray-400 hover:text-red-400 transition-colors"
                                >
                                  Delete
                                </button>
                                {(notification.related_file_id || notification.related_deliverable_id) && (
                                  <button
                                    onClick={() => handleNotificationClick(notification)}
                                    className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                                  >
                                    View
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Layout>
    </AuthWrapper>
  );
}
