// Explore.jsx — ArtVault Discovery Page
import { useState } from 'react';
import { ArtworkCard } from '../components/artwork/ArtworkCard';
import { BuyUnitModal } from '../components/market/BuyUnitModal';
import { mockArtworks } from '../data/mockArtworks';
import '../styles/pages.css';

const CATEGORIES = ['All', 'Urban', 'Landscape', 'Heritage', 'Abstract', 'Documentary'];
const SORT_OPTIONS = [
  { value: 'trending', label: 'Trending' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'volume', label: 'Most Active' },
];

function sortArtworks(artworks, sort) {
  const arr = [...artworks];
  switch (sort) {
    case 'price_asc': return arr.sort((a, b) => a.currentPrice - b.currentPrice);
    case 'price_desc': return arr.sort((a, b) => b.currentPrice - a.currentPrice);
    case 'volume': return arr.sort((a, b) => b.tradingVolume - a.tradingVolume);
    default: return arr.sort((a, b) => b.holders - a.holders);
  }
}

export default function Explore() {
  const [activeCategory, setActiveCategory] = useState('All');
  const [activeSort, setActiveSort] = useState('trending');
  const [buyArtwork, setBuyArtwork] = useState(null);

  const filtered = mockArtworks.filter(aw =>
    activeCategory === 'All' || aw.category === activeCategory
  );
  const sorted = sortArtworks(filtered, activeSort);

  return (
    <main>
      <div className="container">
        {/* Header */}
        <div className="explore-header">
          <h1 className="explore-title">Explore</h1>
          <p className="explore-subtitle">
            Discover emerging artists and the community markets around their work.
          </p>
        </div>

        {/* Filters + Sort */}
        <div className="explore-filters" role="group" aria-label="Filter artworks">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              className={`filter-chip ${activeCategory === cat ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat)}
              aria-pressed={activeCategory === cat}
            >
              {cat}
            </button>
          ))}

          <div className="explore-sort">
            <label htmlFor="sort-select" className="sr-only">Sort by</label>
            <select
              id="sort-select"
              className="input"
              value={activeSort}
              onChange={e => setActiveSort(e.target.value)}
              style={{ padding: '6px 12px', height: '36px', fontSize: 'var(--text-sm)' }}
            >
              {SORT_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Results count */}
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-tertiary)', marginBottom: '24px' }}>
          {sorted.length} artwork{sorted.length !== 1 ? 's' : ''} found
        </p>

        {/* Grid */}
        {sorted.length > 0 ? (
          <div className="artwork-grid artwork-grid-3">
            {sorted.map(aw => (
              <ArtworkCard key={aw.id} artwork={aw} onBuy={setBuyArtwork} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">◻</div>
            <h3 className="empty-state-title">No artworks found</h3>
            <p className="empty-state-desc">Try a different category or check back soon.</p>
          </div>
        )}

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
