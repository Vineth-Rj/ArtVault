// Marketplace.jsx — ArtVault Live Market
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { mockArtworks } from '../data/mockArtworks';
import { mockArtists } from '../data/mockArtists';
import { mockUnits } from '../data/mockUnits';
import { BuyUnitModal } from '../components/market/BuyUnitModal';
import { PriceChart } from '../components/market/PriceChart';
import Button from '../components/common/Button';
import '../styles/pages.css';

const SORT_OPTIONS = [
  { value: 'volume', label: 'Highest Volume' },
  { value: 'price_high', label: 'Price: High → Low' },
  { value: 'price_low', label: 'Price: Low → High' },
  { value: 'change', label: 'Best Performers' },
  { value: 'holders', label: 'Most Holders' },
];

function sortArtworks(artworks, sort) {
  const arr = [...artworks];
  switch (sort) {
    case 'volume': return arr.sort((a, b) => b.tradingVolume - a.tradingVolume);
    case 'price_high': return arr.sort((a, b) => b.currentPrice - a.currentPrice);
    case 'price_low': return arr.sort((a, b) => a.currentPrice - b.currentPrice);
    case 'change': return arr.sort((a, b) => b.priceChange - a.priceChange);
    case 'holders': return arr.sort((a, b) => b.holders - a.holders);
    default: return arr;
  }
}

function MarketRow({ artwork, rank, onBuy }) {
  const artist = mockArtists.find(a => a.id === artwork.artistId);
  const isPositive = artwork.priceChange >= 0;
  const soldPercent = Math.round((artwork.unitsSold / artwork.totalUnits) * 100);

  return (
    <div className="market-row" role="row">
      <div className="market-row-rank">#{rank}</div>

      <Link to={`/artwork/${artwork.id}`} className="market-row-art">
        <img src={artwork.thumbnailUrl || artwork.imageUrl} alt={artwork.title} className="market-thumb" />
        <div>
          <div className="market-row-title">{artwork.title}</div>
          <div className="market-row-artist">{artist?.name}</div>
        </div>
      </Link>

      <div className="market-row-price mono accent">₹{artwork.currentPrice}</div>

      <div className={`market-row-change mono ${isPositive ? 'positive' : 'negative'}`}>
        {isPositive ? '+' : ''}{artwork.priceChange}%
      </div>

      <div className="market-row-chart">
        <PriceChart data={artwork.priceHistory} height={40} showLabels={false} />
      </div>

      <div className="market-row-stats">
        <span className="market-row-stat">
          <span className="market-row-stat-label">Vol</span>
          <span className="mono">₹{artwork.tradingVolume.toLocaleString()}</span>
        </span>
        <span className="market-row-stat">
          <span className="market-row-stat-label">Holders</span>
          <span className="mono">{artwork.holders}</span>
        </span>
      </div>

      <div className="market-row-avail">
        <div className="avail-bar-track">
          <div className="avail-bar-fill" style={{ width: `${soldPercent}%` }} />
        </div>
        <span className="avail-label">{artwork.unitsAvailable} left</span>
      </div>

      <div className="market-row-action">
        <Button
          variant="primary"
          size="sm"
          onClick={() => onBuy(artwork)}
          disabled={artwork.unitsAvailable === 0}
        >
          {artwork.unitsAvailable === 0 ? 'Sold Out' : 'Buy'}
        </Button>
      </div>
    </div>
  );
}

export default function Marketplace() {
  const [sort, setSort] = useState('volume');
  const [buyArtwork, setBuyArtwork] = useState(null);

  const sorted = sortArtworks(mockArtworks, sort);

  // Market summary stats
  const totalVolume = mockArtworks.reduce((s, a) => s + a.tradingVolume, 0);
  const totalHolders = mockArtworks.reduce((s, a) => s + a.holders, 0);
  const totalUnitsSold = mockArtworks.reduce((s, a) => s + a.unitsSold, 0);
  const listedCount = mockUnits.filter(u => u.isListed).length;

  // Top gainers
  const topGainers = [...mockArtworks].sort((a, b) => b.priceChange - a.priceChange).slice(0, 3);

  return (
    <main>
      <div className="container">

        {/* Header */}
        <div className="page-header">
          <div>
            <h1 className="page-title">Live Market</h1>
            <p className="page-subtitle">Art Unit prices move with community transactions</p>
          </div>
        </div>

        {/* Market summary */}
        <div className="market-summary-grid">
          <div className="market-summary-card">
            <span className="market-summary-label">24h Trading Volume</span>
            <span className="market-summary-value mono">₹{totalVolume.toLocaleString()}</span>
          </div>
          <div className="market-summary-card">
            <span className="market-summary-label">Active Collectors</span>
            <span className="market-summary-value">{totalHolders}</span>
          </div>
          <div className="market-summary-card">
            <span className="market-summary-label">Units Traded</span>
            <span className="market-summary-value">{totalUnitsSold.toLocaleString()}</span>
          </div>
          <div className="market-summary-card">
            <span className="market-summary-label">Secondary Listings</span>
            <span className="market-summary-value accent">{listedCount}</span>
          </div>
        </div>

        {/* Top gainers strip */}
        <div className="top-gainers-strip">
          <span className="top-gainers-label">Top Performers</span>
          {topGainers.map(art => (
            <Link key={art.id} to={`/artwork/${art.id}`} className="gainer-chip">
              <span className="gainer-chip-title">{art.title}</span>
              <span className="gainer-chip-change positive">+{art.priceChange}%</span>
            </Link>
          ))}
        </div>

        {/* Sort controls */}
        <div className="market-controls">
          <div className="market-controls-left">
            <span className="market-count">{mockArtworks.length} artworks</span>
          </div>
          <div className="filter-group">
            {SORT_OPTIONS.map(opt => (
              <button
                key={opt.value}
                className={`filter-btn${sort === opt.value ? ' active' : ''}`}
                onClick={() => setSort(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Market table header */}
        <div className="market-table-header" role="rowheader">
          <span></span>
          <span>Artwork</span>
          <span>Price</span>
          <span>Change</span>
          <span>Trend</span>
          <span>Volume / Holders</span>
          <span>Supply</span>
          <span></span>
        </div>

        {/* Market rows */}
        <div className="market-table" role="table" aria-label="Artwork market table">
          {sorted.map((artwork, i) => (
            <MarketRow
              key={artwork.id}
              artwork={artwork}
              rank={i + 1}
              onBuy={setBuyArtwork}
            />
          ))}
        </div>

        <div style={{ height: 'var(--space-20)' }} />
      </div>

      {buyArtwork && (
        <BuyUnitModal
          isOpen={!!buyArtwork}
          onClose={() => setBuyArtwork(null)}
          artwork={buyArtwork}
        />
      )}
    </main>
  );
}
