import NodeCache from "node-cache";

// Single unified cache instance with aggressive caching
export const templateCache = new NodeCache({
  stdTTL: 7 * 24 * 60 * 60, // 7 days - aggressive caching since templates rarely change
  checkperiod: 2 * 60 * 60,  // Check every 2 hours for expired keys
  useClones: false,          // Better performance, templates are read-only
  maxKeys: 2000,            // Higher limit to accommodate all template data
  deleteOnExpire: true,     // Automatically delete expired keys
  forceString: false,       // Allow storing objects
});

// Helper to generate consistent cache keys with prefixes for organization
export function generateTemplateCacheKey(templateId: string, fileType: string): string {
  const normalizedId = templateId.toLowerCase().trim();
  const normalizedFileType = fileType.toLowerCase().trim();
  return `file:${normalizedId}:${normalizedFileType}`;
}



// Enhanced cache invalidation with pattern matching
export function invalidateTemplateCache(templateId?: string) {
  if (templateId) {
    // Invalidate all keys related to specific template
    const normalizedId = templateId.toLowerCase();
    const keys = templateCache.keys();
    const templateKeys = keys.filter(key => 
      key.includes(`:${normalizedId}:`) || key.includes(`:${normalizedId}`)
    );
    
    templateKeys.forEach(key => templateCache.del(key));
    console.log(`Invalidated ${templateKeys.length} cache entries for template: ${templateId}`);
  } else {
    // Invalidate all template caches
    templateCache.flushAll();
    console.log('Invalidated all template cache entries');
  }
}



// export function generateTemplateListCacheKey(): string {
//   return "list:all_templates";
// }

// export function generateTemplateDetailsCacheKey(templateId: string): string {
//   return `details:${templateId.toLowerCase()}`;
// }
// // Invalidate specific cache types
// export function invalidateTemplateListCache() {
//   const keys = templateCache.keys();
//   const listKeys = keys.filter(key => key.startsWith('list:'));
//   listKeys.forEach(key => templateCache.del(key));
//   console.log(`Invalidated ${listKeys.length} template list cache entries`);
// }

// export function invalidateTemplateDetailsCache(templateId?: string) {
//   if (templateId) {
//     templateCache.del(generateTemplateDetailsCacheKey(templateId));
//   } else {
//     const keys = templateCache.keys();
//     const detailKeys = keys.filter(key => key.startsWith('details:'));
//     detailKeys.forEach(key => templateCache.del(key));
//     console.log(`Invalidated ${detailKeys.length} template details cache entries`);
//   }
// }

// // Cache statistics for monitoring
// export function getCacheStats() {
//   return {
//     keys: templateCache.keys().length,
//     stats: templateCache.getStats(),
//     memoryUsage: process.memoryUsage(),
//   };
// }

