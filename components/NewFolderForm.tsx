import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import Button from './Button';
import { Folder } from 'lucide-react';

interface NewFolderFormProps {
  isOpen: boolean;
  onClose: () => void;
  artistId: string;
  onFolderCreated: (folder: any) => void;
}

export default function NewFolderForm({ isOpen, onClose, artistId, onFolderCreated }: NewFolderFormProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    // Validate artistId is a valid UUID
    console.log('Artist ID received:', artistId, 'Type:', typeof artistId);
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(artistId)) {
      console.error('Invalid UUID format:', artistId);
      setError('Invalid artist ID format');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      console.log('Creating folder with data:', {
        name: name.trim(),
        description: description.trim() || null,
        artist_id: artistId
      });

      // Ensure artistId is properly formatted as UUID
      const cleanArtistId = artistId?.toString()?.trim();
      
      const { data, error } = await supabase
        .from('folders')
        .insert({
          name: name.trim(),
          description: description.trim() || null,
          artist_id: cleanArtistId
        })
        .select()
        .single();

      if (error) {
        console.error('Supabase error creating folder:', error);
        throw new Error(error.message || 'Database error occurred');
      }

      onFolderCreated(data);
      handleClose();
    } catch (error) {
      console.error('Error creating folder:', error);
      if (error instanceof Error) {
        setError(error.message);
      } else if (typeof error === 'object' && error !== null && 'message' in error) {
        setError((error as any).message);
      } else {
        setError('Failed to create folder');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setName('');
    setDescription('');
    setLoading(false);
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-700 p-6 rounded-lg w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">Create New Folder</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white text-sm font-medium"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Folder Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-gray-500 border border-gray-600 rounded-md text-white"
              placeholder="Enter folder name"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Description (Optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 bg-gray-500 border border-gray-600 rounded-md text-white"
              placeholder="Enter folder description"
              disabled={loading}
            />
          </div>

          {error && (
            <div className="text-red-400 text-sm">{error}</div>
          )}

          <div className="flex gap-2">
            <Button
              type="submit"
              variant="primary"
              disabled={loading || !name.trim()}
              loading={loading}
              className="flex-1"
            >
              <Folder className="w-4 h-4 mr-2" />
              {loading ? 'Creating...' : 'Create Folder'}
            </Button>
            <Button
              type="button"
              variant="tertiary"
              onClick={handleClose}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
