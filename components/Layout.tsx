import React, { useState, useEffect } from 'react';
import GlobalNavigation from './GlobalNavigation';
import SimpleLayout from './SimpleLayout';
import AddArtistForm from './AddArtistForm';
import NewReleaseForm from './NewReleaseForm';
import CommandBar from './command-dock/CommandBar';
import { supabase } from '../lib/supabase';
import Spinner from './Spinner';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [layoutPreference, setLayoutPreference] = useState<string>('simple');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLayoutPreference = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        const { data: profileData, error } = await supabase
          .from('user_profiles')
          .select('layout_preference')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error fetching layout preference:', error);
        } else {
          setLayoutPreference(profileData?.layout_preference || 'simple');
        }
      } catch (error) {
        console.error('Error fetching layout preference:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLayoutPreference();

    // Listen for preference changes
    const handlePreferenceChange = () => {
      fetchLayoutPreference();
    };
    window.addEventListener('layoutPreferenceChanged', handlePreferenceChange);

    return () => {
      window.removeEventListener('layoutPreferenceChanged', handlePreferenceChange);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-900">
        <div className="flex-1 flex items-center justify-center">
          <Spinner size="lg" />
        </div>
      </div>
    );
  }

  // Render SimpleLayout as default (simple navigation at top)
  if (layoutPreference === 'simple') {
    return <SimpleLayout>{children}</SimpleLayout>;
  }

  // Render GlobalNavigation (complex sidebar layout) if preference is 'complex'
  return <GlobalNavigationLayout>{children}</GlobalNavigationLayout>;
}

// Separate component for the complex navigation layout
function GlobalNavigationLayout({ children }: { children: React.ReactNode }) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showReleaseModal, setShowReleaseModal] = useState(false);
  const [preselectedArtistId, setPreselectedArtistId] = useState<string | undefined>(undefined);

  const handleNewArtist = () => {
    setShowAddModal(true);
  };

  const handleNewRelease = (artistId?: string) => {
    setPreselectedArtistId(artistId);
    setShowReleaseModal(true);
  };

  const handleArtistCreated = () => {
    setShowAddModal(false);
    window.location.reload();
  };

  return (
    <div className="flex h-screen bg-gray-900 overflow-x-hidden">
      <GlobalNavigation 
        onNewArtist={handleNewArtist} 
        onNewRelease={() => handleNewRelease()} 
      />
      {/* Main Content */}
      <div className="flex-1 overflow-auto overflow-x-hidden" style={{ marginLeft: '272px' }}>
        <div className="py-8 relative overflow-x-hidden" style={{ paddingLeft: '80px', paddingRight: '80px', zIndex: 1 }}>
          {children}
        </div>
      </div>
      {/* Command Bar - floating at bottom center */}
      {/* <CommandBar /> */}
      {/* Add Artist Modal */}
      {showAddModal && (
        <AddArtistForm
          onClose={() => setShowAddModal(false)}
          onArtistCreated={handleArtistCreated}
        />
      )}
      {/* New Release Modal */}
      {showReleaseModal && (
        <NewReleaseForm
          isOpen={showReleaseModal}
          onClose={() => setShowReleaseModal(false)}
          preselectedArtistId={preselectedArtistId}
        />
      )}
    </div>
  );
}