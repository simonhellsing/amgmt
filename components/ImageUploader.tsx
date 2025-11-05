import { useRef, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Upload, LucideIcon } from 'lucide-react';

export type ImageShape = 'circle' | 'square' | 'rounded';

interface ImageUploaderProps {
  onImageUploaded: (url: string) => void;
  currentImageUrl?: string | null;
  className?: string;
  shape?: ImageShape;
  emptyStateIcon?: LucideIcon;
  emptyStateText?: string;
  label?: string;
  bucketName?: string;
  pathPrefix?: string;
  disabled?: boolean;
}

export default function ImageUploader({
  onImageUploaded,
  currentImageUrl,
  className = 'w-24 h-24',
  shape = 'square',
  emptyStateIcon: EmptyIcon,
  emptyStateText = 'Add Image',
  label,
  bucketName = 'artist-images',
  pathPrefix = 'uploads',
  disabled = false,
}: ImageUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null);
  const [error, setError] = useState<string | null>(null);

  // Update preview when currentImageUrl changes from parent
  useEffect(() => {
    setPreviewUrl(currentImageUrl || null);
  }, [currentImageUrl]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB');
      return;
    }

    setError(null);

    // Create preview and wait for it to load before uploading
    const reader = new FileReader();
    const previewPromise = new Promise<string>((resolve) => {
      reader.onload = (e) => {
        const result = e.target?.result as string;
        console.log('Preview loaded, data URL length:', result?.length);
        setPreviewUrl(result);
        resolve(result);
      };
    });
    reader.readAsDataURL(file);

    // Wait for preview to load
    const dataUrl = await previewPromise;
    console.log('Preview set, URL starts with:', dataUrl?.substring(0, 50));

    // Small delay to ensure the preview is rendered
    await new Promise(resolve => setTimeout(resolve, 100));

    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${pathPrefix}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      const { data } = supabase.storage.from(bucketName).getPublicUrl(filePath);
      const publicUrl = data?.publicUrl;

      if (publicUrl) {
        onImageUploaded(publicUrl);
      }
    } catch (err) {
      console.error('Upload failed:', err);
      setError(err instanceof Error ? err.message : 'Upload failed');
      // Revert preview on error
      setPreviewUrl(currentImageUrl || null);
    } finally {
      setUploading(false);
    }
  };

  const handleClick = () => {
    if (!disabled && !uploading) {
      fileInputRef.current?.click();
    }
  };

  const shapeClasses = {
    circle: 'rounded-full',
    square: 'rounded-lg',
    rounded: 'rounded-xl',
  };

  const containerClass = shapeClasses[shape];

  return (
    <div className="flex flex-col">
      {label && (
        <label className="block text-sm font-medium text-gray-300 mb-2">
          {label}
        </label>
      )}
      
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
        disabled={disabled || uploading}
      />

      <div
        onClick={handleClick}
        className={`relative ${className} ${containerClass} border-2 ${
          previewUrl ? 'border-gray-700' : 'border-dashed border-gray-600'
        } ${
          disabled || uploading
            ? 'cursor-not-allowed'
            : 'cursor-pointer hover:border-gray-500'
        } overflow-hidden transition-colors group`}
      >
        {previewUrl ? (
          <div className="relative w-full h-full">
            <img
              src={previewUrl}
              alt="Preview"
              className="w-full h-full object-cover block"
              onLoad={(e) => {
                console.log('Image rendered successfully');
                console.log('Image natural size:', e.currentTarget.naturalWidth, 'x', e.currentTarget.naturalHeight);
                console.log('Image display size:', e.currentTarget.width, 'x', e.currentTarget.height);
              }}
              onError={(e) => {
                console.error('Image failed to render');
                setError('Failed to display image preview');
              }}
            />
            {!disabled && !uploading && (
              <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-50 transition-opacity flex items-center justify-center">
                <Upload className="w-6 h-6 text-white" />
              </div>
            )}
            {uploading && (
              <div className="absolute inset-0 bg-gray-800 bg-opacity-80 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-gray-400 h-full">
            {EmptyIcon ? (
              <EmptyIcon className="w-8 h-8 mb-2" />
            ) : (
              <Upload className="w-8 h-8 mb-2" />
            )}
            <span className="text-xs text-center px-2">
              {uploading ? 'Uploading...' : emptyStateText}
            </span>
          </div>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-400 mt-1">{error}</p>
      )}

      <p className="text-xs text-gray-400 mt-1 text-center">
        {uploading ? 'Uploading...' : 'Click to upload image'}
      </p>
    </div>
  );
}

