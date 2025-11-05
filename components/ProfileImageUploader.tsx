import ImageUploader from './ImageUploader';
import { User } from 'lucide-react';

interface ProfileImageUploaderProps {
  onImageUploaded: (url: string) => void;
  currentImageUrl?: string | null;
  className?: string;
}

export default function ProfileImageUploader({ 
  onImageUploaded, 
  currentImageUrl, 
  className = "w-24 h-24" 
}: ProfileImageUploaderProps) {
  return (
    <ImageUploader
      onImageUploaded={onImageUploaded}
      currentImageUrl={currentImageUrl}
      className={className}
      shape="circle"
      emptyStateIcon={User}
      emptyStateText="Add Photo"
      bucketName="artist-images"
      pathPrefix="profile-images"
    />
  );
}
