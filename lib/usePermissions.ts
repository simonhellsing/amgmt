import { useState, useEffect, useMemo, useCallback } from 'react';
import { canCurrentUserPerformAction, Permission, ResourceType } from './accessControl';

interface UsePermissionsResult {
  permissions: Record<Permission, boolean>;
  loading: boolean;
  checkPermission: (permission: Permission) => boolean;
}

/**
 * Hook to check multiple permissions for a resource
 */
export const usePermissions = (
  resourceType: ResourceType, 
  resourceId: string,
  permissionsToCheck: Permission[]
): UsePermissionsResult => {
  const [permissions, setPermissions] = useState<Record<Permission, boolean>>({} as Record<Permission, boolean>);
  const [loading, setLoading] = useState(true);

  // Stable permission list key to prevent infinite re-renders
  const permissionsKey = useMemo(() => permissionsToCheck.sort().join(','), [permissionsToCheck]);

  useEffect(() => {
    if (!resourceId) return;

    const loadPermissions = async () => {
      setLoading(true);
      try {
        const results = await Promise.all(
          permissionsToCheck.map(permission => 
            canCurrentUserPerformAction(permission, resourceType, resourceId)
          )
        );

        const permissionMap = permissionsToCheck.reduce((acc, permission, index) => {
          acc[permission] = results[index];
          return acc;
        }, {} as Record<Permission, boolean>);

        setPermissions(permissionMap);
      } catch (error) {
        console.error('Error loading permissions:', error);
        // Default to no permissions on error
        const permissionMap = permissionsToCheck.reduce((acc, permission) => {
          acc[permission] = false;
          return acc;
        }, {} as Record<Permission, boolean>);
        setPermissions(permissionMap);
      } finally {
        setLoading(false);
      }
    };

    loadPermissions();
  }, [resourceType, resourceId, permissionsKey]); // Use stable key instead of array

  const checkPermission = useCallback((permission: Permission): boolean => {
    return permissions[permission] || false;
  }, [permissions]);

  return { permissions, loading, checkPermission };
};

/**
 * Hook for common release permissions
 */
export const useReleasePermissions = (releaseId: string) => {
  return usePermissions('release', releaseId, [
    'view',
    'upload_files',
    'manage_access',
    'invite_users',
    'create_deliverables',
    'edit_deliverables',
    'delete_deliverables',
    'override_approvals'
  ]);
};

/**
 * Hook for common deliverable permissions
 */
export const useDeliverablePermissions = (deliverableId: string) => {
  return usePermissions('deliverable', deliverableId, [
    'view',
    'upload_files',
    'edit_deliverables',
    'delete_deliverables',
    'override_approvals'
  ]);
};



/**
 * Hook for common artist permissions
 */
export const useArtistPermissions = (artistId: string) => {
  return usePermissions('artist', artistId, [
    'view',
    'manage_access',
    'invite_users',
    'create_deliverables',
    'edit_deliverables',
    'delete_deliverables',
    'override_approvals'
  ]);
};
