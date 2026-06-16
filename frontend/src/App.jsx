import { useState } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import StockManager from './components/StockManager';
import OrdersManager from './components/OrdersManager';
import ClientsManager from './components/ClientsManager';
import Analytics from './components/Analytics';

export default function App() {
  const [activePage, setActivePage] = useState('dashboard');

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return <Dashboard />;
      case 'stock':
        return <StockManager />;
      case 'orders':
        return <OrdersManager />;
      case 'clients':
        return <ClientsManager />;
      case 'analytics':
        return <Analytics />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar activePage={activePage} setActivePage={setActivePage} />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6">{renderPage()}</div>
      </main>
    </div>
  );
}
