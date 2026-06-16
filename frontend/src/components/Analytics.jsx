import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4', '#a855f7', '#ec4899', '#14b8a6'];

function StatCard({ icon, label, value, color }) {
  return (
    <div className="card p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl ${color}`}>{icon}</div>
      <div>
        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{label}</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
      </div>
    </div>
  );
}

function StockStatusPill({ quantity, threshold }) {
  if (quantity === 0) return <span className="bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 px-2 py-0.5 rounded-full text-xs font-semibold">Out of Stock</span>;
  if (quantity <= threshold) return <span className="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 px-2 py-0.5 rounded-full text-xs font-semibold">Low Stock</span>;
  return <span className="bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 px-2 py-0.5 rounded-full text-xs font-semibold">In Stock</span>;
}

// Custom tooltip that respects dark mode
function CustomTooltip({ active, payload, label, prefix = '' }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 shadow text-sm">
      <p className="font-medium text-gray-700 dark:text-gray-200 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-gray-600 dark:text-gray-300">{prefix}{typeof p.value === 'number' ? (prefix === '£' ? p.value.toFixed(2) : p.value) : p.value}</p>
      ))}
    </div>
  );
}

export default function Analytics() {
  const [summary, setSummary] = useState(null);
  const [allStock, setAllStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [summaryRes, stockRes] = await Promise.all([
          fetch('/api/orders/analytics/stock-summary'), fetch('/api/stock'),
        ]);
        if (!summaryRes.ok || !stockRes.ok) throw new Error('Failed to fetch analytics data');
        const [summaryData, stockData] = await Promise.all([summaryRes.json(), stockRes.json()]);
        setSummary(summaryData); setAllStock(stockData);
      } catch (err) { setError(err.message); } finally { setLoading(false); }
    };
    fetchData();
  }, []);

  if (error) return <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-400">{error}</div>;

  if (loading) return (
    <div className="space-y-5">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Analytics</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <div key={i} className="card p-5 h-20 animate-pulse bg-gray-100 dark:bg-gray-800" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card p-5 h-72 animate-pulse bg-gray-100 dark:bg-gray-800" />
        <div className="card p-5 h-72 animate-pulse bg-gray-100 dark:bg-gray-800" />
      </div>
    </div>
  );

  const categories = summary?.category_breakdown || [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Analytics</h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Inventory insights and stock overview</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon="📦" label="Unique Items" value={summary?.total_items ?? 0} color="bg-indigo-50 dark:bg-indigo-950" />
        <StatCard icon="🔢" label="Total Units" value={summary?.total_units ?? 0} color="bg-blue-50 dark:bg-blue-950" />
        <StatCard icon="💷" label="Inventory Value" value={`£${(summary?.total_value ?? 0).toFixed(2)}`} color="bg-green-50 dark:bg-green-950" />
        <StatCard icon="⚠️" label="Low Stock Items" value={summary?.low_stock_count ?? 0} color="bg-red-50 dark:bg-red-950" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card p-5">
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">Stock by Category (Units)</h3>
          {categories.length === 0 ? (
            <p className="text-gray-400 dark:text-gray-500 text-sm text-center py-10">No category data available.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={categories} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'currentColor' }} className="text-gray-500 dark:text-gray-400" />
                <YAxis tick={{ fontSize: 12, fill: 'currentColor' }} className="text-gray-500 dark:text-gray-400" />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="total_quantity" radius={[4, 4, 0, 0]}>
                  {categories.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card p-5">
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">Inventory Value by Category (£)</h3>
          {categories.length === 0 ? (
            <p className="text-gray-400 dark:text-gray-500 text-sm text-center py-10">No category data available.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={categories} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'currentColor' }} className="text-gray-500 dark:text-gray-400" />
                <YAxis tick={{ fontSize: 12, fill: 'currentColor' }} className="text-gray-500 dark:text-gray-400" tickFormatter={(v) => `£${v}`} />
                <Tooltip content={<CustomTooltip prefix="£" />} />
                <Bar dataKey="total_value" radius={[4, 4, 0, 0]}>
                  {categories.map((_, idx) => <Cell key={idx} fill={COLORS[(idx + 2) % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Stock Status Table */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Stock Status</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Full inventory breakdown</p>
        </div>

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
              <tr>
                {['Name', 'Category', 'Size', 'Quantity', 'Unit Price', 'Total Value', 'Status'].map(h => (
                  <th key={h} className="text-left py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {allStock.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-gray-400 dark:text-gray-500">No stock data</td></tr>
              ) : allStock.map((item) => {
                const value = (item.quantity || 0) * (item.price || 0);
                return (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="py-3 px-4 font-medium text-gray-900 dark:text-gray-100">{item.name}</td>
                    <td className="py-3 px-4 text-gray-500 dark:text-gray-400">{item.category || '—'}</td>
                    <td className="py-3 px-4 text-gray-500 dark:text-gray-400">{item.size || '—'}</td>
                    <td className="py-3 px-4 font-semibold text-gray-900 dark:text-gray-100">{item.quantity}</td>
                    <td className="py-3 px-4 text-gray-700 dark:text-gray-300">{item.price !== null ? `£${Number(item.price).toFixed(2)}` : '—'}</td>
                    <td className="py-3 px-4 font-medium text-gray-900 dark:text-gray-100">£{value.toFixed(2)}</td>
                    <td className="py-3 px-4"><StockStatusPill quantity={item.quantity} threshold={item.low_stock_threshold} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-700">
          {allStock.length === 0 ? (
            <p className="text-center py-8 text-gray-400 dark:text-gray-500">No stock data</p>
          ) : allStock.map((item) => {
            const value = (item.quantity || 0) * (item.price || 0);
            return (
              <div key={item.id} className="p-4">
                <div className="flex items-start justify-between mb-1.5">
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">{item.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{item.category || '—'}{item.size ? ` · ${item.size}` : ''}</p>
                  </div>
                  <StockStatusPill quantity={item.quantity} threshold={item.low_stock_threshold} />
                </div>
                <div className="flex gap-4 text-xs text-gray-500 dark:text-gray-400 mt-1">
                  <span>Qty: <span className="font-bold text-gray-900 dark:text-gray-100">{item.quantity}</span></span>
                  <span>Price: <span className="font-medium text-gray-900 dark:text-gray-100">{item.price !== null ? `£${Number(item.price).toFixed(2)}` : '—'}</span></span>
                  <span>Value: <span className="font-medium text-gray-900 dark:text-gray-100">£{value.toFixed(2)}</span></span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
