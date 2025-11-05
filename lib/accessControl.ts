import { supabase } from './supabase';
import { cache, cacheKeys } from './cache';

export type AccessLevel = 'none' | 'view' | 'edit' | 'artist' | 'full';
export type ResourceType = 'artist' | 'release' | 'deliverable' | 'folder' | 'collection' | 'organization';

export interface AccessGrant {
  id: string;
  resourceType: ResourceType;
  resourceId: string;
  userId?: string;
  email: string;
  accessLevel: AccessLevel;
  grantedBy?: string;
  grantedAt: string;
  invitedAt: string;
  acceptedAt?: string;
  expiresAt?: string;
  isActive: boolean;
  isYou?: boolean;
}

export interface Collection {
  id: string;
  name: string;
  description?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  isPublic: boolean;
  publicToken?: string;
  publicExpiresAt?: string;
}

export interface CollectionItem {
  id: string;
  collectionId: string;
  itemType: ResourceType;
  itemId: string;
  sortOrder: number;
  addedBy: string;
  addedAt: string;
}

export interface ShareLink {
  id: string;
  resourceType: ResourceType;
  resourceId: string;
  token: string;
  accessLevel: AccessLevel;
  createdBy: string;
  createdAt: string;
  expiresAt?: string;
  maxUses?: number;
  useCount: number;
  isActive: boolean;
  title?: string;
  description?: string;
}

// =====================================================
// PERMISSION DEFINITIONS
// =====================================================

export type Permission = 
  | 'view'
  | 'download' 
  | 'comment'
  | 'approve_reject'
  | 'upload_files'
  | 'create_deliverables'
  | 'edit_deliverables'
  | 'delete_deliverables'
  | 'manage_metadata'
  | 'change_file_status'
  | 'manage_access'
  | 'invite_users'
  | 'override_approvals'
  | 'manage_share_links'
  | 'create_collections';

const PERMISSIONS: Record<Permission, AccessLevel[]> = {
  // View Only Access
  'view': ['view', 'artist', 'edit', 'full'],
  'download': ['view', 'artist', 'edit', 'full'],
  
  // Artist Access
  'comment': ['artist', 'edit', 'full'],
  'approve_reject': ['artist', 'edit', 'full'],
  
  // Edit Access
  'upload_files': ['edit', 'full'],
  'create_deliverables': ['edit', 'full'],
  'edit_deliverables': ['edit', 'full'],
  'delete_deliverables': ['edit', 'full'],
  'manage_metadata': ['edit', 'full'],
  'change_file_status': ['edit', 'full'],
  
  // Full Access
  'manage_access': ['full'],
  'invite_users': ['full'],
  'override_approvals': ['full'],
  'manage_share_links': ['full'],
  'create_collections': ['full']
};

// =====================================================
// DATA INTERFACES
// =====================================================

export interface Artist {
  id: string;
  name: string;
  region: string | null;
  country: string | null;
  image_url?: string | null;
  organization_id?: string | null;
}

export interface Release {
  id: string;
  title: string;
  online?: string | null;
  offline?: string | null;
  cover_url?: string | null;
  status?: string | null;
  type?: string;
  catalog_number?: string | null;
  created_at?: string;
  artists?: Array<{
    id: string;
    name: string;
    image_url?: string | null;
  }>;
  deliverables?: Array<{
    id: string;
    status: string;
  }>;
}

export interface Deliverable {
  id: string;
  name: string;
  type: string;
  release_id: string;
  online_deadline?: string | null;
  offline_deadline?: string | null;
  status: string;
  created_at: string;
  release?: {
    title: string;
    release_artists: Array<{
      artist: {
        name: string;
      };
    }>;
  };
}

export interface Folder {
  id: string;
  name: string;
  description?: string | null;
  artist_id: string;
  file_count?: number;
  created_at: string;
}

// =====================================================
// PERMISSION CHECKING FUNCTIONS
// =====================================================

/**
 * Check if a user can perform a specific action on a resource
 */
export const canUserPerformAction = async (
  userId: string,
  action: Permission,
  resourceType: ResourceType,
  resourceId: string
): Promise<boolean> => {
  try {
    const userAccess = await getUserHighestAccess(userId, resourceType, resourceId);
    return checkPermission(userAccess, action);
  } catch (error) {
    console.error('Error checking user permission:', error);
    return false;
  }
};

/**
 * Get the highest access level a user has for a specific resource
 * Includes cascading access from parent resources
 */
export const getUserHighestAccess = async (
  userId: string,
  resourceType: ResourceType,
  resourceId: string
): Promise<AccessLevel | null> => {
  // Use request deduplication to prevent multiple simultaneous checks
  const cacheKey = cacheKeys.userAccess(userId, resourceType, resourceId);
  return cache.getOrFetch(cacheKey, async () => {
    // Check direct access to the resource first
    const directAccess = await getDirectAccess(userId, resourceType, resourceId);
    
    // Get all possible parent resources to check for cascading access
    const parentResources = await getParentResources(resourceType, resourceId);
    
    // Check access for all parent resources and find the highest level
    const accessLevels: (AccessLevel | null)[] = [directAccess];
    
    // Batch parent access checks
    const parentAccessPromises = parentResources.map(parent => 
      getDirectAccess(userId, parent.resourceType, parent.resourceId)
    );
    const parentAccessResults = await Promise.all(parentAccessPromises);
    accessLevels.push(...parentAccessResults.filter(Boolean));
    
    // Return the highest access level found
    return getHighestAccessLevel(accessLevels.filter(Boolean) as AccessLevel[]);
  }, 300000); // 5 minute TTL
};

/**
 * Get parent resources for cascading access checking
 */
const getParentResources = async (
  resourceType: ResourceType,
  resourceId: string
): Promise<{ resourceType: ResourceType; resourceId: string }[]> => {
  const parents: { resourceType: ResourceType; resourceId: string }[] = [];

  try {
    // If it's a release, get its artist(s) and organization(s)
    if (resourceType === 'release') {
      // Get artists for this release
      const { data: artistData, error: artistError } = await supabase
        .from('release_artists')
        .select('artist_id')
        .eq('release_id', resourceId);

      if (!artistError && artistData) {
        for (const item of artistData) {
          parents.push({ resourceType: 'artist', resourceId: item.artist_id });
        }


      }
    }

    // If it's a deliverable, get its release, artist(s), and organization(s)
    if (resourceType === 'deliverable') {
      // Get the release for this deliverable
      const { data: releaseData, error: releaseError } = await supabase
        .from('deliverables')
        .select('release_id')
        .eq('id', resourceId)
        .single();

      if (!releaseError && releaseData) {
        const releaseId = releaseData.release_id;
        parents.push({ resourceType: 'release', resourceId: releaseId });

        // Recursively get parents of the release
        const releaseParents = await getParentResources('release', releaseId);
        parents.push(...releaseParents);
      }
    }





    // If it's a folder, get its artist and organization
    if (resourceType === 'folder') {
      const { data: folderData, error: folderError } = await supabase
        .from('folders')
        .select('artist_id')
        .eq('id', resourceId)
        .single();

      if (!folderError && folderData) {
        const artistId = folderData.artist_id;
        parents.push({ resourceType: 'artist', resourceId: artistId });

        // Get organization for this artist
        const artistParents = await getParentResources('artist', artistId);
        parents.push(...artistParents);
      }
    }

    // Organization is already the top level, no parents

  } catch (error) {
    console.error('Error getting parent resources:', error);
  }

  return parents;
};

/**
 * Get the highest access level from a list of access levels
 */
const getHighestAccessLevel = (accessLevels: AccessLevel[]): AccessLevel | null => {
  if (accessLevels.length === 0) return null;

  // Access level priority: full > edit > artist > view > none
  const levelPriority: Record<AccessLevel, number> = {
    'full': 4,
    'edit': 3,
    'artist': 2,
    'view': 1,
    'none': 0
  };

  return accessLevels.reduce((highest, current) => {
    return levelPriority[current] > levelPriority[highest] ? current : highest;
  });
};

/**
 * Get direct access level for a user on a specific resource
 */
const getDirectAccess = async (
  userId: string,
  resourceType: ResourceType,
  resourceId: string
): Promise<AccessLevel | null> => {
  try {
    const { data, error } = await supabase
      .from('access_grants')
      .select('access_level')
      .eq('resource_type', resourceType)
      .eq('resource_id', resourceId)
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      return null;
    }

    return data.access_level as AccessLevel;
  } catch (error) {
    console.error('Error in getDirectAccess:', error);
    return null;
  }
};

/**
 * Check if an access level allows a specific permission
 */
const checkPermission = (accessLevel: AccessLevel | null, action: Permission): boolean => {
  if (!accessLevel) return false;
  return PERMISSIONS[action]?.includes(accessLevel) || false;
};

/**
 * Get all permissions a user has for a resource
 */
export const getUserPermissions = async (
  userId: string,
  resourceType: ResourceType,
  resourceId: string
): Promise<Permission[]> => {
  const accessLevel = await getUserHighestAccess(userId, resourceType, resourceId);
  if (!accessLevel) return [];

  return Object.entries(PERMISSIONS)
    .filter(([_, levels]) => levels.includes(accessLevel))
    .map(([permission]) => permission as Permission);
};

/**
 * Check if current user can perform action (convenience function)
 */
export const canCurrentUserPerformAction = async (
  action: Permission,
  resourceType: ResourceType,
  resourceId: string
): Promise<boolean> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  
  return canUserPerformAction(user.id, action, resourceType, resourceId);
};



// =====================================================
// PERMISSION-BASED FILTERING FUNCTIONS
// =====================================================

/**
 * Get artists that the current user has access to view
 * Artist access grants access to all current and future releases by that artist
 * Can optionally filter by organization
 */
export const getAccessibleArtists = async (options?: { limit?: number; offset?: number; organizationId?: string }): Promise<Artist[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // Get organization ID from options or localStorage
  const organizationId = options?.organizationId || (typeof window !== 'undefined' ? localStorage.getItem('selectedOrganizationId') : null);

  // Use request deduplication with organization-specific cache key
  const cacheKey = cacheKeys.accessibleArtists(user.id) + (organizationId ? `_org_${organizationId}` : '');
  return cache.getOrFetch(cacheKey, async () => {

  const accessibleArtistIds = new Set<string>();

  // 1. Direct artist access - grants access to all releases by that artist
  const { data: directArtistAccess } = await supabase
    .from('access_grants')
    .select('resource_id')
    .eq('user_id', user.id)
    .eq('resource_type', 'artist')
    .eq('is_active', true);

    directArtistAccess?.forEach(grant => accessibleArtistIds.add(grant.resource_id));



  // 3. Release access - only show artists if user has release access AND no higher level access
  //    This covers the case where someone only has access to specific releases
  const { data: releaseAccess } = await supabase
    .from('access_grants')
    .select('resource_id')
    .eq('user_id', user.id)
    .eq('resource_type', 'release')
    .eq('is_active', true);

  if (releaseAccess && releaseAccess.length > 0) {
    const releaseIds = releaseAccess.map(grant => grant.resource_id);
    const { data: releaseArtists } = await supabase
      .from('release_artists')
      .select('artist_id')
      .in('release_id', releaseIds);

    releaseArtists?.forEach(ra => {
      // Only add if they don't already have direct artist access
      // This ensures the UI is consistent with actual permissions
      accessibleArtistIds.add(ra.artist_id);
    });
  }

  if (accessibleArtistIds.size === 0) {
    return [];
  }

  // Fetch the actual artist data
  let query = supabase
    .from('artists')
    .select('id, name, region, country, image_url, organization_id')
    .in('id', Array.from(accessibleArtistIds))
    .order('name');

  // Filter by organization if specified
  if (organizationId) {
    query = query.eq('organization_id', organizationId);
  }

  // Apply pagination if requested
  if (options?.limit) {
    query = query.limit(options.limit);
  }
  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
  }

  const { data, error} = await query;

  if (error) {
    console.error('Error fetching accessible artists:', error);
    return [];
  }

  return data || [];
  }, 300000); // 5 minute TTL
};

/**
 * Get releases that the current user has access to view
 * Can optionally filter by organization
 */
export const getAccessibleReleases = async (options?: { limit?: number; offset?: number; organizationId?: string }): Promise<Release[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // Get organization ID from options or localStorage
  const organizationId = options?.organizationId || (typeof window !== 'undefined' ? localStorage.getItem('selectedOrganizationId') : null);

  // Use request deduplication with organization-specific cache key
  const cacheKey = cacheKeys.accessibleReleases(user.id) + (organizationId ? `_org_${organizationId}` : '');
  return cache.getOrFetch(cacheKey, async () => {

  const accessibleReleaseIds = new Set<string>();

  // If filtering by organization, first get artists in that organization
  let orgArtistIds: string[] = [];
  if (organizationId) {
    const { data: orgArtists } = await supabase
      .from('artists')
      .select('id')
      .eq('organization_id', organizationId);
    
    orgArtistIds = orgArtists?.map(a => a.id) || [];
    
    if (orgArtistIds.length === 0) {
      return []; // No artists in this organization
    }
  }

  // Direct release access
  const { data: directAccess } = await supabase
    .from('access_grants')
    .select('resource_id')
    .eq('user_id', user.id)
    .eq('resource_type', 'release')
    .eq('is_active', true);

  directAccess?.forEach(grant => accessibleReleaseIds.add(grant.resource_id));

  // Artist access (cascades to all releases for those artists)
  const { data: artistAccess } = await supabase
    .from('access_grants')
    .select('resource_id')
    .eq('user_id', user.id)
    .eq('resource_type', 'artist')
    .eq('is_active', true);

  if (artistAccess && artistAccess.length > 0) {
    let artistIds = artistAccess.map(grant => grant.resource_id);
    
    // If filtering by organization, only include artists from that org
    if (organizationId && orgArtistIds.length > 0) {
      artistIds = artistIds.filter(id => orgArtistIds.includes(id));
    }
    
    if (artistIds.length > 0) {
      const { data: artistReleases } = await supabase
        .from('release_artists')
        .select('release_id')
        .in('artist_id', artistIds);

      artistReleases?.forEach(ar => accessibleReleaseIds.add(ar.release_id));
    }
  }

  // If no access at all, return empty
  if (accessibleReleaseIds.size === 0) {
    return [];
  }

  // Fetch the actual release data with artist information and deliverables
  let query = supabase
    .from('releases')
    .select(`
      id,
      title,
      online,
      offline,
      cover_url,
      status,
      type,
      catalog_number,
      created_at,
      release_artists(
        artist:artists(id, name, image_url, organization_id)
      ),
      deliverables(id, status)
    `)
    .in('id', Array.from(accessibleReleaseIds))
    .order('created_at', { ascending: false });

  // Apply pagination if requested
  if (options?.limit) {
    query = query.limit(options.limit);
  }
  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching accessible releases:', error);
    return [];
  }

  // Transform the data to flatten artist information
  let releases = (data || []).map((release: any) => ({
    ...release,
    artists: release.release_artists?.map((ra: any) => ra.artist).filter(Boolean) || []
  }));

  // Filter out releases where all artists are null or from other organizations
  if (organizationId) {
    releases = releases.filter(release => 
      release.artists.length > 0 && 
      release.artists.some((artist: any) => artist.organization_id === organizationId)
    );
  }

  return releases;
  }, 300000); // 5 minute TTL
};

/**
 * Get releases for a specific artist that the current user has access to
 * If user has artist access, they get ALL releases by that artist
 */
export const getAccessibleArtistReleases = async (artistId: string): Promise<Release[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // Check if user has access to this artist (direct or cascaded)
  const userArtistAccess = await getUserHighestAccess(user.id, 'artist', artistId);
  
  // Get all releases for this artist
  const { data: artistReleases, error: arError } = await supabase
    .from('release_artists')
    .select('release_id')
    .eq('artist_id', artistId);

  if (arError || !artistReleases) {
    console.error('Error fetching artist releases:', arError);
    return [];
  }

  const releaseIds = artistReleases.map(ar => ar.release_id);
  
  if (releaseIds.length === 0) return [];

  let accessibleReleaseIds: string[] = [];

  if (userArtistAccess) {
    // User has artist access - they get ALL releases by this artist
    accessibleReleaseIds = releaseIds;
  } else {
    // User doesn't have artist access - check individual release permissions in bulk
    const { data: userReleaseAccess } = await supabase
      .from('access_grants')
      .select('resource_id')
      .eq('user_id', user.id)
      .eq('resource_type', 'release')
      .eq('is_active', true)
      .in('resource_id', releaseIds);
    
    accessibleReleaseIds = userReleaseAccess?.map(grant => grant.resource_id) || [];
  }

  if (accessibleReleaseIds.length === 0) return [];

  // Fetch the actual release data
  const { data, error } = await supabase
    .from('releases')
    .select(`
      id,
      title,
      online,
      offline,
      cover_url,
      status,
      type,
      catalog_number,
      created_at,
      release_artists!inner(
        artist:artists(id, name, image_url)
      ),
      deliverables(id, status)
    `)
    .in('id', accessibleReleaseIds)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching accessible artist releases:', error);
    return [];
  }

  // Transform the data to flatten artist information
  return (data || []).map((release: any) => ({
    ...release,
    artists: release.release_artists?.map((ra: any) => ra.artist) || []
  }));
};

/**
 * Get deliverables for a release that the current user has access to
 */
export const getAccessibleDeliverables = async (releaseId: string): Promise<Deliverable[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // Check if user has access to this release
  const hasReleaseAccess = await getUserHighestAccess(user.id, 'release', releaseId);
  if (!hasReleaseAccess) {
    return [];
  }

  // If user has release access, they automatically have access to all deliverables
  const { data, error } = await supabase
    .from('deliverables')
    .select(`
      id,
      name,
      type,
      release_id,
      online_deadline,
      offline_deadline,
      status,
      created_at,
      release:releases(
        title,
        release_artists(
          artist:artists(name)
        )
      )
    `)
    .eq('release_id', releaseId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching accessible deliverables:', error);
    return [];
  }

  // Transform the data to match our interface
  const transformedData = (data || []).map((deliverable: any) => ({
    ...deliverable,
    release: Array.isArray(deliverable.release) ? deliverable.release[0] : deliverable.release
  }));

  return transformedData;
};

/**
 * Get all deliverables that the current user has access to (across all accessible releases)
 */
export const getAllAccessibleDeliverables = async (): Promise<Deliverable[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // First get all accessible releases
  const accessibleReleases = await getAccessibleReleases();
  
  if (accessibleReleases.length === 0) {
    return [];
  }

  // Get all deliverables for these releases
  const releaseIds = accessibleReleases.map(release => release.id);
  
  const { data, error } = await supabase
    .from('deliverables')
    .select(`
      *,
      release:releases(
        title,
        release_artists(
          artist:artists(name)
        )
      )
    `)
    .in('release_id', releaseIds)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching all accessible deliverables:', error);
    return [];
  }

  // Transform the data to match our interface
  const transformedData = (data || []).map((deliverable: any) => ({
    ...deliverable,
    release: Array.isArray(deliverable.release) ? deliverable.release[0] : deliverable.release
  }));

  return transformedData;
};

/**
 * Get folders for an artist that the current user has access to
 */
export const getAccessibleArtistFolders = async (artistId: string): Promise<Folder[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // Check if user has access to this artist
  const hasArtistAccess = await getUserHighestAccess(user.id, 'artist', artistId);
  if (!hasArtistAccess) {
    return [];
  }

  // If user has artist access, they automatically have access to all folders
  const { data, error } = await supabase
    .from('folders')
    .select('id, name, description, artist_id, file_count, created_at')
    .eq('artist_id', artistId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching accessible artist folders:', error);
    return [];
  }

  return data || [];
};



/**
 * Debug function to check access grants
 * Call this manually from browser console: debugUserAccess()
 */
export const debugUserAccess = async (): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.log('❌ No user found');
    return;
  }

  console.log('🔍 Current user:', user.id);

  // Check ALL access grants (not just for this user) to see if table has data
  const { data: allGrantsInTable, error: allGrantsError } = await supabase
    .from('access_grants')
    .select('*')
    .limit(10);

  console.log('📋 All access grants in table (first 10):', allGrantsInTable);
  if (allGrantsError) console.error('❌ Error fetching all grants:', allGrantsError);

  // Check all access grants for user
  const { data: allGrants, error: grantsError } = await supabase
    .from('access_grants')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_active', true);

  console.log('📋 All active access grants for user:', allGrants);
  if (grantsError) console.error('❌ Error fetching grants:', grantsError);



  // Check if user exists in user_profiles
  const { data: userProfile, error: profileError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  console.log('👤 User profile:', userProfile);
  if (profileError) console.error('❌ Error fetching user profile:', profileError);
};

/**
 * Debug function to check user access for a specific resource
 * Call this manually from browser console: debugResourceAccess('artist', 'artist-id-here')
 */
export const debugResourceAccess = async (resourceType: ResourceType, resourceId: string) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.log('❌ No user found');
    return;
  }

  console.log(`🔍 Debugging access for user ${user.id} to ${resourceType} ${resourceId}`);
  
  const directAccess = await getDirectAccess(user.id, resourceType, resourceId);
  console.log(`🎯 Direct access:`, directAccess);
  
  const highestAccess = await getUserHighestAccess(user.id, resourceType, resourceId);
  console.log(`🏆 Highest access:`, highestAccess);
  
  // Also check all access grants for this user
  const { data: allGrants } = await supabase
    .from('access_grants')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_active', true);
  
  console.log(`📋 All active access grants for user:`, allGrants);
};





// =====================================================
// ACCESS CONTROL FUNCTIONS
// =====================================================

export const getAccessGrants = async (
  resourceType: ResourceType,
  resourceId: string
): Promise<AccessGrant[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  const currentUserEmail = user?.email;

  // First, get all access grants for this resource
  const { data: grantsData, error: grantsError } = await supabase
    .from('access_grants')
    .select(`
      id,
      resource_type,
      resource_id,
      user_id,
      access_level,
      granted_by,
      granted_at,
      invited_at,
      accepted_at,
      expires_at,
      is_active
    `)
    .eq('resource_type', resourceType)
    .eq('resource_id', resourceId)
    .eq('is_active', true)
    .order('invited_at', { ascending: true });

  if (grantsError) {
    console.error('Error fetching access grants:', grantsError);
    throw grantsError;
  }

  // Get all user IDs from the grants
  const userIds = (grantsData || [])
    .map(grant => grant.user_id)
    .filter(userId => userId !== null);

  // Fetch user profiles for all user IDs
  let userProfiles: any[] = [];
  if (userIds.length > 0) {
    const { data: profilesData, error: profilesError } = await supabase
      .from('user_profiles')
      .select('id, email, first_name, last_name')
      .in('id', userIds);

    if (profilesError) {
      console.error('Error fetching user profiles:', profilesError);
    } else {
      userProfiles = profilesData || [];
    }
  }

  // Create a map of user profiles by ID
  const userProfilesMap = new Map(userProfiles.map(profile => [profile.id, profile]));

  // Combine grants with user profiles
  const data = (grantsData || []).map(grant => ({
    ...grant,
    user: grant.user_id ? userProfilesMap.get(grant.user_id) : null
  }));

  // Error handling is already done above with grantsError

  // Map grants and add "you" indicator
  const grants = (data || []).map((grant: any) => ({
    id: grant.id,
    resourceType: grant.resource_type as ResourceType,
    resourceId: grant.resource_id,
    userId: grant.user_id,
    email: grant.user?.email || 'Unknown',
    accessLevel: grant.access_level as AccessLevel,
    grantedBy: grant.granted_by,
    grantedAt: grant.granted_at,
    invitedAt: grant.invited_at,
    acceptedAt: grant.accepted_at,
    expiresAt: grant.expires_at,
    isActive: grant.is_active,
    isYou: !!(currentUserEmail && grant.user?.email?.toLowerCase() === currentUserEmail.toLowerCase())
  }));

  // Sort: current user first, then by invited_at
  grants.sort((a, b) => {
    if (a.isYou && !b.isYou) return -1;
    if (!a.isYou && b.isYou) return 1;
    return new Date(a.invitedAt).getTime() - new Date(b.invitedAt).getTime();
  });

  return grants;
};

export const inviteUsers = async ({
  resourceType,
  resourceId,
  emails,
  accessLevel,
  resourceName,
  resourceDescription
}: {
  resourceType: ResourceType;
  resourceId: string;
  emails: string[];
  accessLevel: AccessLevel;
  resourceName: string;
  resourceDescription?: string;
}): Promise<{ success: string[], alreadyExists: string[], errors: string[] }> => {
  const { data: { user } } = await supabase.auth.getUser();
  const inviterEmail = user?.email;

  const result = {
    success: [] as string[],
    alreadyExists: [] as string[],
    errors: [] as string[]
  };

  // Check which users already exist via API route
  const checkResponse = await fetch('/api/check-users', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ emails }),
  });

  if (!checkResponse.ok) {
    console.error('Failed to check users:', await checkResponse.text());
    throw new Error('Failed to check existing users');
  }

  const checkResult = await checkResponse.json();
  const existingEmails = checkResult.existingEmails;
  const newEmails = checkResult.newEmails;

  // Check which users already have access to this resource
  const { data: existingAccess, error: accessError } = await supabase
    .from('access_grants')
    .select('email')
    .eq('resource_type', resourceType)
    .eq('resource_id', resourceId)
    .in('email', emails.map(e => e.toLowerCase().trim()))
    .eq('is_active', true);

  if (accessError) {
    console.error('Error checking existing access:', accessError);
    throw accessError;
  }

  const alreadyHaveAccess = existingAccess?.map(grant => grant.email) || [];

  // Filter out users who already have access
  const emailsToInvite = emails.filter(email => 
    !alreadyHaveAccess.includes(email.toLowerCase().trim())
  );

  // Add users who already have access to result
  result.alreadyExists = [...existingEmails, ...alreadyHaveAccess];

  // Only create access grants for users who don't already have access
  const grants = emailsToInvite.map(email => ({
    resource_type: resourceType,
    resource_id: resourceId,
    email: email.toLowerCase().trim(),
    access_level: accessLevel,
    granted_by: user?.id,
    user_id: null, // Will be set when user accepts invite
    granted_at: new Date().toISOString(),
    invited_at: new Date().toISOString(),
    is_active: true
  }));

  if (grants.length === 0) {
    return result;
  }

  const { data: insertedGrants, error } = await supabase
    .from('access_grants')
    .upsert(grants, { 
      onConflict: 'resource_type,resource_id,email',
      ignoreDuplicates: false 
    })
    .select('*');

  if (error) {
    console.error('Error inviting users:', error);
    throw error;
  }
  
  // If upsert didn't return the grants (e.g., if they already existed), fetch them
  let grantsToProcess = insertedGrants;
  if (!insertedGrants || insertedGrants.length === 0) {
    const { data: existingGrants, error: fetchError } = await supabase
      .from('access_grants')
      .select('*')
      .in('email', emails)
      .eq('resource_type', resourceType)
      .eq('resource_id', resourceId);
    
    if (fetchError) {
      console.error('Error fetching existing grants:', fetchError);
      throw fetchError;
    }
    
    grantsToProcess = existingGrants;
  }

  // Send email invites for each grant
  if (grantsToProcess) {
    for (const grant of grantsToProcess) {
      try {
        // Add a small delay to ensure the database transaction is committed
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Verify the grant exists before sending email
        const { data: verifyGrant, error: verifyError } = await supabase
          .from('access_grants')
          .select('id')
          .eq('id', grant.id)
          .single();
        
        if (verifyError || !verifyGrant) {
          console.error('Grant not found in database:', grant.id, verifyError);
          result.errors.push(grant.email);
          continue;
        }
        
        const response = await fetch('/api/send-invite-supabase', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            accessGrantId: grant.id,
            resourceType,
            resourceId,
            resourceName,
            resourceDescription,
            inviterEmail,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Failed to send invite email for:', grant.email, 'Response:', errorText);
          result.errors.push(grant.email);
        } else {
          result.success.push(grant.email);
        }
      } catch (err) {
        console.error('Error sending invite email:', err);
        result.errors.push(grant.email);
      }
    }
  }

  return result;
};

export const changeAccessLevel = async ({
  grantId,
  accessLevel
}: {
  grantId: string;
  accessLevel: AccessLevel;
}): Promise<void> => {
  const { error } = await supabase
    .from('access_grants')
    .update({ access_level: accessLevel })
    .eq('id', grantId);

  if (error) {
    console.error('Error changing access level:', error);
    throw error;
  }
};

export const revokeAccess = async ({
  grantId
}: {
  grantId: string;
}): Promise<void> => {
  const { error } = await supabase
    .from('access_grants')
    .update({ is_active: false })
    .eq('id', grantId);

  if (error) {
    console.error('Error revoking access:', error);
    throw error;
  }
};

export const hasAccess = async (
  resourceType: ResourceType,
  resourceId: string,
  requiredLevel: AccessLevel = 'view'
): Promise<boolean> => {
  const { data, error } = await supabase.rpc('has_access', {
    p_resource_type: resourceType,
    p_resource_id: resourceId,
    p_required_level: requiredLevel
  });

  if (error) {
    console.error('Error checking access:', error);
    return false;
  }

  return data || false;
};

// =====================================================
// COLLECTION FUNCTIONS
// =====================================================

export const createCollection = async ({
  name,
  description,
  isPublic = false
}: {
  name: string;
  description?: string;
  isPublic?: boolean;
}): Promise<Collection> => {
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('collections')
    .insert({
      name,
      description,
      created_by: user?.id,
      is_public: isPublic
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating collection:', error);
    throw error;
  }

  return {
    id: data.id,
    name: data.name,
    description: data.description,
    createdBy: data.created_by,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    isPublic: data.is_public,
    publicToken: data.public_token,
    publicExpiresAt: data.public_expires_at,
  };
};

export const getCollections = async (): Promise<Collection[]> => {
  const { data, error } = await supabase
    .from('collections')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error fetching collections:', error);
    throw error;
  }

  return (data || []).map((collection: any) => ({
    id: collection.id,
    name: collection.name,
    description: collection.description,
    createdBy: collection.created_by,
    createdAt: collection.created_at,
    updatedAt: collection.updated_at,
    isPublic: collection.is_public,
    publicToken: collection.public_token,
    publicExpiresAt: collection.public_expires_at,
  }));
};

export const addToCollection = async ({
  collectionId,
  itemType,
  itemId,
  sortOrder
}: {
  collectionId: string;
  itemType: ResourceType;
  itemId: string;
  sortOrder?: number;
}): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser();

  const { error } = await supabase
    .from('collection_items')
    .insert({
      collection_id: collectionId,
      item_type: itemType,
      item_id: itemId,
      sort_order: sortOrder || 0,
      added_by: user?.id
    });

  if (error) {
    console.error('Error adding item to collection:', error);
    throw error;
  }
};

export const removeFromCollection = async ({
  collectionId,
  itemType,
  itemId
}: {
  collectionId: string;
  itemType: ResourceType;
  itemId: string;
}): Promise<void> => {
  const { error } = await supabase
    .from('collection_items')
    .delete()
    .eq('collection_id', collectionId)
    .eq('item_type', itemType)
    .eq('item_id', itemId);

  if (error) {
    console.error('Error removing item from collection:', error);
    throw error;
  }
};

export const getCollectionItems = async (collectionId: string): Promise<CollectionItem[]> => {
  const { data, error } = await supabase
    .from('collection_items')
    .select('*')
    .eq('collection_id', collectionId)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('Error fetching collection items:', error);
    throw error;
  }

  return (data || []).map((item: any) => ({
    id: item.id,
    collectionId: item.collection_id,
    itemType: item.item_type as ResourceType,
    itemId: item.item_id,
    sortOrder: item.sort_order,
    addedBy: item.added_by,
    addedAt: item.added_at,
  }));
};

// =====================================================
// SHARE LINK FUNCTIONS
// =====================================================

export const createShareLink = async ({
  resourceType,
  resourceId,
  accessLevel = 'view',
  title,
  description,
  expiresAt,
  maxUses
}: {
  resourceType: ResourceType;
  resourceId: string;
  accessLevel?: AccessLevel;
  title?: string;
  description?: string;
  expiresAt?: string;
  maxUses?: number;
}): Promise<ShareLink> => {
  const { data: { user } } = await supabase.auth.getUser();
  const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

  const { data, error } = await supabase
    .from('share_links')
    .insert({
      resource_type: resourceType,
      resource_id: resourceId,
      token,
      access_level: accessLevel,
      created_by: user?.id,
      title,
      description,
      expires_at: expiresAt,
      max_uses: maxUses
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating share link:', error);
    throw error;
  }

  return {
    id: data.id,
    resourceType: data.resource_type as ResourceType,
    resourceId: data.resource_id,
    token: data.token,
    accessLevel: data.access_level as AccessLevel,
    createdBy: data.created_by,
    createdAt: data.created_at,
    expiresAt: data.expires_at,
    maxUses: data.max_uses,
    useCount: data.use_count,
    isActive: data.is_active,
    title: data.title,
    description: data.description,
  };
};

export const getShareLinks = async (
  resourceType: ResourceType,
  resourceId: string
): Promise<ShareLink[]> => {
  const { data, error } = await supabase
    .from('share_links')
    .select('*')
    .eq('resource_type', resourceType)
    .eq('resource_id', resourceId)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching share links:', error);
    throw error;
  }

  return (data || []).map((link: any) => ({
    id: link.id,
    resourceType: link.resource_type as ResourceType,
    resourceId: link.resource_id,
    token: link.token,
    accessLevel: link.access_level as AccessLevel,
    createdBy: link.created_by,
    createdAt: link.created_at,
    expiresAt: link.expires_at,
    maxUses: link.max_uses,
    useCount: link.use_count,
    isActive: link.is_active,
    title: link.title,
    description: link.description,
  }));
};

export const deleteShareLink = async (linkId: string): Promise<void> => {
  const { error } = await supabase
    .from('share_links')
    .update({ is_active: false })
    .eq('id', linkId);

  if (error) {
    console.error('Error deleting share link:', error);
    throw error;
  }
};

/**
 * Grant access to a user directly (for admin use, bypasses email invitation)
 */
export const grantDirectAccess = async (
  userEmail: string,
  resourceType: ResourceType,
  resourceId: string,
  accessLevel: AccessLevel
): Promise<boolean> => {
  try {
    // First, get the user by email using the server-side API
    const response = await fetch('/api/get-user-by-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: userEmail }),
    });

    if (!response.ok) {
      console.error('Failed to get user by email');
      return false;
    }

    const { user, error: userError } = await response.json();
    
    if (userError || !user) {
      console.error('User not found:', userError);
      return false;
    }

    // Check if access grant already exists
    const { data: existingGrant } = await supabase
      .from('access_grants')
      .select('id')
      .eq('user_id', user.id)
      .eq('resource_type', resourceType)
      .eq('resource_id', resourceId)
      .eq('is_active', true)
      .single();

    if (existingGrant) {
      return true;
    }

    // Get current user (admin) who is granting access
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) {
      console.error('No current user found');
      return false;
    }

    // Create the access grant
    const { error: grantError } = await supabase
      .from('access_grants')
      .insert({
        user_id: user.id,
        resource_type: resourceType,
        resource_id: resourceId,
        access_level: accessLevel,
        is_active: true,
        granted_by: currentUser.id,
        granted_at: new Date().toISOString(),
        accepted_at: new Date().toISOString() // Mark as accepted immediately
      });

    if (grantError) {
      console.error('Error granting access:', grantError);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in grantDirectAccess:', error);
    return false;
  }
};

// Make debug functions available globally for console access
if (typeof window !== 'undefined') {
  (window as any).debugUserAccess = debugUserAccess;
  (window as any).debugResourceAccess = debugResourceAccess;
  (window as any).grantDirectAccess = grantDirectAccess;
}
