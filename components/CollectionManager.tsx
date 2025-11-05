import React, { useState, useEffect } from 'react';
import { Plus, Folder, Share, MoreHorizontal, Trash2, Edit } from 'lucide-react';
import Button from './Button';
import { useToast } from '../lib/useToast';
import { 
  createCollection, 
  getCollections, 
  addToCollection, 
  removeFromCollection,
  createShareLink,
  type Collection,
  type ResourceType 
} from '../lib/accessControl';

interface CollectionManagerProps {
  resourceType: ResourceType;
  resourceId: string;
  resourceName: string;
  onCollectionAdded?: (collectionId: string) => void;
}

export default function CollectionManager({ 
  resourceType, 
  resourceId, 
  resourceName,
  onCollectionAdded 
}: CollectionManagerProps) {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [newCollectionDescription, setNewCollectionDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [addingToCollection, setAddingToCollection] = useState<string | null>(null);
  
  const { success, error } = useToast();

  useEffect(() => {
    loadCollections();
  }, []);

  const loadCollections = async () => {
    setLoading(true);
    try {
      const collectionsData = await getCollections();
      setCollections(collectionsData);
    } catch (err) {
      console.error('Error loading collections:', err);
      error('Failed to load collections');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCollection = async () => {
    if (!newCollectionName.trim()) return;

    setCreating(true);
    try {
      const collection = await createCollection({
        name: newCollectionName.trim(),
        description: newCollectionDescription.trim() || undefined,
        isPublic: false
      });

      // Add the current resource to the new collection
      await addToCollection({
        collectionId: collection.id,
        itemType: resourceType,
        itemId: resourceId
      });

      setNewCollectionName('');
      setNewCollectionDescription('');
      setShowCreateModal(false);
      await loadCollections();
      
      success(`"${collection.name}" collection created and "${resourceName}" added`);
      
      if (onCollectionAdded) {
        onCollectionAdded(collection.id);
      }
    } catch (err) {
      console.error('Error creating collection:', err);
      error('Failed to create collection');
    } finally {
      setCreating(false);
    }
  };

  const handleAddToCollection = async (collectionId: string) => {
    setAddingToCollection(collectionId);
    try {
      await addToCollection({
        collectionId,
        itemType: resourceType,
        itemId: resourceId
      });

      const collection = collections.find(c => c.id === collectionId);
      success(`"${resourceName}" added to "${collection?.name}"`);
    } catch (err) {
      console.error('Error adding to collection:', err);
      error('Failed to add to collection');
    } finally {
      setAddingToCollection(null);
    }
  };

  const handleRemoveFromCollection = async (collectionId: string) => {
    try {
      await removeFromCollection({
        collectionId,
        itemType: resourceType,
        itemId: resourceId
      });

      const collection = collections.find(c => c.id === collectionId);
      success(`"${resourceName}" removed from "${collection?.name}"`);
    } catch (err) {
      console.error('Error removing from collection:', err);
      error('Failed to remove from collection');
    }
  };

  const handleCreateShareLink = async (collectionId: string) => {
    try {
      const shareLink = await createShareLink({
        resourceType: 'collection',
        resourceId: collectionId,
        accessLevel: 'view',
        title: `Collection: ${collections.find(c => c.id === collectionId)?.name}`,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
      });

      const shareUrl = `${window.location.origin}/share/${shareLink.token}`;
      await navigator.clipboard.writeText(shareUrl);
      
      success('Share link copied to clipboard');
    } catch (err) {
      console.error('Error creating share link:', err);
      error('Failed to create share link');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-300">Collections</h3>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setShowCreateModal(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          New Collection
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-3 p-3 bg-gray-600 rounded-lg animate-pulse">
              <div className="w-8 h-8 bg-gray-500 rounded"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-500 rounded w-32 mb-2"></div>
                <div className="h-3 bg-gray-500 rounded w-24"></div>
              </div>
            </div>
          ))}
        </div>
      ) : collections.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <Folder className="w-8 h-8 mx-auto mb-2" />
          <p>No collections yet</p>
          <p className="text-sm">Create a collection to organize your content</p>
        </div>
      ) : (
        <div className="space-y-2">
          {collections.map((collection) => (
            <div key={collection.id} className="flex items-center gap-3 p-3 bg-gray-600 rounded-lg">
              <Folder className="w-5 h-5 text-blue-400 flex-shrink-0" />
              
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">
                  {collection.name}
                </p>
                {collection.description && (
                  <p className="text-gray-400 text-xs truncate">{collection.description}</p>
                )}
              </div>
              
              <div className="flex items-center gap-1">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleCreateShareLink(collection.id)}
                  className="px-2"
                >
                  <Share className="w-3 h-3" />
                </Button>
                
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleAddToCollection(collection.id)}
                  disabled={addingToCollection === collection.id}
                  loading={addingToCollection === collection.id}
                  className="px-2"
                >
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Collection Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-gray-700 rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-bold text-white mb-4">Create New Collection</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Collection Name
                </label>
                <input
                  type="text"
                  value={newCollectionName}
                  onChange={(e) => setNewCollectionName(e.target.value)}
                  placeholder="Enter collection name..."
                  className="w-full bg-gray-500 border border-gray-600 rounded-md px-3 py-2 text-white placeholder-gray-400"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Description (optional)
                </label>
                <textarea
                  value={newCollectionDescription}
                  onChange={(e) => setNewCollectionDescription(e.target.value)}
                  placeholder="Enter description..."
                  rows={3}
                  className="w-full bg-gray-500 border border-gray-600 rounded-md px-3 py-2 text-white placeholder-gray-400"
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <Button
                variant="secondary"
                onClick={() => setShowCreateModal(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleCreateCollection}
                disabled={!newCollectionName.trim() || creating}
                loading={creating}
                className="flex-1"
              >
                Create
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
