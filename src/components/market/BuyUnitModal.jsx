// BuyUnitModal.jsx — ArtVault Market Component
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '../common/Modal';
import Button from '../common/Button';
import { useApp } from '../../context/AppContext';
import { marketService } from '../../services/marketService';
import { mockArtists } from '../../data/mockArtists';

export function BuyUnitModal({ isOpen, onClose, artwork }) {
  const { wallet, addOwnedUnit, notify } = useApp();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);

  const artist = mockArtists.find(a => a.id === artwork?.artistId);
  const canAfford = wallet.balance >= (artwork?.currentPrice || 0);

  const handleBuy = async () => {
    if (!canAfford) {
      notify('Insufficient credits', 'error');
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await marketService.buyUnit(artwork.id, 'user-collector-a');
      if (error) throw new Error(error);
      addOwnedUnit(data.unit);
      setSuccess(data);
    } catch (e) {
      notify(e.message || 'Purchase failed. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSuccess(null);
    onClose();
  };

  const goToPortfolio = () => {
    handleClose();
    navigate('/portfolio');
  };

  if (!artwork) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={success ? 'Purchase Successful' : 'Buy Art Unit'}
    >
      {!success ? (
        /* Buy confirmation */
        <div className="buy-modal-content">
          {/* Artwork preview */}
          <div className="buy-artwork-preview">
            <img src={artwork.thumbnailUrl || artwork.imageUrl} alt={artwork.title} />
            <div>
              <h4 className="buy-artwork-title">{artwork.title}</h4>
              <p className="buy-artwork-artist">{artist?.name}</p>
            </div>
          </div>

          <hr className="divider" style={{ margin: '16px 0' }} />

          {/* Price breakdown */}
          <div className="buy-breakdown">
            <div className="buy-row">
              <span className="buy-label">Unit price</span>
              <span className="buy-value mono">₹{artwork.currentPrice} credits</span>
            </div>
            <div className="buy-row">
              <span className="buy-label">Quantity</span>
              <span className="buy-value">1 complete Art Unit</span>
            </div>
            <div className="buy-row buy-row-total">
              <span className="buy-label">Total</span>
              <span className="buy-value mono accent">₹{artwork.currentPrice} credits</span>
            </div>
          </div>

          <hr className="divider" style={{ margin: '16px 0' }} />

          <div className="buy-wallet">
            <div className="buy-row">
              <span className="buy-label">Your balance</span>
              <span className="buy-value mono">{wallet.balance.toLocaleString()} credits</span>
            </div>
            <div className="buy-row">
              <span className="buy-label">After purchase</span>
              <span className={`buy-value mono ${!canAfford ? 'negative' : ''}`}>
                {(wallet.balance - artwork.currentPrice).toLocaleString()} credits
              </span>
            </div>
          </div>

          {!canAfford && (
            <div className="buy-error-banner">
              Insufficient credits. Your balance is ₹{wallet.balance}.
            </div>
          )}

          <p className="buy-disclaimer">
            This purchases 1 complete Art Unit. The market price is determined by community transactions.
            This is not a financial investment.
          </p>

          <div className="buy-actions">
            <Button variant="secondary" onClick={handleClose} fullWidth>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleBuy}
              loading={loading}
              disabled={!canAfford}
              fullWidth
            >
              Confirm Purchase
            </Button>
          </div>
        </div>
      ) : (
        /* Success state */
        <div className="buy-success">
          <div className="buy-success-icon" aria-hidden="true">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <circle cx="24" cy="24" r="23" stroke="var(--color-positive)" strokeWidth="2"/>
              <path d="M14 24l7 7 13-14" stroke="var(--color-positive)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>

          <div className="buy-success-heading">
            <span className="buy-success-label">You own</span>
            <h2 className="buy-success-unit">Unit #{success.unit.unitNumber}</h2>
          </div>

          <div className="buy-success-details">
            <div className="buy-row">
              <span className="buy-label">Artwork</span>
              <span className="buy-value">{artwork.title}</span>
            </div>
            <div className="buy-row">
              <span className="buy-label">Artist</span>
              <span className="buy-value">{artist?.name}</span>
            </div>
            <div className="buy-row">
              <span className="buy-label">Purchase price</span>
              <span className="buy-value mono">₹{success.price} credits</span>
            </div>
            <div className="buy-row">
              <span className="buy-label">Transaction ID</span>
              <span className="buy-value mono" style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>
                {success.transactionId}
              </span>
            </div>
          </div>

          <div className="buy-actions">
            <Button variant="secondary" onClick={handleClose} fullWidth>
              Continue Exploring
            </Button>
            <Button variant="primary" onClick={goToPortfolio} fullWidth>
              View Portfolio
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

export default BuyUnitModal;
