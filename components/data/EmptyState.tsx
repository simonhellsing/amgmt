import React from 'react';
import { LucideIcon } from 'lucide-react';
import { registerComponent, type ComponentMetadata } from '@/lib/componentMetadata';

export interface EmptyStateProps {
  /** Icon component */
  icon?: LucideIcon;
  
  /** Title text */
  title: string;
  
  /** Description text */
  description?: string;
  
  /** Action button */
  action?: React.ReactNode;
  
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  action,
  size = 'md',
}) => {
  const sizeConfig = {
    sm: {
      container: 'py-8',
      icon: 'h-8 w-8',
      title: 'text-base',
      description: 'text-sm',
      gap: 'gap-3',
    },
    md: {
      container: 'py-12',
      icon: 'h-12 w-12',
      title: 'text-lg',
      description: 'text-sm',
      gap: 'gap-4',
    },
    lg: {
      container: 'py-16',
      icon: 'h-16 w-16',
      title: 'text-xl',
      description: 'text-base',
      gap: 'gap-6',
    },
  };

  const config = sizeConfig[size];

  return (
    <div className={`flex flex-col items-center justify-center text-center ${config.container} ${config.gap}`}>
      {Icon && (
        <div className="flex items-center justify-center rounded-full bg-gray-800 p-4">
          <Icon className={`${config.icon} text-gray-400`} />
        </div>
      )}
      
      <div className={config.gap}>
        <h3 className={`${config.title} font-semibold text-white`}>
          {title}
        </h3>
        
        {description && (
          <p className={`${config.description} text-gray-400 max-w-sm`}>
            {description}
          </p>
        )}
      </div>

      {action && <div className="mt-2">{action}</div>}
    </div>
  );
};

export default EmptyState;

export const emptyStateMetadata: ComponentMetadata = {
  name: 'EmptyState',
  description: 'Placeholder shown when no data is available',
  category: 'data',
  variants: [{ name: 'default', description: 'Standard empty state' }],
  sizes: ['sm', 'md', 'lg'],
  applicableStates: ['default'],
  props: [
    { name: 'icon', type: 'LucideIcon', required: false, description: 'Icon to display' },
    { name: 'title', type: 'string', required: true, description: 'Title text' },
    { name: 'description', type: 'string', required: false, description: 'Description text' },
    { name: 'action', type: 'React.ReactNode', required: false, description: 'Action button or element' },
    { name: 'size', type: "'sm' | 'md' | 'lg'", default: "'md'", required: false, description: 'Size variant' },
  ],
  example: `import { FolderOpen } from 'lucide-react';

<EmptyState
  icon={FolderOpen}
  title="No files yet"
  description="Upload your first file to get started"
  action={<Button>Upload File</Button>}
/>`,
  a11y: 'Purely informational component. Ensure action buttons are keyboard accessible.',
};

registerComponent(emptyStateMetadata);

