import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useOrganization } from '../lib/OrganizationContext';
import Button from './Button';
import ImageUploader from './ImageUploader';
import { User } from 'lucide-react';

export default function AddArtistForm({ onClose, onArtistCreated }: { onClose: () => void, onArtistCreated: () => void }) {
  const { selectedOrganization } = useOrganization();
  const [name, setName] = useState('');
  const [region, setRegion] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const user = (await supabase.auth.getUser()).data.user;
    if (!user) {
      setError('Not authenticated');
      setLoading(false);
      return;
    }

const { error: insertError } = await supabase.from('artists').insert([
  {
    name,
    region: region || null,
    image_url: imageUrl || null,
    organization_id: selectedOrganization?.id || null,
  }
]);

      
      
      
      
      
      

    if (insertError) {
      console.error('Error creating artist:', insertError);
      setError(`Failed to create artist: ${insertError.message || 'Unknown error'}`);
    } else {
      onArtistCreated();
      onClose();
    }
    setLoading(false);
  };

  return (
    <div>
      {error && <p className="text-red-400 mb-4 text-sm">{error}</p>}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
              Artist Name *
            </label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              required
              placeholder="Enter artist name"
              className="w-full border border-gray-600 p-2 rounded bg-gray-500 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Region (Optional)
            </label>
            <input
              value={region}
              onChange={e => setRegion(e.target.value)}
              placeholder="e.g., North America"
              className="w-full border border-gray-600 p-2 rounded bg-gray-500 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex justify-end gap-2 mt-2">
            <Button
              type="button"
              onClick={onClose}
              variant="secondary"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={loading}
              variant="primary"
              disabled={!name.trim()}
            >
              {loading ? 'Saving...' : 'Create Artist'}
            </Button>
          </div>
        </form>
    </div>
  );
}
