import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';
import { getAccessibleReleases } from '../lib/accessControl';
import { useOrganization } from '../lib/OrganizationContext';
import Spinner from './Spinner';
import Tooltip from './Tooltip';
import NotificationMenu from './NotificationMenu';
import { commands } from './command-dock/commandRegistry';
import AddArtistForm from './AddArtistForm';
import NewReleaseForm from './NewReleaseForm';
import Modal from './overlay/Modal';
import { Home, Users, Disc3, Calendar, User, Bell, Building2, Check, Settings, LogOut, Plus, Command } from 'lucide-react';

interface GlobalNavigationProps {
  onNewArtist: () => void;
  onNewRelease: () => void;
}

interface Release {
  id: string;
  title: string;
  cover_url?: string | null;
  artists?: Array<{ id: string; name: string; }>;
}

interface Organization {
  id: string;
  name: string;
  image_url?: string | null;
}

interface UserProfile {
  first_name?: string;
  last_name?: string;
  avatar_url?: string | null;
}

export default function GlobalNavigation({ onNewArtist, onNewRelease }: GlobalNavigationProps) {
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const { selectedOrganization, allOrganizations, setSelectedOrganization, loading: orgLoading } = useOrganization();
  const [showOrgMenu, setShowOrgMenu] = useState(false);
  const [showNotificationMenu, setShowNotificationMenu] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [activeModal, setActiveModal] = useState<'artist' | 'release' | null>(null);
  const [layoutPreference, setLayoutPreference] = useState<string>('simple');
  const addMenuRef = useRef<HTMLDivElement>(null);
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const [releases, setReleases] = useState<Release[]>([]);
  const [releasesLoading, setReleasesLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      if (user) {
        // Fetch user profile
        const { data: profileData, error: profileError } = await supabase
          .from('user_profiles')
          .select('first_name, last_name, avatar_url, layout_preference')
          .eq('id', user.id)
          .single();
        
        if (profileError) {
          console.error('Error fetching user profile:', profileError);
        } else {
          setUserProfile(profileData);
          setLayoutPreference(profileData?.layout_preference || 'simple');
        }
      }
    };
    getUser();
  }, []);

  useEffect(() => {
    const fetchReleases = async () => {
      try {
        const accessibleReleases = await getAccessibleReleases();
        setReleases(accessibleReleases);
      } catch (error) {
        console.error('Error fetching accessible releases:', error);
        setReleases([]);
      }
      setReleasesLoading(false);
    };

    fetchReleases();
    
    // Re-fetch releases when organization changes
    const handleOrgChange = () => {
      setReleasesLoading(true);
      fetchReleases();
    };
    
    window.addEventListener('organizationChanged', handleOrgChange);
    return () => {
      window.removeEventListener('organizationChanged', handleOrgChange);
    };
  }, [selectedOrganization]);

  // Function to fetch unread notification count
  const fetchUnreadNotificationCount = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false);

      if (error) {
        console.error('Error fetching unread notification count:', error);
        return;
      }

      setUnreadNotificationCount(count || 0);
    } catch (error) {
      console.error('Error fetching unread notification count:', error);
    }
  };

  useEffect(() => {
    // Initial fetch of notification count
    fetchUnreadNotificationCount();

    // Listen for manual refresh events
    const handleRefreshNotificationCount = () => {
      fetchUnreadNotificationCount();
    };

    window.addEventListener('refreshNotificationCount', handleRefreshNotificationCount);

    return () => {
      window.removeEventListener('refreshNotificationCount', handleRefreshNotificationCount);
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const handleOrgMenuClick = () => {
    setShowOrgMenu(!showOrgMenu);
  };

  const handleLayoutPreferenceToggle = async () => {
    const newPreference = layoutPreference === 'simple' ? 'complex' : 'simple';
    const previousPreference = layoutPreference;
    setLayoutPreference(newPreference);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('user_profiles')
        .update({ layout_preference: newPreference })
        .eq('id', user.id);

      if (error) {
        console.error('Error updating layout preference:', error);
        setLayoutPreference(previousPreference);
        return;
      }
      
      window.dispatchEvent(new Event('layoutPreferenceChanged'));
    } catch (error) {
      console.error('Error saving layout preference:', error);
      setLayoutPreference(previousPreference);
    }
  };

  // Get action commands (create, upload, etc. - not navigation)
  const actionCommands = commands.filter(cmd => 
    cmd.id.startsWith('create:') || cmd.id.startsWith('upload:') || cmd.id.startsWith('add:')
  );

  // Handle action menu item click
  const handleAddActionClick = async (command: typeof commands[0]) => {
    setShowAddMenu(false);
    
    // Special handling for create commands - open modals
    if (command.id === 'create:artist') {
      setActiveModal('artist');
      return;
    }
    
    if (command.id === 'create:release') {
      setActiveModal('release');
      return;
    }

    // For other commands, execute normally
    try {
      const context = {
        router,
        artistId: undefined,
        releaseId: undefined,
        organizationId: selectedOrganization?.id,
        route: router.pathname,
      };
      const resultData = await command.run('', context);
      // You might want to show a toast here
    } catch (err) {
      console.error('Command execution error:', err);
    }
  };

  // Click outside handler for Add menu
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const clickedInButton = addButtonRef.current && addButtonRef.current.contains(target);
      const clickedInMenu = addMenuRef.current && addMenuRef.current.contains(target);
      
      if (!clickedInButton && !clickedInMenu) {
        setShowAddMenu(false);
      }
    };

    if (showAddMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showAddMenu]);

  // Check if current route is a release detail page
  const isReleaseDetailPage = router.pathname.startsWith('/releases/') && router.query.id;
  const currentReleaseId = isReleaseDetailPage ? router.query.id as string : null;

  return (
    <div className="fixed top-0 left-0 z-[60] bg-gray-800 overflow-hidden shadow-lg" style={{ height: '100vh' }}>
      <div className="w-[272px] bg-gray-800 h-full flex flex-col">
      {/* Top Section with Organization and Notification */}
      <div className="p-4 pb-2">
        <div className="flex gap-0 items-center">
          {/* Organization Button */}
          <div className="relative min-w-0 flex-1 max-w-full">
            <button
              onClick={handleOrgMenuClick}
              className={`text-left rounded-lg text-sm font-medium transition-colors duration-75 cursor-pointer flex items-center pl-2 pr-3 h-8 gap-3 text-white max-w-full bg-gray-700/90 backdrop-blur-md ${
                showOrgMenu
                  ? 'opacity-100'
                  : 'hover:opacity-80'
              }`}
            >
              <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                {orgLoading ? (
                  <div className="w-5 h-5 bg-gray-700 rounded-md animate-pulse" />
                ) : selectedOrganization?.image_url ? (
                  <img
                    src={selectedOrganization.image_url}
                    alt={selectedOrganization.name || 'Organization'}
                    className="w-5 h-5 rounded-md object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                ) : null}
                {!orgLoading && (
                  <div className={`w-5 h-5 bg-gray-600 rounded-md flex items-center justify-center ${selectedOrganization?.image_url ? 'hidden' : ''}`}>
                    {selectedOrganization?.name ? (
                      <span className="text-[10px] text-gray-300 font-medium">
                        {selectedOrganization.name.charAt(0).toUpperCase()}
                      </span>
                    ) : (
                      <Building2 className="h-3 w-3 text-gray-300" />
                    )}
                  </div>
                )}
              </div>
              <span className="truncate min-w-0">
                {orgLoading ? 'Loading...' : selectedOrganization?.name || 'Workspace'}
              </span>
              <svg 
                className={`w-3 h-3 transition-transform flex-shrink-0 -ml-2 ${showOrgMenu ? 'rotate-180' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {/* Custom Organization Dropdown */}
            {showOrgMenu && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowOrgMenu(false)}
                />
                <div className="absolute top-full left-0 mt-2 w-[232px] bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-50 p-2">
                  {/* User Profile Section */}
                  {user && (
                    <>
                      <div className="px-3 py-2 mb-2">
                        <div className="flex items-center gap-3">
                          <div className="flex-shrink-0">
                            {userProfile?.avatar_url ? (
                              <img
                                src={userProfile.avatar_url}
                                alt="Profile"
                                className="w-6 h-6 rounded-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              e.currentTarget.nextElementSibling?.classList.remove('hidden');
                            }}
                              />
                            ) : null}
                            <div className={`w-6 h-6 bg-gray-600 rounded-full flex items-center justify-center ${userProfile?.avatar_url ? 'hidden' : ''}`}>
                              <User className="w-4 h-4 text-gray-300" />
                            </div>
                          </div>
                          <div className="flex-1 overflow-hidden">
                            {userProfile?.first_name || userProfile?.last_name ? (
                              <div className="font-medium text-sm text-white truncate">
                                {userProfile.first_name} {userProfile.last_name}
                              </div>
                            ) : null}
                            <div className="text-xs text-gray-400 truncate">
                              {user.email}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="border-t border-gray-700 mb-2" />
                    </>
                  )}
                  
                  {/* Organizations Section */}
                  {allOrganizations.length > 0 && (
                    <>
                      <div className="px-3 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Organizations
                      </div>
                      {allOrganizations.map((org) => (
                        <button
                          key={org.id}
                          onClick={() => {
                            setSelectedOrganization(org);
                            setShowOrgMenu(false);
                            // Redirect to home page to avoid staying on pages that don't belong to the new organization
                            router.push('/home');
                          }}
                          className="w-full flex items-center justify-between px-3 py-2 text-sm text-white hover:bg-gray-700 transition-colors duration-75 rounded-lg cursor-pointer"
                        >
                          <div className="flex items-center gap-3 flex-1 overflow-hidden">
                            <div className="flex-shrink-0">
                              {org.image_url ? (
                                <img
                                  src={org.image_url}
                                  alt={org.name}
                                  className="w-5 h-5 rounded-md object-cover"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                  }}
                                />
                              ) : null}
                              <div className={`w-5 h-5 bg-gray-600 rounded-md flex items-center justify-center ${org.image_url ? 'hidden' : ''}`}>
                                <span className="text-xs text-gray-300 font-medium">
                                  {org.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            </div>
                            <span className="truncate">{org.name}</span>
                          </div>
                          {selectedOrganization?.id === org.id && (
                            <Check className="w-4 h-4 text-blue-400 flex-shrink-0" />
                          )}
                        </button>
                      ))}
                      <div className="my-2 border-t border-gray-700" />
                    </>
                  )}
                  
                  {/* Simplified UI Toggle */}
                  <div className="px-3 py-2 mb-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-white">Simplified UI</span>
                      <button
                        onClick={handleLayoutPreferenceToggle}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-800 ${
                          layoutPreference === 'simple' ? 'bg-blue-500' : 'bg-gray-600'
                        }`}
                        role="switch"
                        aria-checked={layoutPreference === 'simple'}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            layoutPreference === 'simple' ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                  <div className="border-t border-gray-700 mb-2" />
                  
                  {/* Settings and Logout */}
                  <button
                    onClick={() => {
                      setShowOrgMenu(false);
                      router.push('/settings');
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-white hover:bg-gray-700 transition-colors duration-75 rounded-lg cursor-pointer"
                  >
                    <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
                      <Settings className="w-4 h-4" />
                    </div>
                    <span>Settings</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowOrgMenu(false);
                      handleLogout();
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-white hover:bg-gray-700 transition-colors duration-75 rounded-lg cursor-pointer"
                  >
                    <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
                      <LogOut className="w-4 h-4" />
                    </div>
                    <span>Logout</span>
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Notification Button */}
          <div className="relative flex-shrink-0 ml-1">
            <button
              onClick={() => {
                setShowNotificationMenu(!showNotificationMenu);
                setShowAddMenu(false); // Close add menu when opening notification menu
              }}
              className={`flex items-center justify-center rounded-lg transition-colors duration-75 cursor-pointer px-1.5 py-1.5 bg-gray-700/90 backdrop-blur-md ${
                showNotificationMenu
                  ? 'text-white opacity-100'
                  : 'text-gray-300 hover:text-white opacity-80 hover:opacity-100'
              }`}
            >
              <div className="w-5 h-5 flex items-center justify-center">
                <Bell className="h-3.5 w-3.5" />
              </div>
              {unreadNotificationCount > 0 && (
                <div className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-medium">
                  {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
                </div>
              )}
            </button>
            
            <NotificationMenu
              isOpen={showNotificationMenu}
              onClose={() => setShowNotificationMenu(false)}
              position="right"
              onNotificationUpdate={fetchUnreadNotificationCount}
            />
          </div>

          {/* Add Button */}
          <div className="relative flex-shrink-0 ml-2">
            <button
              ref={addButtonRef}
              onClick={() => {
                setShowAddMenu(!showAddMenu);
                setShowNotificationMenu(false); // Close notification menu when opening add menu
              }}
              className={`flex items-center justify-center rounded-lg transition-colors duration-75 cursor-pointer px-1.5 py-1.5 shadow-sm ${
                showAddMenu
                  ? 'bg-gray-100 text-gray-900'
                  : 'bg-white text-gray-900 hover:bg-gray-100 active:bg-gray-200'
              }`}
            >
              <div className="w-5 h-5 flex items-center justify-center">
                <Plus className="h-3.5 w-3.5" />
              </div>
            </button>
            
            {/* Add Menu Dropdown */}
            {showAddMenu && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowAddMenu(false)}
                />
                <div ref={addMenuRef} className="absolute top-full right-0 mt-2 w-56 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-50 overflow-hidden">
                  <div className="p-2">
                    <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                      Quick Actions
                    </div>
                    <div className="space-y-1">
                      {actionCommands.map((command) => (
                        <button
                          key={command.id}
                          onClick={() => handleAddActionClick(command)}
                          className="
                            w-full flex items-center gap-3 px-3 py-2.5 text-left
                            rounded-lg transition-colors duration-75 cursor-pointer
                            text-gray-300 hover:bg-gray-700 hover:text-white
                            group
                          "
                        >
                          <div className="flex-shrink-0 w-8 h-8 rounded-md bg-gray-900 flex items-center justify-center">
                            <Command className="w-4 h-4 text-gray-400 group-hover:text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm">{command.title}</div>
                            {command.hint && (
                              <div className="text-xs text-gray-500 truncate">{command.hint}</div>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-4 pt-2 overflow-y-auto" style={{ contentVisibility: 'auto' }}>
        <ul className="space-y-1">
          <li>
            <button
              onClick={() => router.push('/home')}
              className={`text-left rounded-lg text-sm font-medium transition-colors duration-75 cursor-pointer flex items-center w-full px-2 h-8 pr-4 gap-3 ${
                router.pathname === '/home' 
                  ? 'bg-gray-700 text-white' 
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
                <Home className="h-4 w-4" />
              </div>
              Home
            </button>
          </li>

          <li>
            <button
              onClick={() => router.push('/artists')}
              className={`text-left rounded-lg text-sm font-medium transition-colors duration-75 cursor-pointer flex items-center w-full px-2 h-8 pr-4 gap-3 ${
                router.pathname === '/artists' 
                  ? 'bg-gray-700 text-white' 
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
                <Users className="h-4 w-4" />
              </div>
              Artists
            </button>
          </li>
          <li>
            <button
              onClick={() => router.push('/releases')}
              className={`text-left rounded-lg text-sm font-medium transition-colors duration-75 cursor-pointer flex items-center w-full px-2 h-8 pr-4 gap-3 ${
                router.pathname === '/releases'
                  ? 'bg-gray-700 text-white'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
                <Disc3 className="h-4 w-4" />
              </div>
              Releases
            </button>
          </li>
          <li>
            <button
              onClick={() => router.push('/calendar')}
              className={`text-left rounded-lg text-sm font-medium transition-colors duration-75 cursor-pointer flex items-center w-full px-2 h-8 pr-4 gap-3 ${
                router.pathname === '/calendar'
                  ? 'bg-gray-700 text-white'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
                <Calendar className="h-4 w-4" />
              </div>
              Calendar
            </button>
          </li>
        </ul>

        {/* Divider */}
        <div className="border-t border-gray-800 my-4"></div>

        {/* All Releases Section */}
        <div className="mt-6">
          <div className="mb-3 px-2">
            <h3 className="text-xs font-semibold text-gray-400 mb-1">All releases</h3>
          </div>
          {releasesLoading ? (
            <div className="flex items-center justify-center py-4">
              <Spinner size="sm" color="gray" />
            </div>
          ) : releases.length === 0 ? (
            <div className="text-gray-500 text-sm px-2">No releases found</div>
          ) : (
            <ul className="space-y-1">
              {releases.map((release) => {
                const isActive = currentReleaseId === release.id;
                return (
                  <li key={release.id}>
                    <button
                      onClick={() => router.push(`/releases/${release.id}`)}
                      className={`text-left rounded-lg text-sm font-medium transition-colors duration-75 cursor-pointer flex items-center w-full px-2 h-8 pr-4 gap-3 ${
                        isActive
                          ? 'bg-gray-700 text-white'
                          : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                      }`}
                    >
                      {/* Release Cover */}
                      <div className="flex-shrink-0">
                        {release.cover_url ? (
                          <img
                            src={release.cover_url}
                            alt={release.title}
                            className="w-5 h-5 rounded object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              e.currentTarget.nextElementSibling?.classList.remove('hidden');
                            }}
                          />
                        ) : null}
                        <div className={`w-5 h-5 rounded bg-gray-600 flex items-center justify-center ${release.cover_url ? 'hidden' : ''}`}>
                          <Disc3 className="w-3 h-3 text-gray-300" />
                        </div>
                      </div>
                      <span className="truncate">{release.title}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </nav>

      {/* Modals */}
      {activeModal === 'artist' && (
        <Modal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          title="Create Artist"
          size="lg"
        >
          <AddArtistForm
            onClose={() => setActiveModal(null)}
            onArtistCreated={() => {
              setActiveModal(null);
              router.reload();
            }}
          />
        </Modal>
      )}

      <NewReleaseForm
        isOpen={activeModal === 'release'}
        onClose={() => setActiveModal(null)}
        preselectedArtistId={undefined}
        onReleaseCreated={(release) => {
          setActiveModal(null);
          router.reload();
        }}
      />
      </div>
    </div>
  );
} 