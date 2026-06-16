import { useState } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import StockManager from './components/StockManager';
import OrdersManager from './components/OrdersManager';
import ClientsManager from './components/ClientsManager';
import Analytics from './components/Analytics';

const PAGE_LABELS = {
  dashboard: 'Dashboard',
  stock: 'Stock Manager',
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

export default function App() {
  const [activePage, setActivePage] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dark, setDark] = useState(getInitialDark);

  const toggleDark = () => {
    const next = !dark;
    setDark(next);
    if (next) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const handleNav = (page) => {
    setActivePage(page);
    setSidebarOpen(false);
  };

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard': return <Dashboard />;
      case 'stock':     return <StockManager />;
      case 'orders':    return <OrdersManager />;
      case 'clients':   return <ClientsManager />;
      case 'analytics': return <Analytics />;
      default:          return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden theme-page">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <div className={`fixed inset-y-0 left-0 z-40 lg:static lg:z-auto transform transition-transform duration-200 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <Sidebar activePage={activePage} setActivePage={handleNav} dark={dark} onToggleDark={toggleDark} />
      </div>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <header className="lg:hidden theme-header px-4 py-3 flex items-center gap-3 shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="p-1.5 rounded-lg hover-theme" aria-label="Open menu">
            <svg className="w-5 h-5" style={{color:'var(--text-secondary)'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="text-base font-semibold text-theme-primary">{PAGE_LABELS[activePage]}</span>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-sm">{dark ? '🌙' : '☀️'}</span>
            <div className="relative cursor-pointer" onClick={toggleDark}>
              <div style={{
                width: '44px', height: '24px', borderRadius: '12px',
                backgroundColor: dark ? '#4f46e5' : '#d1d5db',
                transition: 'background-color 0.3s',
                position: 'relative'
              }}>
                <div style={{
                  position: 'absolute', top: '4px',
                  left: dark ? '24px' : '4px',
                  width: '16px', height: '16px',
                  borderRadius: '50%', backgroundColor: 'white',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                  transition: 'left 0.3s'
                }} />
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="p-4 lg:p-6">{renderPage()}</div>
        </main>
      </div>
    </div>
  );
}
