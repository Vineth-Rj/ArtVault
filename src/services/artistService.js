// artistService.js — ArtVault
// Connects to:
//   GET  /api/products?artistId=:id        → artist's products
//   GET  /api/products/:id                 → single product detail
//   GET  /api/artist/products              → my products (authenticated artist)
//   GET  /api/artist/market                → my market config
//   POST /api/artist/market                → create/update artist market

import apiClient from './api';

export const artistService = {
  /**
   * Get all products for a specific artist (public).
   * Falls back to mock data if backend unavailable.
   */
  async getAll() {
    try {
      const data = await apiClient.get('/products');
      // Backend returns { items, total, page, pages, limit }
      // Normalise to array for backward compat
      const items = data.items ?? data ?? [];
      return { data: items, error: null };
    } catch (err) {
      console.warn('[artistService.getAll] Backend unavailable, using mock data:', err.message);
      const { mockArtists } = await import('../data/mockArtists');
      return { data: mockArtists, error: null };
    }
  },

  /**
   * Get a single artist profile.
   * Backend doesn't have a dedicated /api/artist/:id public endpoint,
   * so we embed artist data in the product response via the `artist` relation.
   * We fetch the artist's products and extract artist from the first one.
   */
  async getById(id) {
    try {
      const data = await apiClient.get('/products', { artistId: id, limit: 1 });
      const items = data.items ?? [];
      if (items.length > 0 && items[0].artist) {
        return { data: items[0].artist, error: null };
      }
      return { data: null, error: 'Artist not found' };
    } catch (err) {
      console.warn('[artistService.getById] Falling back to mock:', err.message);
      const { getArtistById } = await import('../data/mockArtists');
      const artist = getArtistById(id);
      return artist
        ? { data: artist, error: null }
        : { data: null, error: 'Artist not found' };
    }
  },

  /**
   * Get all products by a specific artist (public profile page).
   * Backend: GET /api/products?artistId=:id
   */
  async getArtworks(artistId) {
    try {
      const data = await apiClient.get('/products', { artistId, limit: 50 });
      return { data: data.items ?? [], error: null };
    } catch (err) {
      console.warn('[artistService.getArtworks] Falling back to mock:', err.message);
      const { getArtworksByArtist } = await import('../data/mockArtworks');
      return { data: getArtworksByArtist(artistId), error: null };
    }
  },

  /**
   * Get the authenticated artist's own product list.
   * Backend: GET /api/artist/products  (requires ARTIST role + auth)
   */
  async getMyProducts() {
    try {
      const data = await apiClient.get('/artist/products');
      return { data: data.products ?? [], error: null };
    } catch (err) {
      return { data: [], error: err.message };
    }
  },

  /**
   * Get the authenticated artist's market configuration.
   * Backend: GET /api/artist/market
   */
  async getMyMarket() {
    try {
      const data = await apiClient.get('/artist/market');
      return { data, error: null };
    } catch (err) {
      return { data: null, error: err.message };
    }
  },

  /**
   * Create or update the artist's market.
   * Backend: POST /api/artist/market
   */
  async createMarket(params) {
    try {
      const data = await apiClient.post('/artist/market', params);
      return { data, error: null };
    } catch (err) {
      return { data: null, error: err.message };
    }
  },

  /**
   * Legacy getDashboard — kept for ArtistProfile backward compat
   */
  async getDashboard(artistId) {
    try {
      const [artworksRes] = await Promise.all([
        this.getArtworks(artistId),
      ]);
      const artworks = artworksRes.data ?? [];
      const totalPrimaryEarnings = artworks.reduce((acc, aw) => {
        return acc + (Number(aw.price || 0) * (aw.soldCount || 0));
      }, 0);
      return {
        data: {
          artworks,
          totalPrimaryEarnings,
          totalSecondaryRoyalties: 0, // would need separate endpoint
          totalHolders: 0,
          totalUnitsSold: artworks.reduce((a, aw) => a + (aw.soldCount || 0), 0),
          totalTradingVolume: 0,
        },
        error: null,
      };
    } catch (err) {
      return { data: null, error: err.message };
    }
  },
};

export default artistService;
