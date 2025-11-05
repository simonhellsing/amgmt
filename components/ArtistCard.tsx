import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Card from './Card';
import Spinner from './Spinner';
import { User } from 'lucide-react';

interface ArtistCardProps {
  artist: {
    id: string;
    name: string;
    region?: string | null;
    country?: string | null;
    image_url?: string | null;
  };
  className?: string;
}

const ArtistCard = React.memo(function ArtistCard({ artist, className = '' }: ArtistCardProps) {
  const [imageLoading, setImageLoading] = useState(true);

  // Reset loading state when artist image changes
  useEffect(() => {
    setImageLoading(true);
  }, [artist.image_url]);
  
  return (
    <Link href={`/artists/${artist.id}`}>
      <Card className={className}>
        {/* Image Section */}
        <div className="px-4 pt-4">
          <div className="aspect-square bg-gray-700 relative overflow-hidden rounded-full">
            {artist.image_url ? (
              <>
                {imageLoading && (
                  <div className="absolute inset-0 flex items-center justify-center z-10 bg-gray-700 rounded-full">
                    <Spinner size="lg" color="gray" />
                  </div>
                )}
                <Image
                  src={artist.image_url}
                  alt={artist.name}
                  fill
                  className="object-cover rounded-full"
                  onLoadingComplete={() => setImageLoading(false)}
                  onError={() => setImageLoading(false)}
                />
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400 rounded-full">
                <User className="w-16 h-16" />
              </div>
            )}
          </div>
        </div>

        {/* Content Section */}
        <div className="px-4 pb-6 pt-3">
          <h3 className="font-medium text-gray-300 group-hover:text-gray-200 text-xs text-left truncate transition-colors">
            {artist.name}
          </h3>
        </div>
      </Card>
    </Link>
  );
});

export default ArtistCard; 