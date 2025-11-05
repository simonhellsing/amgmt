import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import Button from './Button';
import ImageUploader from './ImageUploader';
import { User } from 'lucide-react';

interface Artist {
  id: string;
  name: string;
  region?: string | null;
  country?: string | null;
  image_url?: string | null;
}

interface ArtistEditFormProps {
  isOpen: boolean;
  onClose: () => void;
  artist: Artist | null;
  onArtistUpdated?: () => void;
}

export default function ArtistEditForm({ isOpen, onClose, artist, onArtistUpdated }: ArtistEditFormProps) {
  const [name, setName] = useState('');
  const [region, setRegion] = useState('');
  const [country, setCountry] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Populate form when editing
  React.useEffect(() => {
    if (artist) {
      setName(artist.name);
      setRegion(artist.region || '');
      setCountry(artist.country || '');
      setImageUrl(artist.image_url || null);
    }
  }, [artist]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!artist) return;

      // Update the artist
      const { error: artistError } = await supabase
        .from('artists')
        .update({
          name,
          region: region || null,
          country: country || null,
          image_url: imageUrl
        })
        .eq('id', artist.id);

      if (artistError) {
        throw new Error('Failed to update artist');
      }

      onClose();
      onArtistUpdated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !artist) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-700 p-6 rounded-lg w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">Edit Artist</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-sm font-medium"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Artist Image */}
          <div className="flex justify-center">
            <ImageUploader
              onImageUploaded={setImageUrl}
              currentImageUrl={imageUrl}
              className="w-32 h-32"
              shape="circle"
              emptyStateIcon={User}
              emptyStateText="Add Photo"
              bucketName="artist-images"
              pathPrefix="artist-images"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2 bg-gray-500 border border-gray-600 rounded-md text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Region
            </label>
            <input
              type="text"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="w-full px-3 py-2 bg-gray-500 border border-gray-600 rounded-md text-white focus:outline-none focus:border-blue-500"
              placeholder="e.g., North America"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Country
            </label>
            <input
              type="text"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full px-3 py-2 bg-gray-500 border border-gray-600 rounded-md text-white focus:outline-none focus:border-blue-500"
              placeholder="e.g., United States"
            />
          </div>

          {error && (
            <div className="text-red-400 text-sm">{error}</div>
          )}

          <div className="flex gap-2">
            <Button
              type="submit"
              variant="primary"
              disabled={loading || !name}
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