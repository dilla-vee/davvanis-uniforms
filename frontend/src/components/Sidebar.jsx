export default function Sidebar({ activePage, setActivePage, dark, onToggleDark, user, onLogout }) {
  // Dynamically build navigation items based on user role
  const navItems = [];

  if (user?.role === 'embroidery') {
    navItems.push({ id: 'transfers', label: 'Transit', icon: '🚚' });
  } else if (user?.role === 'workshop') {
    navItems.push({ id: 'transfers', label: 'Transit', icon: '🚚' });
    navItems.push({ id: 'stock', label: 'Stock', icon: '📦' });
    navItems.push({ id: 'labels', label: 'Print Labels', icon: '🏷️' });
  } else {
    navItems.push({ id: 'dashboard', label: 'Dashboard', icon: '🏠' });
    navItems.push({ id: 'pos', label: 'POS', icon: '🛒' });
    navItems.push({ id: 'catalogue', label: 'Catalogue', icon: '🏷️' });
    navItems.push({ id: 'stock', label: 'Stock', icon: '📦' });
    navItems.push({ id: 'transfers', label: 'Transit', icon: '🚚' });
    navItems.push({ id: 'orders', label: 'Orders', icon: '📋' });
    navItems.push({ id: 'clients', label: 'Clients', icon: '👥' });
  }

  if (user?.role === 'admin') {
    navItems.push({ id: 'labels', label: 'Print Labels', icon: '🖨️' });
    navItems.push({ id: 'analytics', label: 'Analytics', icon: '📊' });
    navItems.push({ id: 'users', label: 'Staff Settings', icon: '🛡️' });
  }

  return (
    <aside className="theme-sidebar flex flex-col shrink-0 h-full" style={{ width: '224px' }}>
      {/* Logo */}
      <div className="px-4 py-4 theme-border-light" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3">
          <img
            src="/davannis-logo.svg"
            alt="Davannis Uniforms"
            style={{ width: '42px', height: '50px', flexShrink: 0, objectFit: 'contain' }}
          />
          <div style={{ lineHeight: 1.1 }}>
            <div style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontWeight: 700,
              fontSize: '15px',
              background: 'linear-gradient(135deg, #061a45, #d9a21b)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              letterSpacing: '0.01em',
            }}>
              Davannis
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
                backgroundColor: isActive ? (dark ? '#282520' : '#eef2ff') : 'transparent',
                color: isActive ? (dark ? '#d9a21b' : '#4338ca') : 'var(--text-secondary)',
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
        <div
          onClick={onToggleDark}
          className="flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer transition-colors"
          style={{ background: 'var(--bg-muted)' }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
          onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-muted)'}
        >
          {/* Sun/Moon toggle track */}
          <div
            style={{
              position: 'relative',
              width: '48px',
              height: '26px',
              borderRadius: '13px',
              background: dark
                ? 'linear-gradient(135deg, #1a1a2e, #2d2d44)'
                : 'linear-gradient(135deg, #fde68a, #fbbf24)',
              transition: 'background 0.4s ease',
              flexShrink: 0,
              boxShadow: dark
                ? 'inset 0 1px 3px rgba(0,0,0,0.4)'
                : 'inset 0 1px 3px rgba(0,0,0,0.1)',
            }}
          >
            {/* Knob */}
            <div style={{
              position: 'absolute',
              top: '3px',
              left: dark ? '25px' : '3px',
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              background: dark ? '#1e1e22' : '#ffffff',
              boxShadow: dark
                ? '0 0 6px rgba(217,162,27,0.4), 0 1px 3px rgba(0,0,0,0.5)'
                : '0 1px 4px rgba(0,0,0,0.15)',
              transition: 'left 0.35s cubic-bezier(0.4, 0, 0.2, 1), background 0.3s, box-shadow 0.3s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '11px',
              lineHeight: 1,
            }}>
              {dark ? '🌙' : '☀️'}
            </div>
          </div>

          <span className="text-xs font-semibold text-theme-secondary">
            {dark ? 'Dark' : 'Light'}
          </span>
        </div>
        <p className="text-[9px] text-theme-muted text-center mt-2.5">Davannis Uniforms © 2026</p>
      </div>
    </aside>
  );
}
