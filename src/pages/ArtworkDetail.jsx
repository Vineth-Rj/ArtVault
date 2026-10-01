// ArtworkDetail.jsx — ArtVault
// Full artwork detail page: art-first, Gemini insights, unit economics, price chart, buy flow

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Loader } from '../components/common/Loader';
import { AIInsight } from '../components/gemini/AIInsight';
import { PriceChart } from '../components/market/PriceChart';
import { BuyUnitModal } from '../components/market/BuyUnitModal';
import Button from '../components/common/Button';
import { mockArtworks, getArtworkById } from '../data/mockArtworks';
import { mockArtists } from '../data/mockArtists';
import { mockUnits } from '../data/mockUnits';
import { useApp } from '../context/AppContext';
import '../styles/pages.css';

function StatPill({ label, value, accent }) {
  return (
    <div className="stat-card" style={{ flex: '1 1 120px' }}>
      <div className="stat-label">{label}</div>
      <div className={`stat-value${accent ? ' accent' : ''}`}>{value}</div>
    </div>
  );
}

export default function ArtworkDetail() {
  const { id } = useParams();
  const { ownedUnits } = useApp();
  const [buyOpen, setBuyOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('story'); // 'story' | 'gemini' | 'market'

  const artwork = getArtworkById(id);
  const artist = artwork ? mockArtists.find(a => a.id === artwork.artistId) : null;

  // Owned by current user?
  const userOwned = [...ownedUnits, ...mockUnits.filter(u => u.ownerId === 'user-collector-a')]
    .filter(u => u.artworkId === id);

  // Listed units for secondary market
  const listedUnits = mockUnits.filter(u => u.artworkId === id && u.isListed);

  if (!artwork) {
    return (
      <main className="container" style={{ padding: 'var(--space-12) 0' }}>
        <div className="empty-state">
          <div className="empty-state-icon">◻</div>
          <h2 className="empty-state-title">Artwork not found</h2>
          <p className="empty-state-desc">This artwork doesn't exist or has been removed.</p>
          <Link to="/explore" className="btn btn-secondary" style={{ marginTop: 16 }}>
            Back to Explore
          </Link>
        </div>
      </main>
    );
  }

  const soldPercent = Math.round((artwork.unitsSold / artwork.totalUnits) * 100);
  const creatorRoyalty = 10;

  return (
    <main>
      {/* Full-bleed artwork hero */}
      <div className="artwork-detail-hero">
        <div className="artwork-detail-hero-image">
          <img src={artwork.imageUrl} alt={artwork.title} />
          <div className="artwork-detail-hero-overlay" />
        </div>
        <div className="artwork-detail-hero-content container">
          <div className="artwork-detail-meta">
            <span className="tag tag-default">{artwork.category}</span>
            <span className="tag tag-default">{artwork.artType}</span>
          </div>
          <h1 className="artwork-detail-title">{artwork.title}</h1>
          <Link to={`/artist/${artwork.artistId}`} className="artwork-detail-artist-link">
            <div className="artwork-detail-artist-avatar">
              {artist?.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
            </div>
            <div>
              <div className="artwork-detail-artist-name">{artist?.name}</div>
              <div className="artwork-detail-artist-handle">{artist?.handle}</div>
            </div>
          </Link>
        </div>
      </div>

      {/* Main content */}
      <div className="container">
        <div className="artwork-detail-layout">

          {/* LEFT: Art content */}
          <div className="artwork-detail-left">

            {/* Tab nav */}
            <div className="artwork-tabs" role="tablist">
              {[
                { id: 'story', label: 'Artist Story' },
                { id: 'gemini', label: '✦ Gemini Insight' },
                { id: 'market', label: 'Market Data' },
              ].map(tab => (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  className={`artwork-tab-btn${activeTab === tab.id ? ' active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Story tab */}
            {activeTab === 'story' && (
              <div className="artwork-tab-panel">
                <p className="artwork-description">{artwork.description}</p>
                {artwork.story && (
                  <blockquote className="artwork-story-quote">
                    <p>"{artwork.story}"</p>
                    <footer>— {artist?.name}</footer>
                  </blockquote>
                )}
              </div>
            )}

            {/* Gemini tab */}
            {activeTab === 'gemini' && (
              <div className="artwork-tab-panel">
                <AIInsight artwork={artwork} preloaded={artwork.geminiInsight} />
              </div>
            )}

            {/* Market tab */}
            {activeTab === 'market' && (
              <div className="artwork-tab-panel">
                {/* Price chart */}
                <div className="artwork-chart-section">
                  <h3 className="section-label">Price History</h3>
                  <PriceChart data={artwork.priceHistory} height={140} showLabels />
                </div>

                {/* Unit distribution */}
                <div style={{ marginTop: 'var(--space-6)' }}>
                  <h3 className="section-label">Unit Distribution</h3>
                  <div className="unit-progress-bar-wrap">
                    <div className="unit-progress-track">
                      <div
                        className="unit-progress-fill"
                        style={{ width: `${soldPercent}%` }}
                        aria-valuenow={soldPercent}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        role="progressbar"
                      />
                    </div>
                    <div className="unit-progress-labels">
                      <span>{artwork.unitsSold} sold</span>
                      <span>{artwork.unitsAvailable} available</span>
                    </div>
                  </div>
                </div>

                {/* Listed units */}
                {listedUnits.length > 0 && (
                  <div style={{ marginTop: 'var(--space-6)' }}>
                    <h3 className="section-label">Secondary Market Listings</h3>
                    <div className="market-listings-table">
                      {listedUnits.map(unit => (
                        <div key={unit.id} className="market-listing-row">
                          <span className="mono" style={{ color: 'var(--color-text-secondary)' }}>
                            Unit #{unit.unitNumber}
                          </span>
                          <span style={{ color: 'var(--color-text-tertiary)' }}>{unit.ownerName}</span>
                          <span className="mono accent">₹{unit.listingPrice}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* RIGHT: Purchase panel */}
          <aside className="artwork-detail-right">
            <div className="artwork-purchase-panel">
              {/* Price */}
              <div className="purchase-price-section">
                <span className="purchase-price-label">Current Unit Price</span>
                <div className="purchase-price-display">
                  <span className="purchase-price-value">₹{artwork.currentPrice}</span>
                  <span className={`purchase-price-change ${artwork.priceChange >= 0 ? 'positive' : 'negative'}`}>
                    +{artwork.priceChange}% all time
                  </span>
                </div>
                <span className="purchase-price-initial">
                  Initial: ₹{artwork.initialPrice} per unit
                </span>
              </div>

              {/* Key stats */}
              <div className="purchase-stats-grid">
                <StatPill label="Total Units" value={artwork.totalUnits.toLocaleString()} />
                <StatPill label="Holders" value={artwork.holders} />
                <StatPill label="Available" value={artwork.unitsAvailable} accent />
                <StatPill label="Creator Royalty" value={`${creatorRoyalty}%`} />
              </div>

              {/* Volume */}
              <div className="purchase-volume-row">
                <span className="purchase-volume-label">Trading Volume</span>
                <span className="purchase-volume-value mono">₹{artwork.tradingVolume.toLocaleString()}</span>
              </div>

              {/* User owned */}
              {userOwned.length > 0 && (
                <div className="purchase-owned-badge">
                  <span aria-label="Checkmark">✓</span>
                  You own {userOwned.length} unit{userOwned.length > 1 ? 's' : ''} of this artwork
                </div>
              )}

              {/* CTA */}
              <Button
                variant="primary"
                fullWidth
                onClick={() => setBuyOpen(true)}
                disabled={artwork.unitsAvailable === 0}
                style={{ marginTop: 'var(--space-4)' }}
              >
                {artwork.unitsAvailable === 0 ? 'Sold Out' : 'Buy Art Unit'}
              </Button>

              <p className="purchase-disclaimer">
                Buying a unit supports the artist directly (10% royalty on all trades).
                Market price is determined by community transactions.
              </p>
            </div>

            {/* Artist mini-card */}
            {artist && (
              <Link to={`/artist/${artwork.artistId}`} className="artist-mini-card">
                <div className="artist-mini-avatar">
                  {artist.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
                </div>
                <div className="artist-mini-info">
                  <span className="artist-mini-name">{artist.name}</span>
                  <span className="artist-mini-handle">{artist.handle}</span>
                </div>
                <span className="artist-mini-arrow" aria-hidden>→</span>
              </Link>
            )}
          </aside>
        </div>

        {/* Related artworks */}
        <section style={{ marginTop: 'var(--space-16)', marginBottom: 'var(--space-20)' }}>
          <div className="section-header">
            <h2 className="section-title">More from {artist?.name}</h2>
          </div>
          <div className="artwork-grid artwork-grid-3">
            {mockArtworks
              .filter(a => a.artistId === artwork.artistId && a.id !== artwork.id)
              .slice(0, 3)
              .map(a => (
                <Link key={a.id} to={`/artwork/${a.id}`} className="artwork-card" aria-label={a.title}>
                  <div className="artwork-card-image">
                    <img src={a.thumbnailUrl || a.imageUrl} alt={a.title} loading="lazy" />
                    <div className="artwork-card-units-badge">{a.unitsAvailable} left</div>
                  </div>
                  <div className="artwork-card-body">
                    <div>
                      <h3 className="artwork-card-title">{a.title}</h3>
                    </div>
                    <div className="artwork-card-market">
                      <div className="artwork-card-market-item">
                        <span className="market-item-label">Price</span>
                        <span className="market-item-value">₹{a.currentPrice}</span>
                      </div>
                      <div className="artwork-card-market-item">
                        <span className="market-item-label">Change</span>
                        <span className="market-item-value positive">+{a.priceChange}%</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
          </div>
        </section>
      </div>

      {/* Buy modal */}
      <BuyUnitModal
        isOpen={buyOpen}
        onClose={() => setBuyOpen(false)}
        artwork={artwork}
      />
    </main>
  );
}
