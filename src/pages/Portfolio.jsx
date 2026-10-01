// Portfolio.jsx — ArtVault Collector Portfolio
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { mockUnits, mockTransactions } from '../data/mockUnits';
import { mockArtworks } from '../data/mockArtworks';
import { mockArtists } from '../data/mockArtists';
import { EmptyState } from '../components/common/EmptyState';
import Button from '../components/common/Button';
import '../styles/pages.css';

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function HoldingRow({ unit, onList }) {
  const artwork = mockArtworks.find(a => a.id === unit.artworkId);
  const artist = artwork ? mockArtists.find(a => a.id === artwork.artistId) : null;
  const pnl = unit.currentPrice - unit.purchasePrice;
  const pnlPercent = ((pnl / unit.purchasePrice) * 100).toFixed(1);
  const isProfit = pnl >= 0;

  if (!artwork) return null;

  return (
    <div className="holding-row">
      <Link to={`/artwork/${artwork.id}`} className="holding-row-art">
        <img src={artwork.thumbnailUrl || artwork.imageUrl} alt={artwork.title} className="holding-thumb" />
        <div>
          <div className="holding-title">{artwork.title}</div>
          <div className="holding-artist">{artist?.name}</div>
          <div className="holding-unit-num">Unit #{unit.unitNumber}</div>
        </div>
      </Link>

      <div className="holding-row-data">
        <div className="holding-data-item">
          <span className="holding-data-label">Bought at</span>
          <span className="holding-data-value mono">₹{unit.purchasePrice}</span>
        </div>
        <div className="holding-data-item">
          <span className="holding-data-label">Current</span>
          <span className="holding-data-value mono accent">₹{unit.currentPrice}</span>
        </div>
        <div className="holding-data-item">
          <span className="holding-data-label">P&L</span>
          <span className={`holding-data-value mono ${isProfit ? 'positive' : 'negative'}`}>
            {isProfit ? '+' : ''}₹{pnl} ({isProfit ? '+' : ''}{pnlPercent}%)
          </span>
        </div>
        <div className="holding-data-item">
          <span className="holding-data-label">Status</span>
          <span className={`tag ${unit.isListed ? 'tag-accent' : 'tag-default'}`}>
            {unit.isListed ? `Listed @ ₹${unit.listingPrice}` : 'Holding'}
          </span>
        </div>
      </div>
    </div>
  );
}

function TransactionRow({ tx }) {
  const isBuy = tx.type === 'buy';
  return (
    <div className="tx-row">
      <div className="tx-type-badge" data-type={tx.type}>
        {isBuy ? '↓ Buy' : '↑ Sell'}
      </div>
      <div className="tx-info">
        <div className="tx-artwork-title">{tx.artworkTitle}</div>
        <div className="tx-meta">Unit #{tx.unitNumber} · {formatDate(tx.timestamp)}</div>
      </div>
      <div className={`tx-price mono ${isBuy ? 'negative' : 'positive'}`}>
        {isBuy ? '-' : '+'}₹{tx.price}
      </div>
    </div>
  );
}

export default function Portfolio() {
  const { wallet, ownedUnits } = useApp();
  const [activeTab, setActiveTab] = useState('holdings');

  // Combine hardcoded owned + any newly purchased units in context
  const allOwned = [
    ...mockUnits.filter(u => u.ownerId === 'user-collector-a'),
    ...ownedUnits,
  ];

  // Portfolio metrics
  const totalInvested = allOwned.reduce((sum, u) => sum + u.purchasePrice, 0);
  const totalCurrent = allOwned.reduce((sum, u) => sum + u.currentPrice, 0);
  const totalPnL = totalCurrent - totalInvested;
  const pnlPercent = totalInvested > 0 ? ((totalPnL / totalInvested) * 100).toFixed(1) : '0.0';
  const isOverallProfit = totalPnL >= 0;

  const portfolioValue = totalCurrent + wallet.balance;

  return (
    <main>
      <div className="container">

        {/* Portfolio header */}
        <div className="portfolio-header">
          <div>
            <h1 className="page-title">Your Portfolio</h1>
            <p className="page-subtitle">Holdings, performance, and transaction history</p>
          </div>
        </div>

        {/* Metrics row */}
        <div className="portfolio-metrics">
          <div className="portfolio-metric-card highlight">
            <span className="portfolio-metric-label">Total Portfolio Value</span>
            <span className="portfolio-metric-value">₹{portfolioValue.toLocaleString()}</span>
            <span className="portfolio-metric-sub">art + wallet</span>
          </div>
          <div className="portfolio-metric-card">
            <span className="portfolio-metric-label">Art Units Value</span>
            <span className="portfolio-metric-value">₹{totalCurrent.toLocaleString()}</span>
            <span className="portfolio-metric-sub">{allOwned.length} units held</span>
          </div>
          <div className="portfolio-metric-card">
            <span className="portfolio-metric-label">Total P&L</span>
            <span className={`portfolio-metric-value ${isOverallProfit ? 'positive' : 'negative'}`}>
              {isOverallProfit ? '+' : ''}₹{totalPnL.toLocaleString()}
            </span>
            <span className="portfolio-metric-sub">
              {isOverallProfit ? '+' : ''}{pnlPercent}% return
            </span>
          </div>
          <div className="portfolio-metric-card">
            <span className="portfolio-metric-label">Wallet Balance</span>
            <span className="portfolio-metric-value mono">₹{wallet.balance.toLocaleString()}</span>
            <span className="portfolio-metric-sub">available credits</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="artwork-tabs" role="tablist" style={{ marginTop: 'var(--space-8)' }}>
          {[
            { id: 'holdings', label: `Holdings (${allOwned.length})` },
            { id: 'transactions', label: `History (${mockTransactions.length})` },
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

        {/* Holdings tab */}
        {activeTab === 'holdings' && (
          <div className="portfolio-tab-panel">
            {allOwned.length === 0 ? (
              <EmptyState
                icon="◻"
                title="No units owned yet"
                description="Browse the marketplace and buy your first Art Unit to start collecting."
                action={<Link to="/explore"><Button variant="primary">Explore Artworks</Button></Link>}
              />
            ) : (
              <div className="holdings-list">
                {allOwned.map(unit => (
                  <HoldingRow key={unit.id} unit={unit} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Transactions tab */}
        {activeTab === 'transactions' && (
          <div className="portfolio-tab-panel">
            {mockTransactions.length === 0 ? (
              <EmptyState icon="◻" title="No transactions yet" description="Your buy and sell history will appear here." />
            ) : (
              <div className="tx-list">
                {mockTransactions.map(tx => (
                  <TransactionRow key={tx.id} tx={tx} />
                ))}
              </div>
            )}
          </div>
        )}

        <div style={{ height: 'var(--space-20)' }} />
      </div>
    </main>
  );
}
