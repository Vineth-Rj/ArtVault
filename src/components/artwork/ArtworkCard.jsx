// ArtworkCard.jsx — ArtVault
import { Link, useNavigate } from 'react-router-dom';
import Button from '../common/Button';
import '../../styles/artwork.css';

function PriceChange({ change }) {
  if (change === undefined || change === null) return null;
  const isPositive = change >= 0;
  return (
    <span className={`market-item-value ${isPositive ? 'positive' : 'negative'}`}>
      {isPositive ? '+' : ''}{change}%
    </span>
  );
}

/**
 * ArtworkCard — renders as a div to avoid nested <a> issues.
 * The image + title area links to the artwork detail page.
 * Buttons use button elements (no <Link> inside <Link>).
 */
export function ArtworkCard({ artwork, onBuy }) {
  const navigate = useNavigate();

  // Normalise field names — backend uses different names than mock data
  const price = artwork.currentPrice ?? Number(artwork.price ?? 0);
  const priceChange = artwork.priceChange ?? 0;
  const holders = artwork.holders ?? artwork.soldCount ?? 0;
  const volume = artwork.tradingVolume ?? 0;
  const unitsAvailable = artwork.unitsAvailable ?? artwork.stock ?? 0;
  const totalUnits = artwork.totalUnits ?? artwork.stock ?? 1;
  const imageUrl = artwork.thumbnailUrl ?? artwork.imageUrl;
  const artistName = artwork.artist?.name ?? artwork.artistName ?? 'Unknown Artist';
  const category = artwork.category ?? '';

  return (
    <div className="artwork-card" role="article">
      {/* Image — clicking anywhere on image goes to detail */}
      <Link
        to={`/artwork/${artwork.id}`}
        className="artwork-card-image-link"
        aria-label={`View ${artwork.title} by ${artistName}`}
        tabIndex={-1}
      >
        <div className="artwork-card-image">
          <img
            src={imageUrl}
            alt={artwork.title}
            loading="lazy"
          />
          {/* Category tag */}
          {category && (
            <div className="artwork-card-category">
              <span className="tag tag-default">{category}</span>
            </div>
          )}
          {/* Units badge */}
          <div className="artwork-card-units-badge">
            {unitsAvailable.toLocaleString()} units left
          </div>
          {/* Hover overlay */}
          <div className="artwork-card-overlay">
            <button
              className="btn btn-primary btn-sm"
              type="button"
              onClick={(e) => { e.preventDefault(); onBuy && onBuy(artwork); }}
              aria-label={`Buy unit from ${artwork.title}`}
            >
              Buy Unit
            </button>
            <button
              className="btn btn-secondary btn-sm"
              type="button"
              onClick={(e) => { e.preventDefault(); navigate(`/artwork/${artwork.id}`); }}
            >
              View Market
            </button>
          </div>
        </div>
      </Link>

      {/* Body */}
      <div className="artwork-card-body">
        <div>
          <Link to={`/artwork/${artwork.id}`} className="artwork-card-title-link">
            <h3 className="artwork-card-title">{artwork.title}</h3>
          </Link>
          <p className="artwork-card-artist">{artistName}</p>
        </div>

        {/* Market data */}
        <div className="artwork-card-market">
          <div className="artwork-card-market-item">
            <span className="market-item-label">Price</span>
            <span className="market-item-value">₹{price.toLocaleString()}</span>
          </div>
          <div className="artwork-card-market-item">
            <span className="market-item-label">Change</span>
            <PriceChange change={priceChange} />
          </div>
          <div className="artwork-card-market-item">
            <span className="market-item-label">Holders</span>
            <span className="market-item-value">{holders}</span>
          </div>
          {volume > 0 && (
            <div className="artwork-card-market-item">
              <span className="market-item-label">Volume</span>
              <span className="market-item-value">₹{volume.toLocaleString()}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ArtworkCard;
