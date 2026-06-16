const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: '🏠' },
  { id: 'stock', label: 'Stock', icon: '📦' },
  { id: 'orders', label: 'Orders', icon: '📋' },
  { id: 'clients', label: 'Clients', icon: '👥' },
  { id: 'analytics', label: 'Analytics', icon: '📊' },
];

export default function Sidebar({ activePage, setActivePage, dark, onToggleDark }) {
  return (
    <aside className="theme-sidebar flex flex-col shrink-0 h-full" style={{ width: '224px' }}>
      {/* Logo */}
      <div className="px-5 py-5 theme-border-light" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2">
          <span className="text-2xl">👕</span>
          <div>
            <h1 className="text-lg font-bold text-indigo-600 leading-tight">UniStore</h1>
            <p className="text-xs text-theme-muted">Uniform Manager</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActivePage(item.id)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left"
              style={{
                backgroundColor: isActive ? (dark ? '#1e1b4b' : '#eef2ff') : 'transparent',
                color: isActive ? (dark ? '#a5b4fc' : '#4338ca') : 'var(--text-secondary)',
              }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
              {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-500" />}
            </button>
          );
        })}
      </nav>

      {/* Footer — theme toggle */}
      <div className="px-4 py-4" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="text-base">{dark ? '🌙' : '☀️'}</span>
            <span className="text-sm font-medium text-theme-secondary">
              {dark ? 'Dark Mode' : 'Light Mode'}
            </span>
          </div>

          {/* Toggle switch — inline styles so it always works */}
          <div
            onClick={onToggleDark}
            role="switch"
            aria-checked={dark}
            tabIndex={0}
            onKeyDown={e => e.key === 'Enter' && onToggleDark()}
            style={{
              position: 'relative',
              width: '44px',
              height: '24px',
              borderRadius: '12px',
              backgroundColor: dark ? '#4f46e5' : '#d1d5db',
              cursor: 'pointer',
              transition: 'background-color 0.3s ease',
              flexShrink: 0,
            }}
          >
            <div style={{
              position: 'absolute',
              top: '4px',
              left: dark ? '24px' : '4px',
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              backgroundColor: 'white',
              boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
              transition: 'left 0.3s ease',
            }} />
          </div>
        </div>
        <p className="text-xs text-theme-muted text-center mt-3">UniStore v1.0</p>
      </div>
    </aside>
  );
}
