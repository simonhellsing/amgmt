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
  Check,
  X,
  Crown,
  ChevronRight
} from 'lucide-react';
import { useToast } from '@/lib/useToast';
import { inviteUsers, revokeAccess, getAccessGrants, changeAccessLevel } from '@/lib/accessControl';

interface OrganizationMembersProps {
  organizationId: string;
  organizationName: string;
  currentUserId: string;
}

interface Member {
  id: string;
  userId?: string;
  email: string;
  accessLevel: 'view' | 'edit' | 'artist' | 'full';
  role: 'Administrator' | 'Collaborator' | 'Artist';
  invitedAt: string;
  acceptedAt?: string;
  isActive: boolean;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  releaseAccessCount?: number;
  artistAccessCount?: number;
  artistName?: string;
}

const ROLE_INFO = {
  Administrator: { label: 'Administrator', icon: Crown, color: 'text-yellow-400', description: 'Full access to all artists and releases' },
  Collaborator: { label: 'Collaborator', icon: Edit, color: 'text-blue-400', description: 'Access to specific releases' },
  Artist: { label: 'Artist', icon: Shield, color: 'text-purple-400', description: 'Access to all releases for one artist' },
};

const ACCESS_LEVEL_TO_ROLE: Record<string, 'Administrator' | 'Collaborator' | 'Artist'> = {
  full: 'Administrator',
  edit: 'Collaborator',
  artist: 'Artist',
  view: 'Collaborator', // Default view to Collaborator for now
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
  const [inviteRole, setInviteRole] = useState<'Administrator' | 'Collaborator' | 'Artist'>('Collaborator');
  const [inviting, setInviting] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const toast = useToast();

  useEffect(() => {
    loadMembers();
  }, [organizationId]);

  const loadMembers = async () => {
    setLoading(true);
    try {
      // Get all access grants for this organization
      const grants = await getAccessGrants('organization', organizationId);
      
      // Get all user IDs to fetch their profiles
      const userIds = grants.map(g => g.userId).filter(Boolean) as string[];
      
      // Fetch user profiles
      let userProfilesMap = new Map();
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('user_profiles')
          .select('id, first_name, last_name, avatar_url')
          .in('id', userIds);
        
        if (profiles) {
          userProfilesMap = new Map(profiles.map(p => [p.id, p]));
        }
      }
      
      // Get organization's artists to filter by
      const { data: orgArtists } = await supabase
        .from('artists')
        .select('id')
        .eq('organization_id', organizationId);

      const orgArtistIds = orgArtists?.map(a => a.id) || [];

      // Map grants to members and fetch their limited access
      const membersList: Member[] = await Promise.all(grants.map(async (grant: any) => {
        const accessLevel = grant.accessLevel as string;
        const role = ACCESS_LEVEL_TO_ROLE[accessLevel] || 'Collaborator';
        
        // Get user profile data
        const userProfile = grant.userId ? userProfilesMap.get(grant.userId) : null;
        
        let releaseAccessCount = 0;
        let artistAccessCount = 0;
        let artistName: string | undefined;

        // For Collaborators and Artists, fetch their limited access
        if (role === 'Collaborator' && grant.userId) {
          // Count releases they have access to in this organization
          const { data: releaseGrants } = await supabase
            .from('access_grants')
            .select('resource_id')
            .eq('user_id', grant.userId)
            .eq('resource_type', 'release')
            .eq('is_active', true);

          if (releaseGrants && releaseGrants.length > 0) {
            const releaseIds = releaseGrants.map(g => g.resource_id);
            // Check which releases belong to this organization
            const { data: orgReleases } = await supabase
              .from('release_artists')
              .select('release_id')
              .in('release_id', releaseIds)
              .in('artist_id', orgArtistIds);

            releaseAccessCount = new Set(orgReleases?.map(r => r.release_id) || []).size;
          }
        } else if (role === 'Artist' && grant.userId) {
          // Find which artist they have access to in this organization
          const { data: artistGrants } = await supabase
            .from('access_grants')
            .select('resource_id')
            .eq('user_id', grant.userId)
            .eq('resource_type', 'artist')
            .eq('is_active', true)
            .in('resource_id', orgArtistIds);

          if (artistGrants && artistGrants.length > 0) {
            artistAccessCount = artistGrants.length;
            // Get the first artist's name
            const { data: artistData } = await supabase
              .from('artists')
              .select('name')
              .eq('id', artistGrants[0].resource_id)
              .single();
            
            artistName = artistData?.name;
          }
        }
        
        return {
          id: grant.id,
          userId: grant.userId,
          email: grant.email,
          accessLevel: (accessLevel || 'view') as Member['accessLevel'],
          role: role,
          invitedAt: grant.invitedAt,
          acceptedAt: grant.acceptedAt,
          isActive: grant.isActive,
          firstName: userProfile?.first_name,
          lastName: userProfile?.last_name,
          avatarUrl: userProfile?.avatar_url,
          releaseAccessCount,
          artistAccessCount,
          artistName,
        };
      }));

      setMembers(membersList);
    } catch (error) {
      console.error('Error loading members:', error);
      toast.error('Failed to load organization members');
    } finally {
      setLoading(false);
    }
  };

  const getAccessLevelForRole = (role: 'Administrator' | 'Collaborator' | 'Artist'): 'view' | 'edit' | 'artist' | 'full' => {
    if (role === 'Administrator') return 'full';
    if (role === 'Artist') return 'artist';
    return 'edit';
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

      const accessLevel = getAccessLevelForRole(inviteRole);

      const result = await inviteUsers({
        resourceType: 'organization',
        resourceId: organizationId,
        emails: emailList,
        accessLevel: accessLevel,
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
      if (selectedMember?.id === memberId) {
        setSelectedMember(null);
      }
    } catch (error) {
      console.error('Error removing member:', error);
      toast.error('Failed to remove member');
    } finally {
      setRemovingMemberId(null);
    }
  };

  const handleChangeRole = async (memberId: string, newRole: 'Administrator' | 'Collaborator' | 'Artist') => {
    try {
      const newAccessLevel = getAccessLevelForRole(newRole);
      await changeAccessLevel({ grantId: memberId, accessLevel: newAccessLevel });
      toast.success('Role updated successfully');
      await loadMembers();
      // Update selected member if it's the one we just changed
      if (selectedMember?.id === memberId) {
        setSelectedMember(prev => prev ? { ...prev, role: newRole, accessLevel: newAccessLevel } : null);
      }
    } catch (error: any) {
      console.error('Error changing role:', error);
      toast.error(error.message || 'Failed to update role');
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

  const getAccessSummary = (member: Member) => {
    if (member.role === 'Administrator') {
      return 'All artists and releases';
    }
    if (member.role === 'Artist' && member.artistName) {
      return `Artist: ${member.artistName}`;
    }
    if (member.role === 'Collaborator' && member.releaseAccessCount !== undefined) {
      if (member.releaseAccessCount === 0) {
        return 'No releases assigned';
      }
      return `${member.releaseAccessCount} release${member.releaseAccessCount !== 1 ? 's' : ''}`;
    }
    return 'Limited access';
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
                Role
              </label>
              <div className="grid grid-cols-3 gap-3">
                {Object.entries(ROLE_INFO).map(([role, info]) => {
                  const Icon = info.icon;
                  const isSelected = inviteRole === role;
                  return (
                    <button
                      key={role}
                      onClick={() => setInviteRole(role as any)}
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
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Access
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
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="text-gray-400">
                      <UserPlus className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p className="text-lg font-medium">No members yet</p>
                      <p className="text-sm mt-1">Invite users to collaborate on your organization</p>
                    </div>
                  </td>
                </tr>
              ) : (
                members.map((member) => {
                  const roleInfo = ROLE_INFO[member.role];
                  const RoleIcon = roleInfo.icon;
                  const status = getMemberStatus(member);
                  const accessSummary = getAccessSummary(member);
                  const isCurrentUser = member.userId === currentUserId;
                  
                  return (
                    <tr 
                      key={member.id} 
                      className={`hover:bg-gray-700/30 transition-colors ${selectedMember?.id === member.id ? 'bg-gray-700/50' : ''}`}
                    >
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
                              {isCurrentUser && <span className="text-gray-500 text-sm ml-2">(You)</span>}
                            </div>
                            <div className="text-sm text-gray-400">{member.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <RoleIcon className={`w-4 h-4 ${roleInfo.color}`} />
                          <span className="text-sm text-gray-300">{roleInfo.label}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-400 truncate max-w-[200px] block" title={accessSummary}>
                          {accessSummary}
                        </span>
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
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedMember(selectedMember?.id === member.id ? null : member)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          {!isCurrentUser && (
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
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Member Edit Modal */}
      {selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-gray-800 rounded-lg border border-gray-700 max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Edit Member Access</h3>
              <IconButton
                icon={X}
                variant="ghost"
                size="sm"
                onClick={() => setSelectedMember(null)}
              />
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  {selectedMember.avatarUrl ? (
                    <img
                      src={selectedMember.avatarUrl}
                      alt={getMemberDisplayName(selectedMember)}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center">
                      <span className="text-white font-medium text-sm">
                        {getMemberDisplayName(selectedMember).charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div>
                    <div className="font-medium text-white">{getMemberDisplayName(selectedMember)}</div>
                    <div className="text-sm text-gray-400">{selectedMember.email}</div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Role
                </label>
                <select
                  value={selectedMember.role}
                  onChange={(e) => handleChangeRole(selectedMember.id, e.target.value as any)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="Administrator">Administrator</option>
                  <option value="Collaborator">Collaborator</option>
                  <option value="Artist">Artist</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">{ROLE_INFO[selectedMember.role].description}</p>
              </div>

              <div className="pt-4 border-t border-gray-700">
                <p className="text-sm text-gray-400 mb-2">Current Access:</p>
                <p className="text-sm text-white">{getAccessSummary(selectedMember)}</p>
                <p className="text-xs text-gray-500 mt-2">
                  Note: Managing specific releases and artists will be available in a future update.
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  variant="secondary"
                  onClick={() => setSelectedMember(null)}
                  className="flex-1"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

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