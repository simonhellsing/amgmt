import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import MultiSelect from './MultiSelect';
import Button from './Button';
import ImageUploader from './ImageUploader';
import { Music } from 'lucide-react';

interface Artist {
  id: string;
  name: string;
}

interface Release {
  id: string;
  title: string;
  type: string;
  status: string;
  catalog_number?: string | null;
  cover_url?: string | null;
}

interface ReleaseEditFormProps {
  isOpen: boolean;
  onClose: () => void;
  release: Release | null;
  onReleaseUpdated?: () => void;
}

export default function ReleaseEditForm({ isOpen, onClose, release, onReleaseUpdated }: ReleaseEditFormProps) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState('album');
  const [catalogNumber, setCatalogNumber] = useState('');
  const [selectedArtists, setSelectedArtists] = useState<string[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  React.useEffect(() => {
    const fetchArtists = async () => {
      const { data, error } = await supabase
        .from('artists')
        .select('id, name')
        .order('name');
      
      if (error) {
        console.error('Error fetching artists:', error);
      } else {
        setArtists(data || []);
      }
    };

    fetchArtists();
  }, []);

  // Populate form when editing
  React.useEffect(() => {
    if (release) {
      setTitle(release.title);
      setType(release.type);
      setCatalogNumber(release.catalog_number || '');
      setCoverUrl(release.cover_url || null);
      
      // Fetch associated artists
      const fetchReleaseArtists = async () => {
        const { data, error } = await supabase
          .from('release_artists')
          .select('artist_id')
          .eq('release_id', release.id);
        
        if (!error && data) {
          setSelectedArtists(data.map(ra => ra.artist_id));
        }
      };
      
      fetchReleaseArtists();
    }
  }, [release]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!release) return;

      // Update the release
      const { error: releaseError } = await supabase
        .from('releases')
        .update({
          title,
          type,
          catalog_number: catalogNumber || null,
          cover_url: coverUrl
        })
        .eq('id', release.id);

      if (releaseError) {
        throw new Error('Failed to update release');
      }

      // Update release-artist relationships
      // First, delete existing relationships
      await supabase
        .from('release_artists')
        .delete()
        .eq('release_id', release.id);

      // Then, create new relationships
      if (selectedArtists.length > 0) {
        const releaseArtists = selectedArtists.map(artistId => ({
          release_id: release.id,
          artist_id: artistId
        }));

        const { error: relationError } = await supabase
          .from('release_artists')
          .insert(releaseArtists);

        if (relationError) {
          console.error('Error updating release-artist relationships:', relationError);
        }
      }

      onClose();
      onReleaseUpdated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !release) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-700 p-6 rounded-lg w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">Edit Release</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-sm font-medium"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Cover Image */}
          <div className="flex justify-center">
            <ImageUploader
              onImageUploaded={setCoverUrl}
              currentImageUrl={coverUrl}
              className="w-40 h-40"
              shape="square"
              emptyStateIcon={Music}
              emptyStateText="Add Cover"
              bucketName="release-covers"
              pathPrefix="release-covers"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-3 py-2 bg-gray-500 border border-gray-600 rounded-md text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-3 py-2 bg-gray-500 border border-gray-600 rounded-md text-white focus:outline-none focus:border-blue-500"
            >
              <option value="album">Album</option>
              <option value="single">Single</option>
              <option value="EP">EP</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Catalog Number
            </label>
            <input
              type="text"
              value={catalogNumber}
              onChange={(e) => setCatalogNumber(e.target.value)}
              className="w-full px-3 py-2 bg-gray-500 border border-gray-600 rounded-md text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Artists (select 1-2)
            </label>
            <MultiSelect
              options={artists.map(artist => ({ id: artist.id, label: artist.name }))}
              selectedValues={selectedArtists}
              onChange={setSelectedArtists}
              placeholder="Select artists..."
              maxSelections={2}
            />
          </div>

          {error && (
            <div className="text-red-400 text-sm">{error}</div>
          )}

          <div className="flex gap-2">
            <Button
              type="submit"
              variant="primary"
              disabled={loading || !title}
              loading={loading}
              className="flex-1"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
            <Button
              type="button"
              variant="tertiary"
              onClick={onClose}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
} 