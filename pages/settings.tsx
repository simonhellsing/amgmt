import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabase';
import Layout from '@/components/Layout';
import Button from '@/components/Button';
import IconButton from '@/components/IconButton';
import Spinner from '@/components/Spinner';
import ProfileImageUploader from '@/components/ProfileImageUploader';
import OrganizationImageUploader from '@/components/OrganizationImageUploader';
import OrganizationMembers from '@/components/OrganizationMembers';
import { User, Save, Settings as SettingsIcon, Building2, Users, Plus, LogOut, X, CreditCard, Eye } from 'lucide-react';
import { useToast } from '@/lib/useToast';
import ToastContainer from '@/components/Toast';
import { Input } from '@/components/form';
import { revokeAccess } from '@/lib/accessControl';
import { useOrganization } from '@/lib/OrganizationContext';

interface UserProfile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  avatar_url?: string | null;
  phone_number?: string | null;
  location?: string | null;
}

interface Organization {
  id: string;
  name: string;
  image_url?: string | null;
  created_at: string;
  updated_at: string;
}

interface UserOrganization {
  organization: Organization;
  accessLevel: string;
  grantId: string;
  isAdmin: boolean;
  role: 'Administrator' | 'Collaborator' | 'Artist';
}

type PersonalTabType = 'profile' | 'preferences';
type OrgTabType = 'overview' | 'settings' | 'members' | 'billing';

export default function SettingsPage() {
  const router = useRouter();
  const { toasts, removeToast, ...toast } = useToast();
  const { allOrganizations, refreshOrganizations } = useOrganization();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userOrganizations, setUserOrganizations] = useState<UserOrganization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingOrg, setSavingOrg] = useState(false);
  const [leavingOrgId, setLeavingOrgId] = useState<string | null>(null);
  const [activePersonalTab, setActivePersonalTab] = useState<PersonalTabType | null>('profile');
  const [activeOrgTab, setActiveOrgTab] = useState<OrgTabType | null>(null);
  const [showCreateOrg, setShowCreateOrg] = useState(false);
  
  // Profile form fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [location, setLocation] = useState('');
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [layoutPreference, setLayoutPreference] = useState<string>('simple');

  // Organization form fields
  const [orgName, setOrgName] = useState('');
  const [orgImageUrl, setOrgImageUrl] = useState<string | null>(null);

  const selectedOrganization = userOrganizations.find(uo => uo.organization.id === selectedOrgId)?.organization || null;
  const selectedUserOrg = userOrganizations.find(uo => uo.organization.id === selectedOrgId);
  const isAdmin = selectedUserOrg?.isAdmin || false;

  // Map access levels to roles
  const getRoleFromAccessLevel = (accessLevel: string): 'Administrator' | 'Collaborator' | 'Artist' => {
    if (accessLevel === 'full') return 'Administrator';
    if (accessLevel === 'artist') return 'Artist';
    return 'Collaborator';
  };

  const loadUserData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    
    if (user) {
      // Fetch user profile
      const { data: profileData, error } = await supabase
        .from('user_profiles')
        .select('id, first_name, last_name, email, avatar_url, phone_number, location, layout_preference')
        .eq('id', user.id)
        .single();
      
      if (error) {
        console.error('Error fetching user profile:', error);
        toast.error('Error loading profile');
      } else {
        setProfile(profileData);
        setFirstName(profileData.first_name || '');
        setLastName(profileData.last_name || '');
        setPhoneNumber(profileData.phone_number || '');
        setLocation(profileData.location || '');
        setProfileImageUrl(profileData.avatar_url);
        setLayoutPreference(profileData.layout_preference || 'simple');
      }

      // Fetch all organizations the user has access to
      const { data: orgAccessGrants, error: grantsError } = await supabase
        .from('access_grants')
        .select('id, resource_id, access_level')
        .eq('resource_type', 'organization')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (grantsError) {
        console.error('Error fetching organization access:', grantsError);
      } else if (orgAccessGrants && orgAccessGrants.length > 0) {
        // Fetch all organization details
        const orgIds = orgAccessGrants.map(g => g.resource_id);
        const { data: orgsData, error: orgsError } = await supabase
          .from('organizations')
          .select('*')
          .in('id', orgIds)
          .order('name');

        if (orgsError) {
          console.error('Error fetching organizations:', orgsError);
        } else if (orgsData) {
          // Combine organizations with access info
          const userOrgs: UserOrganization[] = orgsData.map(org => {
            const grant = orgAccessGrants.find(g => g.resource_id === org.id);
            const accessLevel = grant?.access_level || 'view';
            return {
              organization: org,
              accessLevel: accessLevel,
              grantId: grant?.id || '',
              isAdmin: accessLevel === 'full',
              role: getRoleFromAccessLevel(accessLevel)
            };
          });

          setUserOrganizations(userOrgs);

          // Select the first organization or the one from localStorage
          const savedOrgId = typeof window !== 'undefined' ? localStorage.getItem('selectedOrganizationId') : null;
          const orgToSelect = savedOrgId 
            ? userOrgs.find(uo => uo.organization.id === savedOrgId)?.organization.id
            : userOrgs[0]?.organization.id;

          if (orgToSelect) {
            setSelectedOrgId(orgToSelect);
            const selectedOrg = userOrgs.find(uo => uo.organization.id === orgToSelect)?.organization;
            if (selectedOrg) {
              setOrgName(selectedOrg.name || '');
              setOrgImageUrl(selectedOrg.image_url || null);
            }
          }
        }
      }
    }
    setLoading(false);
  };
    
  useEffect(() => {
    loadUserData();
  }, []);

  const handleLeaveOrganization = async (orgId: string, orgName: string) => {
    // Prevent leaving if it's the last organization
    if (userOrganizations.length <= 1) {
      toast.error('You must belong to at least one organization. Create a new organization before leaving this one.');
      return;
    }

    if (!confirm(`Are you sure you want to leave "${orgName}"? You will lose access to all content in this organization.`)) {
      return;
    }

    setLeavingOrgId(orgId);
    try {
      const orgGrant = userOrganizations.find(uo => uo.organization.id === orgId);
      if (!orgGrant) {
        toast.error('Organization access not found');
        return;
      }

      await revokeAccess({ grantId: orgGrant.grantId });
      
      toast.success(`You have left "${orgName}"`);
      
      // If leaving the selected organization, select another one
      if (selectedOrgId === orgId) {
        const remainingOrgs = userOrganizations.filter(uo => uo.organization.id !== orgId);
        if (remainingOrgs.length > 0) {
          setSelectedOrgId(remainingOrgs[0].organization.id);
          setOrgName(remainingOrgs[0].organization.name || '');
          setOrgImageUrl(remainingOrgs[0].organization.image_url || null);
        }
      }

      // Trigger navigation update
      window.dispatchEvent(new Event('organizationUpdated'));
      
      // Reload organizations
      await loadUserData();
      await refreshOrganizations();
    } catch (error: any) {
      console.error('Error leaving organization:', error);
      toast.error(error.message || 'Failed to leave organization');
    } finally {
      setLeavingOrgId(null);
    }
  };

  const handleSelectOrganization = (orgId: string) => {
    const userOrg = userOrganizations.find(uo => uo.organization.id === orgId);
    if (userOrg) {
      setSelectedOrgId(orgId);
      setOrgName(userOrg.organization.name || '');
      setOrgImageUrl(userOrg.organization.image_url || null);
      localStorage.setItem('selectedOrganizationId', orgId);
      // Switch to overview tab when selecting an organization
      setActiveOrgTab('overview');
      setActivePersonalTab(null);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      // Update user metadata in auth
      const { error: authError } = await supabase.auth.updateUser({
        data: {
          first_name: firstName,
          last_name: lastName,
          phone_number: phoneNumber || null,
          location: location || null,
          avatar_url: profileImageUrl || null,
        }
      });

      if (authError) {
        console.error('Error updating auth user:', authError);
        toast.error('Error updating profile');
        return;
      }

      // Update user profile in database
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({
          first_name: firstName,
          last_name: lastName,
          phone_number: phoneNumber || null,
          location: location || null,
          avatar_url: profileImageUrl || null,
          layout_preference: layoutPreference,
        })
        .eq('id', user.id);

      if (profileError) {
        console.error('Error updating profile:', profileError);
        toast.error('Error updating profile');
        return;
      }

      toast.success('Profile updated successfully');
      
      // Reload profile data
      await loadUserData();
      
      // Trigger layout preference change event
      window.dispatchEvent(new Event('layoutPreferenceChanged'));
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Error updating profile');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateOrganization = async () => {
    if (!orgName.trim()) {
      toast.error('Organization name is required');
      return;
    }

    setSavingOrg(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('Not authenticated - please log in again');
        setSavingOrg(false);
        return;
      }

      // Create the organization
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: orgName.trim(),
          image_url: orgImageUrl,
        })
        .select()
        .single();

      if (orgError) {
        console.error('Organization creation error:', orgError);
        toast.error(`Failed to create organization: ${orgError.message}`);
        setSavingOrg(false);
        return;
      }

      if (orgData) {
        // Grant the creator full access to the organization
        const { error: grantError } = await supabase
          .from('access_grants')
          .insert({
            resource_type: 'organization',
            resource_id: orgData.id,
            user_id: user.id,
            email: user.email,
            access_level: 'full',
            granted_by: user.id,
            granted_at: new Date().toISOString(),
            accepted_at: new Date().toISOString(),
            is_active: true,
          });

        if (grantError) {
          console.error('Error granting access to creator:', grantError);
          // Don't fail the entire operation if this fails (trigger might have handled it)
        }

        toast.success('Organization created successfully');
        
        // Reset form
        setOrgName('');
        setOrgImageUrl(null);
        setShowCreateOrg(false);
        
        // Trigger navigation update
        window.dispatchEvent(new Event('organizationUpdated'));
        
        // Reload organizations
        await loadUserData();
        
        // Select the newly created organization
        setSelectedOrgId(orgData.id);
        setActiveOrgTab('overview');
        setActivePersonalTab(null);
      }
    } catch (error: any) {
      console.error('Error creating organization:', error);
      toast.error(error.message || 'Error creating organization');
    } finally {
      setSavingOrg(false);
    }
  };

  const handleSaveOrganization = async () => {
    if (!selectedOrganization) return;

    setSavingOrg(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Not authenticated');
        return;
      }

      const response = await fetch(`/api/organizations/${selectedOrganization.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          name: orgName,
          image_url: orgImageUrl,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update organization');
      }

      const updatedOrg = await response.json();
      toast.success('Organization updated successfully');
      
      // Update the organization in the list
      setUserOrganizations(prev => prev.map(uo => 
        uo.organization.id === updatedOrg.id 
          ? { ...uo, organization: updatedOrg }
          : uo
      ));
      
      // Update form fields
      setOrgName(updatedOrg.name || '');
      setOrgImageUrl(updatedOrg.image_url);
      
      // Trigger navigation update
      window.dispatchEvent(new Event('organizationUpdated'));
      await refreshOrganizations();
    } catch (error: any) {
      console.error('Error updating organization:', error);
      toast.error(error.message || 'Error updating organization');
    } finally {
      setSavingOrg(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <Spinner size="lg" />
        </div>
      </Layout>
    );
  }

  if (!user) {
    router.push('/login');
    return null;
  }

  const getUserDisplayName = () => {
    if (profile?.first_name || profile?.last_name) {
      return `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
    }
    return user.email?.split('@')[0] || 'User';
  };

  return (
    <Layout>
      <ToastContainer toasts={toasts} onClose={removeToast} />
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          <p className="text-gray-400">Manage your account and system settings</p>
        </div>

        <div className="flex gap-6">
          {/* Left Sidebar */}
          <div className="w-64 flex-shrink-0">
            <div className="bg-gray-800 rounded-lg p-4 mb-4">
              {/* Profile Section */}
              <div className="flex items-center gap-3 mb-4">
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt="Profile"
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-medium text-sm">
                      {getUserDisplayName().charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-white font-medium text-sm truncate">
                    {getUserDisplayName()}
                  </div>
                  <div className="text-gray-400 text-xs truncate">
                    {profile?.email || user.email}
                  </div>
                </div>
              </div>
            </div>

            {/* Personal Settings Tabs */}
            <div className="space-y-1 mb-4">
              <button
                onClick={() => {
                  setActivePersonalTab('profile');
                  setActiveOrgTab(null);
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activePersonalTab === 'profile'
                    ? 'bg-gray-700 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                }`}
              >
                <User className="w-4 h-4" />
                Profile settings
              </button>
              <button
                onClick={() => {
                  setActivePersonalTab('preferences');
                  setActiveOrgTab(null);
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activePersonalTab === 'preferences'
                    ? 'bg-gray-700 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                }`}
              >
                <SettingsIcon className="w-4 h-4" />
                Preferences
              </button>
            </div>

            {/* Divider */}
            <hr className="border-gray-700 my-4" />

            {/* Organization Settings Section */}
            <div className="mb-2">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider px-3 mb-2">
                Organisation settings
              </p>
            </div>

            <div className="space-y-1">
              <button
                onClick={() => {
                  setActiveOrgTab('overview');
                  setActivePersonalTab(null);
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeOrgTab === 'overview'
                    ? 'bg-gray-700 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                }`}
              >
                <Eye className="w-4 h-4" />
                Overview
              </button>
              {isAdmin && (
                <button
                  onClick={() => {
                    setActiveOrgTab('settings');
                    setActivePersonalTab(null);
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeOrgTab === 'settings'
                      ? 'bg-gray-700 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                  }`}
                >
                  <SettingsIcon className="w-4 h-4" />
                  Settings
                </button>
              )}
              {isAdmin && (
                <button
                  onClick={() => {
                    setActiveOrgTab('members');
                    setActivePersonalTab(null);
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeOrgTab === 'members'
                      ? 'bg-gray-700 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  Members
                </button>
              )}
              <button
                onClick={() => {
                  setActiveOrgTab('billing');
                  setActivePersonalTab(null);
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeOrgTab === 'billing'
                    ? 'bg-gray-700 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                Billing
              </button>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 min-w-0">
            {/* Personal Settings Content */}
            {activePersonalTab === 'profile' && (
              <div className="space-y-6">
                <div className="bg-gray-800 rounded-lg p-6">
                  <h2 className="text-lg font-semibold text-white mb-4">Profile Information</h2>
                  
                  {/* Profile Picture */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Profile Picture
                    </label>
                    <ProfileImageUploader
                      currentImageUrl={profileImageUrl}
                      onImageUploaded={setProfileImageUrl}
                      className="w-24 h-24"
                    />
                  </div>

                  {/* Name Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        First Name
                      </label>
                      <input
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                        placeholder="Enter your first name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Last Name
                      </label>
                      <input
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                        placeholder="Enter your last name"
                      />
                    </div>
                  </div>

                  {/* Email (Read-only) */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={profile?.email || ''}
                      disabled
                      className="w-full bg-gray-600 border border-gray-500 rounded-lg px-3 py-2 text-gray-400 cursor-not-allowed"
                    />
                    <p className="text-xs text-gray-500 mt-1">Email address cannot be changed</p>
                  </div>

                  {/* Phone Number */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Phone Number (Optional)
                    </label>
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                      placeholder="Enter your phone number"
                    />
                  </div>

                  {/* Location */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Location (Optional)
                    </label>
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                      placeholder="Enter your location"
                    />
                  </div>

                  {/* Save Button */}
                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full md:w-auto"
                  >
                    {saving ? (
                      <>
                        <Spinner size="sm" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {activePersonalTab === 'preferences' && (
              <div className="space-y-6">
                <div className="bg-gray-800 rounded-lg p-6">
                  <h2 className="text-lg font-semibold text-white mb-4">Preferences</h2>
                  
                  {/* Layout Preference */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Layout Type
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setLayoutPreference('simple')}
                        className={`p-4 rounded-lg border-2 transition-all text-left ${
                          layoutPreference === 'simple'
                            ? 'border-blue-500 bg-blue-900/20'
                            : 'border-gray-600 bg-gray-700 hover:border-gray-500'
                        }`}
                      >
                        <div className="font-medium text-white text-sm mb-1">Simple</div>
                        <div className="text-xs text-gray-400">Clean, minimal interface</div>
                      </button>
                      <button
                        onClick={() => setLayoutPreference('detailed')}
                        className={`p-4 rounded-lg border-2 transition-all text-left ${
                          layoutPreference === 'detailed'
                            ? 'border-blue-500 bg-blue-900/20'
                            : 'border-gray-600 bg-gray-700 hover:border-gray-500'
                        }`}
                      >
                        <div className="font-medium text-white text-sm mb-1">Detailed</div>
                        <div className="text-xs text-gray-400">More information visible</div>
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Changes will be saved automatically when you save your profile.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Organization Settings Content */}
            {activeOrgTab === 'overview' && (
              <div className="space-y-6">
                <div className="bg-gray-800 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold text-white">Your Organizations</h2>
                    <Button
                      onClick={() => {
                        setShowCreateOrg(true);
                        setOrgName('');
                        setOrgImageUrl(null);
                      }}
                      variant="secondary"
                      size="sm"
                    >
                      <Plus className="w-4 h-4" />
                      Create New Organization
                    </Button>
                  </div>

                  {userOrganizations.length === 0 && !showCreateOrg && (
                    <div className="text-center py-8">
                      <p className="text-gray-400 mb-4">You don't belong to any organizations yet.</p>
                      <Button
                        onClick={() => {
                          setShowCreateOrg(true);
                          setOrgName('');
                          setOrgImageUrl(null);
                        }}
                      >
                        <Plus className="w-4 h-4" />
                        Create Your First Organization
                      </Button>
                    </div>
                  )}

                  {userOrganizations.length > 0 && (
                    <div className="space-y-3">
                      {userOrganizations.map((userOrg) => {
                        const isSelected = selectedOrgId === userOrg.organization.id;
                        return (
                          <div
                            key={userOrg.organization.id}
                            className={`p-4 rounded-lg border-2 transition-colors ${
                              isSelected
                                ? 'border-blue-500 bg-blue-900/20'
                                : 'border-gray-700 bg-gray-700/50 hover:border-gray-600'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3 flex-1">
                                {userOrg.organization.image_url ? (
                                  <img
                                    src={userOrg.organization.image_url}
                                    alt={userOrg.organization.name}
                                    className="w-10 h-10 rounded-lg object-cover"
                                  />
                                ) : (
                                  <div className="w-10 h-10 rounded-lg bg-gray-600 flex items-center justify-center">
                                    <Building2 className="w-5 h-5 text-gray-400" />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <h3 className="text-white font-medium truncate">{userOrg.organization.name}</h3>
                                  <p className="text-sm text-gray-400">{userOrg.role}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {isSelected && (
                                  <span className="text-xs text-blue-400 font-medium">Selected</span>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleLeaveOrganization(userOrg.organization.id, userOrg.organization.name);
                                  }}
                                  disabled={leavingOrgId === userOrg.organization.id || userOrganizations.length <= 1}
                                  className="text-red-400 hover:text-red-300"
                                  title={userOrganizations.length <= 1 ? 'You must belong to at least one organization' : 'Leave organization'}
                                >
                                  {leavingOrgId === userOrg.organization.id ? (
                                    <Spinner size="sm" />
                                  ) : (
                                    <LogOut className="w-4 h-4" />
                                  )}
                                </Button>
                                {!isSelected && (
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => handleSelectOrganization(userOrg.organization.id)}
                                  >
                                    Select
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Create Organization Form */}
                {showCreateOrg && (
                  <div className="bg-gray-800 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-semibold text-white">Create New Organization</h2>
                      <IconButton
                        variant="ghost"
                        size="sm"
                        icon={X}
                        onClick={() => {
                          setShowCreateOrg(false);
                          setOrgName('');
                          setOrgImageUrl(null);
                        }}
                      />
                    </div>
                    
                    <p className="text-gray-400 mb-6">
                      Create an organization to start collaborating with your team. You'll be the administrator and can invite others later.
                    </p>
                    
                    {/* Organization Logo */}
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Organization Logo (Optional)
                      </label>
                      <OrganizationImageUploader
                        currentImageUrl={orgImageUrl}
                        onImageUploaded={setOrgImageUrl}
                        className="w-32 h-32"
                      />
                    </div>

                    {/* Organization Name */}
                    <div className="mb-6">
                      <Input
                        label="Organization Name"
                        value={orgName}
                        onChange={(e) => setOrgName(e.target.value)}
                        placeholder="Enter organization name"
                        required
                      />
                    </div>

                    {/* Create Button */}
                    <div className="flex gap-3">
                      <Button
                        onClick={handleCreateOrganization}
                        disabled={savingOrg || !orgName.trim()}
                        className="w-full md:w-auto"
                      >
                        {savingOrg ? (
                          <>
                            <Spinner size="sm" />
                            Creating...
                          </>
                        ) : (
                          <>
                            <Plus className="w-4 h-4" />
                            Create Organization
                          </>
                        )}
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setShowCreateOrg(false);
                          setOrgName('');
                          setOrgImageUrl(null);
                        }}
                        disabled={savingOrg}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeOrgTab === 'settings' && isAdmin && selectedOrganization && (
              <div className="space-y-6">
                <div className="bg-gray-800 rounded-lg p-6">
                  <h2 className="text-lg font-semibold text-white mb-4">Organization Settings</h2>
                  
                  {/* Organization Logo */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Organization Logo
                    </label>
                    <OrganizationImageUploader
                      currentImageUrl={orgImageUrl}
                      onImageUploaded={setOrgImageUrl}
                      className="w-32 h-32"
                    />
                  </div>

                  {/* Organization Name */}
                  <div className="mb-6">
                    <Input
                      label="Organization Name"
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      placeholder="Enter organization name"
                      required
                    />
                  </div>

                  {/* Save Button */}
                  <Button
                    onClick={handleSaveOrganization}
                    disabled={savingOrg || !orgName.trim()}
                    className="w-full md:w-auto"
                  >
                    {savingOrg ? (
                      <>
                        <Spinner size="sm" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Save Changes
                      </>
                    )}
                  </Button>

                  {/* Leave Organization */}
                  <div className="mt-8 pt-6 border-t border-gray-700">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-white font-medium">Leave Organization</h3>
                        <p className="text-gray-400 text-sm mt-1">Leave this organization and lose access to all its content</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => selectedOrganization && handleLeaveOrganization(selectedOrganization.id, selectedOrganization.name)}
                        disabled={leavingOrgId === selectedOrganization?.id || userOrganizations.length <= 1}
                        className="text-red-400 hover:text-red-300"
                      >
                        {leavingOrgId === selectedOrganization?.id ? (
                          <Spinner size="sm" />
                        ) : (
                          <>
                            <LogOut className="w-4 h-4" />
                            Leave
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeOrgTab === 'members' && isAdmin && selectedOrganization && user && (
              <OrganizationMembers 
                organizationId={selectedOrganization.id}
                organizationName={selectedOrganization.name}
                currentUserId={user.id}
              />
            )}

            {activeOrgTab === 'billing' && (
              <div className="space-y-6">
                <div className="bg-gray-800 rounded-lg p-6">
                  <h2 className="text-lg font-semibold text-white mb-4">Billing</h2>
                  <p className="text-gray-400">Billing features will be available soon.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}