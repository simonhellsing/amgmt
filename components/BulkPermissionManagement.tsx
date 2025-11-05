import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { 
  getAccessGrants, 
  inviteUsers, 
  changeAccessLevel, 
  revokeAccess,
  canCurrentUserPerformAction,
  AccessLevel,
  ResourceType,
  AccessGrant,
  Artist,
  Release,
  getAccessibleArtists,
  getAccessibleReleases
} from '../lib/accessControl';

// Extended Release interface to include release_artists relationship
interface ReleaseWithArtists extends Release {
  release_artists?: Array<{
    artist_id: string;
    artist: {
      id: string;
      name: string;
    };
  }>;
}
import Button from './Button';
import Spinner from './Spinner';
import { Users, Shield, Search, Filter, ChevronDown, User, Settings, Eye, Edit, Crown, UserCheck, X } from 'lucide-react';
import { useToast } from '../lib/useToast';

interface UserAccess {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  grants: AccessGrant[];
  isYou: boolean;
}

export default function AccessManagement() {
  const [loading, setLoading] = useState(true);
  const [hasAdminAccess, setHasAdminAccess] = useState(false);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [releases, setReleases] = useState<ReleaseWithArtists[]>([]);
  const [allGrants, setAllGrants] = useState<AccessGrant[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterResourceType, setFilterResourceType] = useState<ResourceType | 'all'>('all');
  const [filterAccessLevel, setFilterAccessLevel] = useState<AccessLevel | 'all'>('all');
  const [isInviting, setIsInviting] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmails, setInviteEmails] = useState('');
  const [inviteAccessLevel, setInviteAccessLevel] = useState<AccessLevel>('view');
  const [inviteResourceType, setInviteResourceType] = useState<ResourceType>('artist');
  const [inviteResourceId, setInviteResourceId] = useState('');

  const { success, error } = useToast();

  const getHighestAccessLevel = (grants: AccessGrant[]): AccessLevel => {
    if (grants.length === 0) return 'none';
    
    const levels: AccessLevel[] = ['none', 'view', 'artist', 'edit', 'full'];
    let highestLevel = 'none' as AccessLevel;
    
    grants.forEach(grant => {
      const levelIndex = levels.indexOf(grant.accessLevel);
      const highestIndex = levels.indexOf(highestLevel);
      if (levelIndex > highestIndex) {
        highestLevel = grant.accessLevel;
      }
    });
    
    return highestLevel;
  };

  // Group grants by user and consolidate permissions
  const groupedUserAccess = useMemo(() => {
    const userMap = new Map<string, UserAccess>();
    
    allGrants.forEach(grant => {
      if (grant.resourceType === 'none' as any) {
        // This is a user with no grants
        userMap.set(grant.email, {
          user: {
            id: grant.userId || '',
            email: grant.email,
            firstName: '',
            lastName: ''
          },
          grants: [],
          isYou: grant.isYou || false
        });
      } else {
        // This is a user with grants
        const existing = userMap.get(grant.email);
        if (existing) {
          existing.grants.push(grant);
        } else {
          userMap.set(grant.email, {
            user: {
              id: grant.userId || '',
              email: grant.email,
              firstName: '',
              lastName: ''
            },
            grants: [grant],
            isYou: grant.isYou || false
          });
        }
      }
    });
    
    // Consolidate permissions for each user
    const consolidatedUsers = Array.from(userMap.values()).map(userAccess => {
      const consolidatedGrants: AccessGrant[] = [];
      const processedArtists = new Set<string>();
      
      // Group grants by artist
      const artistGrants = new Map<string, AccessGrant[]>();
      const releaseGrants = new Map<string, AccessGrant[]>();
      
      userAccess.grants.forEach(grant => {
        if (grant.resourceType === 'artist') {
          if (!artistGrants.has(grant.resourceId)) {
            artistGrants.set(grant.resourceId, []);
          }
          artistGrants.get(grant.resourceId)!.push(grant);
        } else if (grant.resourceType === 'release') {
          // Find the artist for this release through release_artists
          const release = releases.find(r => r.id === grant.resourceId);
          if (release && release.release_artists && release.release_artists.length > 0) {
            const artistId = release.release_artists[0].artist_id;
            if (!releaseGrants.has(artistId)) {
              releaseGrants.set(artistId, []);
            }
            releaseGrants.get(artistId)!.push(grant);
          }
        }
      });
      
      // Process artist-level grants first
      artistGrants.forEach((grants, artistId) => {
        const highestLevel = getHighestAccessLevel(grants);
        consolidatedGrants.push({
          ...grants[0],
          accessLevel: highestLevel,
          resourceType: 'artist',
          resourceId: artistId
        });
        processedArtists.add(artistId);
      });
      
      // Process release-level grants
      releaseGrants.forEach((grants, artistId) => {
        if (!processedArtists.has(artistId)) {
          // Check if user has access to all releases for this artist
          const artistReleases = releases.filter(r => 
            r.release_artists && r.release_artists.some(ra => ra.artist_id === artistId)
          );
          const userReleaseAccess = grants.map(g => g.resourceId);
          const hasAllReleases = artistReleases.every(release => 
            userReleaseAccess.includes(release.id)
          );
          
          if (hasAllReleases && artistReleases.length > 0) {
            // User has access to all releases, show as artist access
            const highestLevel = getHighestAccessLevel(grants);
            consolidatedGrants.push({
              ...grants[0],
              accessLevel: highestLevel,
              resourceType: 'artist',
              resourceId: artistId
            });
          } else {
            // User has partial access, show individual releases
            grants.forEach(grant => {
              consolidatedGrants.push(grant);
            });
          }
        }
      });
      
      return {
        ...userAccess,
        grants: consolidatedGrants
      };
    });
    
    return consolidatedUsers.sort((a, b) => {
      // Current user first
      if (a.isYou && !b.isYou) return -1;
      if (!a.isYou && b.isYou) return 1;
      // Then by email
      return a.user.email.localeCompare(b.user.email);
    });
  }, [allGrants, releases]);

  // Filter grouped access
  const filteredUserAccess = useMemo(() => {
    return groupedUserAccess.filter(userAccess => {
      // Filter by search term (email)
      if (searchTerm && !userAccess.user.email.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }

      // Filter by resource type
      if (filterResourceType !== 'all') {
        const hasMatchingResource = userAccess.grants.some(grant => grant.resourceType === filterResourceType);
        if (!hasMatchingResource) return false;
      }

      // Filter by access level
      if (filterAccessLevel !== 'all') {
        const hasMatchingLevel = userAccess.grants.some(grant => grant.accessLevel === filterAccessLevel);
        if (!hasMatchingLevel) return false;
      }

      return true;
    });
  }, [groupedUserAccess, searchTerm, filterResourceType, filterAccessLevel]);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  useEffect(() => {
    loadAllData();
  }, []);

  const checkAdminAccess = async () => {
    try {
      // Check if user has full access to any artists or releases (simpler admin check)
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: fullAccessGrants } = await supabase
        .from('access_grants')
        .select('resource_type')
        .eq('user_id', user.id)
        .eq('access_level', 'full')
        .eq('is_active', true)
        .limit(1);

      if (fullAccessGrants && fullAccessGrants.length > 0) {
        setHasAdminAccess(true);
      }
    } catch (err) {
      console.error('Error checking admin access:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadAllData = async () => {
    try {
      // Only load accessible artists and releases to reduce data
      const accessibleArtists = await getAccessibleArtists();
      const accessibleReleases = await getAccessibleReleases();
      
      setArtists(accessibleArtists || []);
      setReleases(accessibleReleases || []);
      
      // Load all grants
      loadAllGrants();
    } catch (err) {
      console.error('Error loading data:', err);
    }
  };

  const loadAllGrants = async () => {
    try {
      // Get current user ID first
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) return;
      
      // First, get resources that the current user has full admin access to
      const { data: adminGrants, error: adminError } = await supabase
        .from('access_grants')
        .select('resource_type, resource_id')
        .eq('user_id', currentUser.id)
        .eq('access_level', 'full')
        .eq('is_active', true);
      
      if (adminError) {
        console.error('Error fetching admin grants:', adminError);
        return;
      }
      
      // If user has no admin access, don't show anything
      if (!adminGrants || adminGrants.length === 0) {
        setAllGrants([]);
        return;
      }
      
      // Group resource IDs by type
      const adminResources = {
        organization: adminGrants.filter(g => g.resource_type === 'organization').map(g => g.resource_id),
        artist: adminGrants.filter(g => g.resource_type === 'artist').map(g => g.resource_id),
        release: adminGrants.filter(g => g.resource_type === 'release').map(g => g.resource_id),
      };
      
      // Get all access grants for resources the current user can manage
      const { data: allGrantsData, error: grantsError } = await supabase
        .from('access_grants')
        .select('*')
        .eq('is_active', true);

      if (grantsError) {
        console.error('Error fetching grants:', grantsError);
        return;
      }
      
      // Filter to only grants for resources the current user manages
      const filteredGrants = allGrantsData?.filter((grant: any) => {
        const resourceIds = adminResources[grant.resource_type as keyof typeof adminResources] || [];
        return resourceIds.includes(grant.resource_id);
      }) || [];

      // Get unique user IDs from the filtered grants
      const uniqueUserIds = [...new Set(filteredGrants.map((grant: any) => grant.user_id).filter(Boolean))];
      
      // Only fetch user profiles for users who have grants to resources we manage
      let allUsers: any[] = [];
      if (uniqueUserIds.length > 0) {
        const { data: usersData, error: usersError } = await supabase
          .from('user_profiles')
          .select('id, email, first_name, last_name')
          .in('id', uniqueUserIds)
          .order('email');

        if (usersError) {
          console.error('Error fetching users:', usersError);
          return;
        }
        
        allUsers = usersData || [];
      }

      // Create a map of user emails to their grants
      const userGrantsMap = new Map<string, AccessGrant[]>();
      
      // Initialize users who have grants
      allUsers?.forEach(user => {
        userGrantsMap.set(user.email, []);
      });
      
      // Add actual grants to the map (only filtered grants)
      filteredGrants.forEach((grant: any) => {
        // Find the user for this grant
        const user = allUsers?.find(u => u.id === grant.user_id);
        if (user) {
          const existing = userGrantsMap.get(user.email) || [];
          userGrantsMap.set(user.email, [...existing, {
            id: grant.id,
            resourceType: grant.resource_type,
            resourceId: grant.resource_id,
            userId: grant.user_id,
            email: user.email,
            accessLevel: grant.access_level,
            grantedBy: grant.granted_by,
            grantedAt: grant.granted_at,
            invitedAt: grant.invited_at,
            acceptedAt: grant.accepted_at,
            expiresAt: grant.expires_at,
            isActive: grant.is_active,
            isYou: grant.user_id === currentUser?.id
          }]);
        }
      });
      
      // Convert map to array and format for display
      const formattedGrants: AccessGrant[] = [];
      
      userGrantsMap.forEach((grants, email) => {
        const user = allUsers?.find(u => u.email === email);
        if (user && grants.length > 0) {
          // Only show users who actually have grants
          grants.forEach(grant => {
            formattedGrants.push({
              ...grant,
              isYou: user.id === currentUser?.id
            });
          });
        }
      });
      
      setAllGrants(formattedGrants);
    } catch (err) {
      console.error('Error loading grants:', err);
    }
  };

  const handleChangeAccess = async (grantId: string, newAccessLevel: AccessLevel) => {
    try {
      if (newAccessLevel === 'none') {
        // If setting to "none", revoke the access
        await revokeAccess({ grantId });
        success('Access revoked successfully');
      } else {
        await changeAccessLevel({ grantId, accessLevel: newAccessLevel });
        success('Access level updated successfully');
      }
      loadAllGrants(); // Refresh data
    } catch (err) {
      console.error('Error changing access:', err);
      error('Failed to update access level');
    }
  };

  const handleRevokeAccess = async (grantId: string) => {
    try {
      await revokeAccess({ grantId });
      success('Access revoked successfully');
      loadAllGrants(); // Refresh data
    } catch (err) {
      console.error('Error revoking access:', err);
      error('Failed to revoke access');
    }
  };

  const handleBulkInvite = async () => {
    if (!inviteEmails.trim() || !inviteResourceId) return;

    setIsInviting(true);
    try {
      const emails = inviteEmails.split('\n').map(email => email.trim()).filter(Boolean);
      
      // Get resource name for the invite
      let resourceName = '';
      if (inviteResourceType === 'artist') {
        const artist = artists.find(a => a.id === inviteResourceId);
        resourceName = artist?.name || 'Artist';
      } else if (inviteResourceType === 'release') {
        const release = releases.find(r => r.id === inviteResourceId);
        resourceName = release?.title || 'Release';
      }

      const result = await inviteUsers({
        resourceType: inviteResourceType,
        resourceId: inviteResourceId,
        emails,
        accessLevel: inviteAccessLevel,
        resourceName,
        resourceDescription: `Bulk invitation to ${resourceName}`
      });

      const successCount = result.success.length;
      const errorCount = result.errors.length;
      const existingCount = result.alreadyExists.length;

      let message = `Invitations sent: ${successCount}`;
      if (existingCount > 0) message += `, Already have access: ${existingCount}`;
      if (errorCount > 0) message += `, Failed: ${errorCount}`;

      success(message);
      
      // Reset form
      setInviteEmails('');
      setInviteResourceId('');
      setShowInviteForm(false);
      
      loadAllGrants(); // Refresh data
    } catch (err) {
      console.error('Error sending bulk invites:', err);
      error('Failed to send bulk invitations');
    } finally {
      setIsInviting(false);
    }
  };

  const getResourceName = (grant: AccessGrant) => {
    if (grant.resourceType === 'none' as any) {
      return 'No Access';
    } else if (grant.resourceType === 'artist') {
      const artist = artists.find(a => a.id === grant.resourceId);
      return artist?.name || 'Artist';
    } else if (grant.resourceType === 'release') {
      const release = releases.find(r => r.id === grant.resourceId);
      return release?.title || 'Release';
    }
    return 'Unknown';
  };

  const getAccessLevelIcon = (level: AccessLevel) => {
    switch (level) {
      case 'full':
        return <Crown className="w-4 h-4" />;
      case 'edit':
        return <Edit className="w-4 h-4" />;
      case 'artist':
        return <UserCheck className="w-4 h-4" />;
      case 'view':
        return <Eye className="w-4 h-4" />;
      default:
        return <X className="w-4 h-4" />;
    }
  };

  const getAccessLevelColor = (level: AccessLevel) => {
    switch (level) {
      case 'full':
        return 'bg-green-500 text-white';
      case 'edit':
        return 'bg-blue-500 text-white';
      case 'artist':
        return 'bg-yellow-500 text-white';
      case 'view':
        return 'bg-gray-500 text-white';
      default:
        return 'bg-red-500 text-white';
    }
  };

  const getPermissionSummary = (grants: AccessGrant[]) => {
    if (grants.length === 0) return 'No access';
    
    const artistGrants = grants.filter(g => g.resourceType === 'artist');
    const releaseGrants = grants.filter(g => g.resourceType === 'release');
    
    const parts = [];
    if (artistGrants.length > 0) {
      parts.push(`${artistGrants.length} artist${artistGrants.length > 1 ? 's' : ''}`);
    }
    if (releaseGrants.length > 0) {
      parts.push(`${releaseGrants.length} release${releaseGrants.length > 1 ? 's' : ''}`);
    }
    
    return parts.join(', ');
  };

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex items-center justify-center py-8">
          <Spinner size="lg" />
        </div>
      </div>
    );
  }

  if (!hasAdminAccess) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="text-center py-8">
          <Shield className="w-12 h-12 text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">Admin Access Required</h3>
          <p className="text-gray-400">
            You need admin access to manage user permissions.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-white mb-2">Access Management</h2>
          <p className="text-gray-400">Manage user access across all artists and releases</p>
        </div>
        <Button onClick={() => setShowInviteForm(true)} size="sm">
          <Users className="w-4 h-4 mr-2" />
          Invite Users
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-700 rounded-lg p-4">
          <div className="text-2xl font-bold text-white">{filteredUserAccess.length}</div>
          <div className="text-sm text-gray-400">Total Users</div>
        </div>
        <div className="bg-gray-700 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-400">
            {filteredUserAccess.filter(u => getHighestAccessLevel(u.grants) === 'full').length}
          </div>
          <div className="text-sm text-gray-400">Full Access</div>
        </div>
        <div className="bg-gray-700 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-400">
            {filteredUserAccess.filter(u => getHighestAccessLevel(u.grants) === 'edit').length}
          </div>
          <div className="text-sm text-gray-400">Edit Access</div>
        </div>
        <div className="bg-gray-700 rounded-lg p-4">
          <div className="text-2xl font-bold text-yellow-400">
            {filteredUserAccess.filter(u => getHighestAccessLevel(u.grants) === 'artist').length}
          </div>
          <div className="text-sm text-gray-400">Artist Access</div>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Search Users
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by email..."
              className="w-full bg-gray-700 border border-gray-600 rounded-lg pl-10 pr-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Resource Type
          </label>
          <select
            value={filterResourceType}
            onChange={(e) => setFilterResourceType(e.target.value as ResourceType | 'all')}
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Resources</option>
            <option value="artist">Artists Only</option>
            <option value="release">Releases Only</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Access Level
          </label>
          <select
            value={filterAccessLevel}
            onChange={(e) => setFilterAccessLevel(e.target.value as AccessLevel | 'all')}
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Levels</option>
            <option value="full">Full Access</option>
            <option value="edit">Edit Access</option>
            <option value="artist">Artist Access</option>
            <option value="view">View Only</option>
            <option value="none">No Access</option>
          </select>
        </div>
      </div>

      {/* Users List */}
      <div className="space-y-4">
        {filteredUserAccess.map((userAccess) => (
          <div key={userAccess.user.id} className="bg-gray-700 rounded-lg border border-gray-600">
            {/* User Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-600">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center mr-3">
                  <User className="w-5 h-5 text-gray-300" />
                </div>
                <div>
                  <div className="text-white font-medium flex items-center">
                    {userAccess.user.email}
                    {userAccess.isYou && (
                      <span className="ml-2 px-2 py-1 bg-blue-500 text-white text-xs rounded-full">You</span>
                    )}
                  </div>
                  {userAccess.user.firstName && userAccess.user.lastName && (
                    <div className="text-sm text-gray-400">
                      {userAccess.user.firstName} {userAccess.user.lastName}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Highest Access Badge */}
              <div className={`px-3 py-1 rounded-full text-xs font-medium flex items-center ${getAccessLevelColor(getHighestAccessLevel(userAccess.grants))}`}>
                {getAccessLevelIcon(getHighestAccessLevel(userAccess.grants))}
                <span className="ml-1">{getHighestAccessLevel(userAccess.grants).charAt(0).toUpperCase() + getHighestAccessLevel(userAccess.grants).slice(1)}</span>
              </div>
            </div>

            {/* Permissions List */}
            <div className="p-4">
              {userAccess.grants.length === 0 ? (
                <div className="text-center py-6">
                  <X className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                  <div className="text-gray-400 text-sm">No access granted</div>
                </div>
              ) : (
                <div className="space-y-3">
                  {userAccess.grants.map((grant) => (
                    <div key={grant.id} className="flex items-center justify-between bg-gray-600 rounded-lg px-4 py-3">
                      <div className="flex-1">
                        <div className="text-white font-medium">{getResourceName(grant)}</div>
                        <div className="text-gray-400 text-sm capitalize">{grant.resourceType}</div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <select
                          value={grant.accessLevel}
                          onChange={(e) => handleChangeAccess(grant.id, e.target.value as AccessLevel)}
                          disabled={grant.isYou}
                          className="bg-gray-700 border border-gray-500 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <option value="none">No Access</option>
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
                            className="text-red-400 hover:text-red-300 px-3 py-2"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredUserAccess.length === 0 && (
        <div className="text-center py-12">
          <Users className="w-16 h-16 text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No Users Found</h3>
          <p className="text-gray-400 mb-4">
            No users match your current filters. Try adjusting your search criteria.
          </p>
          <Button onClick={() => {
            setSearchTerm('');
            setFilterResourceType('all');
            setFilterAccessLevel('all');
          }}>
            Clear Filters
          </Button>
        </div>
      )}

      {/* Invite Users Modal */}
      {showInviteForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-lg">
            <h3 className="text-lg font-semibold text-white mb-4">Invite Users</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Resource Type
                </label>
                <select
                  value={inviteResourceType}
                  onChange={(e) => {
                    setInviteResourceType(e.target.value as ResourceType);
                    setInviteResourceId('');
                  }}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="artist">Artist</option>
                  <option value="release">Release</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Resource
                </label>
                <select
                  value={inviteResourceId}
                  onChange={(e) => setInviteResourceId(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">Select a resource</option>
                  {inviteResourceType === 'artist' && artists.map(artist => (
                    <option key={artist.id} value={artist.id}>{artist.name}</option>
                  ))}
                  {inviteResourceType === 'release' && releases.map(release => (
                    <option key={release.id} value={release.id}>{release.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Access Level
                </label>
                <select
                  value={inviteAccessLevel}
                  onChange={(e) => setInviteAccessLevel(e.target.value as AccessLevel)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="view">View Only</option>
                  <option value="artist">Artist Access</option>
                  <option value="edit">Edit Access</option>
                  <option value="full">Full Access</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email Addresses (one per line)
                </label>
                <textarea
                  value={inviteEmails}
                  onChange={(e) => setInviteEmails(e.target.value)}
                  placeholder="user1@example.com&#10;user2@example.com&#10;user3@example.com"
                  rows={6}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button
                variant="ghost"
                onClick={() => setShowInviteForm(false)}
                disabled={isInviting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleBulkInvite}
                disabled={isInviting || !inviteEmails.trim() || !inviteResourceId}
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
  );
}
