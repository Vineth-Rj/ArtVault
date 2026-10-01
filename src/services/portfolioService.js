// portfolioService.js — ArtVault
// Connects to (all require auth JWT):
//   GET /api/portfolio          → summary: { totalInvested, totalCurrentValue, unrealizedGain, ... }
//   GET /api/portfolio/units    → owned art units
//   GET /api/portfolio/history  → transaction history
//   GET /api/portfolio/wallet   → wallet balance + recent wallet txns
//   GET /api/portfolio/payouts  → royalty payouts

import apiClient from './api';

export const portfolioService = {
  /**
   * Full portfolio summary with enriched units.
   * Backend: GET /api/portfolio
   */
  async getPortfolio() {
    try {
      const summary = await apiClient.get('/portfolio');
      const units = await apiClient.get('/portfolio/units');
      const wallet = await apiClient.get('/portfolio/wallet');

      return {
        data: {
          units: units.units ?? units ?? [],
          wallet: wallet.wallet ?? wallet ?? { balance: 0 },
          totalInvested: summary.totalInvested ?? 0,
          totalCurrentValue: summary.totalCurrentValue ?? 0,
          unrealizedGain: summary.unrealizedGain ?? 0,
          unrealizedGainPercent: summary.unrealizedGainPercent ?? 0,
        },
        error: null,
      };
    } catch (err) {
      console.warn('[portfolioService] Falling back to mock:', err.message);
      // Fallback to mock data when user is not logged in / backend unavailable
      const { getUnitsByOwner, mockWallet } = await import('../data/mockUnits');
      const { getArtworkById } = await import('../data/mockArtworks');
      const { getArtistById } = await import('../data/mockArtists');

      const units = getUnitsByOwner('user-collector-a');
      const enrichedUnits = units.map(unit => {
        const artwork = getArtworkById(unit.artworkId);
        const artist = artwork ? getArtistById(artwork.artistId) : null;
        const currentValue = artwork ? artwork.currentPrice : unit.currentPrice;
        const gainLoss = currentValue - unit.purchasePrice;
        const gainLossPercent = ((gainLoss / unit.purchasePrice) * 100).toFixed(1);
        return { ...unit, artwork, artist, currentValue, gainLoss, gainLossPercent: parseFloat(gainLossPercent) };
      });
      const totalInvested = enrichedUnits.reduce((a, u) => a + u.purchasePrice, 0);
      const totalCurrentValue = enrichedUnits.reduce((a, u) => a + u.currentValue, 0);
      const unrealizedGain = totalCurrentValue - totalInvested;

      return {
        data: {
          units: enrichedUnits,
          wallet: mockWallet,
          totalInvested,
          totalCurrentValue,
          unrealizedGain,
          unrealizedGainPercent: totalInvested > 0 ? parseFloat(((unrealizedGain / totalInvested) * 100).toFixed(1)) : 0,
        },
        error: null,
      };
    }
  },

  /**
   * Transaction history.
   * Backend: GET /api/portfolio/history
   */
  async getTransactionHistory() {
    try {
      const data = await apiClient.get('/portfolio/history');
      return { data: data.history ?? data ?? [], error: null };
    } catch (err) {
      const { mockTransactions } = await import('../data/mockUnits');
      return { data: mockTransactions, error: null };
    }
  },

  /**
   * Wallet balance.
   * Backend: GET /api/portfolio/wallet
   */
  async getWallet() {
    try {
      const data = await apiClient.get('/portfolio/wallet');
      return { data: data.wallet ?? data, error: null };
    } catch (err) {
      const { mockWallet } = await import('../data/mockUnits');
      return { data: mockWallet, error: null };
    }
  },

  /**
   * Royalty payouts (artist-specific).
   * Backend: GET /api/portfolio/payouts
   */
  async getPayouts() {
    try {
      const data = await apiClient.get('/portfolio/payouts');
      return { data: data.payouts ?? data ?? [], error: null };
    } catch (err) {
      return { data: [], error: err.message };
    }
  },
};

export default portfolioService;
