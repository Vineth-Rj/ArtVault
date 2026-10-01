// marketService.js — ArtVault
// Connects to:
//   GET  /api/products               → browse artworks (explore page)
//   GET  /api/products/:id           → single artwork detail + market + perks
//   GET  /api/market/orders          → open orders/listings
//   POST /api/market/buy             → buy a unit  { productId }
//   POST /api/market/sell            → list a unit { unitId, price }
//   DELETE /api/market/orders/:id    → cancel listing

import apiClient from './api';

export const marketService = {
  /**
   * Browse all artworks.
   * Backend: GET /api/products?category=&q=&sort=&page=&limit=
   * Returns: { items, total, page, pages, limit }
   */
  async getAll(params = {}) {
    try {
      const data = await apiClient.get('/products', params);
      return { data: data.items ?? [], meta: data, error: null };
    } catch (err) {
      console.warn('[marketService.getAll] Falling back to mock:', err.message);
      const { mockArtworks } = await import('../data/mockArtworks');
      return { data: mockArtworks, meta: null, error: null };
    }
  },

  /**
   * Get a single artwork with market data, perks, etc.
   * Backend: GET /api/products/:id → { product, market, perks }
   */
  async getByArtwork(artworkId) {
    try {
      const data = await apiClient.get(`/products/${artworkId}`);
      // Normalize to the shape pages expect
      const product = data.product ?? data;
      return {
        data: {
          artwork: product,
          listedUnits: [],
          currentPrice: Number(product.price),
          initialPrice: Number(product.price),
          priceChange: 0,
          holders: product.soldCount ?? 0,
          tradingVolume: 0,
          unitsAvailable: product.stock ?? 0,
          unitsSold: product.soldCount ?? 0,
          priceHistory: [],
          market: data.market ?? null,
          perks: data.perks ?? [],
        },
        error: null,
      };
    } catch (err) {
      console.warn('[marketService.getByArtwork] Falling back to mock:', err.message);
      const { getArtworkById } = await import('../data/mockArtworks');
      const { getUnitsByArtwork } = await import('../data/mockUnits');
      const artwork = getArtworkById(artworkId);
      if (!artwork) return { data: null, error: 'Artwork not found' };
      const units = getUnitsByArtwork(artworkId);
      return {
        data: {
          artwork,
          listedUnits: units.filter(u => u.isListed),
          currentPrice: artwork.currentPrice,
          initialPrice: artwork.initialPrice,
          priceChange: artwork.priceChange,
          holders: artwork.holders,
          tradingVolume: artwork.tradingVolume,
          unitsAvailable: artwork.unitsAvailable,
          unitsSold: artwork.unitsSold,
          priceHistory: artwork.priceHistory,
          market: null,
          perks: [],
        },
        error: null,
      };
    }
  },

  /**
   * Buy a unit (primary purchase).
   * Backend: POST /api/market/buy { productId }
   * Returns the trade/order record.
   */
  async buyUnit(productId) {
    try {
      const data = await apiClient.post('/market/buy', { productId });
      return { data, error: null };
    } catch (err) {
      return { data: null, error: err.message };
    }
  },

  /**
   * List a unit for sale (secondary market).
   * Backend: POST /api/market/sell { unitId, price }
   */
  async listUnit(unitId, price) {
    try {
      const data = await apiClient.post('/market/sell', { unitId, price });
      return { data, error: null };
    } catch (err) {
      return { data: null, error: err.message };
    }
  },

  /**
   * Cancel an open sell order.
   * Backend: DELETE /api/market/orders/:id
   */
  async cancelListing(orderId) {
    try {
      const data = await apiClient.delete(`/market/orders/${orderId}`);
      return { data, error: null };
    } catch (err) {
      return { data: null, error: err.message };
    }
  },

  /**
   * Get open market orders (secondary listings).
   * Backend: GET /api/market/orders
   */
  async getOrders(params = {}) {
    try {
      const data = await apiClient.get('/market/orders', params);
      return { data: data.orders ?? [], error: null };
    } catch (err) {
      return { data: [], error: err.message };
    }
  },
};

export default marketService;
