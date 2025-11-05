import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import Layout from '../../components/Layout';
import Button from '../../components/Button';
import AuthWrapper from '../../components/AuthWrapper';
import NewReleaseForm from '../../components/NewReleaseForm';
import NewFolderForm from '../../components/NewFolderForm';
import ReleaseCard from '../../components/ReleaseCard';
import FolderCard from '../../components/FolderCard';
import Spinner from '../../components/Spinner';
import Menu from '../../components/Menu';
import ArtistEditForm from '../../components/ArtistEditForm';
import { User, MoreHorizontal, Edit, Trash2, Music, Folder, ChevronDown, Share } from 'lucide-react';
import IconButton from '../../components/IconButton';
import BlurredHeader from '../../components/BlurredHeader';
import ShareAccessModal from '../../components/ShareAccessModal';
import ToastContainer from '../../components/Toast';
import { useToast } from '../../lib/useToast';
import { getAccessibleArtistReleases, getAccessibleArtistFolders, canCurrentUserPerformAction } from '../../lib/accessControl';

interface Artist {
  id: string;
  name: string;
  region: string | null;
  country: string | null;
  image_url?: string | null;
}

interface Release {
  id: string;
  title: string;
  online?: string | null;
  offline?: string | null;
  cover_url?: string | null;
  status?: string | null;
  deliverables?: Array<{
    id: string;
    status: string;
  }>;
}

interface Folder {
  id: string;
  name: string;
  description?: string | null;
  file_count?: number;
}

export default function ArtistDetailPage() {
  const router = useRouter();
  const { id } = router.query;

  const [artist, setArtist] = useState<Artist | null>(null);
  const [loading, setLoading] = useState(true);
  const [showReleaseModal, setShowReleaseModal] = useState(false);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [releases, setReleases] = useState<Release[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [releasesLoading, setReleasesLoading] = useState(true);
  const [foldersLoading, setFoldersLoading] = useState(true);
  const [showArtistMenu, setShowArtistMenu] = useState(false);
  const [showArtistEditForm, setShowArtistEditForm] = useState(false);
  const [showArtistDeleteModal, setShowArtistDeleteModal] = useState(false);
  const [artistDeleteLoading, setArtistDeleteLoading] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [canManageAccess, setCanManageAccess] = useState(false);

  const { toasts, removeToast, success, error } = useToast();

  useEffect(() => {
    if (!id) return;

    const fetchArtist = async () => {
      const { data, error } = await supabase
        .from('artists')
        .select('id, name, region, country, image_url')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching artist:', error);
      } else {
        console.log('Artist data fetched:', data);
        console.log('Artist ID:', data?.id, 'Type:', typeof data?.id);
        setArtist(data);
      }

      setLoading(false);
    };

    fetchArtist();
  }, [id]);

  useEffect(() => {
    if (!id || typeof id !== 'string') return;
    setReleasesLoading(true);
    
    const fetchReleases = async () => {
      try {
        console.log('Fetching accessible releases for artist:', id);
        const accessibleReleases = await getAccessibleArtistReleases(id);
        console.log('Accessible artist releases:', accessibleReleases);
        setReleases(accessibleReleases);
      } catch (error) {
        console.error('Error fetching accessible artist releases:', error);
        setReleases([]);
      } finally {
        setReleasesLoading(false);
      }
    };
    
    fetchReleases();
  }, [id, showReleaseModal]);

  useEffect(() => {
    if (!id || typeof id !== 'string') return;
    setFoldersLoading(true);
    
    const fetchFolders = async () => {
      try {
        console.log('Fetching accessible folders for artist:', id);
        const accessibleFolders = await getAccessibleArtistFolders(id);
        console.log('Accessible artist folders:', accessibleFolders);
        setFolders(accessibleFolders);
      } catch (error) {
        console.error('Error fetching accessible artist folders:', error);
        setFolders([]);
      } finally {
        setFoldersLoading(false);
      }
    };

    fetchFolders();
  }, [id, showFolderModal]);

  useEffect(() => {
    if (!id || typeof id !== 'string') return;
    
    const checkPermissions = async () => {
      const canManage = await canCurrentUserPerformAction('manage_access', 'artist', id);
      setCanManageAccess(canManage);
    };
    
    checkPermissions();
  }, [id]);

  const handleDeleteArtist = async () => {
    if (!artist) return;
    
    setArtistDeleteLoading(true);
    try {
      // Delete the artist (this will cascade delete associated releases and deliverables)
      const { error } = await supabase
        .from('artists')
        .delete()
        .eq('id', artist.id);

      if (error) {
        console.error('Error deleting artist:', error);
        throw new Error('Failed to delete artist');
      }

      // Redirect to artists list
      router.push('/artists');
    } catch (err) {
      console.error('Error deleting artist:', err);
      // You might want to show an error message to the user here
    } finally {
      setArtistDeleteLoading(false);
    }
  };

  if (loading) {
    return (
      <AuthWrapper>
        <Layout>
          <div className="text-white">
            <div className="mb-6">
              <h1 className="text-2xl font-bold">Artist</h1>
            </div>
            <div className="flex items-center justify-center py-12">
              <Spinner size="lg" />
            </div>
          </div>
        </Layout>
      </AuthWrapper>
    );
  }

  if (!artist) {
    return <div className="p-6 text-red-500">Artist not found.</div>;
  }

  return (
    <AuthWrapper>
      <Layout>
        <div className="text-white">
          {/* Artist Header with Blurred Background */}
          <BlurredHeader imageUrl={artist.image_url}>
            <div className="flex items-end space-x-6">
              {/* Artist Image */}
              <div className="flex-shrink-0">
                {artist.image_url ? (
                  <div className="relative w-56 h-56">
                    <Image
                      src={artist.image_url}
                      alt={artist.name}
                      fill
                      className="object-cover rounded-full"
                    />
                  </div>
                ) : (
                  <div className="w-56 h-56 bg-gray-500 rounded-full flex items-center justify-center text-gray-400">
                    <User className="w-28 h-28" />
                  </div>
                )}
              </div>

              {/* Artist Info */}
              <div className="flex-1 flex flex-col justify-end">
                <div className="flex items-end justify-between mb-4">
                  <div className="flex flex-col">
                    <h1 className="text-3xl font-bold mb-2">{artist.name}</h1>
                    
                    {(artist.region || artist.country) && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400">Location: </span>
                        <span className="text-sm text-gray-300">
                          {artist.region ?? ''}
                          {artist.region && artist.country ? ', ' : ''}
                          {artist.country ?? ''}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {/* Add Button with Dropdown */}
                    <div className="relative">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => setShowAddMenu(!showAddMenu)}
                      >
                        Add
                        <ChevronDown className="w-4 h-4 ml-1" />
                      </Button>
                      
                      <Menu
                        isOpen={showAddMenu}
                        onClose={() => setShowAddMenu(false)}
                        items={[
                          {
                            label: 'Add new folder',
                            onClick: () => {
                              setShowAddMenu(false);
                              setShowFolderModal(true);
                            },
                            icon: <Folder className="w-4 h-4 mr-2" />
                          },
                          {
                            label: 'Add new release',
                            onClick: () => {
                              setShowAddMenu(false);
                              setShowReleaseModal(true);
                            },
                            icon: <Music className="w-4 h-4 mr-2" />
                          }
                        ]}
                        position="bottom"
                        align="left"
                      />
                    </div>
                    
                    {/* Share Button */}
                    {canManageAccess && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setShowShareModal(true)}
                      >
                        <Share className="w-4 h-4 mr-2" />
                        Share
                      </Button>
                    )}
                    
                    {/* Three Dots Menu */}
                    <div className="relative">
                      <IconButton
                        variant="ghost"
                        size="sm"
                        icon={MoreHorizontal}
                        onClick={() => setShowArtistMenu(!showArtistMenu)}
                        className="h-8 w-8"
                      />
                      
                      <Menu
                        isOpen={showArtistMenu}
                        onClose={() => setShowArtistMenu(false)}
                        items={[
                          {
                            label: 'Edit artist',
                            onClick: () => {
                              setShowArtistMenu(false);
                              setShowArtistEditForm(true);
                            },
                            icon: <Edit className="w-4 h-4 mr-2" />
                          },
                          {
                            label: 'Delete artist',
                            onClick: () => {
                              setShowArtistMenu(false);
                              setShowArtistDeleteModal(true);
                            },
                            icon: <Trash2 className="w-4 h-4 mr-2" />
                          }
                        ]}
                        position="bottom"
                        align="right"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </BlurredHeader>

          {/* Folders Section */}
          {(foldersLoading || folders.length > 0) && (
            <div className="blurred-header-full-width py-6 overflow-visible" style={{ marginLeft: 'calc(50% - 50vw)', marginRight: 'calc(50% - 50vw)', width: '100vw', position: 'relative' }}>
              <div className="px-6 lg:px-[16%]">
                <div className="mb-8">
                  <h2 className="text-xl font-semibold mb-2">Folders</h2>
                  {foldersLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Spinner size="md" />
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 lg:gap-4 -mx-4">
                      {folders.map((folder) => (
                        <FolderCard key={folder.id} folder={folder} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Releases Section */}
          <div className="blurred-header-full-width py-6 overflow-visible" style={{ marginLeft: 'calc(50% - 50vw)', marginRight: 'calc(50% - 50vw)', width: '100vw', position: 'relative' }}>
            <div className="px-6 lg:px-[16%]">
              <div className="mb-4">
                <h2 className="text-xl font-semibold mb-2">Releases</h2>
                {releasesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Spinner size="md" />
                  </div>
                ) : releases.length === 0 ? (
                  <p className="text-gray-400 text-sm">No releases yet.</p>
                ) : (
                  <div className="grid grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 lg:gap-4 -mx-4">
                    {releases.map((release) => (
                      <ReleaseCard key={release.id} release={release} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {showReleaseModal && (
            <NewReleaseForm
              isOpen={showReleaseModal}
              onClose={() => setShowReleaseModal(false)}
              preselectedArtistId={artist.id}
              onReleaseCreated={(release) => {
                success(
                  `"${release.title}" has been created`,
                  undefined,
                  <Music className="w-5 h-5 text-green-400" />
                );
              }}
            />
          )}

          {showFolderModal && (
            <NewFolderForm
              isOpen={showFolderModal}
              onClose={() => setShowFolderModal(false)}
              artistId={artist.id}
              onFolderCreated={(folder) => {
                success(
                  `"${folder.name}" folder has been created`,
                  undefined,
                  <Folder className="w-5 h-5 text-blue-400" />
                );
              }}
            />
          )}

          <ArtistEditForm
            isOpen={showArtistEditForm}
            onClose={() => setShowArtistEditForm(false)}
            artist={artist}
            onArtistUpdated={() => {
              // Refresh the page to show updated data
              window.location.reload();
            }}
          />

          {/* Artist Delete Confirmation Modal */}
          {showArtistDeleteModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-gray-700 p-6 rounded-lg w-full max-w-md">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-white">Delete Artist</h2>
                  <button
                    onClick={() => setShowArtistDeleteModal(false)}
                    className="text-gray-400 hover:text-white"
                  >
                    ✕
                  </button>
                </div>

                <div className="mb-6">
                  <p className="text-gray-300 mb-2">
                    Are you sure you want to delete <span className="font-semibold text-white">{artist?.name}</span>?
                  </p>
                  <p className="text-sm text-gray-400">
                    This action cannot be undone. All releases, deliverables, and asset files associated with this artist will be deleted permanently.
                  </p>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="danger"
                    onClick={handleDeleteArtist}
                    disabled={artistDeleteLoading}
                    loading={artistDeleteLoading}
                    className="flex-1"
                  >
                    {artistDeleteLoading ? 'Deleting...' : 'Delete'}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => setShowArtistDeleteModal(false)}
                    disabled={artistDeleteLoading}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Share Access Modal */}
          <ShareAccessModal
            isOpen={showShareModal}
            onClose={() => setShowShareModal(false)}
            resourceType="artist"
            resourceId={artist.id}
            resourceName={artist.name}
            resourceDescription={`Artist: ${artist.name}`}
            resourceImageUrl={artist.image_url || undefined}
          />
          
          <ToastContainer toasts={toasts} onClose={removeToast} />
        </div>
      </Layout>
    </AuthWrapper>
  );
}
