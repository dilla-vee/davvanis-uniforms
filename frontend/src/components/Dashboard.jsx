import { useState, useEffect } from 'react';

function StatCard({ icon, label, value, bg, loading }) {
  return (
    <div className="card p-5 flex items-center gap-4">
      <div className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl" style={{ backgroundColor: bg }}>{icon}</div>
      <div>
        <p className="text-sm font-medium text-theme-secondary">{label}</p>
        {loading
          ? <div className="h-7 w-16 rounded mt-1 animate-pulse" style={{ backgroundColor: 'var(--bg-muted)' }} />
          : <p className="text-2xl font-bold text-theme-primary">{value}</p>}
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    pending:    { background: '#fef3c7', color: '#92400e' },
    processing: { background: '#dbeafe', color: '#1e40af' },
    completed:  { background: '#d1fae5', color: '#065f46' },
    cancelled:  { background: '#fee2e2', color: '#991b1b' },
  };
  const s = styles[status] || { background: '#f3f4f6', color: '#374151' };
  return (
    <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold capitalize" style={s}>
      {status}
    </span>
  );
}

export default function Dashboard() {
  const [stock, setStock] = useState([]);
  const [orders, setOrders] = useState([]);
  const [clients, setClients] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true);
        const [sR, oR, cR, lR] = await Promise.all([
          fetch('/api/stock'), fetch('/api/orders'), fetch('/api/clients'), fetch('/api/stock/low'),
        ]);
        const [s, o, c, l] = await Promise.all([sR.json(), oR.json(), cR.json(), lR.json()]);
        setStock(s); setOrders(o); setClients(c); setLowStock(l);
      } catch (err) { setError(err.message); } finally { setLoading(false); }
    };
    fetchAll();
  }, []);

  const pendingOrders = orders.filter(o => o.status === 'pending').length;

  if (error) return <div className="rounded-lg p-4" style={{ background: '#fee2e2', color: '#991b1b' }}><strong>Error:</strong> {error}</div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-theme-primary">Dashboard</h2>
        <p className="text-sm mt-1 text-theme-secondary">Overview of your uniform store</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon="📦" label="Total Stock Items" value={stock.length}    bg="rgba(99,102,241,0.1)"  loading={loading} />
        <StatCard icon="📋" label="Pending Orders"    value={pendingOrders}   bg="rgba(245,158,11,0.1)"  loading={loading} />
        <StatCard icon="👥" label="Total Clients"     value={clients.length}  bg="rgba(34,197,94,0.1)"   loading={loading} />
        <StatCard icon="⚠️" label="Low Stock Alerts"  value={lowStock.length} bg="rgba(239,68,68,0.1)"   loading={loading} />
      </div>

      {/* Low Stock */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <span>⚠️</span>
          <h3 className="text-base font-semibold text-theme-primary">Low Stock Alerts</h3>
          {lowStock.length > 0 && (
            <span className="ml-auto px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: '#fee2e2', color: '#991b1b' }}>
              {lowStock.length} items
            </span>
          )}
        </div>
        {loading ? (
          <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-10 rounded animate-pulse" style={{ backgroundColor: 'var(--bg-muted)' }} />)}</div>
        ) : lowStock.length === 0 ? (
          <div className="text-center py-8"><span className="text-4xl">✅</span><p className="mt-2 text-sm text-theme-secondary">All stock levels are healthy!</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr style={{ borderBottom: '1px solid var(--border-light)' }}>
                <th className="text-left py-2 pr-4 text-theme-secondary font-medium">Item</th>
                <th className="text-left py-2 pr-4 text-theme-secondary font-medium hidden sm:table-cell">Category</th>
                <th className="text-left py-2 pr-4 text-theme-secondary font-medium hidden sm:table-cell">Size</th>
                <th className="text-left py-2 text-theme-secondary font-medium">Qty</th>
              </tr></thead>
              <tbody>
                {lowStock.map(item => (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td className="py-2.5 pr-4 font-medium text-theme-primary">
                      {item.name}
                      <span className="block text-xs text-theme-muted sm:hidden">{item.category} · {item.size}</span>
                    </td>
                    <td className="py-2.5 pr-4 text-theme-secondary hidden sm:table-cell">{item.category || '—'}</td>
                    <td className="py-2.5 pr-4 text-theme-secondary hidden sm:table-cell">{item.size || '—'}</td>
                    <td className="py-2.5">
                      <span className="font-bold" style={{ color: '#ef4444' }}>{item.quantity}</span>
                      <span className="text-xs ml-1 text-theme-muted">/ {item.low_stock_threshold} min</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Orders */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <span>📋</span>
          <h3 className="text-base font-semibold text-theme-primary">Recent Orders</h3>
        </div>
        {loading ? (
          <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-10 rounded animate-pulse" style={{ backgroundColor: 'var(--bg-muted)' }} />)}</div>
        ) : orders.length === 0 ? (
          <p className="text-sm text-center py-6 text-theme-secondary">No orders yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr style={{ borderBottom: '1px solid var(--border-light)' }}>
                <th className="text-left py-2 pr-4 text-theme-secondary font-medium">Order #</th>
                <th className="text-left py-2 pr-4 text-theme-secondary font-medium">Client</th>
                <th className="text-left py-2 pr-4 text-theme-secondary font-medium hidden sm:table-cell">Date</th>
                <th className="text-left py-2 pr-4 text-theme-secondary font-medium hidden sm:table-cell">Total</th>
                <th className="text-left py-2 text-theme-secondary font-medium">Status</th>
              </tr></thead>
              <tbody>
                {orders.slice(0, 5).map(order => (
                  <tr key={order.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td className="py-2.5 pr-4 font-medium" style={{ color: '#6366f1' }}>#{order.id}</td>
                    <td className="py-2.5 pr-4 text-theme-primary">
                      {order.client_name || '—'}
                      <span className="block text-xs text-theme-muted sm:hidden">£{(order.total_price||0).toFixed(2)} · {new Date(order.order_date).toLocaleDateString()}</span>
                    </td>
                    <td className="py-2.5 pr-4 text-theme-secondary hidden sm:table-cell">{new Date(order.order_date).toLocaleDateString()}</td>
                    <td className="py-2.5 pr-4 font-medium text-theme-primary hidden sm:table-cell">£{(order.total_price||0).toFixed(2)}</td>
                    <td className="py-2.5"><StatusBadge status={order.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
