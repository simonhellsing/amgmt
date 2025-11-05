import ImageUploader from './ImageUploader';
import { Building2 } from 'lucide-react';

interface OrganizationImageUploaderProps {
  onImageUploaded: (url: string) => void;
  currentImageUrl?: string | null;
  className?: string;
}

export default function OrganizationImageUploader({ 
  onImageUploaded, 
  currentImageUrl, 
  className = "w-24 h-24" 
}: OrganizationImageUploaderProps) {
  return (
    <ImageUploader
      onImageUploaded={onImageUploaded}
      currentImageUrl={currentImageUrl}
      className={className}
      shape="rounded"
      emptyStateIcon={Building2}
      emptyStateText="Add Logo"
      bucketName="artist-images"
      pathPrefix="organization-logos"
    />
  );
}

