/**
 * Component Metadata System
 * 
 * This system allows components to export metadata about their states,
 * variants, sizes, and props. The gallery uses this metadata to automatically
 * generate comprehensive state matrices and documentation.
 */

export type ComponentState =
  // Interaction states
  | 'default'
  | 'hover'
  | 'active'
  | 'focus'
  | 'pressed'
  | 'loading'
  | 'disabled'
  // Validation states
  | 'valid'
  | 'invalid'
  | 'warning'
  // Selection states
  | 'selected'
  | 'unselected'
  | 'indeterminate'
  // Disclosure states
  | 'open'
  | 'closed'
  // Async states
  | 'idle'
  | 'success'
  | 'error';

export type ComponentSize = 'sm' | 'md' | 'lg' | 'xl';

export interface ComponentProp {
  name: string;
  type: string;
  default?: string;
  required: boolean;
  description: string;
}

export interface ComponentVariant {
  name: string;
  description: string;
  // Which states apply to this variant (undefined = all states apply)
  applicableStates?: ComponentState[];
}

export interface ComponentMetadata {
  /** Component name */
  name: string;
  
  /** Short one-line description */
  description: string;
  
  /** Component category */
  category: 'ui' | 'form' | 'feedback' | 'overlay' | 'navigation' | 'data' | 'layout' | 'typography' | 'patterns';
  
  /** Available variants */
  variants: ComponentVariant[];
  
  /** Available sizes */
  sizes: ComponentSize[];
  
  /** Which states apply to this component */
  applicableStates: ComponentState[];
  
  /** Component props documentation */
  props: ComponentProp[];
  
  /** Example usage code */
  example: string;
  
  /** Accessibility notes */
  a11y?: string;
}

/**
 * Registry of all component metadata.
 * Components register themselves here on module load.
 */
export const componentRegistry = new Map<string, ComponentMetadata>();

/**
 * Register a component's metadata in the global registry
 */
export function registerComponent(metadata: ComponentMetadata): void {
  componentRegistry.set(metadata.name, metadata);
}

/**
 * Get all registered components
 */
export function getAllComponents(): ComponentMetadata[] {
  return Array.from(componentRegistry.values());
}

/**
 * Get components by category
 */
export function getComponentsByCategory(category: ComponentMetadata['category']): ComponentMetadata[] {
  return getAllComponents().filter(c => c.category === category);
}

/**
 * Get a specific component's metadata
 */
export function getComponent(name: string): ComponentMetadata | undefined {
  return componentRegistry.get(name);
}

/**
 * Helper to create state props for a component
 * This generates the props needed to simulate different states
 */
export function getStateProps(state: ComponentState): Record<string, any> {
  const stateProps: Record<string, any> = {};
  
  switch (state) {
    case 'default':
      // No special props
      break;
    case 'hover':
      stateProps['data-hover'] = true;
      break;
    case 'active':
      stateProps['data-active'] = true;
      break;
    case 'focus':
      stateProps['data-focus'] = true;
      break;
    case 'pressed':
      stateProps['data-pressed'] = true;
      break;
    case 'loading':
      stateProps.loading = true;
      break;
    case 'disabled':
      stateProps.disabled = true;
      break;
    case 'valid':
      stateProps.valid = true;
      break;
    case 'invalid':
      stateProps.invalid = true;
      stateProps.error = 'Error message';
      break;
    case 'warning':
      stateProps.warning = 'Warning message';
      break;
    case 'selected':
      stateProps.selected = true;
      break;
    case 'unselected':
      stateProps.selected = false;
      break;
    case 'indeterminate':
      stateProps.indeterminate = true;
      break;
    case 'open':
      stateProps.open = true;
      break;
    case 'closed':
      stateProps.open = false;
      break;
    case 'idle':
      // Default async state
      break;
    case 'success':
      stateProps.success = true;
      break;
    case 'error':
      stateProps.error = 'Error occurred';
      break;
  }
  
  return stateProps;
}

/**
 * Helper to check if a state applies to a variant
 */
export function stateAppliesTo(
  state: ComponentState,
  variant: ComponentVariant,
  component: ComponentMetadata
): boolean {
  // Check if state is in component's applicable states
  if (!component.applicableStates.includes(state)) {
    return false;
  }
  
  // If variant doesn't specify applicable states, all component states apply
  if (!variant.applicableStates) {
    return true;
  }
  
  // Check if state is in variant's applicable states
  return variant.applicableStates.includes(state);
}

/**
 * Get formatted state label for display
 */
export function getStateLabel(state: ComponentState): string {
  return state.charAt(0).toUpperCase() + state.slice(1);
}

