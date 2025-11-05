import React from 'react';
import { useRouter } from 'next/router';
import { Folder, FileText } from 'lucide-react';

interface FolderCardProps {
  folder: {
    id: string;
    name: string;
    description?: string | null;
    file_count?: number;
  };
}

export default function FolderCard({ folder }: FolderCardProps) {
  const router = useRouter();

  const handleClick = () => {
    router.push(`/folders/${folder.id}`);
  };

  return (
    <div
      onClick={handleClick}
      className="bg-gray-800 rounded-3xl p-4 cursor-pointer hover:bg-gray-700 transition-colors border border-gray-700 hover:border-gray-600"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-shrink-0">
          <Folder className="w-8 h-8 text-blue-400" />
        </div>
      </div>
      
      <div className="space-y-2">
        <h3 className="text-gray-300 font-medium text-xs leading-tight">
          {folder.name}
        </h3>
        
        {folder.description && (
          <p className="text-gray-400 text-xs line-clamp-2">
            {folder.description}
          </p>
        )}
        
        <div className="flex items-center gap-1 text-gray-500 text-xs">
          <FileText className="w-3 h-3" />
          <span>
            {folder.file_count || 0} {folder.file_count === 1 ? 'file' : 'files'}
          </span>
        </div>
      </div>
    </div>
  );
}
