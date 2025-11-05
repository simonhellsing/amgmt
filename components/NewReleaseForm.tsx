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

interface NewReleaseFormProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedArtistId?: string;
  onReleaseCreated?: (release: { id: string; title: string }) => void;
}

export default function NewReleaseForm({ isOpen, onClose, preselectedArtistId, onReleaseCreated }: NewReleaseFormProps) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState('album');
  const [catalogNumber, setCatalogNumber] = useState('');
  const [selectedArtists, setSelectedArtists] = useState<string[]>(preselectedArtistId ? [preselectedArtistId] : []);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Create the release
      const { data: releaseData, error: releaseError } = await supabase
        .from('releases')
        .insert({
          title,
          type,
          catalog_number: catalogNumber || null,
          cover_url: coverUrl
        })
        .select()
        .single();

      if (releaseError) {
        throw new Error('Failed to create release');
      }

      // Create release-artist relationships
      if (selectedArtists.length > 0) {
        const releaseArtists = selectedArtists.map(artistId => ({
          release_id: releaseData.id,
          artist_id: artistId
        }));

        const { error: relationError } = await supabase
          .from('release_artists')
          .insert(releaseArtists);

        if (relationError) {
          console.error('Error creating release-artist relationships:', relationError);
        }
      }

      // Reset form
      setTitle('');
      setType('album');
      setCatalogNumber('');
      setSelectedArtists(preselectedArtistId ? [preselectedArtistId] : []);
      setCoverUrl(null);

      // Notify parent component of successful creation
      onReleaseCreated?.(releaseData);

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };



  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[100]">
              <div className="bg-gray-700 p-6 rounded-lg w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">Create New Release</h2>
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
              {loading ? 'Creating...' : 'Create Release'}
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