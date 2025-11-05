/**
 * Simple in-memory cache for frequently accessed data
 * Helps reduce database queries for permission checks and data fetching
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

interface PendingRequest<T> {
  promise: Promise<T>;
  timestamp: number;
}

class MemoryCache {
  private cache = new Map<string, CacheEntry<any>>();
  private pendingRequests = new Map<string, PendingRequest<any>>();
  
  set<T>(key: string, data: T, ttlMs: number = 300000): void { // Default 5min TTL (was 30s)
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs
    });
  }
  
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data as T;
  }
  
  // Request deduplication: prevent multiple simultaneous identical requests
  async getOrFetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlMs: number = 300000
  ): Promise<T> {
    // Check cache first
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }
    
    // Check if there's already a pending request for this key
    const pending = this.pendingRequests.get(key);
    if (pending) {
      // Reuse the existing promise
      return pending.promise;
    }
    
    // Create new request
    const promise = fetcher()
      .then(result => {
        this.set(key, result, ttlMs);
        this.pendingRequests.delete(key);
        return result;
      })
      .catch(error => {
        this.pendingRequests.delete(key);
        throw error;
      });
    
    this.pendingRequests.set(key, { promise, timestamp: Date.now() });
    return promise;
  }
  
  delete(key: string): void {
    this.cache.delete(key);
  }
  
  clear(): void {
    this.cache.clear();
  }
  
  // Clean expired entries
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }
}

// Global cache instance
export const cache = new MemoryCache();

// Cache key generators
export const cacheKeys = {
  userAccess: (userId: string, resourceType: string, resourceId: string) => 
    `user_access:${userId}:${resourceType}:${resourceId}`,
  accessibleArtists: (userId: string) => 
    `accessible_artists:${userId}`,
  accessibleReleases: (userId: string) => 
    `accessible_releases:${userId}`,
  accessibleArtistReleases: (userId: string, artistId: string) => 
    `accessible_artist_releases:${userId}:${artistId}`,
  userPermissions: (userId: string) => 
    `user_permissions:${userId}`
};

// Cleanup expired entries every 5 minutes
if (typeof window !== 'undefined') {
  setInterval(() => {
    cache.cleanup();
  }, 5 * 60 * 1000);
}

// Clear cache when user logs out
export const clearUserCache = (userId: string) => {
  const keysToDelete: string[] = [];
  
  // Find all keys that contain this user ID
  for (const key of cache['cache'].keys()) {
    if (key.includes(userId)) {
      keysToDelete.push(key);
    }
  }
  
  // Delete all user-related cache entries
  keysToDelete.forEach(key => cache.delete(key));
};

// Invalidate cache when permissions change
export const invalidateAccessCache = (userId?: string, resourceType?: string, resourceId?: string) => {
  if (userId && resourceType && resourceId) {
    // Invalidate specific resource access
    cache.delete(cacheKeys.userAccess(userId, resourceType, resourceId));
  }
  
  if (userId) {
    // Invalidate all user's cached data
    cache.delete(cacheKeys.accessibleArtists(userId));
    cache.delete(cacheKeys.accessibleReleases(userId));
    cache.delete(cacheKeys.userPermissions(userId));
    
    // Clear artist-specific and org-specific caches
    const keysToDelete: string[] = [];
    for (const key of cache['cache'].keys()) {
      if (key.startsWith(`accessible_artist_releases:${userId}:`)) {
        keysToDelete.push(key);
      }
      // Also clear org-specific accessible releases caches
      if (key.startsWith(`accessible_releases:${userId}_org_`)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => cache.delete(key));
  } else {
    // Clear all caches (nuclear option)
    cache.clear();
  }
};
