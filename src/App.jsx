// App.jsx — ArtVault Root
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { Navbar } from './components/layout/Navbar';
import { Notification } from './components/common/Notification';

// Pages
import Home from './pages/Home';
import Explore from './pages/Explore';
import ArtworkDetail from './pages/ArtworkDetail';
import ArtistProfile from './pages/ArtistProfile';
import Marketplace from './pages/Marketplace';
import Portfolio from './pages/Portfolio';
import CreateArtwork from './pages/CreateArtwork';
import Login from './pages/Login';
import Signup from './pages/Signup';

// Styles
import './styles/variables.css';
import './styles/globals.css';
import './styles/components.css';
import './styles/navbar.css';
import './styles/artwork.css';
import './styles/pages.css';

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <div className="app-root">
          <Navbar />
          <div className="app-content">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/explore" element={<Explore />} />
              <Route path="/artwork/:id" element={<ArtworkDetail />} />
              <Route path="/artist/:id" element={<ArtistProfile />} />
              <Route path="/market" element={<Marketplace />} />
              <Route path="/portfolio" element={<Portfolio />} />
              <Route path="/create-artwork" element={<CreateArtwork />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              {/* Fallback */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
          <Notification />
          <Footer />
        </div>
      </BrowserRouter>
    </AppProvider>
  );
}

function NotFound() {
  return (
    <main className="container" style={{ padding: 'var(--space-20) 0', textAlign: 'center' }}>
      <div style={{ fontSize: 64, marginBottom: 'var(--space-4)', opacity: 0.3 }}>◻</div>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-3xl)', marginBottom: 'var(--space-4)' }}>
        Page not found
      </h1>
      <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-6)' }}>
        This page doesn't exist.
      </p>
      <a href="/" className="btn btn-primary">Go Home</a>
    </main>
  );
}

function Footer() {
  return (
    <footer className="app-footer">
      <div className="container">
        <div className="footer-inner">
          <div className="footer-brand">
            <div className="footer-logo">
              <svg width="16" height="16" viewBox="0 0 18 18" fill="var(--color-accent)">
                <path d="M9 2L2 14h14L9 2z" />
              </svg>
              <span>ArtVault</span>
            </div>
            <p className="footer-tagline">Community-owned art. Human connections.</p>
          </div>
          <div className="footer-links">
            <a href="/explore" className="footer-link">Explore</a>
            <a href="/market" className="footer-link">Market</a>
            <a href="/portfolio" className="footer-link">Portfolio</a>
            <a href="/create-artwork" className="footer-link">Create</a>
          </div>
          <div className="footer-right">
            <span className="footer-caption">Powered by Gemini</span>
          </div>
        </div>
        <div className="footer-bottom">
          <p>Art Units are community collectibles — not financial investments. ArtVault is a hackathon demo.</p>
        </div>
      </div>
    </footer>
  );
}
