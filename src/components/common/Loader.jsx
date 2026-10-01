// Loader.jsx — ArtVault Common Component
export function Loader({ text = 'Loading…', inline = false }) {
  return (
    <div className={`loader-wrapper ${inline ? 'inline' : ''}`} role="status" aria-live="polite">
      <div className="spinner" aria-hidden="true" />
      <span className="loader-text">{text}</span>
    </div>
  );
}

export function LoaderInline() {
  return <span className="spinner spinner-sm" role="status" aria-label="Loading" />;
}

export default Loader;
