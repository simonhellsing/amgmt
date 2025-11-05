import React, { useState, useMemo } from 'react';
import Head from 'next/head';
import { Search, Filter, X } from 'lucide-react';
import {
  getAllComponents,
  type ComponentMetadata,
  type ComponentState,
  getStateLabel,
  stateAppliesTo,
} from '@/lib/componentMetadata';

// Import all components to ensure they register
import '@/components/ui/Button';
import '@/components/ui/IconButton';
import '@/components/ui/LinkButton';
import '@/components/form/Input';
import '@/components/form/Textarea';
import '@/components/form/Checkbox';
import '@/components/form/Select';
import '@/components/feedback/Alert';
import '@/components/feedback/Spinner';
import '@/components/typography/Badge';
import '@/components/layout/Card';
import '@/components/layout/Stack';
import '@/components/overlay/Modal';
import '@/components/data/EmptyState';
import '@/components/command-dock/CommandBar';
import '@/components/command-dock/ResultCard';

// Import actual component implementations for preview
import Button from '@/components/ui/Button';
import IconButton from '@/components/ui/IconButton';
import LinkButton from '@/components/ui/LinkButton';
import Input from '@/components/form/Input';
import Textarea from '@/components/form/Textarea';
import Checkbox from '@/components/form/Checkbox';
import Select from '@/components/form/Select';
import Alert from '@/components/feedback/Alert';
import Spinner from '@/components/feedback/Spinner';
import Badge from '@/components/typography/Badge';
import Card from '@/components/layout/Card';
import Stack from '@/components/layout/Stack';
import Modal from '@/components/overlay/Modal';
import EmptyState from '@/components/data/EmptyState';
import CommandBar from '@/components/command-dock/CommandBar';
import { ResultCard } from '@/components/command-dock/ResultCard';
import { Settings, Trash2, Plus, FolderOpen } from 'lucide-react';

const CATEGORIES = ['ui', 'form', 'feedback', 'overlay', 'navigation', 'data', 'layout', 'typography', 'patterns'] as const;

const ALL_STATES: ComponentState[] = [
  'default',
  'hover',
  'active',
  'focus',
  'loading',
  'disabled',
  'valid',
  'invalid',
  'warning',
  'selected',
  'unselected',
  'indeterminate',
  'open',
  'closed',
  'idle',
  'success',
  'error',
];

export default function ComponentGallery() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [selectedStates, setSelectedStates] = useState<Set<ComponentState>>(new Set());
  const [showFilters, setShowFilters] = useState(false);

  const components = useMemo(() => getAllComponents(), []);

  const filteredComponents = useMemo(() => {
    return components.filter((component) => {
      // Search filter
      if (searchQuery && !component.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }

      // Category filter
      if (selectedCategories.size > 0 && !selectedCategories.has(component.category)) {
        return false;
      }

      // State filter
      if (selectedStates.size > 0) {
        const hasAnyState = Array.from(selectedStates).some((state) =>
          component.applicableStates.includes(state)
        );
        if (!hasAnyState) return false;
      }

      return true;
    });
  }, [components, searchQuery, selectedCategories, selectedStates]);

  const toggleCategory = (category: string) => {
    const newSet = new Set(selectedCategories);
    if (newSet.has(category)) {
      newSet.delete(category);
    } else {
      newSet.add(category);
    }
    setSelectedCategories(newSet);
  };

  const toggleState = (state: ComponentState) => {
    const newSet = new Set(selectedStates);
    if (newSet.has(state)) {
      newSet.delete(state);
    } else {
      newSet.add(state);
    }
    setSelectedStates(newSet);
  };

  const clearFilters = () => {
    setSelectedCategories(new Set());
    setSelectedStates(new Set());
    setSearchQuery('');
  };

  return (
    <>
      <Head>
        <title>Component Gallery | Design System</title>
      </Head>

      <div className="min-h-screen bg-gray-900 text-white">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-gray-800 border-b border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">Component Gallery</h1>
                <p className="text-sm text-gray-400 mt-1">
                  {filteredComponents.length} components
                </p>
              </div>

              {/* Search */}
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search components..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-500 w-64"
                  />
                </div>

                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md text-sm transition-colors"
                >
                  <Filter className="h-4 w-4" />
                  Filters
                  {(selectedCategories.size > 0 || selectedStates.size > 0) && (
                    <span className="ml-1 px-1.5 py-0.5 bg-gray-600 rounded text-xs">
                      {selectedCategories.size + selectedStates.size}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Filter Panel */}
            {showFilters && (
              <div className="mt-4 p-4 bg-gray-750 rounded-lg border border-gray-700">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold">Filters</h3>
                  {(selectedCategories.size > 0 || selectedStates.size > 0) && (
                    <button
                      onClick={clearFilters}
                      className="text-sm text-gray-400 hover:text-white"
                    >
                      Clear all
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-6">
                  {/* Category filters */}
                  <div>
                    <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2">
                      Categories
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {CATEGORIES.map((category) => (
                        <button
                          key={category}
                          onClick={() => toggleCategory(category)}
                          className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                            selectedCategories.has(category)
                              ? 'bg-white text-gray-900'
                              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          }`}
                        >
                          {category}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* State filters */}
                  <div>
                    <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2">
                      States
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {ALL_STATES.map((state) => (
                        <button
                          key={state}
                          onClick={() => toggleState(state)}
                          className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                            selectedStates.has(state)
                              ? 'bg-white text-gray-900'
                              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          }`}
                        >
                          {getStateLabel(state)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Component List */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {filteredComponents.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400">No components found matching your filters.</p>
            </div>
          ) : (
            <div className="space-y-16">
              {filteredComponents.map((component) => (
                <ComponentSection key={component.name} component={component} />
              ))}
            </div>
          )}
        </main>
      </div>
    </>
  );
}

function ComponentSection({ component }: { component: ComponentMetadata }) {
  const [expandedStates, setExpandedStates] = useState(false);

  return (
    <section id={component.name.toLowerCase()} className="scroll-mt-24">
      {/* Component Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <h2 className="text-2xl font-bold">{component.name}</h2>
          <span className="px-2 py-1 bg-gray-700 rounded text-xs font-medium text-gray-300">
            {component.category}
          </span>
        </div>
        <p className="text-gray-400">{component.description}</p>
      </div>

      {/* Live Previews - State Matrix */}
      <div className="mb-8">
        <h3 className="text-sm font-semibold text-gray-400 uppercase mb-4">Live Preview</h3>
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <ComponentPreview component={component} />
        </div>
      </div>

      {/* Props Table */}
      <div className="mb-8">
        <h3 className="text-sm font-semibold text-gray-400 uppercase mb-4">Props</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-2 px-4 font-semibold text-gray-300">Prop</th>
                <th className="text-left py-2 px-4 font-semibold text-gray-300">Type</th>
                <th className="text-left py-2 px-4 font-semibold text-gray-300">Default</th>
                <th className="text-left py-2 px-4 font-semibold text-gray-300">Description</th>
              </tr>
            </thead>
            <tbody>
              {component.props.map((prop) => (
                <tr key={prop.name} className="border-b border-gray-800">
                  <td className="py-2 px-4 font-mono text-blue-400">
                    {prop.name}
                    {prop.required && <span className="text-red-500 ml-1">*</span>}
                  </td>
                  <td className="py-2 px-4 font-mono text-sm text-gray-400">{prop.type}</td>
                  <td className="py-2 px-4 font-mono text-sm text-gray-400">{prop.default || '—'}</td>
                  <td className="py-2 px-4 text-gray-300">{prop.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Code Example */}
      <div className="mb-8">
        <h3 className="text-sm font-semibold text-gray-400 uppercase mb-4">Example</h3>
        <pre className="bg-gray-800 border border-gray-700 rounded-lg p-4 overflow-x-auto">
          <code className="text-sm text-gray-300">{component.example}</code>
        </pre>
      </div>

      {/* Accessibility Notes */}
      {component.a11y && (
        <div>
          <h3 className="text-sm font-semibold text-gray-400 uppercase mb-4">Accessibility</h3>
          <p className="text-gray-300 text-sm">{component.a11y}</p>
        </div>
      )}
    </section>
  );
}

function ComponentPreview({ component }: { component: ComponentMetadata }) {
  // Render different previews based on component type
  switch (component.name) {
    case 'Button':
      return <ButtonPreview component={component} />;
    case 'IconButton':
      return <IconButtonPreview component={component} />;
    case 'LinkButton':
      return <LinkButtonPreview component={component} />;
    case 'Input':
      return <InputPreview component={component} />;
    case 'Textarea':
      return <TextareaPreview />;
    case 'Checkbox':
      return <CheckboxPreview component={component} />;
    case 'Select':
      return <SelectPreview component={component} />;
    case 'Alert':
      return <AlertPreview component={component} />;
    case 'Badge':
      return <BadgePreview component={component} />;
    case 'Spinner':
      return <SpinnerPreview component={component} />;
    case 'Card':
      return <CardPreview />;
    case 'Stack':
      return <StackPreview />;
    case 'Modal':
      return <ModalPreview />;
    case 'EmptyState':
      return <EmptyStatePreview />;
    case 'CommandBar':
      return <CommandBarPreview />;
    case 'ResultCard':
      return <ResultCardPreview />;
    default:
      return <div className="text-gray-400 text-sm">Preview not yet implemented</div>;
  }
}

// Component-specific preview implementations
function ButtonPreview({ component }: { component: ComponentMetadata }) {
  return (
    <div className="space-y-10">
      {component.variants.map((variant) => (
        <div key={variant.name}>
          <h4 className="text-xs font-semibold text-gray-400 mb-4 uppercase">{variant.name}</h4>
          <div className="flex flex-wrap gap-6 items-center">
            {component.sizes.map((size) => (
              <div key={size} className="space-y-3">
                <Button variant={variant.name as any} size={size as "lg" | "sm" | "md" | undefined}>
                  {variant.name} {size}
                </Button>
                <Button variant={variant.name as any} size={size as "lg" | "sm" | "md" | undefined} loading>
                  Loading
                </Button>
                <Button variant={variant.name as any} size={size as "lg" | "sm" | "md" | undefined} disabled>
                  Disabled
                </Button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function IconButtonPreview({ component }: { component: ComponentMetadata }) {
  return (
    <div className="space-y-10">
      {component.variants.map((variant) => (
        <div key={variant.name}>
          <h4 className="text-xs font-semibold text-gray-400 mb-4 uppercase">{variant.name}</h4>
          <div className="flex flex-wrap gap-6 items-center">
            {component.sizes.map((size) => (
              <React.Fragment key={size}>
                <IconButton variant={variant.name as any} size={size as "lg" | "sm" | "md" | undefined} icon={Settings} aria-label="Settings" />
                <IconButton variant={variant.name as any} size={size as "lg" | "sm" | "md" | undefined} icon={Settings}>
                  With Text
                </IconButton>
                <IconButton variant={variant.name as any} size={size as "lg" | "sm" | "md" | undefined} icon={Settings} loading aria-label="Loading" />
                <IconButton variant={variant.name as any} size={size as "lg" | "sm" | "md" | undefined} icon={Settings} disabled aria-label="Disabled" />
              </React.Fragment>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function LinkButtonPreview({ component }: { component: ComponentMetadata }) {
  return (
    <div className="space-y-10">
      {component.variants.map((variant) => (
        <div key={variant.name}>
          <h4 className="text-xs font-semibold text-gray-400 mb-4 uppercase">{variant.name}</h4>
          <div className="flex flex-wrap gap-6 items-center">
            {component.sizes.map((size) => (
              <React.Fragment key={size}>
                <LinkButton href="#" variant={variant.name as any} size={size as "lg" | "sm" | "md" | undefined}>
                  {variant.name} {size}
                </LinkButton>
                <LinkButton href="#" variant={variant.name as any} size={size as "lg" | "sm" | "md" | undefined} disabled>
                  Disabled
                </LinkButton>
              </React.Fragment>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function InputPreview({ component }: { component: ComponentMetadata }) {
  return (
    <div className="space-y-10 max-w-md">
      {component.sizes.map((size) => (
        <div key={size} className="space-y-5">
          <div>
            <h4 className="text-xs font-semibold text-gray-400 mb-4 uppercase">{size} Size</h4>
            <div className="space-y-4">
              <Input label="Default" size={size as "lg" | "sm" | "md" | undefined} placeholder="Enter text..." />
              <Input label="With Error" size={size as "lg" | "sm" | "md" | undefined} error="This field is required" />
              <Input label="With Success" size={size as "lg" | "sm" | "md" | undefined} success="Looks good!" />
              <Input label="Disabled" size={size as "lg" | "sm" | "md" | undefined} disabled value="Disabled input" />
              <Input label="Password" type="password" size={size as "lg" | "sm" | "md" | undefined} showPasswordToggle />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function TextareaPreview() {
  return (
    <div className="space-y-4 max-w-md">
      <Textarea label="Default" placeholder="Enter description..." />
      <Textarea label="With Error" error="Description is required" />
      <Textarea label="With Character Count" maxLength={200} showCount />
    </div>
  );
}

function CheckboxPreview({ component }: { component: ComponentMetadata }) {
  return (
    <div className="space-y-10">
      {component.sizes.map((size) => (
        <div key={size}>
          <h4 className="text-xs font-semibold text-gray-400 mb-4 uppercase">{size} Size</h4>
          <div className="space-y-3">
            <Checkbox label="Default" size={size as "lg" | "sm" | "md" | undefined} />
            <Checkbox label="Checked" size={size as "lg" | "sm" | "md" | undefined} checked />
            <Checkbox label="Indeterminate" size={size as "lg" | "sm" | "md" | undefined} indeterminate />
            <Checkbox label="Disabled" size={size as "lg" | "sm" | "md" | undefined} disabled />
          </div>
        </div>
      ))}
    </div>
  );
}

function SelectPreview({ component }: { component: ComponentMetadata }) {
  const options = [
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2' },
    { value: 'option3', label: 'Option 3' },
  ];

  return (
    <div className="space-y-10 max-w-md">
      {component.sizes.map((size) => (
        <div key={size}>
          <h4 className="text-xs font-semibold text-gray-400 mb-4 uppercase">{size} Size</h4>
          <div className="space-y-4">
            <Select label="Default" size={size as "lg" | "sm" | "md" | undefined} options={options} placeholder="Select an option" />
            <Select label="With Error" size={size as "lg" | "sm" | "md" | undefined} options={options} error="Please select an option" />
          </div>
        </div>
      ))}
    </div>
  );
}

function AlertPreview({ component }: { component: ComponentMetadata }) {
  return (
    <div className="space-y-4">
      {component.variants.map((variant) => (
        <Alert key={variant.name} variant={variant.name as any} title={`${variant.name} Alert`}>
          This is a {variant.name} message with important information.
        </Alert>
      ))}
    </div>
  );
}

function BadgePreview({ component }: { component: ComponentMetadata }) {
  return (
    <div className="space-y-8">
      {component.sizes.map((size) => (
        <div key={size}>
          <h4 className="text-xs font-semibold text-gray-400 mb-4 uppercase">{size} Size</h4>
          <div className="flex flex-wrap gap-3 items-center">
            {component.variants.map((variant) => (
              <Badge key={variant.name} variant={variant.name as any} size={size as "lg" | "sm" | "md" | undefined}>
                {variant.name}
              </Badge>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function SpinnerPreview({ component }: { component: ComponentMetadata }) {
  return (
    <div className="flex gap-8 items-center">
      {component.sizes.map((size) => (
        <div key={size} className="text-center">
          <Spinner size={size as "lg" | "sm" | "md" | undefined} />
          <p className="text-xs text-gray-400 mt-2">{size}</p>
        </div>
      ))}
    </div>
  );
}

function CardPreview() {
  return (
    <div className="grid grid-cols-3 gap-4">
      <Card padding="md">
        <h3 className="font-semibold mb-2">Default Card</h3>
        <p className="text-sm text-gray-400">Standard card with medium padding</p>
      </Card>
      <Card padding="md" hoverable>
        <h3 className="font-semibold mb-2">Hoverable Card</h3>
        <p className="text-sm text-gray-400">Hover over me!</p>
      </Card>
      <Card padding="md" href="#">
        <h3 className="font-semibold mb-2">Link Card</h3>
        <p className="text-sm text-gray-400">Clickable card</p>
      </Card>
    </div>
  );
}

function StackPreview() {
  return (
    <div className="space-y-10">
      <div>
        <h4 className="text-xs font-semibold text-gray-400 mb-4 uppercase">Vertical Stack</h4>
        <Stack direction="vertical" spacing={4}>
          <div className="bg-gray-700 p-4 rounded">Item 1</div>
          <div className="bg-gray-700 p-4 rounded">Item 2</div>
          <div className="bg-gray-700 p-4 rounded">Item 3</div>
        </Stack>
      </div>
      <div>
        <h4 className="text-xs font-semibold text-gray-400 mb-4 uppercase">Horizontal Stack</h4>
        <Stack direction="horizontal" spacing={4}>
          <div className="bg-gray-700 p-4 rounded">Item 1</div>
          <div className="bg-gray-700 p-4 rounded">Item 2</div>
          <div className="bg-gray-700 p-4 rounded">Item 3</div>
        </Stack>
      </div>
    </div>
  );
}

function ModalPreview() {
  const [isOpen, setIsOpen] = React.useState(false);
  
  return (
    <div>
      <Button onClick={() => setIsOpen(true)}>Open Modal</Button>
      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Example Modal">
        <p className="text-gray-300 mb-4">
          This is an example modal dialog. It traps focus, closes on Escape, and prevents body scroll.
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="tertiary" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => setIsOpen(false)}>
            Confirm
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function EmptyStatePreview() {
  return (
    <div className="space-y-8">
      <EmptyState
        icon={FolderOpen}
        title="No files yet"
        description="Upload your first file to get started"
        action={<Button>Upload File</Button>}
      />
      <EmptyState
        title="No results"
        description="Try adjusting your search or filters"
        size="sm"
      />
    </div>
  );
}

function CommandBarPreview() {
  return (
    <div className="space-y-4">
      <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
        <p className="text-sm text-gray-400 mb-4">
          The CommandBar is mounted globally at the app level. It appears as a floating bar at the bottom of every page.
        </p>
        <div className="bg-gray-800 p-4 rounded border border-gray-600">
          <p className="text-xs text-gray-500 mb-2">Try it now:</p>
          <ul className="text-sm text-gray-300 space-y-1">
            <li>• Press <kbd className="px-2 py-1 bg-gray-700 rounded text-xs">⌘K</kbd> or <kbd className="px-2 py-1 bg-gray-700 rounded text-xs">/</kbd> to focus</li>
            <li>• Type to search artists, releases, or deliverables</li>
            <li>• Try commands like "create artist" or "new release"</li>
            <li>• Click the white <kbd className="px-2 py-1 bg-white text-gray-900 rounded text-xs">+</kbd> button for quick actions</li>
          </ul>
        </div>
      </div>
      <div className="text-xs text-gray-500">
        <strong>Note:</strong> The CommandBar is already active in this app. Look at the bottom of the screen!
      </div>
    </div>
  );
}

function ResultCardPreview() {
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  const mockSearchResults = [
    {
      id: '1',
      type: 'artist' as const,
      title: 'Miles Davis',
      subtitle: 'Jazz • United States',
      href: '#',
    },
    {
      id: '2',
      type: 'release' as const,
      title: 'Kind of Blue',
      subtitle: 'Album • 1959',
      href: '#',
    },
    {
      id: '3',
      type: 'deliverable' as const,
      title: 'Master Audio Files',
      subtitle: 'Audio • Pending',
      href: '#',
    },
  ];

  const mockCommandResult = {
    title: 'Create artist',
    description: 'Open the artist creation form',
  };

  return (
    <div className="space-y-8">
      <div>
        <h4 className="text-xs font-semibold text-gray-400 mb-4 uppercase">Search Results (with icons)</h4>
        <div className="bg-gray-900 rounded-lg p-2 space-y-1 max-w-lg">
          {mockSearchResults.map((result, index) => (
            <ResultCard
              key={result.id}
              result={result}
              isSelected={selectedIndex === index}
              onClick={() => setSelectedIndex(index)}
              resultType="search"
            />
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-2">Click to select, or use ↑/↓ keys in the actual command bar</p>
      </div>

      <div>
        <h4 className="text-xs font-semibold text-gray-400 mb-4 uppercase">Command Result (no icon)</h4>
        <div className="bg-gray-900 rounded-lg p-2 max-w-lg">
          <ResultCard
            result={mockCommandResult}
            isSelected={false}
            onClick={() => {}}
            resultType="command"
          />
        </div>
      </div>
    </div>
  );
}

