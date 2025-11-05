import { supabase } from '@/lib/supabase';
import { SearchResult } from '@/types/command-dock';

/**
 * Search for artists by name
 */
export async function searchArtists(query: string): Promise<SearchResult[]> {
  if (!query.trim()) return [];

  try {
    const { data, error } = await supabase
      .from('artists')
      .select('id, name, region, country')
      .ilike('name', `%${query}%`)
      .limit(10);

    if (error) {
      console.error('Error searching artists:', error);
      return [];
    }

    return (data ?? []).map(artist => ({
      id: artist.id,
      type: 'artist' as const,
      title: artist.name,
      subtitle: [artist.region, artist.country].filter(Boolean).join(' • '),
      href: `/artists/${artist.id}`,
    }));
  } catch (error) {
    console.error('Error searching artists:', error);
    return [];
  }
}

/**
 * Search for releases by title
 */
export async function searchReleases(query: string): Promise<SearchResult[]> {
  if (!query.trim()) return [];

  try {
    const { data, error } = await supabase
      .from('releases')
      .select('id, title, type, catalog_number, status')
      .ilike('title', `%${query}%`)
      .limit(10);

    if (error) {
      console.error('Error searching releases:', error);
      return [];
    }

    return (data ?? []).map(release => ({
      id: release.id,
      type: 'release' as const,
      title: release.title,
      subtitle: [release.type, release.catalog_number, release.status]
        .filter(Boolean)
        .join(' • '),
      href: `/releases/${release.id}`,
    }));
  } catch (error) {
    console.error('Error searching releases:', error);
    return [];
  }
}

/**
 * Search for deliverables and files
 */
export async function searchAssets(query: string): Promise<SearchResult[]> {
  if (!query.trim()) return [];

  try {
    // Search deliverables
    const { data: deliverables, error: delError } = await supabase
      .from('deliverables')
      .select(`
        id, 
        name, 
        type, 
        status,
        release:releases(title)
      `)
      .ilike('name', `%${query}%`)
      .limit(5);

    if (delError) {
      console.error('Error searching deliverables:', delError);
    }

    const deliverableResults: SearchResult[] = (deliverables ?? []).map(del => ({
      id: del.id,
      type: 'deliverable' as const,
      title: del.name,
      subtitle: [del.type, (del.release as any)?.title, del.status]
        .filter(Boolean)
        .join(' • '),
      href: `/deliverables/${del.id}`,
    }));

    // TODO: Search folders when needed
    // const { data: folders } = await supabase
    //   .from('folders')
    //   .select('id, name, description')
    //   .ilike('name', `%${query}%`)
    //   .limit(5);

    return deliverableResults;
  } catch (error) {
    console.error('Error searching assets:', error);
    return [];
  }
}

/**
 * Search all content types and interleave results
 */
export async function searchAll(query: string): Promise<SearchResult[]> {
  if (!query.trim()) return [];

  const [artists, releases, assets] = await Promise.all([
    searchArtists(query),
    searchReleases(query),
    searchAssets(query),
  ]);

  // Interleave results: Artists → Releases → Assets
  const results: SearchResult[] = [];
  const maxLength = Math.max(artists.length, releases.length, assets.length);

  for (let i = 0; i < maxLength; i++) {
    if (artists[i]) results.push(artists[i]);
    if (releases[i]) results.push(releases[i]);
    if (assets[i]) results.push(assets[i]);
  }

  return results.slice(0, 10);
}

/**
 * Parse query for prefixes and route to appropriate search
 */
export async function search(query: string): Promise<SearchResult[]> {
  const trimmedQuery = query.trim();
  
  if (!trimmedQuery) return [];

  // Check for prefixes
  if (trimmedQuery.startsWith('a:')) {
    return searchArtists(trimmedQuery.slice(2).trim());
  }
  
  if (trimmedQuery.startsWith('r:')) {
    return searchReleases(trimmedQuery.slice(2).trim());
  }
  
  if (trimmedQuery.startsWith('f:') || trimmedQuery.startsWith('d:')) {
    return searchAssets(trimmedQuery.slice(2).trim());
  }

  // No prefix: search all
  return searchAll(trimmedQuery);
}

