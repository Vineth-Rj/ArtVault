// CreateArtwork.jsx — ArtVault Artist Dashboard / Artwork Minting
import { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Button from '../components/common/Button';
import { Loader } from '../components/common/Loader';
import { geminiService } from '../services/geminiService';
import { useApp } from '../context/AppContext';
import apiClient from '../services/api';
import '../styles/pages.css';

const CATEGORIES = ['Urban', 'Heritage', 'Landscape', 'Abstract', 'Documentary', 'Folk', 'Contemporary'];
const ART_TYPES = ['Acrylic on Canvas', 'Oil on Canvas', 'Watercolour', 'Ink', 'Digital', 'Mixed Media', 'Sculpture', 'Photography'];
const UNIT_PRESETS = [100, 250, 500, 750, 1000];

function GeminiIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="var(--color-gemini)" style={{ flexShrink: 0 }}>
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
    </svg>
  );
}

export default function CreateArtwork() {
  const navigate = useNavigate();
  const { user, isAuthenticated, notify } = useApp();
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    title: '',
    description: '',
    story: '',
    category: '',
    artType: '',
    totalUnits: 500,
    unitPrice: 10,
    imageUrl: '',
  });
  const [imageFile, setImageFile] = useState(null);      // actual File object
  const [imagePreview, setImagePreview] = useState('');  // local blob URL
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const [geminiSuggestions, setGeminiSuggestions] = useState(null);
  const [geminiLoading, setGeminiLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState({});

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

  // Handle image file selection
  function handleImageChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    set('imageUrl', ''); // clear URL field when file is chosen
  }

  const validate = () => {
    const errs = {};
    if (!form.title.trim()) errs.title = 'Title is required';
    if (!form.description.trim()) errs.description = 'Description is required';
    if (!form.category) errs.category = 'Select a category';
    if (!form.artType) errs.artType = 'Select an art type';
    if (form.unitPrice < 1) errs.unitPrice = 'Price must be at least ₹1';
    if (form.totalUnits < 10) errs.totalUnits = 'Minimum 10 units';
    if (!imageFile && !form.imageUrl.trim()) errs.imageUrl = 'Upload an image or provide an image URL';
    return errs;
  };

  // Auth gate — must be an ARTIST
  if (!isAuthenticated) {
    return (
      <main className="container" style={{ padding: 'var(--space-20) 0', textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 'var(--space-4)', opacity: 0.3 }}>🎨</div>
        <h1 style={{ fontFamily: 'var(--font-display)', marginBottom: 'var(--space-4)' }}>Sign in to create artwork</h1>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-6)' }}>
          You need an account to list artwork on ArtVault.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <Link to="/login" className="btn btn-ghost">Sign in</Link>
          <Link to="/signup" className="btn btn-primary">Join as Artist</Link>
        </div>
      </main>
    );
  }

  if (isAuthenticated && user?.role !== 'ARTIST') {
    return (
      <main className="container" style={{ padding: 'var(--space-20) 0', textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 'var(--space-4)', opacity: 0.3 }}>🎨</div>
        <h1 style={{ fontFamily: 'var(--font-display)', marginBottom: 'var(--space-4)' }}>Artist accounts only</h1>
        <p style={{ color: 'var(--color-text-secondary)' }}>
          Only ARTIST accounts can list artwork. Create a new account with the Artist role.
        </p>
      </main>
    );
  }

  const handleGeminiAnalyze = async () => {
    if (!form.title && !form.description) return;
    setGeminiLoading(true);
    try {
      const { data } = await geminiService.analyzeArtwork({
        title: form.title,
        description: form.description,
        story: form.story,
        imageUrl: form.imageUrl,
      });
      setGeminiSuggestions(data);
    } catch {
      // silently fail — suggestions are optional
    } finally {
      setGeminiLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setSubmitLoading(true);
    setSubmitError('');
    try {
      let result;
      if (imageFile) {
        // Multipart upload — backend handles Supabase Storage
        const fd = new FormData();
        fd.append('image', imageFile);
        fd.append('title', form.title);
        fd.append('description', form.description);
        fd.append('story', form.story || '');
        fd.append('category', form.category);
        fd.append('artType', form.artType);
        fd.append('price', String(form.unitPrice));
        fd.append('stock', String(form.totalUnits));
        result = await apiClient.postForm('/products', fd);
      } else {
        // URL-based submission
        result = await apiClient.post('/products', {
          title: form.title,
          description: form.description,
          story: form.story || '',
          category: form.category,
          artType: form.artType,
          price: form.unitPrice,
          stock: form.totalUnits,
          imageUrl: form.imageUrl,
        });
      }
      notify('Artwork listed successfully!', 'success');
      navigate(`/artwork/${result.product?.id ?? 'explore'}`);
    } catch (err) {
      setSubmitError(err.message || 'Failed to submit artwork. Please try again.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const totalRevenue = form.totalUnits * form.unitPrice;
  const creatorRoyalty = Math.round(totalRevenue * 0.1);

  if (submitted) {
    return (
      <main className="container" style={{ padding: 'var(--space-12) 0' }}>
        <div className="create-success">
          <div className="create-success-icon" aria-hidden>
            <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
              <circle cx="32" cy="32" r="31" stroke="var(--color-positive)" strokeWidth="2" />
              <path d="M20 32l8 9 16-18" stroke="var(--color-positive)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className="create-success-title">Artwork Created!</h1>
          <p className="create-success-desc">
            <strong>{form.title}</strong> has been listed with <strong>{form.totalUnits.toLocaleString()} Art Units</strong> at{' '}
            <strong>₹{form.unitPrice}</strong> each. Collectors can now discover and own your work.
          </p>
          <div className="create-success-stats">
            <div className="stat-card">
              <div className="stat-label">Total Units</div>
              <div className="stat-value">{form.totalUnits.toLocaleString()}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Unit Price</div>
              <div className="stat-value">₹{form.unitPrice}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Potential Revenue</div>
              <div className="stat-value accent">₹{totalRevenue.toLocaleString()}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Your Royalty (10%)</div>
              <div className="stat-value positive">₹{creatorRoyalty.toLocaleString()}</div>
            </div>
          </div>
          <div className="create-success-actions">
            <Button variant="secondary" onClick={() => { setSubmitted(false); setForm({ title: '', description: '', story: '', category: '', artType: '', totalUnits: 500, unitPrice: 10, imageUrl: '' }); setGeminiSuggestions(null); }}>
              Create Another
            </Button>
            <Button variant="primary" onClick={() => navigate('/explore')}>
              View in Explore
            </Button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main>
      <div className="container">
        <div className="page-header">
          <div>
            <h1 className="page-title">List Your Artwork</h1>
            <p className="page-subtitle">Create Art Units and let the community own a piece of your work</p>
          </div>
        </div>

        <div className="create-layout">
          {/* Form */}
          <div className="create-form-area">
            <form onSubmit={handleSubmit} noValidate>

              {/* Submit error banner */}
              {submitError && (
                <div className="auth-error" role="alert" style={{ marginBottom: 'var(--space-5)' }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M8 5v4M8 11v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  {submitError}
                </div>
              )}
              <section className="create-section">
                <h2 className="create-section-title">Artwork Details</h2>

                <div className="create-field">
                  <label className="create-label" htmlFor="artwork-title">
                    Title <span className="create-required">*</span>
                  </label>
                  <input
                    id="artwork-title"
                    type="text"
                    className={`create-input${errors.title ? ' error' : ''}`}
                    value={form.title}
                    onChange={e => set('title', e.target.value)}
                    placeholder="e.g. Monsoon Memories"
                  />
                  {errors.title && <span className="create-error">{errors.title}</span>}
                </div>

                <div className="create-field-row">
                  <div className="create-field">
                    <label className="create-label" htmlFor="artwork-category">
                      Category <span className="create-required">*</span>
                    </label>
                    <select
                      id="artwork-category"
                      className={`create-select${errors.category ? ' error' : ''}`}
                      value={form.category}
                      onChange={e => set('category', e.target.value)}
                    >
                      <option value="">Select category</option>
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    {errors.category && <span className="create-error">{errors.category}</span>}
                  </div>

                  <div className="create-field">
                    <label className="create-label" htmlFor="artwork-type">
                      Art Type <span className="create-required">*</span>
                    </label>
                    <select
                      id="artwork-type"
                      className={`create-select${errors.artType ? ' error' : ''}`}
                      value={form.artType}
                      onChange={e => set('artType', e.target.value)}
                    >
                      <option value="">Select type</option>
                      {ART_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    {errors.artType && <span className="create-error">{errors.artType}</span>}
                  </div>
                </div>

                <div className="create-field">
                  <label className="create-label" htmlFor="artwork-description">
                    Description <span className="create-required">*</span>
                  </label>
                  <textarea
                    id="artwork-description"
                    className={`create-textarea${errors.description ? ' error' : ''}`}
                    rows={4}
                    value={form.description}
                    onChange={e => set('description', e.target.value)}
                    placeholder="What is this artwork about? What does it capture or convey?"
                  />
                  {errors.description && <span className="create-error">{errors.description}</span>}
                </div>

                <div className="create-field">
                  <label className="create-label" htmlFor="artwork-story">
                    Artist Story <span className="create-optional">(optional)</span>
                  </label>
                  <textarea
                    id="artwork-story"
                    className="create-textarea"
                    rows={3}
                    value={form.story}
                    onChange={e => set('story', e.target.value)}
                    placeholder="The personal story behind creating this work…"
                  />
                </div>

                <div className="create-field">
                  <label className="create-label">
                    Artwork Image <span className="create-required">*</span>
                  </label>
                  {/* File upload */}
                  <div
                    className="image-upload-zone"
                    style={{
                      border: `2px dashed ${errors.imageUrl ? 'var(--color-negative)' : 'var(--color-border)'}`,
                      borderRadius: 'var(--radius-lg)',
                      padding: '24px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      transition: 'border-color var(--transition-fast)',
                      marginBottom: '12px',
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) { setImageFile(f); setImagePreview(URL.createObjectURL(f)); set('imageUrl', ''); } }}
                  >
                    {imagePreview ? (
                      <img src={imagePreview} alt="Preview" style={{ maxHeight: 200, maxWidth: '100%', borderRadius: 8, margin: '0 auto' }} />
                    ) : (
                      <>
                        <div style={{ fontSize: 32, marginBottom: 8, opacity: 0.4 }}>📁</div>
                        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-tertiary)' }}>
                          Click or drag & drop an image file<br/>
                          <span style={{ fontSize: 'var(--text-xs)' }}>JPG, PNG, WebP up to 10MB</span>
                        </p>
                      </>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleImageChange}
                  />
                  {!imageFile && (
                    <>
                      <p style={{ textAlign: 'center', fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', margin: '8px 0' }}>— or paste an image URL —</p>
                      <input
                        id="artwork-image"
                        type="url"
                        className={`create-input${errors.imageUrl ? ' error' : ''}`}
                        value={form.imageUrl}
                        onChange={e => set('imageUrl', e.target.value)}
                        placeholder="https://example.com/artwork.jpg"
                      />
                    </>
                  )}
                  {errors.imageUrl && <span className="create-error">{errors.imageUrl}</span>}
                </div>
              </section>

              {/* Gemini analyze button */}
              <div className="create-gemini-bar">
                <div className="create-gemini-info">
                  <GeminiIcon />
                  <div>
                    <div className="create-gemini-title">Analyze with Gemini</div>
                    <div className="create-gemini-desc">Get AI-powered style, mood, and theme suggestions for your artwork</div>
                  </div>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleGeminiAnalyze}
                  loading={geminiLoading}
                  disabled={!form.title && !form.description}
                  type="button"
                  style={{ borderColor: 'var(--color-gemini-border)', color: 'var(--color-gemini)', whiteSpace: 'nowrap' }}
                >
                  <GeminiIcon /> Analyze
                </Button>
              </div>

              {geminiLoading && <Loader text="Gemini is interpreting your artwork…" inline />}

              {geminiSuggestions && !geminiLoading && (
                <div className="create-gemini-result">
                  <div className="gemini-result-row">
                    <span className="gemini-result-label">Detected Style</span>
                    <span className="gemini-result-value">{geminiSuggestions.style}</span>
                  </div>
                  <div className="gemini-result-row">
                    <span className="gemini-result-label">Mood</span>
                    <div className="ai-field-tags">
                      {geminiSuggestions.mood?.map(m => (
                        <span key={m} className="tag tag-gemini">{m}</span>
                      ))}
                    </div>
                  </div>
                  <div className="gemini-result-row">
                    <span className="gemini-result-label">Themes</span>
                    <div className="ai-field-tags">
                      {geminiSuggestions.themes?.map(t => (
                        <span key={t} className="tag tag-default">{t}</span>
                      ))}
                    </div>
                  </div>
                  <div className="gemini-result-row">
                    <span className="gemini-result-label">Summary</span>
                    <p className="gemini-result-desc">{geminiSuggestions.description}</p>
                  </div>
                </div>
              )}

              {/* Unit Economics */}
              <section className="create-section">
                <h2 className="create-section-title">Unit Economics</h2>
                <p className="create-section-desc">
                  Your artwork is split into tradable Art Units. Collectors buy complete units.
                  You earn a 10% royalty on every trade — forever.
                </p>

                <div className="create-field-row">
                  <div className="create-field">
                    <label className="create-label" htmlFor="artwork-units">
                      Total Art Units <span className="create-required">*</span>
                    </label>
                    <div className="create-preset-row">
                      {UNIT_PRESETS.map(p => (
                        <button
                          key={p}
                          type="button"
                          className={`create-preset-btn${form.totalUnits === p ? ' active' : ''}`}
                          onClick={() => set('totalUnits', p)}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                    <input
                      id="artwork-units"
                      type="number"
                      min={10}
                      max={10000}
                      className={`create-input${errors.totalUnits ? ' error' : ''}`}
                      value={form.totalUnits}
                      onChange={e => set('totalUnits', parseInt(e.target.value) || 0)}
                    />
                    {errors.totalUnits && <span className="create-error">{errors.totalUnits}</span>}
                  </div>

                  <div className="create-field">
                    <label className="create-label" htmlFor="artwork-price">
                      Initial Unit Price (₹) <span className="create-required">*</span>
                    </label>
                    <input
                      id="artwork-price"
                      type="number"
                      min={1}
                      step={1}
                      className={`create-input${errors.unitPrice ? ' error' : ''}`}
                      value={form.unitPrice}
                      onChange={e => set('unitPrice', parseInt(e.target.value) || 0)}
                    />
                    {errors.unitPrice && <span className="create-error">{errors.unitPrice}</span>}
                    <p className="create-field-hint">
                      Market price will change based on community trading
                    </p>
                  </div>
                </div>
              </section>

              {/* Submit */}
              <div className="create-submit-area">
                <Button variant="primary" type="submit" disabled={submitLoading} style={{ minWidth: 200 }}>
                  {submitLoading ? 'Listing artwork…' : 'List Artwork'}
                </Button>
              </div>
            </form>
          </div>

          {/* Sidebar — live preview */}
          <aside className="create-sidebar">
            <div className="create-preview-card">
              <h3 className="create-preview-title">Live Preview</h3>

              {(imagePreview || form.imageUrl) && (
                <div className="create-preview-image">
                  <img src={imagePreview || form.imageUrl} alt="Preview" onError={e => e.target.style.display = 'none'} />
                </div>
              )}

              <div className="create-preview-info">
                <div className="create-preview-name">{form.title || 'Untitled Artwork'}</div>
                <div className="create-preview-meta">
                  {form.category && <span className="tag tag-default">{form.category}</span>}
                  {form.artType && <span className="tag tag-default">{form.artType}</span>}
                </div>
              </div>

              <div className="create-economics-breakdown">
                <h4 className="create-economics-title">Economics</h4>
                <div className="buy-row">
                  <span className="buy-label">Total units</span>
                  <span className="buy-value mono">{form.totalUnits.toLocaleString()}</span>
                </div>
                <div className="buy-row">
                  <span className="buy-label">Unit price</span>
                  <span className="buy-value mono">₹{form.unitPrice}</span>
                </div>
                <div className="buy-row">
                  <span className="buy-label">Potential revenue</span>
                  <span className="buy-value mono accent">₹{totalRevenue.toLocaleString()}</span>
                </div>
                <div className="buy-row">
                  <span className="buy-label">Your royalty (10%)</span>
                  <span className="buy-value mono positive">₹{creatorRoyalty.toLocaleString()}</span>
                </div>
              </div>

              <div className="create-royalty-note">
                <span style={{ fontSize: 18 }}>∞</span>
                <p>You earn 10% on <strong>every resale</strong> forever — not just the initial sale.</p>
              </div>
            </div>
          </aside>
        </div>

        <div style={{ height: 'var(--space-20)' }} />
      </div>
    </main>
  );
}
