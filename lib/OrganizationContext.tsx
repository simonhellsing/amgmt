import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from './supabase';

interface Organization {
  id: string;
  name: string;
  image_url?: string | null;
}

interface OrganizationContextType {
  selectedOrganization: Organization | null;
  allOrganizations: Organization[];
  setSelectedOrganization: (org: Organization) => void;
  loading: boolean;
  refreshOrganizations: () => Promise<void>;
  needsOrganizationSelection: boolean;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const [selectedOrganization, setSelectedOrganizationState] = useState<Organization | null>(null);
  const [allOrganizations, setAllOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [needsOrganizationSelection, setNeedsOrganizationSelection] = useState(false);

  const fetchOrganizations = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Fetch all organizations the user has access to
      const { data: accessGrants, error: accessError } = await supabase
        .from('access_grants')
        .select('resource_id')
        .eq('user_id', user.id)
        .eq('resource_type', 'organization')
        .eq('is_active', true);

      if (accessError) {
        console.error('Error fetching organization access:', accessError);
        setLoading(false);
        return;
      }

      if (!accessGrants || accessGrants.length === 0) {
        setLoading(false);
        return;
      }

      // Fetch all organization details
      const orgIds = accessGrants.map(grant => grant.resource_id);
      const { data: organizations, error: orgError } = await supabase
        .from('organizations')
        .select('id, name, image_url')
        .in('id', orgIds)
        .order('name');

      if (orgError) {
        console.error('Error fetching organizations:', orgError);
        setLoading(false);
        return;
      }

      setAllOrganizations(organizations || []);

      // Set selected organization from localStorage or determine if selection is needed
      const savedOrgId = localStorage.getItem('selectedOrganizationId');
      let orgToSelect: Organization | null = null;

      if (savedOrgId) {
        orgToSelect = organizations?.find(org => org.id === savedOrgId) || null;
      }

      // If user has multiple organizations and no valid saved selection, they need to choose
      if (!orgToSelect && organizations && organizations.length > 1) {
        setNeedsOrganizationSelection(true);
        setLoading(false);
        return;
      }

      // If user has exactly one organization, auto-select it
      if (!orgToSelect && organizations && organizations.length === 1) {
        orgToSelect = organizations[0];
      }

      if (orgToSelect) {
        setSelectedOrganizationState(orgToSelect);
        localStorage.setItem('selectedOrganizationId', orgToSelect.id);
        setNeedsOrganizationSelection(false);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error in fetchOrganizations:', error);
      setLoading(false);
    }
  }, []); // Empty deps since we only use setState which are stable

  useEffect(() => {
    fetchOrganizations();
    
    // Listen for organization updates from settings page
    const handleOrganizationUpdated = () => {
      fetchOrganizations();
    };
    
    window.addEventListener('organizationUpdated', handleOrganizationUpdated);
    
    return () => {
      window.removeEventListener('organizationUpdated', handleOrganizationUpdated);
    };
  }, []);

  const setSelectedOrganization = (org: Organization) => {
    setSelectedOrganizationState(org);
    localStorage.setItem('selectedOrganizationId', org.id);
    setNeedsOrganizationSelection(false);
    // Trigger a custom event so components can react to organization changes
    window.dispatchEvent(new CustomEvent('organizationChanged', { detail: org }));
  };

  const refreshOrganizations = useCallback(async () => {
    await fetchOrganizations();
  }, [fetchOrganizations]);

  return (
    <OrganizationContext.Provider
      value={{
        selectedOrganization,
        allOrganizations,
        setSelectedOrganization,
        loading,
        refreshOrganizations,
        needsOrganizationSelection
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
}

