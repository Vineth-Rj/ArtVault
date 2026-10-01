// EmptyState.jsx — ArtVault Common Component
import Button from './Button';

export function EmptyState({ icon = '◻', title, description, action, actionLabel }) {
  return (
    <div className="empty-state" role="status">
      <div className="empty-state-icon" aria-hidden="true">{icon}</div>
      <h3 className="empty-state-title">{title}</h3>
      {description && <p className="empty-state-desc">{description}</p>}
      {/* action can be a JSX element (e.g. <Link><Button>…</Button></Link>) or a fn + label */}
      {action && typeof action === 'function' && actionLabel && (
        <Button variant="secondary" onClick={action} style={{ marginTop: 8 }}>
          {actionLabel}
        </Button>
      )}
      {action && typeof action !== 'function' && (
        <div style={{ marginTop: 12 }}>{action}</div>
      )}
    </div>
  );
}

export default EmptyState;
