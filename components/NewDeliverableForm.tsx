import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import Button from './Button';

interface Artist {
  id: string;
  name: string;
}

interface Deliverable {
  id: string;
  name: string;
  type: string;
  description?: string | null;
  online_deadline?: string | null;
  offline_deadline?: string | null;
  artist_id?: string | null;
  status: string;
}

interface NewDeliverableFormProps {
  isOpen: boolean;
  onClose: () => void;
  releaseId: string;
  releaseTitle: string;
  onDeliverableCreated?: () => void;
  deliverableToEdit?: Deliverable | null;
}

export default function NewDeliverableForm({ isOpen, onClose, releaseId, releaseTitle, onDeliverableCreated, deliverableToEdit }: NewDeliverableFormProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState('pack');
  const [onlineDeadline, setOnlineDeadline] = useState('');
  const [offlineDeadline, setOfflineDeadline] = useState('');
  const [description, setDescription] = useState('');
  const [selectedArtistId, setSelectedArtistId] = useState<string>('');
  const [artists, setArtists] = useState<Artist[]>([]);
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
    if (deliverableToEdit) {
      setName(deliverableToEdit.name);
      setType(deliverableToEdit.type);
      setDescription(deliverableToEdit.description || '');
      setOnlineDeadline(deliverableToEdit.online_deadline || '');
      setOfflineDeadline(deliverableToEdit.offline_deadline || '');
      setSelectedArtistId(deliverableToEdit.artist_id || '');
    } else {
      // Reset form for new deliverable
      setName('');
      setType('pack');
      setDescription('');
      setOnlineDeadline('');
      setOfflineDeadline('');
      setSelectedArtistId('');
    }
  }, [deliverableToEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const deliverableData = {
        name,
        type,
        description: description || null,
        online_deadline: onlineDeadline || null,
        offline_deadline: offlineDeadline || null,
        artist_id: selectedArtistId || null,
      };

      if (deliverableToEdit) {
        // Update existing deliverable
        console.log('Attempting to update deliverable with data:', deliverableData);

        const { data: deliverableDataResult, error: deliverableError } = await supabase
          .from('deliverables')
          .update(deliverableData)
          .eq('id', deliverableToEdit.id)
          .select()
          .single();

        if (deliverableError) {
          console.error('Supabase error:', deliverableError);
          throw new Error(`Failed to update deliverable: ${deliverableError.message}`);
        }

        console.log('Deliverable updated successfully:', deliverableDataResult);
      } else {
        // Create new deliverable
        const newDeliverableData = {
          ...deliverableData,
          release_id: releaseId,
          status: 'in_progress'
        };

        console.log('Attempting to create deliverable with data:', newDeliverableData);

        const { data: deliverableDataResult, error: deliverableError } = await supabase
          .from('deliverables')
          .insert(newDeliverableData)
          .select()
          .single();

        if (deliverableError) {
          console.error('Supabase error:', deliverableError);
          throw new Error(`Failed to create deliverable: ${deliverableError.message}`);
        }

        console.log('Deliverable created successfully:', deliverableDataResult);
      }

      onClose();
      onDeliverableCreated?.();
    } catch (err) {
      console.error('Error saving deliverable:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-gray-700 p-6 rounded-lg w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">
            {deliverableToEdit ? 'Edit Deliverable' : 'Create New Deliverable'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="mb-4">
          <span className="text-sm text-gray-400">For release: </span>
          <span className="text-white font-medium">{releaseTitle}</span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
              placeholder="e.g., Master Files, Artwork Pack"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
            >
              <option value="pack">Asset Pack</option>
              <option value="folder">Folder</option>
              <option value="file">Single File</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Responsible Artist
            </label>
            <select
              value={selectedArtistId}
              onChange={(e) => setSelectedArtistId(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
            >
              <option value="">Select an artist (optional)</option>
              {artists.map((artist) => (
                <option key={artist.id} value={artist.id}>
                  {artist.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
              placeholder="Describe what this deliverable contains..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Online Deadline
              </label>
              <input
                type="date"
                value={onlineDeadline}
                onChange={(e) => setOnlineDeadline(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Offline Deadline
              </label>
              <input
                type="date"
                value={offlineDeadline}
                onChange={(e) => setOfflineDeadline(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
              />
            </div>
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
              {loading ? (deliverableToEdit ? 'Saving...' : 'Creating...') : (deliverableToEdit ? 'Save Changes' : 'Create Deliverable')}
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