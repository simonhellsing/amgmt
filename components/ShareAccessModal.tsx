import { useState, useEffect } from 'react';
import { X, Users, Mail, Link as LinkIcon, Copy, Check } from 'lucide-react';
import Button from './Button';
import Spinner from './Spinner';
import { 
  getAccessGrants, 
  inviteUsers, 
  changeAccessLevel, 
  revokeAccess,
  createShareLink,
  getShareLinks,
  deleteShareLink,
  AccessLevel,
  ResourceType,
  AccessGrant,
  ShareLink
} from '../lib/accessControl';
import { useToast } from '../lib/useToast';

interface ShareAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  resourceType: ResourceType;
  resourceId: string;
  resourceName: string;
  resourceDescription?: string;
  resourceImageUrl?: string;
}

export default function ShareAccessModal({
  isOpen,
  onClose,
  resourceType,
  resourceId,
  resourceName,
  resourceDescription,
  resourceImageUrl
}: ShareAccessModalProps) {
  const [activeTab, setActiveTab] = useState<'people' | 'links'>('people');
  const [loading, setLoading] = useState(true);
  const [grants, setGrants] = useState<AccessGrant[]>([]);
  const [shareLinks, setShareLinks] = useState<ShareLink[]>([]);
  const [isInviting, setIsInviting] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmails, setInviteEmails] = useState('');
  const [inviteAccessLevel, setInviteAccessLevel] = useState<AccessLevel>('view');
  const [isCreatingLink, setIsCreatingLink] = useState(false);
  const [newLinkAccessLevel, setNewLinkAccessLevel] = useState<AccessLevel>('view');
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);

  const { success, error } = useToast();

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, resourceType, resourceId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [grantsData, linksData] = await Promise.all([
        getAccessGrants(resourceType, resourceId),
        getShareLinks(resourceType, resourceId)
      ]);
      setGrants(grantsData);
      setShareLinks(linksData);
    } catch (err) {
      console.error('Error loading share data:', err);
      error('Failed to load sharing information');
    } finally {
      setLoading(false);
    }
  };

  const handleInviteUsers = async () => {
    if (!inviteEmails.trim()) return;

    setIsInviting(true);
    try {
      const emails = inviteEmails.split('\n').map(email => email.trim()).filter(Boolean);
      
      const result = await inviteUsers({
        resourceType,
        resourceId,
        emails,
        accessLevel: inviteAccessLevel,
        resourceName,
        resourceDescription
      });

      const successCount = result.success.length;
      const errorCount = result.errors.length;
      const existingCount = result.alreadyExists.length;

      let message = `Invitations sent: ${successCount}`;
      if (existingCount > 0) message += `, Already have access: ${existingCount}`;
      if (errorCount > 0) message += `, Failed: ${errorCount}`;

      success(message);
      
      // Reset form and reload data
      setInviteEmails('');
      setShowInviteForm(false);
      loadData();
    } catch (err) {
      console.error('Error inviting users:', err);
      error('Failed to send invitations');
    } finally {
      setIsInviting(false);
    }
  };

  const handleChangeAccess = async (grantId: string, newAccessLevel: AccessLevel) => {
    try {
      await changeAccessLevel({ grantId, accessLevel: newAccessLevel });
      success('Access level updated');
      loadData();
    } catch (err) {
      console.error('Error changing access:', err);
      error('Failed to update access level');
    }
  };

  const handleRevokeAccess = async (grantId: string) => {
    try {
      await revokeAccess({ grantId });
      success('Access revoked');
      loadData();
    } catch (err) {
      console.error('Error revoking access:', err);
      error('Failed to revoke access');
    }
  };

  const handleCreateShareLink = async () => {
    setIsCreatingLink(true);
    try {
      await createShareLink({
        resourceType,
        resourceId,
        accessLevel: newLinkAccessLevel,
        title: `Share link for ${resourceName}`,
        description: resourceDescription
      });
      success('Share link created');
      loadData();
      setNewLinkAccessLevel('view');
    } catch (err) {
      console.error('Error creating share link:', err);
      error('Failed to create share link');
    } finally {
      setIsCreatingLink(false);
    }
  };

  const handleCopyLink = async (link: ShareLink) => {
    const url = `${window.location.origin}/shared/${link.token}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedLinkId(link.id);
      success('Link copied to clipboard');
      setTimeout(() => setCopiedLinkId(null), 2000);
    } catch (err) {
      console.error('Error copying link:', err);
      error('Failed to copy link');
    }
  };

  const handleDeleteLink = async (linkId: string) => {
    try {
      await deleteShareLink(linkId);
      success('Share link deleted');
      loadData();
    } catch (err) {
      console.error('Error deleting link:', err);
      error('Failed to delete share link');
    }
  };

  const getAccessLevelColor = (level: AccessLevel) => {
    switch (level) {
      case 'view': return 'text-blue-400';
      case 'artist': return 'text-green-400';
      case 'edit': return 'text-yellow-400';
      case 'full': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getAccessLevelLabel = (level: AccessLevel) => {
    switch (level) {
      case 'view': return 'View Only';
      case 'artist': return 'Artist Access';
      case 'edit': return 'Edit Access';
      case 'full': return 'Full Access';
      default: return level;
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
    >
      <div className="bg-gray-800 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center gap-4">
            {resourceImageUrl && (
              <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-700 flex-shrink-0">
                <img 
                  src={resourceImageUrl} 
                  alt={resourceName}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div>
              <h2 className="text-xl font-semibold text-white">Share Access</h2>
              <p className="text-gray-400">{resourceName}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700">
          <button
            onClick={() => setActiveTab('people')}
            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'people'
                ? 'text-white border-b-2 border-blue-500'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4 inline mr-2" />
            People
          </button>
          <button
            onClick={() => setActiveTab('links')}
            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'links'
                ? 'text-white border-b-2 border-blue-500'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <LinkIcon className="w-4 h-4 inline mr-2" />
            Share Links
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : (
            <>
              {/* People Tab */}
              {activeTab === 'people' && (
                <div className="p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-medium text-white">
                      People with access ({grants.length})
                    </h3>
                    <Button onClick={() => setShowInviteForm(true)} size="sm">
                      <Mail className="w-4 h-4" />
                      Invite People
                    </Button>
                  </div>

                  {/* People List */}
                  <div className="space-y-3">
                    {grants.map((grant) => (
                      <div key={grant.id} className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                            <Users className="w-4 h-4 text-gray-300" />
                          </div>
                          <div>
                            <div className="text-white">
                              {grant.email}
                              {grant.isYou && <span className="text-gray-400 ml-2">(you)</span>}
                            </div>
                            <div className={`text-sm ${getAccessLevelColor(grant.accessLevel)}`}>
                              {getAccessLevelLabel(grant.accessLevel)}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <select
                            value={grant.accessLevel}
                            onChange={(e) => handleChangeAccess(grant.id, e.target.value as AccessLevel)}
                            disabled={grant.isYou}
                            className="bg-gray-600 border border-gray-500 rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-blue-500 disabled:opacity-50"
                          >
                            <option value="view">View Only</option>
                            <option value="artist">Artist Access</option>
                            <option value="edit">Edit Access</option>
                            <option value="full">Full Access</option>
                          </select>
                          
                          {!grant.isYou && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRevokeAccess(grant.id)}
                              className="text-red-400 hover:text-red-300"
                            >
                              Remove
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}

                    {grants.length === 0 && (
                      <div className="text-center py-8 text-gray-400">
                        No people have access yet. Invite someone to get started.
                      </div>
                    )}
                  </div>

                  {/* Invite Form */}
                  {showInviteForm && (
                    <div className="mt-6 p-4 bg-gray-700 rounded-lg">
                      <h4 className="text-white font-medium mb-4">Invite People</h4>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Email addresses (one per line)
                          </label>
                          <textarea
                            value={inviteEmails}
                            onChange={(e) => setInviteEmails(e.target.value)}
                            placeholder="user1@example.com&#10;user2@example.com"
                            rows={3}
                            className="w-full bg-gray-600 border border-gray-500 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Access Level
                          </label>
                          <select
                            value={inviteAccessLevel}
                            onChange={(e) => setInviteAccessLevel(e.target.value as AccessLevel)}
                            className="w-full bg-gray-600 border border-gray-500 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                          >
                            <option value="view">View Only</option>
                            <option value="artist">Artist Access</option>
                            <option value="edit">Edit Access</option>
                            <option value="full">Full Access</option>
                          </select>
                        </div>
                        
                        <div className="flex justify-end gap-3">
                          <Button
                            variant="ghost"
                            onClick={() => setShowInviteForm(false)}
                            disabled={isInviting}
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={handleInviteUsers}
                            disabled={isInviting || !inviteEmails.trim()}
                          >
                            {isInviting ? (
                              <>
                                <Spinner size="sm" />
                                Sending...
                              </>
                            ) : (
                              'Send Invitations'
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Share Links Tab */}
              {activeTab === 'links' && (
                <div className="p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-medium text-white">
                      Share Links ({shareLinks.length})
                    </h3>
                    <div className="flex items-center gap-3">
                      <select
                        value={newLinkAccessLevel}
                        onChange={(e) => setNewLinkAccessLevel(e.target.value as AccessLevel)}
                        className="bg-gray-600 border border-gray-500 rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-blue-500"
                      >
                        <option value="view">View Only</option>
                        <option value="artist">Artist Access</option>
                        <option value="edit">Edit Access</option>
                        <option value="full">Full Access</option>
                      </select>
                      <Button onClick={handleCreateShareLink} disabled={isCreatingLink} size="sm">
                        {isCreatingLink ? (
                          <>
                            <Spinner size="sm" />
                            Creating...
                          </>
                        ) : (
                          'Create Link'
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Links List */}
                  <div className="space-y-3">
                    {shareLinks.map((link) => (
                      <div key={link.id} className="p-4 bg-gray-700 rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <div className="text-white font-medium">
                              {link.title || 'Share Link'}
                            </div>
                            <div className={`text-sm ${getAccessLevelColor(link.accessLevel)}`}>
                              {getAccessLevelLabel(link.accessLevel)}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCopyLink(link)}
                              className="text-blue-400 hover:text-blue-300"
                            >
                              {copiedLinkId === link.id ? (
                                <Check className="w-4 h-4" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteLink(link.id)}
                              className="text-red-400 hover:text-red-300"
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                        
                        <div className="text-sm text-gray-400">
                          Created {new Date(link.createdAt).toLocaleDateString()}
                          {link.useCount > 0 && ` • Used ${link.useCount} times`}
                        </div>
                      </div>
                    ))}

                    {shareLinks.length === 0 && (
                      <div className="text-center py-8 text-gray-400">
                        No share links created yet. Create one to share with anyone.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}