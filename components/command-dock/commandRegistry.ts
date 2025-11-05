import { Command, CommandContext } from '@/types/command-dock';

export const commands: Command[] = [
  {
    id: 'create:artist',
    title: 'Create artist',
    hint: 'Open the artist creation form',
    keywords: ['new', 'add', 'artist'],
    run: async (_q, ctx) => {
      // Modal will be opened by CommandBar
      return { 
        title: 'Opening artist form...'
      };
    },
  },
  {
    id: 'create:release',
    title: 'Create release',
    hint: 'Open the release creation form',
    keywords: ['new', 'add', 'release', 'album'],
    run: async (_q, ctx) => {
      // Modal will be opened by CommandBar
      return { 
        title: 'Opening release form...'
      };
    },
  },
  {
    id: 'navigate:home',
    title: 'Go to home',
    hint: 'Navigate to home page',
    keywords: ['home', 'dashboard'],
    run: async (_q, ctx) => {
      ctx.router.push('/home');
      return { title: 'Navigated to home', href: '/home' };
    },
  },
  {
    id: 'navigate:artists',
    title: 'Go to artists',
    hint: 'View all artists',
    keywords: ['artists', 'browse'],
    run: async (_q, ctx) => {
      ctx.router.push('/artists');
      return { title: 'Navigated to artists', href: '/artists' };
    },
  },
  {
    id: 'navigate:releases',
    title: 'Go to releases',
    hint: 'View all releases',
    keywords: ['releases', 'browse'],
    run: async (_q, ctx) => {
      ctx.router.push('/releases');
      return { title: 'Navigated to releases', href: '/releases' };
    },
  },
  {
    id: 'navigate:calendar',
    title: 'Go to calendar',
    hint: 'View calendar',
    keywords: ['calendar', 'schedule', 'dates'],
    run: async (_q, ctx) => {
      ctx.router.push('/calendar');
      return { title: 'Navigated to calendar', href: '/calendar' };
    },
  },
  {
    id: 'navigate:settings',
    title: 'Go to settings',
    hint: 'Manage your settings',
    keywords: ['settings', 'preferences', 'config'],
    run: async (_q, ctx) => {
      ctx.router.push('/settings');
      return { title: 'Navigated to settings', href: '/settings' };
    },
  },
  {
    id: 'upload:file',
    title: 'Upload file',
    hint: 'Upload a new file or deliverable',
    keywords: ['upload', 'file', 'deliverable', 'asset'],
    visible: (ctx) => ctx.releaseId !== undefined,
    run: async (_q, ctx) => {
      // TODO: Open file upload modal
      return { 
        title: 'File upload',
        description: 'File upload functionality coming soon'
      };
    },
  },
];

/**
 * Filter commands by query string using fuzzy matching
 */
export function filterCommands(query: string, ctx: CommandContext): Command[] {
  if (!query.trim()) {
    return commands.filter(cmd => !cmd.visible || cmd.visible(ctx));
  }

  const lowerQuery = query.toLowerCase();
  
  return commands
    .filter(cmd => !cmd.visible || cmd.visible(ctx))
    .filter(cmd => {
      const titleMatch = cmd.title.toLowerCase().includes(lowerQuery);
      const hintMatch = cmd.hint?.toLowerCase().includes(lowerQuery);
      const keywordMatch = cmd.keywords?.some(k => k.toLowerCase().includes(lowerQuery));
      return titleMatch || hintMatch || keywordMatch;
    })
    .slice(0, 10); // Limit to 10 results
}

