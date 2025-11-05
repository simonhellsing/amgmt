import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getAccessibleReleases, getAccessibleArtists, Release, Artist } from '../lib/accessControl';
import { useOrganization } from '../lib/OrganizationContext';
import Layout from '../components/Layout';
import AuthWrapper from '../components/AuthWrapper';
import ReleaseCard from '../components/ReleaseCard';
import Spinner from '../components/Spinner';
import Card from '../components/Card';
import Image from 'next/image';
import { Users, Disc3, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import { usePageTransition } from '@/lib/pageTransition';

// Helper component for thumbnail images with loading state
function ThumbnailImage({ src, alt, fallback, className }: { src?: string | null; alt: string; fallback: React.ReactNode; className: string }) {
  const [imageLoading, setImageLoading] = useState(true);

  return (
    <div className="relative overflow-hidden w-full h-full">
      {src ? (
        <>
          {imageLoading && (
            <div className={`absolute inset-0 flex items-center justify-center z-10 bg-gray-600 ${className}`}>
              <Spinner size="sm" color="gray" />
            </div>
          )}
          <Image
            src={src}
            alt={alt}
            fill
            className={`object-cover ${className}`}
            onLoadingComplete={() => setImageLoading(false)}
            onError={() => setImageLoading(false)}
          />
        </>
      ) : (
        fallback
      )}
    </div>
  );
}

export default function HomePage() {
  const [releases, setReleases] = useState<Release[]>([]);
  const [allReleases, setAllReleases] = useState<Release[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [layoutPreference, setLayoutPreference] = useState<string>('simple');
  const { selectedOrganization, loading: orgLoading } = useOrganization();
  const { isTransitioning } = usePageTransition();

  useEffect(() => {
    const fetchLayoutPreference = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

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
      }
    };

    fetchLayoutPreference();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      // Wait for organization context to load
      if (orgLoading) {
        return;
      }

      // Ensure an organization is selected before fetching data
      if (!selectedOrganization) {
        setLoading(false);
        return;
      }

      try {
        // Fetch releases and artists in parallel for better performance
        const [allAccessibleReleases, accessibleArtists] = await Promise.all([
          getAccessibleReleases(),
          getAccessibleArtists()
        ]);
        
        // Calculate status based on deliverables like ReleaseCard does
        const inProgressReleases = allAccessibleReleases.filter(release => {
          if (!release.deliverables || release.deliverables.length === 0) {
            return false;
          }
          const hasInProgress = release.deliverables.some((d: any) => d.status === 'in_progress');
          const allFinal = release.deliverables.every((d: any) => d.status === 'final');
          return hasInProgress && !allFinal;
        });
        
        // Sort by created_at (most recent first)
        const sortedReleases = inProgressReleases.sort((a, b) => {
          if (a.created_at && b.created_at) {
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          }
          return 0;
        });
        
        setReleases(sortedReleases);
        setAllReleases(allAccessibleReleases);
        setArtists(accessibleArtists);
      } catch (error) {
        console.error('Error fetching accessible data:', error);
        setReleases([]);
        setAllReleases([]);
        setArtists([]);
      }

      setLoading(false);
    };

    fetchData();
  }, [selectedOrganization, orgLoading]);

  if (loading) {
    return (
      <AuthWrapper>
        <Layout>
          <div className="text-white">
            <div className="flex items-center justify-center py-12">
              <Spinner size="lg" />
            </div>
          </div>
        </Layout>
      </AuthWrapper>
    );
  }

  return (
    <AuthWrapper>
      <Layout>
        <motion.div 
          className="text-white"
          initial={{ opacity: 1 }}
          animate={{ opacity: isTransitioning ? 0 : 1 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          {/* Combined Navigation Cards and Releases in Progress */}
          <div>
            {layoutPreference === 'simple' ? (
                <div className="grid grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 lg:gap-4 -mx-4">
                  {/* Navigation Cards */}
                  <motion.div
                    key="calendar-card"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ 
                      type: "spring",
                      stiffness: 300,
                      damping: 25,
                      mass: 0.8,
                      delay: 0 * 0.05
                    }}
                    style={{ pointerEvents: 'auto' }}
                  >
                  <Card href="/calendar">
                  {/* Image Section */}
                  <div className="px-4 pt-4">
                    <div className="aspect-square bg-gray-700 relative overflow-hidden rounded-3xl">
                      {/* Calendar Widget */}
                      <div className="absolute inset-10 flex flex-col bg-white rounded-lg overflow-hidden">
                        {/* Month Header */}
                        <div className="text-white text-center px-2 flex items-center justify-center" style={{ backgroundColor: '#D42D2D' }}>
                          <span className="text-[10px] font-semibold">
                            {new Date().toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}
                          </span>
                        </div>
                        {/* Date Section */}
                        <div className="flex-1 bg-white flex items-center justify-center">
                          <span className="text-gray-700 text-xl font-bold">
                            {new Date().getDate()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Content Section */}
                  <div className="px-4 pb-4 pt-3">
                    <h3 className="font-medium text-gray-300 group-hover:text-gray-200 text-xs text-left transition-colors">Calendar</h3>
                  </div>
                </Card>
                </motion.div>

                <motion.div
                  key="artists-card"
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ 
                    type: "spring",
                    stiffness: 300,
                    damping: 25,
                    mass: 0.8,
                    delay: 1 * 0.05
                  }}
                  style={{ pointerEvents: 'auto' }}
                >
                  <Card href="/artists">
                  {/* Image Section */}
                  <div className="px-4 pt-4">
                    <div className="aspect-square bg-gray-700 relative overflow-hidden rounded-3xl">
                      {artists.length > 0 ? (
                        <div className="grid grid-cols-2 grid-rows-2 h-full w-full gap-2.5 p-6">
                          {Array.from({ length: 4 }).map((_, idx) => {
                            const artist = artists[idx];
                            return (
                              <ThumbnailImage
                                key={idx}
                                src={artist?.image_url}
                                alt={artist?.name || ''}
                                fallback={<div className="w-full h-full bg-gray-600 flex items-center justify-center rounded-full"><Users className="w-4 h-4 text-gray-400" /></div>}
                                className="rounded-full"
                              />
                            );
                          })}
                        </div>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 rounded-3xl">
                          <Users className="w-16 h-16" />
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Content Section */}
                  <div className="px-4 pb-4 pt-3">
                    <h3 className="font-medium text-gray-300 group-hover:text-gray-200 text-xs text-left transition-colors">All Artists</h3>
                  </div>
                </Card>
                </motion.div>

                <motion.div
                  key="releases-card"
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ 
                    type: "spring",
                    stiffness: 300,
                    damping: 25,
                    mass: 0.8,
                    delay: 2 * 0.05
                  }}
                  style={{ pointerEvents: 'auto' }}
                >
                  <Card href="/releases">
                  {/* Image Section */}
                  <div className="px-4 pt-4">
                    <div className="aspect-square bg-gray-700 relative overflow-hidden rounded-3xl">
                      {allReleases.length > 0 ? (
                        <div className="grid grid-cols-2 grid-rows-2 h-full w-full gap-2.5 p-6">
                          {Array.from({ length: 4 }).map((_, idx) => {
                            const release = allReleases[idx];
                            return (
                              <ThumbnailImage
                                key={idx}
                                src={release?.cover_url}
                                alt={release?.title || ''}
                                fallback={<div className="w-full h-full bg-gray-600 flex items-center justify-center rounded-md"><Disc3 className="w-4 h-4 text-gray-400" /></div>}
                                className="rounded-md"
                              />
                            );
                          })}
                        </div>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 rounded-3xl">
                          <Disc3 className="w-16 h-16" />
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Content Section */}
                  <div className="px-4 pb-4 pt-3">
                    <h3 className="font-medium text-gray-300 group-hover:text-gray-200 text-xs text-left transition-colors">All Releases</h3>
                  </div>
                </Card>
                </motion.div>

                {/* Releases in Progress */}
                {releases.map((release, index) => {
                  // Calculate delay based on column position (left to right)
                  // Navigation cards are 0, 1, 2, so release cards start at index 3
                  const columnIndex = index + 3;
                  const delay = columnIndex * 0.05;
                  
                  return (
                    <motion.div
                      key={`release-${release.id}`}
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ 
                        type: "spring",
                        stiffness: 300,
                        damping: 25,
                        mass: 0.8,
                        delay
                      }}
                    >
                      <ReleaseCard release={release} />
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              /* Complex Layout - Just show releases */
              <div className="grid grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 lg:gap-4 -mx-4">
                {releases.length === 0 ? (
                  <p className="text-gray-400">No releases in progress.</p>
                ) : (
                  releases.map((release, index) => {
                    const delay = index * 0.05;
                    return (
                      <motion.div
                        key={`release-${release.id}`}
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ 
                          type: "spring",
                          stiffness: 300,
                          damping: 25,
                          mass: 0.8,
                          delay
                        }}
                      >
                        <ReleaseCard release={release} />
                      </motion.div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </motion.div>
      </Layout>
    </AuthWrapper>
  );
}