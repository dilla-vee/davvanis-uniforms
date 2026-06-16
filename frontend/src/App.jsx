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

export default function App() {
  const [activePage, setActivePage] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — hidden on mobile unless open */}
      <div className={`
        fixed inset-y-0 left-0 z-40 lg:static lg:z-auto
        transform transition-transform duration-200 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <Sidebar activePage={activePage} setActivePage={handleNav} />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <header className="lg:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-lg text-gray-600 hover:bg-gray-100"
            aria-label="Open menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="text-base font-semibold text-gray-900">{PAGE_LABELS[activePage]}</span>
          <span className="ml-auto text-xl">👕</span>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="p-4 lg:p-6">{renderPage()}</div>
        </main>
      </div>
    </div>
  );
}
