import { useState, useEffect, Component } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import StockManager from './components/StockManager';
import OrdersManager from './components/OrdersManager';
import ClientsManager from './components/ClientsManager';
import Analytics from './components/Analytics';
import TransitManager from './components/TransitManager';
import Login from './components/Login';
import UserManager from './components/UserManager';

// Error boundary — catches JS crashes and shows message instead of black screen
class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: '2rem', fontFamily: 'sans-serif', background: '#fff', minHeight: '100vh', color: '#111' }}>
          <h2 style={{ color: '#ef4444', marginBottom: '1rem' }}>Something went wrong</h2>
          <p style={{ marginBottom: '0.5rem', color: '#555' }}>Error message:</p>
          <pre style={{ background: '#f3f4f6', padding: '1rem', borderRadius: '8px', fontSize: '14px', overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word', border: '1px solid #e5e7eb' }}>
            {this.state.error.message}
            {'\n\n'}
            {this.state.error.stack}
          </pre>
          <button onClick={() => window.location.reload()} style={{ marginTop: '1rem', padding: '0.5rem 1.5rem', background: '#6366f1', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' }}>
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const PAGE_LABELS = {
  dashboard: 'Dashboard',
  stock: 'Stock Manager',
  transfers: 'Transit Manager',
  orders: 'Orders',
  clients: 'Clients',
  analytics: 'Analytics',
};

function getInitialDark() {
  try {
    return localStorage.getItem('theme') === 'dark';
  } catch {
    return false;
  }
}

function applyTheme(dark) {
  try {
    if (dark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  } catch {
    // localStorage may be blocked in some environments
  }
}

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem('unistore_token'));
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('unistore_user'));
    } catch {
      return null;
    }
  });

  const [activePage, setActivePage] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dark, setDark] = useState(getInitialDark);

  useEffect(() => {
    if ((user?.role === 'workshop' || user?.role === 'embroidery') && !['transfers', 'stock', 'orders'].includes(activePage)) {
      setActivePage('transfers');
    }
  }, [user, activePage]);

  useEffect(() => {
    const handleAuthLogout = () => {
      setToken(null);
      setUser(null);
    };
    window.addEventListener('auth-logout', handleAuthLogout);
    return () => window.removeEventListener('auth-logout', handleAuthLogout);
  }, []);

  const toggleDark = () => {
    const next = !dark;
    setDark(next);
    applyTheme(next);
  };

  const handleNav = (page) => {
    setActivePage(page);
    setSidebarOpen(false);
  };

  const handleLoginSuccess = (t, u) => {
    setToken(t);
    setUser(u);
    setActivePage('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('unistore_token');
    localStorage.removeItem('unistore_user');
    setToken(null);
    setUser(null);
    setActivePage('dashboard');
  };

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard': return <Dashboard user={user} />;
      case 'stock':     return <StockManager user={user} />;
      case 'transfers': return <TransitManager user={user} />;
      case 'orders':    return <OrdersManager user={user} />;
      case 'clients':   return (user?.role !== 'workshop' && user?.role !== 'embroidery') ? <ClientsManager user={user} /> : <Dashboard user={user} />;
      case 'users':     return user?.role === 'admin' ? <UserManager /> : <Dashboard user={user} />;
      case 'analytics': return user?.role === 'admin' ? <Analytics /> : <Dashboard user={user} />;
      default:          return <Dashboard user={user} />;
    }
  };

  if (!token) {
    return (
      <ErrorBoundary>
        <Login onLoginSuccess={handleLoginSuccess} />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
    <div className="flex h-screen overflow-hidden theme-page">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <div className={`fixed inset-y-0 left-0 z-40 lg:static lg:z-auto transform transition-transform duration-200 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <Sidebar activePage={activePage} setActivePage={handleNav} dark={dark} onToggleDark={toggleDark} user={user} onLogout={handleLogout} />
      </div>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <header className="lg:hidden theme-header px-4 py-3 flex items-center gap-3 shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="p-1.5 rounded-lg hover-theme" aria-label="Open menu">
            <svg className="w-5 h-5" style={{color:'var(--text-secondary)'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          {/* Mobile brand */}
          <div className="flex items-center gap-2">
            <img
              src="/davannis-logo.svg"
              alt="Davannis Uniforms"
              style={{ width: '34px', height: '40px', flexShrink: 0, objectFit: 'contain' }}
            />
            <div style={{lineHeight:1.1}}>
              <div style={{
                fontFamily:"'Playfair Display',Georgia,serif",
                fontWeight:700, fontSize:'13px',
                background:'linear-gradient(135deg,#061a45,#d9a21b)',
                WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
                backgroundClip:'text',
              }}>Davannis</div>
              <div style={{
                fontFamily:"'Inter',sans-serif", fontWeight:600,
                fontSize:'9px', letterSpacing:'0.1em',
                textTransform:'uppercase', color:'var(--text-muted)',
              }}>Uniforms</div>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="relative cursor-pointer" onClick={toggleDark}>
              <div style={{
                position: 'relative',
                width: '48px',
                height: '26px',
                borderRadius: '13px',
                background: dark
                  ? 'linear-gradient(135deg, #1a1a2e, #2d2d44)'
                  : 'linear-gradient(135deg, #fde68a, #fbbf24)',
                transition: 'background 0.4s ease',
                boxShadow: dark
                  ? 'inset 0 1px 3px rgba(0,0,0,0.4)'
                  : 'inset 0 1px 3px rgba(0,0,0,0.1)',
              }}>
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
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="p-4 lg:p-6">{renderPage()}</div>
        </main>
      </div>
    </div>
    </ErrorBoundary>
  );
}
