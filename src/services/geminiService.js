// geminiService.js — ArtVault
// Connects to:
//   POST /api/ai/analyze-artwork  → { insight: { style, mood, themes, keywords, shortDescription, ... } }
//   GET  /api/ai/status           → { configured, triedModels, lastWorkingModel }
//   GET  /api/ai/expand-query     → { terms: [] }   (search expansion)

import apiClient from './api';

export const geminiService = {
  /**
   * Analyze an artwork with Gemini.
   * Backend: POST /api/ai/analyze-artwork
   * Note: the backend controller calls svc.analyzeProduct(user, productId)
   * via the discovery service — so we send productId (= artwork id in backend).
   */
  async analyzeArtwork({ artworkId, title, description, story, imageUrl }) {
    try {
      const data = await apiClient.post('/ai/analyze-artwork', {
        productId: artworkId,
        title,
        description,
        story,
        imageUrl,
      });
      // Backend returns the insight directly or nested — normalise
      const insight = data.insight ?? data;
      return {
        data: {
          style: insight.style ?? 'Contemporary',
          mood: insight.mood ?? [],
          themes: insight.themes ?? [],
          keywords: insight.keywords ?? insight.aiKeywords ?? [],
          description: insight.shortDescription ?? insight.description ?? '',
          generatedAt: insight.generatedAt ?? new Date().toISOString(),
          usedImage: insight.usedImage ?? false,
        },
        error: null,
      };
    } catch (err) {
      console.warn('[geminiService.analyzeArtwork] Falling back to mock insight:', err.message);
      return getMockInsight(artworkId);
    }
  },

  /**
   * Check whether the Gemini AI is configured on the backend.
   * Backend: GET /api/ai/status
   */
  async getStatus() {
    try {
      const data = await apiClient.get('/ai/status');
      return { data, error: null };
    } catch (err) {
      return { data: { configured: false }, error: err.message };
    }
  },

  /**
   * Expand a search query into related terms.
   * Backend: GET /api/ai/expand-query?q=:query
   */
  async expandQuery(query) {
    try {
      const data = await apiClient.get('/ai/expand-query', { q: query });
      return { data: data.terms ?? [], error: null };
    } catch (err) {
      return { data: [], error: err.message };
    }
  },

  /**
   * (Frontend only) Recommendations based on owned artwork ids.
   * Would need a backend endpoint — returns placeholder for now.
   */
  async getRecommendations(_userId, _ownedArtworkIds = []) {
    return {
      data: {
        recommendations: [],
      },
      error: null,
    };
  },
};

// -----------------------------------------------------------------
// Mock insight fallback (used when backend AI is not configured)
// -----------------------------------------------------------------
function getMockInsight(artworkId) {
  const mockInsights = {
    'artwork-1': {
      style: 'Contemporary Folk',
      mood: ['Nostalgic', 'Peaceful', 'Melancholic'],
      themes: ['Urban solitude', 'Twilight', 'Working class life'],
      keywords: ['sunset', 'city', 'stillness', 'India', 'lockdown'],
      description:
        'A work of quiet intensity — Rahul Mehta captures the transitional hour between daylight and dark with subdued warmth. A meditation on collective solitude.',
      generatedAt: new Date().toISOString(),
    },
    'artwork-2': {
      style: 'Neo-Traditional',
      mood: ['Reverent', 'Ancient', 'Contemplative'],
      themes: ['Heritage', 'Memory', 'Coastline', 'Time'],
      keywords: ['Tamil', 'shore temple', 'ancient', 'gold leaf', 'heritage'],
      description:
        'Ananya Krishnan bridges millennia in a single composition. Gold leaf evokes manuscript traditions while the imagery speaks of erosion — cultural and geological.',
      generatedAt: new Date().toISOString(),
    },
    'artwork-3': {
      style: 'Environmental Landscape',
      mood: ['Urgent', 'Elegiac', 'Beautiful', 'Sorrowful'],
      themes: ['Climate', 'Kerala', 'Monsoon', 'Loss'],
      keywords: ['Kerala backwaters', 'flood', 'monsoon', 'landscape', 'climate'],
      description:
        'Meera Pillai\'s most emotionally charged work. The watercolour medium mirrors the element depicted — fluid, unstable, gorgeous. A document of ecological grief.',
      generatedAt: new Date().toISOString(),
    },
  };

  const insight = mockInsights[artworkId] ?? {
    style: 'Contemporary',
    mood: ['Expressive', 'Dynamic'],
    themes: ['Identity', 'Place', 'Memory'],
    keywords: ['contemporary art', 'India', 'emerging artist'],
    description:
      'A compelling work demonstrating strong command of the medium. Characteristic of a mature artistic voice developing its signature language.',
    generatedAt: new Date().toISOString(),
  };

  return { data: insight, error: null };
}

export default geminiService;
