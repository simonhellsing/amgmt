import React from 'react';

interface AssetDetailHeaderProps {
  deliverableName?: string;
  artistName?: string;
  releaseName: string;
  coverUrl?: string | null;
  className?: string;
}

export default function AssetDetailHeader({
  deliverableName,
  artistName,
  releaseName,
  coverUrl,
  className = ""
}: AssetDetailHeaderProps) {
  return (
    <div className={`flex items-center gap-4 ${className}`}>
      {/* Cover Image */}
      <div className="w-8 h-8 rounded overflow-hidden flex-shrink-0">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={releaseName}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gray-600 flex items-center justify-center">
            <svg className="w-3 h-3 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
            </svg>
          </div>
        )}
      </div>

      {/* Title and Subtitle */}
      <div className="flex flex-col">
        <h1 className="text-sm font-normal text-white">
          {deliverableName || 'Asset'}
        </h1>
        <p className="text-gray-300 text-sm">
          {artistName && releaseName ? `${artistName} · ${releaseName}` : releaseName}
        </p>
      </div>
    </div>
  );
}
