// Home.jsx — ArtVault Landing Page
import { useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/common/Button';
import { ArtworkCard } from '../components/artwork/ArtworkCard';
import { BuyUnitModal } from '../components/market/BuyUnitModal';
import { mockArtworks } from '../data/mockArtworks';
import { mockArtists } from '../data/mockArtists';
import '../styles/pages.css';

const FEATURED_ARTWORKS = mockArtworks.slice(0, 3);
const ARTISTS = mockArtists;

function ArtistSpotlightCard({ artist }) {
  return (
    <Link to={`/artist/${artist.id}`} className="artist-spotlight-card">
      <div className="artist-avatar-ring" aria-hidden="true">
        {artist.name.charAt(0)}
      </div>
      <div className="artist-spotlight-name">{artist.name}</div>
      <div className="artist-spotlight-style">{artist.style}</div>
      <div className="artist-spotlight-stats">
        <div className="artist-stat">
          <span className="artist-stat-value">{artist.totalHolders}</span>
          <span className="artist-stat-label">Holders</span>
        </div>
        <div className="artist-stat">
          <span className="artist-stat-value">₹{artist.avgUnitPrice}</span>
          <span className="artist-stat-label">Avg price</span>
        </div>
      </div>
    </Link>
  );
}

export default function Home() {
  const [buyArtwork, setBuyArtwork] = useState(null);

  return (
    <main>
      {/* ===== HERO ===== */}
      <section className="home-hero" aria-label="ArtVault hero">
        <div className="container" style={{ position: 'relative' }}>
          <div className="home-hero-bg" aria-hidden="true" />
          <div className="home-hero-content">
            <div className="home-eyebrow" aria-hidden="true">
              <span className="home-eyebrow-dot" />
              Community-powered art marketplace
            </div>

            <h1 className="home-hero-title">
              Discover art.<br />
              <em>Own</em> a piece.<br />
              Trade its value.
            </h1>

            <p className="home-hero-subtitle">
              ArtVault connects emerging artists with communities who believe in their work.
              Buy complete Art Units, watch community activity set the market price, and trade with fellow collectors.
            </p>

            <div className="home-hero-actions">
              <Button variant="primary" size="lg" as={Link} href="/explore">
                Explore Art
              </Button>
              <Button variant="secondary" size="lg" as={Link} href="/create-artwork">
                Start Creating
              </Button>
            </div>

            {/* Flow indicator */}
            <div className="home-flow-indicator" aria-label="How ArtVault works">
              {['Discover', '→', 'Understand', '→', 'Buy', '→', 'Own', '→', 'Trade', '→', 'Market Value'].map((step, i) => (
                <span
                  key={i}
                  className={step === '→' ? 'home-flow-arrow' : `home-flow-step ${step === 'Buy' || step === 'Own' ? 'highlight' : ''}`}
                >
                  {step}
                </span>
              ))}
            </div>
          </div>

          {/* Hero visual — mini artwork grid */}
          <div className="home-hero-visual" aria-hidden="true">
            {mockArtworks.slice(0, 4).map(aw => (
              <div key={aw.id} className="home-hero-visual-card">
                <img src={aw.thumbnailUrl} alt="" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section className="home-section" aria-labelledby="how-title">
        <div className="container">
          <p className="home-section-eyebrow">The ArtVault way</p>
          <h2 id="how-title" style={{ fontFamily: 'var(--font-display)', marginBottom: '8px' }}>
            Art. Community. Market.
          </h2>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-tertiary)', marginBottom: '0' }}>
            Technology that puts art first and lets the community determine value.
          </p>

          <div className="how-it-works" role="list">
            {[
              { n: '01', title: 'Discover', desc: 'Explore emerging artists and their works. Let Gemini help you understand style, mood, and themes.' },
              { n: '02', title: 'Buy Art Units', desc: 'Artists create a fixed number of complete Art Units for each work. Buy one to own a piece.' },
              { n: '03', title: 'Community sets value', desc: 'Every trade between collectors sets the visible market price. No algorithm, no speculation — just community activity.' },
              { n: '04', title: 'Trade & hold', desc: 'List your units for others to buy. Watch the price move as the artist\'s community grows.' },
            ].map(step => (
              <div key={step.n} className="how-step" role="listitem">
                <div className="how-step-number">Step {step.n}</div>
                <div className="how-step-title">{step.title}</div>
                <p className="how-step-desc">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FEATURED ARTWORKS ===== */}
      <section className="home-section" aria-labelledby="featured-title">
        <div className="container">
          <div className="section-header">
            <div>
              <p className="home-section-eyebrow">Trending on ArtVault</p>
              <h2 id="featured-title" className="section-title">Featured artworks</h2>
            </div>
            <Link to="/explore" className="btn btn-ghost">View all →</Link>
          </div>

          <div className="artwork-grid artwork-grid-featured">
            {FEATURED_ARTWORKS.map(aw => (
              <ArtworkCard key={aw.id} artwork={aw} onBuy={setBuyArtwork} />
            ))}
          </div>
        </div>
      </section>

      {/* ===== ARTIST SPOTLIGHT ===== */}
      <section className="home-section" aria-labelledby="artists-title">
        <div className="container">
          <div className="section-header">
            <div>
              <p className="home-section-eyebrow">Meet the creators</p>
              <h2 id="artists-title" className="section-title">Emerging artists</h2>
            </div>
            <Link to="/market" className="btn btn-ghost">View market →</Link>
          </div>

          <div className="home-artists">
            {ARTISTS.map(artist => (
              <ArtistSpotlightCard key={artist.id} artist={artist} />
            ))}
          </div>
        </div>
      </section>

      {/* ===== FOOTER CTA ===== */}
      <section
        style={{
          padding: 'var(--space-20) 0',
          borderTop: '1px solid var(--color-border-subtle)',
          textAlign: 'center',
        }}
        aria-label="Call to action"
      >
        <div className="container">
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', marginBottom: '16px' }}>
            Ready to discover?
          </h2>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: '32px' }}>
            Browse artworks, understand them with Gemini, and own a piece of something real.
          </p>
          <Button variant="primary" size="lg" as={Link} href="/explore">
            Explore Art →
          </Button>
        </div>
      </section>

      {/* Buy Modal */}
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
