import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Button from '@/components/Button';
import IconButton from '@/components/IconButton';
import Spinner from '@/components/Spinner';
import { 
  UserPlus, 
  Mail, 
  Shield, 
  Eye, 
  Edit, 
  Trash2, 
  MoreVertical,
  Check,
  X,
  Crown
} from 'lucide-react';
import { useToast } from '@/lib/useToast';
import { inviteUsers, revokeAccess, getAccessGrants } from '@/lib/accessControl';

interface OrganizationMembersProps {
  organizationId: string;
  organizationName: string;
  currentUserId: string;
}

interface Member {
  id: string;
  email: string;
  accessLevel: 'view' | 'edit' | 'artist' | 'full';
  invitedAt: string;
  acceptedAt?: string;
  isActive: boolean;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
}

const ACCESS_LEVEL_INFO = {
  view: { label: 'Viewer', icon: Eye, color: 'text-gray-400', description: 'Can view organization content' },
  edit: { label: 'Editor', icon: Edit, color: 'text-blue-400', description: 'Can edit organization content' },
  artist: { label: 'Artist', icon: Shield, color: 'text-purple-400', description: 'Artist-level permissions' },
  full: { label: 'Admin', icon: Crown, color: 'text-yellow-400', description: 'Full administrative access' },
};

export default function OrganizationMembers({ 
  organizationId, 
  organizationName,
  currentUserId 
}: OrganizationMembersProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmails, setInviteEmails] = useState('');
  const [inviteAccessLevel, setInviteAccessLevel] = useState<'view' | 'edit' | 'artist' | 'full'>('view');
  const [inviting, setInviting] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const toast = useToast();

  useEffect(() => {
    loadMembers();
  }, [organizationId]);

  const loadMembers = async () => {
    setLoading(true);
    try {
      // Get all access grants for this organization
      const grants = await getAccessGrants('organization', organizationId);
      
      console.log('Loaded grants:', grants);
      
      // Map grants to members
      const membersList: Member[] = grants.map((grant: any) => {
        const accessLevel = grant.access_level as Member['accessLevel'];
        
        // Log if we encounter an unexpected access level
        if (!['view', 'edit', 'artist', 'full'].includes(accessLevel)) {
          console.warn('Unexpected access level:', accessLevel, 'for grant:', grant);
        }
        
        return {
          id: grant.id,
          email: grant.email,
          accessLevel: accessLevel || 'view',
          invitedAt: grant.invited_at,
          acceptedAt: grant.accepted_at,
          isActive: grant.is_active,
          firstName: grant.user_first_name,
          lastName: grant.user_last_name,
          avatarUrl: grant.user_avatar_url,
        };
      });

      console.log('Processed members:', membersList);
      setMembers(membersList);
    } catch (error) {
      console.error('Error loading members:', error);
      toast.error('Failed to load organization members');
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmails.trim()) {
      toast.error('Please enter at least one email address');
      return;
    }

    setInviting(true);
    try {
      // Split emails by comma or newline, trim whitespace
      const emailList = inviteEmails
        .split(/[,\n]/)
        .map(email => email.trim())
        .filter(email => email.length > 0);

      // Validate emails
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const invalidEmails = emailList.filter(email => !emailRegex.test(email));
      
      if (invalidEmails.length > 0) {
        toast.error(`Invalid email addresses: ${invalidEmails.join(', ')}`);
        return;
      }

      const result = await inviteUsers({
        resourceType: 'organization',
        resourceId: organizationId,
        emails: emailList,
        accessLevel: inviteAccessLevel,
        resourceName: organizationName,
        resourceDescription: 'organization',
      });

      // Show results
      if (result.success.length > 0) {
        toast.success(`Successfully invited ${result.success.length} user(s)`);
      }
      if (result.alreadyExists.length > 0) {
        toast.warning(`${result.alreadyExists.length} user(s) already have access`);
      }
      if (result.errors.length > 0) {
        toast.error(`Failed to invite ${result.errors.length} user(s)`);
      }

      // Reset form and reload members
      setInviteEmails('');
      setShowInviteForm(false);
      await loadMembers();
    } catch (error: any) {
      console.error('Error inviting users:', error);
      toast.error(error.message || 'Failed to send invitations');
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveMember = async (memberId: string, email: string) => {
    if (!confirm(`Are you sure you want to remove ${email} from the organization?`)) {
      return;
    }

    setRemovingMemberId(memberId);
    try {
      await revokeAccess({ grantId: memberId });
      toast.success('Member removed successfully');
      await loadMembers();
    } catch (error) {
      console.error('Error removing member:', error);
      toast.error('Failed to remove member');
    } finally {
      setRemovingMemberId(null);
    }
  };

  const getMemberDisplayName = (member: Member) => {
    if (member.firstName && member.lastName) {
      return `${member.firstName} ${member.lastName}`;
    }
    if (member.firstName) return member.firstName;
    if (member.lastName) return member.lastName;
    return member.email.split('@')[0];
  };

  const getMemberStatus = (member: Member) => {
    if (!member.isActive) return { label: 'Inactive', color: 'text-gray-500 bg-gray-800' };
    if (!member.acceptedAt) return { label: 'Pending', color: 'text-yellow-400 bg-yellow-900/20' };
    return { label: 'Active', color: 'text-green-400 bg-green-900/20' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Organization Members</h2>
          <p className="text-gray-400 text-sm mt-1">
            Manage who has access to {organizationName}
          </p>
        </div>
        <Button
          onClick={() => setShowInviteForm(!showInviteForm)}
          variant={showInviteForm ? 'secondary' : 'primary'}
        >
          {showInviteForm ? (
            <>
              <X className="w-4 h-4" />
              Cancel
            </>
          ) : (
            <>
              <UserPlus className="w-4 h-4" />
              Invite Members
            </>
          )}
        </Button>
      </div>

      {/* Invite Form */}
      {showInviteForm && (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Invite New Members</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email Addresses
              </label>
              <textarea
                value={inviteEmails}
                onChange={(e) => setInviteEmails(e.target.value)}
                placeholder="Enter email addresses (comma or newline separated)&#10;example@email.com, another@email.com"
                rows={4}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Access Level
              </label>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(ACCESS_LEVEL_INFO).map(([level, info]) => {
                  const Icon = info.icon;
                  const isSelected = inviteAccessLevel === level;
                  return (
                    <button
                      key={level}
                      onClick={() => setInviteAccessLevel(level as any)}
                      className={`flex items-start gap-3 p-3 rounded-lg border-2 transition-all ${
                        isSelected
                          ? 'border-blue-500 bg-blue-900/20'
                          : 'border-gray-600 bg-gray-700 hover:border-gray-500'
                      }`}
                    >
                      <Icon className={`w-5 h-5 mt-0.5 ${info.color}`} />
                      <div className="text-left">
                        <div className="font-medium text-white text-sm">{info.label}</div>
                        <div className="text-xs text-gray-400">{info.description}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleInvite}
                disabled={inviting || !inviteEmails.trim()}
                className="flex-1"
              >
                {inviting ? (
                  <>
                    <Spinner size="sm" />
                    Sending Invitations...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4" />
                    Send Invitations
                  </>
                )}
              </Button>
              <Button
                onClick={() => {
                  setShowInviteForm(false);
                  setInviteEmails('');
                }}
                variant="ghost"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Members List */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-700/50">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Member
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Access Level
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Invited
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {members.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="text-gray-400">
                      <UserPlus className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p className="text-lg font-medium">No members yet</p>
                      <p className="text-sm mt-1">Invite users to collaborate on your organization</p>
                    </div>
                  </td>
                </tr>
              ) : (
                members.map((member) => {
                  // Use default if access level not recognized
                  const accessInfo = ACCESS_LEVEL_INFO[member.accessLevel] || ACCESS_LEVEL_INFO.view;
                  const AccessIcon = accessInfo.icon;
                  const status = getMemberStatus(member);
                  
                  return (
                    <tr key={member.id} className="hover:bg-gray-700/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {member.avatarUrl ? (
                            <img
                              src={member.avatarUrl}
                              alt={getMemberDisplayName(member)}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center">
                              <span className="text-white font-medium text-sm">
                                {getMemberDisplayName(member).charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                          <div>
                            <div className="font-medium text-white">
                              {getMemberDisplayName(member)}
                            </div>
                            <div className="text-sm text-gray-400">{member.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <AccessIcon className={`w-4 h-4 ${accessInfo.color}`} />
                          <span className="text-sm text-gray-300">{accessInfo.label}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${status.color}`}>
                          {status.label === 'Active' && <Check className="w-3 h-3" />}
                          {status.label === 'Pending' && <Mail className="w-3 h-3" />}
                          {status.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-400">
                        {new Date(member.invitedAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <IconButton
                          icon={Trash2}
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveMember(member.id, member.email)}
                          disabled={removingMemberId === member.id}
                          className="text-red-400 hover:text-red-300"
                        >
                          {removingMemberId === member.id ? (
                            <Spinner size="sm" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </IconButton>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary */}
      {members.length > 0 && (
        <div className="flex items-center justify-between text-sm text-gray-400">
          <div>
            {members.length} total member{members.length !== 1 ? 's' : ''}
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-400"></div>
              {members.filter(m => m.acceptedAt && m.isActive).length} active
            </span>
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
              {members.filter(m => !m.acceptedAt && m.isActive).length} pending
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

