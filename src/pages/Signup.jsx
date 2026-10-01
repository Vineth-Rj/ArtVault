// Signup.jsx — ArtVault
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

const ROLES = [
  { value: 'COLLECTOR', label: 'Collector', desc: 'Discover art, buy units, trade value' },
  { value: 'ARTIST', label: 'Artist', desc: 'List your work, earn royalties, build community' },
];

export default function Signup() {
  const { register, isAuthenticated } = useApp();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('COLLECTOR');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (isAuthenticated) {
    navigate('/', { replace: true });
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!name.trim() || !email || !password) {
      setError('Please fill in all fields.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    const { error: err } = await register(name.trim(), email, password, role);
    setLoading(false);

    if (err) {
      setError(err);
    } else {
      navigate('/', { replace: true });
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-card auth-card-wide">
        {/* Logo */}
        <div className="auth-logo">
          <svg width="32" height="32" viewBox="0 0 18 18" fill="var(--color-accent)">
            <path d="M9 2L2 14h14L9 2z" />
          </svg>
          <span className="auth-logo-text">ArtVault</span>
        </div>

        <h1 className="auth-title">Join ArtVault</h1>
        <p className="auth-subtitle">Start your art ownership journey</p>

        {error && (
          <div className="auth-error" role="alert">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M8 5v4M8 11v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            {error}
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          {/* Role selector */}
          <div className="form-group">
            <label className="form-label">I am joining as</label>
            <div className="role-selector">
              {ROLES.map(r => (
                <button
                  key={r.value}
                  type="button"
                  className={`role-option ${role === r.value ? 'selected' : ''}`}
                  onClick={() => setRole(r.value)}
                  aria-pressed={role === r.value}
                >
                  <span className="role-option-label">{r.label}</span>
                  <span className="role-option-desc">{r.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="signup-name">Full name</label>
            <input
              id="signup-name"
              type="text"
              className="form-input"
              placeholder="Your name"
              value={name}
              onChange={e => setName(e.target.value)}
              autoComplete="name"
              required
              minLength={2}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="signup-email">Email</label>
            <input
              id="signup-email"
              type="email"
              className="form-input"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="signup-password">Password</label>
            <input
              id="signup-password"
              type="password"
              className="form-input"
              placeholder="At least 8 characters"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="new-password"
              required
              minLength={8}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-full"
            disabled={loading}
          >
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account?{' '}
          <Link to="/login" className="auth-link">Sign in</Link>
        </p>
      </div>
    </main>
  );
}
