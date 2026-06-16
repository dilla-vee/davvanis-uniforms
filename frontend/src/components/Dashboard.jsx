import { useState, useEffect } from 'react';

function StatCard({ icon, label, value, color, loading }) {
  return (
    <div className="card p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-sm text-gray-500 font-medium">{label}</p>
        {loading ? (
          <div className="h-7 w-16 bg-gray-200 animate-pulse rounded mt-1" />
        ) : (
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        )}
      </div>
    </div>
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
        const [stockRes, ordersRes, clientsRes, lowRes] = await Promise.all([
          fetch('/api/stock'),
          fetch('/api/orders'),
          fetch('/api/clients'),
          fetch('/api/stock/low'),
        ]);
        if (!stockRes.ok || !ordersRes.ok || !clientsRes.ok || !lowRes.ok) {
          throw new Error('Failed to fetch dashboard data');
        }
        const [stockData, ordersData, clientsData, lowData] = await Promise.all([
          stockRes.json(),
          ordersRes.json(),
          clientsRes.json(),
          lowRes.json(),
        ]);
        setStock(stockData);
        setOrders(ordersData);
        setClients(clientsData);
        setLowStock(lowData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const pendingOrders = orders.filter((o) => o.status === 'pending').length;

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        <strong>Error:</strong> {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
        <p className="text-gray-500 text-sm mt-1">Overview of your uniform store</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          icon="📦"
          label="Total Stock Items"
          value={stock.length}
          color="bg-indigo-50"
          loading={loading}
        />
        <StatCard
          icon="📋"
          label="Pending Orders"
          value={pendingOrders}
          color="bg-amber-50"
          loading={loading}
        />
        <StatCard
          icon="👥"
          label="Total Clients"
          value={clients.length}
          color="bg-green-50"
          loading={loading}
        />
        <StatCard
          icon="⚠️"
          label="Low Stock Alerts"
          value={lowStock.length}
          color="bg-red-50"
          loading={loading}
        />
      </div>

      {/* Low Stock Alerts */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-lg">⚠️</span>
          <h3 className="text-base font-semibold text-gray-900">Low Stock Alerts</h3>
          {lowStock.length > 0 && (
            <span className="ml-auto bg-red-100 text-red-700 text-xs font-semibold px-2 py-0.5 rounded-full">
              {lowStock.length} items
            </span>
          )}
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 bg-gray-100 animate-pulse rounded" />
            ))}
          </div>
        ) : lowStock.length === 0 ? (
          <div className="text-center py-8">
            <span className="text-4xl">✅</span>
            <p className="text-gray-500 mt-2 text-sm">All stock levels are healthy!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 pr-4 text-gray-500 font-medium">Item</th>
                  <th className="text-left py-2 pr-4 text-gray-500 font-medium hidden sm:table-cell">Category</th>
                  <th className="text-left py-2 pr-4 text-gray-500 font-medium hidden sm:table-cell">Size</th>
                  <th className="text-left py-2 text-gray-500 font-medium">Quantity</th>
                </tr>
              </thead>
              <tbody>
                {lowStock.map((item) => (
                  <tr key={item.id} className="border-b border-gray-50 last:border-0">
                    <td className="py-2.5 pr-4 font-medium text-gray-900">
                      {item.name}
                      <span className="block text-xs text-gray-400 sm:hidden">{item.category} · {item.size}</span>
                    </td>
                    <td className="py-2.5 pr-4 text-gray-500 hidden sm:table-cell">{item.category || '—'}</td>
                    <td className="py-2.5 pr-4 text-gray-500 hidden sm:table-cell">{item.size || '—'}</td>
                    <td className="py-2.5">
                      <span className="font-bold text-red-600">{item.quantity}</span>
                      <span className="text-gray-400 text-xs ml-1">/ {item.low_stock_threshold} min</span>
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
          <span className="text-lg">📋</span>
          <h3 className="text-base font-semibold text-gray-900">Recent Orders</h3>
        </div>
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 bg-gray-100 animate-pulse rounded" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-6">No orders yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 pr-4 text-gray-500 font-medium">Order #</th>
                  <th className="text-left py-2 pr-4 text-gray-500 font-medium">Client</th>
                  <th className="text-left py-2 pr-4 text-gray-500 font-medium hidden sm:table-cell">Date</th>
                  <th className="text-left py-2 pr-4 text-gray-500 font-medium hidden sm:table-cell">Total</th>
                  <th className="text-left py-2 text-gray-500 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.slice(0, 5).map((order) => (
                  <tr key={order.id} className="border-b border-gray-50 last:border-0">
                    <td className="py-2.5 pr-4 font-medium text-indigo-600">#{order.id}</td>
                    <td className="py-2.5 pr-4 text-gray-900">
                      {order.client_name || '—'}
                      <span className="block text-xs text-gray-400 sm:hidden">£{(order.total_price || 0).toFixed(2)} · {new Date(order.order_date).toLocaleDateString()}</span>
                    </td>
                    <td className="py-2.5 pr-4 text-gray-500 hidden sm:table-cell">{new Date(order.order_date).toLocaleDateString()}</td>
                    <td className="py-2.5 pr-4 font-medium hidden sm:table-cell">£{(order.total_price || 0).toFixed(2)}</td>
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

function StatusBadge({ status }) {
  const map = {
    pending: 'bg-amber-100 text-amber-700',
    processing: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${map[status] || 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
}
