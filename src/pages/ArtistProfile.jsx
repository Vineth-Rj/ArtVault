// ArtistProfile.jsx — ArtVault
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Loader } from '../components/common/Loader';
import { ArtworkCard } from '../components/artwork/ArtworkCard';
import { BuyUnitModal } from '../components/market/BuyUnitModal';
import { artistService } from '../services/artistService';
import '../styles/pages.css';

export default function ArtistProfile() {
  const { id } = useParams();
  const [artist, setArtist] = useState(null);
  const [artworks, setArtworks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [buyArtwork, setBuyArtwork] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const [ar, aw] = await Promise.all([
        artistService.getById(id),
        artistService.getArtworks(id),
      ]);
      if (cancelled) return;
      if (ar.error) { setError(ar.error); setLoading(false); return; }
      setArtist(ar.data);
      setArtworks(aw.data);
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [id]);

  if (loading) return <Loader text="Loading artist profile…" />;
  if (error) return (
    <div className="container" style={{ padding: 'var(--space-12) 0' }}>
      <div className="empty-state">
        <div className="empty-state-icon">⚠</div>
        <h2 className="empty-state-title">Artist not found</h2>
        <p className="empty-state-desc">{error}</p>
        <Link to="/explore" className="btn btn-secondary" style={{ marginTop: 16 }}>Back to Explore</Link>
      </div>
    </div>
  );

  const initials = artist.name.split(' ').map(w => w[0]).join('').slice(0, 2);

  return (
    <main>
      <div className="container">
        {/* Banner */}
        <div className="artist-profile-header">
          <div className="artist-profile-banner" aria-hidden="true">
            <div style={{
              position: 'absolute', inset: 0,
              background: `radial-gradient(ellipse at 30% 50%, var(--color-accent-muted), transparent 70%)`,
            }} />
          </div>

          <div className="artist-profile-identity">
            <div className="artist-profile-avatar" aria-hidden="true">{initials}</div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h1 className="artist-profile-name">{artist.name}</h1>
                {artist.verified && (
                  <span className="tag tag-accent" style={{ marginBottom: 4 }}>✓ Verified</span>
                )}
              </div>
              <p className="artist-profile-handle">{artist.handle}</p>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-tertiary)', marginTop: 4 }}>
                {artist.location} · {artist.style}
              </p>
            </div>
          </div>

          {/* Bio */}
          <div style={{ maxWidth: 640, marginBottom: 'var(--space-6)' }}>
            <p style={{ color: 'var(--color-text-secondary)', lineHeight: 1.8 }}>
              {artist.bio}
            </p>
          </div>

          {/* Stats */}
          <div className="artist-profile-stats">
            {[
              { label: 'Artworks', value: artist.totalArtworks },
              { label: 'Holders', value: artist.totalHolders },
              { label: 'Units Sold', value: artist.totalUnitsSold.toLocaleString() },
              { label: 'Trading Volume', value: `₹${artist.totalTradingVolume.toLocaleString()}` },
              { label: 'Avg Unit Price', value: `₹${artist.avgUnitPrice}` },
            ].map(s => (
              <div key={s.label} className="stat-card">
                <div className="stat-label">{s.label}</div>
                <div className="stat-value">{s.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Artworks */}
        <section aria-labelledby="artist-works-title">
          <div className="section-header">
            <h2 id="artist-works-title" className="section-title">Works</h2>
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-tertiary)' }}>
              {artworks.length} artwork{artworks.length !== 1 ? 's' : ''}
            </span>
          </div>

          {artworks.length > 0 ? (
            <div className="artwork-grid artwork-grid-3">
              {artworks.map(aw => (
                <ArtworkCard key={aw.id} artwork={aw} onBuy={setBuyArtwork} />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">◻</div>
              <h3 className="empty-state-title">No artworks yet</h3>
            </div>
          )}
        </section>

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
