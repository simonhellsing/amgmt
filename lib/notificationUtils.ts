import { supabase } from './supabase';

export interface CreateNotificationParams {
  userId: string;
  type: 'mention' | 'comment' | 'file_upload' | 'deliverable_update';
  title: string;
  message: string;
  relatedFileId?: string;
  relatedDeliverableId?: string;
  relatedCommentId?: string;
  metadata?: any;
}

export async function createNotification(params: CreateNotificationParams) {
  try {
    console.log('🔔 Creating notification with params:', params);
    
    // First, let's check if the user exists
    const { data: userData, error: userError } = await supabase
      .from('user_profiles')
      .select('id, email')
      .eq('id', params.userId)
      .single();
    
    if (userError || !userData) {
      console.error('❌ User not found for notification:', params.userId, userError);
      throw new Error(`User not found: ${params.userId}`);
    }
    
    console.log('✅ User found for notification:', userData);
    
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: params.userId,
        type: params.type,
        title: params.title,
        message: params.message,
        related_file_id: params.relatedFileId,
        related_deliverable_id: params.relatedDeliverableId,
        related_comment_id: params.relatedCommentId,
        metadata: params.metadata,
        read: false,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating notification:', error);
      console.error('❌ Error details:', error.details, error.hint, error.message);
      throw error;
    }

    console.log('✅ Notification created successfully:', data);
    return data;
  } catch (error) {
    console.error('❌ Error creating notification:', error);
    throw error;
  }
}

export async function createMentionNotifications(
  taggedUserIds: string[],
  commentId: string,
  fileId: string,
  commentAuthorName: string,
  commentContent: string
) {
  console.log('createMentionNotifications called with:', { taggedUserIds, commentId, fileId, commentAuthorName });
  try {
    // Get file and deliverable info for the notification
    const { data: fileData, error: fileError } = await supabase
      .from('deliverable_files')
      .select('name, deliverable_id')
      .eq('id', fileId)
      .single();

    if (fileError) {
      console.error('Error fetching file data:', fileError);
      return;
    }

    if (!fileData) {
      console.error('File not found for notification');
      return;
    }

    console.log('File data found:', fileData);

    const { data: deliverableData } = await supabase
      .from('deliverables')
      .select('name')
      .eq('id', fileData.deliverable_id)
      .single();

    // Create notifications for each tagged user
    console.log('Creating notifications for users:', taggedUserIds);
    const notificationPromises = taggedUserIds.map(userId =>
      createNotification({
        userId,
        type: 'mention',
        title: `${commentAuthorName} mentioned you in a comment`,
        message: `"${commentContent.substring(0, 100)}${commentContent.length > 100 ? '...' : ''}" on ${fileData.name} in ${deliverableData?.name || 'deliverable'}`,
        relatedFileId: fileId,
        relatedDeliverableId: fileData.deliverable_id,
        relatedCommentId: commentId,
        metadata: {
          commentAuthorName,
          fileName: fileData.name,
          deliverableName: deliverableData?.name
        }
      })
    );

    const results = await Promise.all(notificationPromises);
    console.log('Notification creation results:', results);
  } catch (error) {
    console.error('Error creating mention notifications:', error);
  }
}

export async function markNotificationAsRead(notificationId: string) {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);

    if (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
}

export async function markAllNotificationsAsRead(userId: string) {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    throw error;
  }
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) {
      console.error('Error getting unread notification count:', error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error('Error getting unread notification count:', error);
    return 0;
  }
}

// Test function to create a notification manually
export async function createTestNotification(userId: string) {
  try {
    console.log('🧪 Creating test notification for user:', userId);
    const result = await createNotification({
      userId,
      type: 'mention',
      title: 'Test notification',
      message: 'This is a test notification to verify the system works',
      metadata: { test: true }
    });
    console.log('✅ Test notification created:', result);
    return result;
  } catch (error) {
    console.error('❌ Error creating test notification:', error);
    throw error;
  }
}

// Global test function for browser console
if (typeof window !== 'undefined') {
  (window as any).testNotification = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('❌ No user logged in');
        return;
      }
      console.log('🧪 Testing notification for user:', user.id);
      await createTestNotification(user.id);
      console.log('✅ Test notification sent! Check your notification menu.');
      
      // Force refresh notification count after 1 second
      setTimeout(() => {
        console.log('🔄 Manually refreshing notification count...');
        // Trigger a manual refresh by dispatching a custom event
        window.dispatchEvent(new CustomEvent('refreshNotificationCount'));
      }, 1000);
    } catch (error) {
      console.error('❌ Test notification failed:', error);
    }
  };

  // Test mention notification for current user
  (window as any).testMentionNotification = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('❌ No user logged in');
        return;
      }
      console.log('🧪 Testing mention notification for user:', user.id);
      
      // Create a test mention notification
      await createMentionNotifications(
        [user.id], // Mention the current user
        'test-comment-id',
        'test-file-id',
        'Test User',
        'This is a test mention notification'
      );
      
      console.log('✅ Test mention notification sent! Check your notification menu.');
      // Force refresh notification count after 1 second
      setTimeout(() => {
        console.log('🔄 Manually refreshing notification count...');
        window.dispatchEvent(new CustomEvent('refreshNotificationCount'));
      }, 1000);
    } catch (error) {
      console.error('❌ Test mention notification failed:', error);
    }
  };

  // Test the notification callback directly
  (window as any).testNotificationCallback = () => {
    console.log('🧪 Testing notification callback directly...');
    // Dispatch the custom event that should trigger the badge update
    window.dispatchEvent(new CustomEvent('refreshNotificationCount'));
    console.log('✅ Custom event dispatched!');
  };
}
