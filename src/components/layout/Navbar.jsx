// Navbar.jsx — ArtVault Layout Component
import { useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import '../../styles/navbar.css';

const NAV_ITEMS = [
  { to: '/explore', label: 'Explore' },
  { to: '/market', label: 'Market' },
  { to: '/portfolio', label: 'Portfolio' },
  { to: '/create-artwork', label: 'Create' },
];

function LogoMark() {
  return (
    <div className="navbar-logo-mark">
      <svg width="18" height="18" viewBox="0 0 18 18">
        <path d="M9 2L2 14h14L9 2z" />
      </svg>
    </div>
  );
}

/** Initials from a display name */
function initials(name = '') {
  return name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0] ?? '')
    .join('')
    .toUpperCase() || '?';
}

export function Navbar() {
  const { user, wallet, logout, isAuthenticated } = useApp();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    setUserMenuOpen(false);
    navigate('/');
  }

  return (
    <>
      <nav className="navbar" role="navigation" aria-label="Main navigation">
        <div className="container navbar-inner">
          {/* Logo */}
          <Link to="/" className="navbar-logo" aria-label="ArtVault home">
            <LogoMark />
            <span className="navbar-logo-text">ArtVault</span>
          </Link>

          {/* Desktop Nav */}
          <div className="navbar-nav" role="list">
            {NAV_ITEMS.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                role="listitem"
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                {item.label}
              </NavLink>
            ))}
          </div>

          {/* Actions */}
          <div className="navbar-actions">
            {/* Wallet chip — only when logged in */}
            {isAuthenticated && (
              <div className="wallet-chip" aria-label={`Wallet balance: ${wallet.balance} credits`}>
                <span className="wallet-chip-label">Wallet</span>
                <span className="wallet-chip-amount">
                  {Number(wallet.balance).toLocaleString()} ₹
                </span>
              </div>
            )}

            {isAuthenticated ? (
              /* User avatar + dropdown */
              <div className="user-menu-container" style={{ position: 'relative' }}>
                <button
                  className="user-avatar"
                  aria-label={`User menu for ${user?.name}`}
                  aria-expanded={userMenuOpen}
                  onClick={() => setUserMenuOpen(v => !v)}
                >
                  {user?.avatar
                    ? <img src={user.avatar} alt={user.name} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                    : <span aria-hidden="true">{initials(user?.name)}</span>
                  }
                </button>
                {userMenuOpen && (
                  <div className="user-dropdown" role="menu" aria-label="User menu">
                    <div className="user-dropdown-header">
                      <p className="user-dropdown-name">{user?.name}</p>
                      <p className="user-dropdown-role">{user?.role?.toLowerCase()}</p>
                    </div>
                    <hr className="user-dropdown-divider" />
                    <Link
                      to="/portfolio"
                      className="user-dropdown-item"
                      role="menuitem"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      Portfolio
                    </Link>
                    {user?.role === 'ARTIST' && (
                      <Link
                        to="/create-artwork"
                        className="user-dropdown-item"
                        role="menuitem"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        Create Artwork
                      </Link>
                    )}
                    <button
                      className="user-dropdown-item user-dropdown-logout"
                      role="menuitem"
                      onClick={handleLogout}
                    >
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* Login / Signup buttons */
              <div className="navbar-auth-buttons">
                <Link to="/login" className="btn btn-ghost btn-sm">
                  Sign in
                </Link>
                <Link to="/signup" className="btn btn-primary btn-sm">
                  Join
                </Link>
              </div>
            )}

            {/* Mobile toggle */}
            <button
              className="navbar-mobile-toggle"
              onClick={() => setMobileOpen(v => !v)}
              aria-expanded={mobileOpen}
              aria-label="Toggle navigation"
            >
              {mobileOpen ? (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M15 5L5 15M5 5l10 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile drawer */}
      {mobileOpen && (
        <nav className="mobile-nav-drawer" aria-label="Mobile navigation">
          {NAV_ITEMS.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `mobile-nav-link ${isActive ? 'active' : ''}`}
              onClick={() => setMobileOpen(false)}
            >
              {item.label}
            </NavLink>
          ))}
          <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: '8px 0' }} />
          {isAuthenticated ? (
            <button
              className="mobile-nav-link"
              style={{ width: '100%', textAlign: 'left', color: 'var(--color-negative)', background: 'none', border: 'none', cursor: 'pointer' }}
              onClick={() => { handleLogout(); setMobileOpen(false); }}
            >
              Sign out
            </button>
          ) : (
            <>
              <Link to="/login" className="mobile-nav-link" onClick={() => setMobileOpen(false)}>Sign in</Link>
              <Link to="/signup" className="mobile-nav-link" onClick={() => setMobileOpen(false)}>Join ArtVault</Link>
            </>
          )}
        </nav>
      )}
    </>
  );
}

export default Navbar;
