// AIInsight.jsx — ArtVault Gemini Component
import { useState } from 'react';
import Button from '../common/Button';
import { Loader } from '../common/Loader';
import { geminiService } from '../../services/geminiService';

export function AIInsight({ artwork, preloaded = null }) {
  const [insight, setInsight] = useState(preloaded);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [revealed, setRevealed] = useState(!!preloaded);

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await geminiService.analyzeArtwork({
        artworkId: artwork.id,
        title: artwork.title,
        description: artwork.description,
        story: artwork.story,
        imageUrl: artwork.imageUrl,
      });
      if (err) throw new Error(err);
      setInsight(data);
      setRevealed(true);
    } catch (e) {
      setError('Analysis unavailable. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ai-insight" role="region" aria-label="Gemini artwork understanding">
      {/* Header */}
      <div className="ai-insight-header">
        <div className="ai-insight-badge">
          <GeminiIcon />
          <span>Gemini Understanding</span>
        </div>
        <p className="ai-insight-disclaimer">
          AI interpretation — not a valuation or recommendation
        </p>
      </div>

      {/* Content */}
      {!revealed && !loading && (
        <div className="ai-insight-cta">
          <p className="ai-insight-prompt">
            Let Gemini interpret the mood, style, and themes of this artwork.
          </p>
          <Button
            variant="secondary"
            onClick={handleAnalyze}
            style={{ borderColor: 'var(--color-gemini-border)', color: 'var(--color-gemini)' }}
          >
            <GeminiIcon small />
            Understand this artwork
          </Button>
        </div>
      )}

      {loading && <Loader text="Gemini is interpreting…" inline />}

      {error && (
        <div className="ai-insight-error">
          <p>{error}</p>
          <Button variant="ghost" size="sm" onClick={handleAnalyze}>Retry</Button>
        </div>
      )}

      {revealed && insight && (
        <div className="ai-insight-content">
          {/* Style + Mood */}
          <div className="ai-insight-row">
            <div className="ai-insight-field">
              <span className="ai-field-label">Style</span>
              <span className="ai-field-value">{insight.style}</span>
            </div>
            <div className="ai-insight-field">
              <span className="ai-field-label">Mood</span>
              <div className="ai-field-tags">
                {insight.mood?.map(m => (
                  <span key={m} className="tag tag-gemini">{m}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Themes */}
          <div className="ai-insight-field">
            <span className="ai-field-label">Themes</span>
            <div className="ai-field-tags">
              {insight.themes?.map(t => (
                <span key={t} className="tag tag-default">{t}</span>
              ))}
            </div>
          </div>

          {/* Keywords */}
          <div className="ai-insight-field">
            <span className="ai-field-label">Keywords</span>
            <div className="ai-field-tags">
              {insight.keywords?.map(k => (
                <span key={k} className="tag tag-default" style={{ fontFamily: 'var(--font-mono)', fontSize: '11px' }}>{k}</span>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="ai-insight-description">
            <p>{insight.description}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function GeminiIcon({ small = false }) {
  const size = small ? 14 : 16;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="var(--color-gemini)">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
    </svg>
  );
}

export default AIInsight;
