import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';
import { useOrganization } from '../lib/OrganizationContext';
import NotificationMenu from './NotificationMenu';
import Modal from './overlay/Modal';
import AddArtistForm from './AddArtistForm';
import NewReleaseForm from './NewReleaseForm';
import { Building2, Bell, Check, LogOut, Settings, ArrowLeft, ChevronRight, Upload, MoreHorizontal, Circle, CircleDashed, CircleCheck, Copy, Trash2, Music } from 'lucide-react';

interface UserProfile {
  first_name?: string;
  last_name?: string;
  avatar_url?: string | null;
}

interface SimpleNavigationProps {
  isScrolled: boolean;
}

export default function SimpleNavigation({ isScrolled }: SimpleNavigationProps) {
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const { selectedOrganization, allOrganizations, setSelectedOrganization, loading: orgLoading } = useOrganization();
  const [showOrgMenu, setShowOrgMenu] = useState(false);
  const [showNotificationMenu, setShowNotificationMenu] = useState(false);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [activeModal, setActiveModal] = useState<'artist' | 'release' | null>(null);
  const [layoutPreference, setLayoutPreference] = useState<string>('simple');
  const [deliverableData, setDeliverableData] = useState<{ releaseTitle: string; deliverableName: string; releaseId: string; status: string; deliverableId: string; coverUrl?: string | null } | null>(null);
  const [showDeliverableMenu, setShowDeliverableMenu] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      if (user) {
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
    fetchUnreadNotificationCount();
    const handleRefreshNotificationCount = () => {
      fetchUnreadNotificationCount();
    };
    window.addEventListener('refreshNotificationCount', handleRefreshNotificationCount);
    return () => {
      window.removeEventListener('refreshNotificationCount', handleRefreshNotificationCount);
    };
  }, []);

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

  // Detect if we're on home page
  const isHomePage = router.pathname === '/home';
  
  // Generate breadcrumbs based on path
  const getBreadcrumbs = () => {
    const path = router.pathname;
    const pathSegments = path.split('/').filter(Boolean);
    
    if (isHomePage || pathSegments.length === 0) {
      return null;
    }

    const breadcrumbs = [];
    
    // First segment is always the category
    const firstSegment = pathSegments[0];
    
    // Check if we're on a listing page (no ID segment) or detail page (has ID segment)
    if (firstSegment === 'artists') {
      if (pathSegments.length === 1) {
        // Listing page: Artists
        return [{ label: 'Artists', href: '/home' }];
      } else {
        // Detail page: Artists > Artist Name
        breadcrumbs.push({ label: 'Artists', href: '/artists' });
        breadcrumbs.push({ label: 'Artist', href: router.asPath });
      }
    } else if (firstSegment === 'releases') {
      if (pathSegments.length === 1) {
        // Listing page: Releases
        return [{ label: 'Releases', href: '/home' }];
      } else {
        // Detail page: Releases > Release Name
        breadcrumbs.push({ label: 'Releases', href: '/releases' });
        breadcrumbs.push({ label: 'Release', href: router.asPath });
      }
    } else if (firstSegment === 'calendar') {
      breadcrumbs.push({ label: 'Calendar', href: '/home' });
    } else if (firstSegment === 'settings') {
      breadcrumbs.push({ label: 'Settings', href: '/home' });
    }

    return breadcrumbs.length > 0 ? breadcrumbs : null;
  };

  const breadcrumbs = getBreadcrumbs();
  const isReleaseDetailPage = router.pathname.startsWith('/releases/') && router.query.id;
  const isArtistDetailPage = router.pathname.startsWith('/artists/') && router.query.id;
  const isDeliverableDetailPage = router.pathname.startsWith('/deliverables/') && router.query.id;
  const showBackButton = !isHomePage && (breadcrumbs || isDeliverableDetailPage);
  const buttonBgClass = (isReleaseDetailPage || isArtistDetailPage || isDeliverableDetailPage) ? 'bg-white/20 backdrop-blur-md' : 'bg-gray-700/90 backdrop-blur-md';

  // Fetch deliverable data when on deliverable detail page
  useEffect(() => {
    if (isDeliverableDetailPage && router.query.id) {
      const fetchDeliverableData = async () => {
        try {
          const { data, error } = await supabase
            .from('deliverables')
            .select(`
              id,
              name,
              status,
              release_id,
              releases!deliverables_release_id_fkey (
                title,
                cover_url
              )
            `)
            .eq('id', router.query.id)
            .single();

          if (!error && data) {
            const release = Array.isArray(data.releases) ? data.releases[0] : data.releases;
            setDeliverableData({
              releaseTitle: release?.title || 'Release',
              deliverableName: data.name,
              releaseId: data.release_id,
              status: data.status || 'not_started',
              deliverableId: data.id,
              coverUrl: release?.cover_url || null
            });
          }
        } catch (error) {
          console.error('Error fetching deliverable data:', error);
        }
      };
      fetchDeliverableData();
    } else {
      setDeliverableData(null);
    }
  }, [isDeliverableDetailPage, router.query.id]);

  return (
    <div className="fixed top-0 left-0 right-0 w-full z-40 bg-transparent" style={{ paddingLeft: '24px', paddingRight: '24px', paddingTop: '20px', paddingBottom: '20px' }}>
      <div className="flex items-center justify-between">
        {/* Organization Button */}
        <div className="relative flex items-center gap-[12px]">
          {/* Back Button */}
          {showBackButton && (
            <button
              onClick={() => {
                // If on a deliverable detail page, go to release page
                const path = router.pathname;
                if (isDeliverableDetailPage && deliverableData) {
                  router.push(`/releases/${deliverableData.releaseId}`);
                } else if (path.startsWith('/releases/') && router.query.id) {
                  router.push('/home');
                } else if (breadcrumbs && breadcrumbs[0].href) {
                  router.push(breadcrumbs[0].href);
                } else {
                  router.push('/home');
                }
              }}
              className={`flex items-center justify-center rounded-lg transition-all duration-75 cursor-pointer p-2 ${buttonBgClass} opacity-80 hover:opacity-100`}
            >
              <div className="w-5 h-5 flex items-center justify-center">
                <ArrowLeft className="h-4 w-4 text-white" />
              </div>
            </button>
          )}
          <button
            onClick={handleOrgMenuClick}
            className={`flex items-center rounded-lg text-sm font-medium transition-all duration-75 cursor-pointer ${
              isHomePage ? 'gap-3 px-3 py-2' : 'gap-1.5 p-2'
            } text-white ${buttonBgClass} ${
              showOrgMenu
                ? 'opacity-100'
                : 'opacity-80 hover:opacity-100'
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
            {isHomePage && (
              <span className="truncate min-w-0">
                {orgLoading ? 'Loading...' : selectedOrganization?.name || 'Workspace'}
              </span>
            )}
            <svg 
              className={`w-3 h-3 transition-transform flex-shrink-0 ${showOrgMenu ? 'rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {/* Organization Dropdown */}
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
                            <div className="w-4 h-4 text-gray-300 text-xs font-medium">
                              {userProfile?.first_name?.[0] || user.email?.[0] || '?'}
                            </div>
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

        {/* Breadcrumbs for Deliverable Detail Page */}
        {isDeliverableDetailPage && deliverableData && (
          <div className="flex items-center gap-[12px] flex-1 ml-[12px]">
            <button
              onClick={() => router.push(`/releases/${deliverableData.releaseId}`)}
              className="flex items-center gap-2 text-gray-300 hover:text-white hover:bg-gray-800 p-2 rounded-lg transition-colors cursor-pointer text-sm font-medium bg-gray-900 opacity-80 hover:opacity-100"
            >
              {deliverableData.coverUrl ? (
                <img
                  src={deliverableData.coverUrl}
                  alt={deliverableData.releaseTitle}
                  className="w-5 h-5 rounded-sm object-cover"
                />
              ) : (
                <div className="w-5 h-5 bg-gray-600 rounded-sm flex items-center justify-center">
                  <Music className="w-3 h-3 text-gray-400" />
                </div>
              )}
              <span>{deliverableData.releaseTitle}</span>
            </button>
            <ChevronRight className="w-4 h-4 text-gray-500" />
            <div className="flex items-center gap-1">
              {(() => {
                switch (deliverableData.status) {
                  case 'not_started':
                    return <Circle className="w-3 h-3 text-yellow-400" />;
                  case 'in_progress':
                    return <CircleDashed className="w-3 h-3 text-blue-400" />;
                  case 'completed':
                  case 'final':
                    return <CircleCheck className="w-3 h-3 text-green-400" />;
                  default:
                    return <Circle className="w-3 h-3 text-yellow-400" />;
                }
              })()}
              <span className="text-white text-sm font-medium">{deliverableData.deliverableName}</span>
            </div>
            <div className="relative ml-1">
              <button
                onClick={() => setShowDeliverableMenu(!showDeliverableMenu)}
                className={`flex items-center justify-center rounded-lg transition-all duration-75 cursor-pointer p-2 bg-gray-900 hover:bg-gray-800 opacity-80 hover:opacity-100 shadow-sm`}
              >
                <MoreHorizontal className="w-4 h-4 text-white" />
              </button>
              {showDeliverableMenu && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowDeliverableMenu(false)}
                  />
                  <div className="absolute top-full right-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-50 p-2">
                    <button
                      onClick={() => {
                        setShowDeliverableMenu(false);
                        router.push(`/deliverables/${deliverableData.deliverableId}/edit`);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 text-sm text-white hover:bg-gray-700 transition-colors duration-75 rounded-lg cursor-pointer"
                    >
                      <Settings className="w-4 h-4" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowDeliverableMenu(false);
                        // Duplicate functionality
                        window.dispatchEvent(new CustomEvent('duplicateDeliverable', { detail: { deliverableId: deliverableData.deliverableId } }));
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 text-sm text-white hover:bg-gray-700 transition-colors duration-75 rounded-lg cursor-pointer"
                    >
                      <Copy className="w-4 h-4" />
                      <span>Duplicate</span>
                    </button>
                    <div className="border-t border-gray-700 my-2" />
                    <button
                      onClick={() => {
                        setShowDeliverableMenu(false);
                        window.dispatchEvent(new CustomEvent('deleteDeliverable', { detail: { deliverableId: deliverableData.deliverableId } }));
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:bg-gray-700 transition-colors duration-75 rounded-lg cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Delete</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Upload Button - Only show on deliverable detail page */}
        {isDeliverableDetailPage && (
          <div className="relative">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                // Trigger file upload in deliverable page
                const event = new CustomEvent('triggerFileUpload', { bubbles: true, cancelable: true });
                window.dispatchEvent(event);
              }}
              className="inline-flex items-center justify-center font-semibold rounded-md transition-all duration-normal focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 cursor-pointer bg-white hover:bg-gray-100 active:bg-gray-200 text-gray-900 focus-visible:ring-gray-500 shadow-sm h-8 px-3 text-sm gap-1.5"
            >
              <Upload className="w-4 h-4" />
              <span>Upload</span>
            </button>
          </div>
        )}

        {/* Notification Button */}
        <div className="relative ml-[12px]">
          <button
            onClick={() => setShowNotificationMenu(!showNotificationMenu)}
            className={`flex items-center justify-center rounded-lg transition-all duration-75 cursor-pointer p-2 ${buttonBgClass} ${
              showNotificationMenu
                ? 'opacity-100'
                : 'opacity-80 hover:opacity-100'
            }`}
          >
            <div className="w-5 h-5 flex items-center justify-center">
              <Bell className="h-4 w-4 text-white" />
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
      </div>

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
  );
}
