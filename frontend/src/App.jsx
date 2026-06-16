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
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') return true;
    if (saved === 'light') return false;
    // Default to light mode — only use saved preference
    return false;
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
    // Directly update the DOM class — no useEffect delay
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
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-40 lg:static lg:z-auto
        transform transition-transform duration-200 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <Sidebar
          activePage={activePage}
          setActivePage={handleNav}
          dark={dark}
          onToggleDark={toggleDark}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <header className="lg:hidden bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center gap-3 shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="Open menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="text-base font-semibold text-gray-900 dark:text-gray-100">
            {PAGE_LABELS[activePage]}
          </span>

          {/* Mobile dark toggle */}
          <div className="ml-auto flex items-center gap-2">
            <span className="text-sm">{dark ? '🌙' : '☀️'}</span>
            <div className="relative cursor-pointer" onClick={toggleDark}>
              <div className={`w-11 h-6 rounded-full transition-colors duration-300 ${dark ? 'bg-indigo-600' : 'bg-gray-300'}`} />
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all duration-300 ${dark ? 'left-6' : 'left-1'}`} />
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
