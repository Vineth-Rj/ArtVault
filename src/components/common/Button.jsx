// Button.jsx — ArtVault Common Component
export function Button({
  children,
  variant = 'primary',
  size = 'default',
  fullWidth = false,
  disabled = false,
  loading = false,
  onClick,
  type = 'button',
  className = '',
  as: Tag = 'button',
  href,
  ...props
}) {
  const classes = [
    'btn',
    `btn-${variant}`,
    size === 'sm' ? 'btn-sm' : '',
    size === 'lg' ? 'btn-lg' : '',
    fullWidth ? 'btn-full' : '',
    loading ? 'btn-loading' : '',
    className,
  ].filter(Boolean).join(' ');

  if (href) {
    return (
      <a href={href} className={classes} {...props}>
        {loading ? <span className="spinner spinner-sm" /> : children}
      </a>
    );
  }

  return (
    <Tag
      type={type}
      className={classes}
      onClick={onClick}
      disabled={disabled || loading}
      aria-disabled={disabled || loading}
      {...props}
    >
      {loading ? <><span className="spinner spinner-sm" /> Loading…</> : children}
    </Tag>
  );
}

export default Button;
