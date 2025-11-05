import React from 'react';
import { AudioLines } from 'lucide-react';

interface OrganizationLogoProps {
  isMinimized?: boolean;
}

export const OrganizationLogo: React.FC<OrganizationLogoProps> = ({ isMinimized = false }) => {

  // Always show regular logo (removed organization selector as per user request)
  return (
    <div className="flex items-center justify-center h-8">
      <AudioLines className="h-5 w-5 text-white flex-shrink-0" />
    </div>
  );
};
