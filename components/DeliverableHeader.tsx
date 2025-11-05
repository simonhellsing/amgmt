import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/router';

interface DeliverableHeaderProps {
  deliverableName: string;
  artistName: string;
  releaseName: string;
  coverUrl?: string | null;
  releaseId: string;
  className?: string;
}

export default function DeliverableHeader({
  deliverableName,
  artistName,
  releaseName,
  coverUrl,
  releaseId,
  className = ""
}: DeliverableHeaderProps) {
  const router = useRouter();

  const handleBackClick = () => {
    router.push(`/releases/${releaseId}`);
  };

  return (
    <div className={`flex items-center gap-4 ${className}`}>
      {/* Back Button */}
      <button
        onClick={handleBackClick}
        className="p-1 hover:bg-gray-600 rounded transition-colors cursor-pointer text-sm font-medium"
      >
        <ArrowLeft className="w-5 h-5 text-gray-400 hover:text-white" />
      </button>

      {/* Cover Image */}
      <div className="w-12 h-12 rounded overflow-hidden flex-shrink-0">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={releaseName}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gray-600 flex items-center justify-center">
            <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
            </svg>
          </div>
        )}
      </div>

      {/* Title and Subtitle */}
      <div className="flex flex-col">
        <h1 className="text-xl font-bold text-white">{deliverableName}</h1>
        <p className="text-gray-300 text-sm">
          {artistName} · {releaseName}
        </p>
      </div>
    </div>
  );
}
