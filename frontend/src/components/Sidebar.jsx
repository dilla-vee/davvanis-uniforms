export default function Sidebar({ activePage, setActivePage, dark, onToggleDark, user, onLogout }) {
  // Dynamically build navigation items based on user role
  const navItems = [];

  if (user?.role === 'workshop') {
    navItems.push({ id: 'transfers', label: 'Transit', icon: '🚚' });
    navItems.push({ id: 'stock', label: 'Stock', icon: '📦' });
    navItems.push({ id: 'orders', label: 'Orders', icon: '📋' });
  } else {
    navItems.push({ id: 'dashboard', label: 'Dashboard', icon: '🏠' });
    navItems.push({ id: 'stock', label: 'Stock', icon: '📦' });
    navItems.push({ id: 'transfers', label: 'Transit', icon: '🚚' });
    navItems.push({ id: 'orders', label: 'Orders', icon: '📋' });
    navItems.push({ id: 'clients', label: 'Clients', icon: '👥' });
  }

  if (user?.role === 'admin') {
    navItems.push({ id: 'analytics', label: 'Analytics', icon: '📊' });
    navItems.push({ id: 'users', label: 'Staff Settings', icon: '🛡️' });
  }

  return (
    <aside className="theme-sidebar flex flex-col shrink-0 h-full" style={{ width: '224px' }}>
      {/* Logo */}
      <div className="px-4 py-4 theme-border-light" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3">
          {/* Icon badge */}
          <div style={{
            width: '38px', height: '38px', borderRadius: '10px', flexShrink: 0,
            background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(79,70,229,0.35)',
            fontSize: '18px',
          }}>👔</div>
          <div style={{ lineHeight: 1.1 }}>
            <div style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontWeight: 700,
              fontSize: '15px',
              background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              letterSpacing: '0.01em',
            }}>
              Davvanis
            </div>
            <div style={{
              fontFamily: "'Inter', sans-serif",
              fontWeight: 600,
              fontSize: '11px',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--text-secondary)',
            }}>
              Uniforms
            </div>
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

      {/* Profile Card & Logout */}
      {user && (
        <div className="px-4 py-3 border-t flex flex-col gap-2" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm uppercase">
              {user.name.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-theme-primary truncate leading-tight">{user.name}</p>
              <p className="text-[10px] text-theme-muted truncate leading-tight capitalize">{user.role}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="w-full py-1.5 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 border border-transparent hover:border-red-200 dark:hover:border-red-950 transition-colors flex items-center justify-center gap-1.5"
          >
            🚪 Sign Out
          </button>
        </div>
      )}

      {/* Footer — theme toggle */}
      <div className="px-4 py-3 border-t" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="text-base">{dark ? '🌙' : '☀️'}</span>
            <span className="text-xs font-medium text-theme-secondary">
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
              width: '40px',
              height: '22px',
              borderRadius: '11px',
              backgroundColor: dark ? '#4f46e5' : '#d1d5db',
              cursor: 'pointer',
              transition: 'background-color 0.3s ease',
              flexShrink: 0,
            }}
          >
            <div style={{
              position: 'absolute',
              top: '3px',
              left: dark ? '21px' : '3px',
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              backgroundColor: 'white',
              boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
              transition: 'left 0.3s ease',
            }} />
          </div>
        </div>
        <p className="text-[9px] text-theme-muted text-center mt-2.5">Davvanis Uniforms © 2026</p>
      </div>
    </aside>
  );
}
