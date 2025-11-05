import React, { useMemo, useRef, useState, useEffect } from 'react';
import Image from 'next/image';
import Card from './Card';
import Tooltip from './Tooltip';
import Spinner from './Spinner';
import { Music, CircleDashed, CircleCheck, Circle } from 'lucide-react';
import { useRouter } from 'next/router';
import { usePageTransition } from '@/lib/pageTransition';

interface ReleaseCardProps {
  release: {
    id: string;
    title: string;
    online?: string | null;
    offline?: string | null;
    cover_url?: string | null;
    status?: string | null;
    deliverables?: Array<{
      id: string;
      status: string;
    }>;
    artists?: Array<{
      id: string;
      name: string;
    }>;
  };
  className?: string;
}

const ReleaseCard = React.memo(function ReleaseCard({ release, className = '' }: ReleaseCardProps) {
  const router = useRouter();
  const { setTransitioning, setClickedReleaseId } = usePageTransition();
  const [imageLoading, setImageLoading] = useState(true);

  // Reset loading state when release changes
  useEffect(() => {
    setImageLoading(true);
  }, [release.cover_url]);

  const handleClick = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
    }
    setClickedReleaseId(release.id);
    setTransitioning(true);
    router.push(`/releases/${release.id}`);
  };

  // Memoize status calculation to prevent recalculation on every render
  const status = useMemo(() => {
    if (!release.deliverables || release.deliverables.length === 0) {
      return 'not_started';
    }

    const hasInProgress = release.deliverables.some(d => d.status === 'in_progress');
    const allFinal = release.deliverables.every(d => d.status === 'final');

    if (allFinal) {
      return 'final';
    } else if (hasInProgress) {
      return 'in_progress';
    } else {
      return 'not_started';
    }
  }, [release.deliverables]);

  const statusDisplay = useMemo(() => {
    switch (status) {
      case 'not_started':
        return 'Draft';
      case 'in_progress':
        const finalDeliverables = release.deliverables?.filter(d => d.status === 'final').length || 0;
        const totalDeliverables = release.deliverables?.length || 0;
        return `${finalDeliverables} of ${totalDeliverables} final`;
      case 'final':
        return 'Completed';
      default:
        return 'Draft';
    }
  }, [status, release.deliverables]);

  const statusIcon = useMemo(() => {
    switch (status) {
      case 'not_started':
        return <Circle className="w-3 h-3 text-yellow-400" />;
      case 'in_progress':
        return <CircleDashed className="w-3 h-3 text-blue-400" />;
      case 'final':
        return <CircleCheck className="w-3 h-3 text-green-400" />;
      default:
        return <Circle className="w-3 h-3 text-yellow-400" />;
    }
  }, [status]);

  return (
    <Card className={className} href={`/releases/${release.id}`} onClick={handleClick}>
        {/* Image Section */}
        <div className="px-4 pt-4">
          <div className="aspect-square bg-gray-700 relative overflow-hidden rounded-3xl">
          {release.cover_url ? (
            <>
              {imageLoading && (
                <div className="absolute inset-0 flex items-center justify-center z-10 bg-gray-700 rounded-3xl">
                  <Spinner size="lg" color="gray" />
                </div>
              )}
              <Image
                src={release.cover_url}
                alt={release.title}
                fill
                className="object-cover rounded-3xl"
                onLoadingComplete={() => setImageLoading(false)}
                onError={() => setImageLoading(false)}
              />
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400 rounded-3xl">
              <Music className="w-16 h-16" />
            </div>
          )}
          </div>
        </div>
      {/* Content Section */}
      <div className="px-4 pb-4 pt-3">
        <div className="flex items-center justify-start gap-2">
          <Tooltip content={statusDisplay} delay={300} position="bottom">
            <div className="cursor-pointer">
              {statusIcon}
            </div>
          </Tooltip>
          <h3 className="font-medium text-gray-300 group-hover:text-gray-200 text-xs truncate transition-colors">
            {release.title}
          </h3>
        </div>
      </div>
    </Card>
  );
});

export default ReleaseCard; 