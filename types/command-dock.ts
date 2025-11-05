import { NextRouter } from 'next/router';

export type CommandContext = {
  router: NextRouter;
  artistId?: string;
  releaseId?: string;
  route?: string;
  organizationId?: string;
};

export type ResultCardData = { 
  title: string; 
  description?: string; 
  href?: string;
};

export type Command = {
  id: string;
  title: string;
  hint?: string;
  keywords?: string[];
  visible?: (ctx: CommandContext) => boolean;
  run: (query: string, ctx: CommandContext) => Promise<ResultCardData>;
};

export type SearchResultType = 'artist' | 'release' | 'deliverable' | 'folder';

export type SearchResult = {
  id: string;
  type: SearchResultType;
  title: string;
  subtitle?: string;
  href: string;
};

export type TabMode = 'search' | 'commands';

