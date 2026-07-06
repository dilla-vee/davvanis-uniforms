import React, { useState, useEffect } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import { apiFetch } from '../utils/api';

const KSH = 'Ksh ';

// ── Greeting ────────────────────────────────────────────────────
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

// ── Animated KPI card ────────────────────────────────────────────
function KpiCard({ icon, label, value, sub, accent, loading }) {
  return (
    <div
      className="card p-5 flex flex-col gap-3 relative overflow-hidden"
      style={{ borderTop: `3px solid ${accent}` }}
    >
      <div className="flex items-start justify-between">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
          style={{ background: `${accent}22` }}
        >
          {icon}
        </div>
        {sub && !loading && (
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: `${accent}18`, color: accent }}
          >
            {sub}
          </span>
        )}
      </div>
      {loading ? (
        <div className="space-y-2">
          <div className="h-7 w-20 rounded-lg animate-pulse" style={{ background: 'var(--bg-muted)' }} />
          <div className="h-3 w-28 rounded animate-pulse" style={{ background: 'var(--bg-muted)' }} />
        </div>
      ) : (
        <div>
          <p className="text-2xl font-extrabold text-theme-primary tracking-tight">{value}</p>
          <p className="text-xs text-theme-secondary mt-0.5 font-medium">{label}</p>
        </div>
      )}
      {/* Decorative circle */}
      <div
        className="absolute -bottom-4 -right-4 w-20 h-20 rounded-full opacity-10"
        style={{ background: accent }}
      />
    </div>
  );
}

// ── Category pie chart ───────────────────────────────────────────
const PIE_COLORS = ['#6366f1', '#06b6d4', '#f59e0b', '#10b981', '#f43f5e', '#8b5cf6', '#ec4899'];

function CategoryChart({ stock, loading }) {
  const data = React.useMemo(() => {
    const counts = {};
    stock.forEach(s => {
      const cat = s.category || 'Other';
      counts[cat] = (counts[cat] || 0) + (parseInt(s.quantity) || 0);
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 7);
  }, [stock]);

  if (loading) return (
    <div className="flex items-center justify-center h-48">
      <div className="w-28 h-28 rounded-full animate-pulse" style={{ background: 'var(--bg-muted)' }} />
    </div>
  );

  if (!data.length) return (
    <p className="text-center text-sm text-theme-secondary py-10">No stock data</p>
  );

  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={50}
          outerRadius={80}
          paddingAngle={3}
          dataKey="value"
        >
          {data.map((_, i) => (
            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(v) => [v + ' units', '']}
          contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px' }}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          formatter={(val) => <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{val}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

// ── Orders bar chart ─────────────────────────────────────────────
function OrdersChart({ orders, loading }) {
  const data = React.useMemo(() => {
    const counts = {};
    orders.forEach(o => {
      const month = new Date(o.order_date).toLocaleString('default', { month: 'short' });
      if (!counts[month]) counts[month] = { month, total: 0, value: 0 };
      counts[month].total += 1;
      counts[month].value += parseFloat(o.total_price) || 0;
    });
    return Object.values(counts).slice(-6);
  }, [orders]);

  if (loading) return (
    <div className="flex items-end gap-2 h-40 px-4">
      {[60, 80, 50, 90, 70, 85].map((h, i) => (
        <div key={i} className="flex-1 rounded-t-lg animate-pulse" style={{ height: `${h}%`, background: 'var(--bg-muted)' }} />
      ))}
    </div>
  );

  if (!data.length) return <p className="text-center text-sm text-theme-secondary py-10">No orders data</p>;

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} barSize={20}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
        <Tooltip
          formatter={(v, name) => [name === 'value' ? KSH + v.toFixed(0) : v, name === 'value' ? 'Revenue' : 'Orders']}
          contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px' }}
        />
        <Bar dataKey="total" fill="#6366f1" radius={[4, 4, 0, 0]} name="total" />
        <Bar dataKey="value" fill="#06b6d4" radius={[4, 4, 0, 0]} name="value" />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Status badge ─────────────────────────────────────────────────
function StatusBadge({ status }) {
  const map = {
    pending:    { bg: '#fef3c7', color: '#92400e' },
    processing: { bg: '#dbeafe', color: '#1e40af' },
    completed:  { bg: '#d1fae5', color: '#065f46' },
    cancelled:  { bg: '#fee2e2', color: '#991b1b' },
  };
  const s = map[status] || { bg: '#f3f4f6', color: '#374151' };
  return (
    <span
      className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold capitalize"
      style={{ background: s.bg, color: s.color }}
    >
      {status}
    </span>
  );
}

// ── Transfer type label ──────────────────────────────────────────
function TransferBadge({ type }) {
  const map = {
    workshop_to_shop:        { label: 'Workshop → Shop',       bg: '#ede9fe', color: '#5b21b6' },
    workshop_to_embroidery:  { label: 'Workshop → Embroidery', bg: '#fce7f3', color: '#9d174d' },
    embroidery_to_shop:      { label: 'Embroidery → Shop',     bg: '#d1fae5', color: '#065f46' },
  };
  const s = map[type] || { label: type, bg: '#f3f4f6', color: '#374151' };
  return (
    <span
      className="inline-block px-2 py-0.5 rounded text-[9px] font-bold"
      style={{ background: s.bg, color: s.color }}
    >
      {s.label}
    </span>
  );
}

// ── Main Dashboard ───────────────────────────────────────────────
export default function Dashboard({ user }) {
  const [stock, setStock]       = useState([]);
  const [orders, setOrders]     = useState([]);
  const [clients, setClients]   = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading]   = useState(true);

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true);
        const [sR, oR, cR, lR, tR] = await Promise.all([
          apiFetch('/api/stock'),
          apiFetch('/api/orders'),
          apiFetch('/api/clients'),
          apiFetch('/api/stock/low'),
          apiFetch('/api/stock/transfers'),
        ]);
        const [s, o, c, l, t] = await Promise.all([sR.json(), oR.json(), cR.json(), lR.json(), tR.json()]);
        setStock(s); setOrders(o); setClients(c); setLowStock(l); setTransfers(t);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const pendingOrders    = orders.filter(o => o.status === 'pending').length;
  const completedOrders  = orders.filter(o => o.status === 'completed').length;
  const pendingTransfers = transfers.filter(t => t.status === 'pending').length;

  const totalShopQty     = stock.reduce((s, i) => s + (parseInt(i.quantity) || 0), 0);
  const totalWorkshopQty = stock.reduce((s, i) => s + (parseInt(i.workshop_quantity) || 0), 0);
  const totalEmbroidery  = stock.reduce((s, i) => s + (parseInt(i.embroidery_quantity) || 0), 0);

  const recentOrders    = orders.slice(0, 5);
  const recentTransfers = transfers.slice(0, 4);

  return (
    <div className="space-y-5">

      {/* ── Hero greeting ── */}
      <div
        className="rounded-2xl p-5 relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, var(--bg-card) 0%, var(--bg-muted) 100%)',
          border: '1px solid var(--border-light)',
          boxShadow: 'var(--shadow)',
        }}
      >
        {/* Warm accent stripe at top */}
        <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl" style={{ background: 'linear-gradient(90deg, #d9a21b, #b8860b, #d9a21b)' }} />

        <div className="relative z-10 mt-1">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-theme-muted">{today}</p>
          <h1 className="text-2xl font-extrabold text-theme-primary mt-1">
            {getGreeting()}{user?.name ? `, ${user.name.split(' ')[0]}` : ''}! 👋
          </h1>
          <p className="text-sm mt-1 text-theme-secondary">
            Here's what's happening at Davannis Uniforms today.
          </p>
          <div className="flex flex-wrap gap-2 mt-4">
            <div className="px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: 'rgba(99,102,241,0.08)', color: '#6366f1', border: '1px solid rgba(99,102,241,0.15)' }}>
              📦 {loading ? '…' : totalShopQty} in Shop
            </div>
            <div className="px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: 'rgba(217,162,27,0.1)', color: '#b8860b', border: '1px solid rgba(217,162,27,0.2)' }}>
              🏭 {loading ? '…' : totalWorkshopQty} in Workshop
            </div>
            <div className="px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: 'rgba(168,85,247,0.08)', color: '#7c3aed', border: '1px solid rgba(168,85,247,0.15)' }}>
              🪡 {loading ? '…' : totalEmbroidery} in Embroidery
            </div>
          </div>
        </div>
        {/* Decorative shapes */}
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-[0.04]" style={{ background: 'radial-gradient(circle, #d9a21b, transparent)', transform: 'translate(30%, -30%)' }} />
        <div className="absolute bottom-0 right-10 w-20 h-20 rounded-full opacity-[0.04]" style={{ background: 'radial-gradient(circle, #b8860b, transparent)', transform: 'translateY(30%)' }} />
      </div>

      {/* ── KPI row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard icon="📦" label="Stock Line Items" value={loading ? '…' : stock.length}      accent="#6366f1" sub={loading ? '' : `${totalShopQty} units`}    loading={loading} />
        <KpiCard icon="📋" label="Pending Orders"   value={loading ? '…' : pendingOrders}     accent="#f59e0b" sub={loading ? '' : `${completedOrders} done`}    loading={loading} />
        <KpiCard icon="👥" label="Total Clients"    value={loading ? '…' : clients.length}    accent="#10b981" sub={loading ? '' : 'Active clients'}             loading={loading} />
        <KpiCard icon="🚨" label="Low Stock Alerts" value={loading ? '…' : lowStock.length}   accent="#ef4444" sub={loading ? '' : lowStock.length > 0 ? 'Needs attention' : 'All healthy'} loading={loading} />
      </div>

      {/* ── Charts row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Category distribution */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-theme-primary">Stock by Category</h3>
              <p className="text-xs text-theme-secondary mt-0.5">Shop quantity distribution</p>
            </div>
            <span className="text-xl">🥧</span>
          </div>
          <CategoryChart stock={stock} loading={loading} />
        </div>

        {/* Orders activity */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-theme-primary">Orders Activity</h3>
              <p className="text-xs text-theme-secondary mt-0.5">Monthly orders &amp; revenue</p>
            </div>
            <span className="text-xl">📊</span>
          </div>
          <OrdersChart orders={orders} loading={loading} />
        </div>
      </div>

      {/* ── Transit + Low Stock row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Pending transfers */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-theme-primary">🚚 Recent Dispatches</h3>
              <p className="text-xs text-theme-secondary mt-0.5">{pendingTransfers} pending approval</p>
            </div>
            {pendingTransfers > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: '#fef3c7', color: '#92400e' }}>
                {pendingTransfers} pending
              </span>
            )}
          </div>
          {loading ? (
            <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-10 rounded-lg animate-pulse" style={{ background: 'var(--bg-muted)' }} />)}</div>
          ) : recentTransfers.length === 0 ? (
            <p className="text-xs text-center py-8 text-theme-secondary">No dispatches yet.</p>
          ) : (
            <div className="space-y-2">
              {recentTransfers.map(t => (
                <div
                  key={t.id}
                  className="flex items-center justify-between p-2.5 rounded-lg"
                  style={{ background: 'var(--bg-muted)' }}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-theme-primary">#{t.id}</span>
                      <TransferBadge type={t.transfer_type} />
                    </div>
                    <p className="text-[10px] text-theme-secondary mt-0.5 truncate">
                      By {t.dispatched_by || '—'} · {t.items?.reduce((s, i) => s + i.qty_dispatched, 0) || 0} items
                    </p>
                  </div>
                  <span
                    className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold capitalize shrink-0"
                    style={{
                      background: t.status === 'pending' ? '#fef3c7' : t.status === 'received' ? '#d1fae5' : '#fee2e2',
                      color:      t.status === 'pending' ? '#92400e' : t.status === 'received' ? '#065f46' : '#991b1b',
                    }}
                  >
                    {t.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Low stock alerts */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-theme-primary">⚠️ Low Stock Alerts</h3>
              <p className="text-xs text-theme-secondary mt-0.5">Items below minimum threshold</p>
            </div>
            {lowStock.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: '#fee2e2', color: '#991b1b' }}>
                {lowStock.length} items
              </span>
            )}
          </div>
          {loading ? (
            <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-10 rounded-lg animate-pulse" style={{ background: 'var(--bg-muted)' }} />)}</div>
          ) : lowStock.length === 0 ? (
            <div className="text-center py-8">
              <span className="text-4xl">✅</span>
              <p className="text-xs text-theme-secondary mt-2 font-medium">All stock levels are healthy!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {lowStock.filter(i => i.category !== 'Sweaters').slice(0, 5).map(item => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-2.5 rounded-lg"
                  style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.12)' }}
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-theme-primary truncate">{item.name}</p>
                    <p className="text-[10px] text-theme-secondary">{item.category} · {item.size || 'No size'}</p>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <span className="text-sm font-extrabold" style={{ color: '#ef4444' }}>{item.quantity}</span>
                    <p className="text-[10px] text-theme-secondary">/ {item.low_stock_threshold} min</p>
                  </div>
                </div>
              ))}
              {lowStock.filter(i => i.category === 'Sweaters').length > 0 && (
                <div
                  className="flex items-center justify-between p-2.5 rounded-lg"
                  style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.12)' }}
                >
                  <div>
                    <p className="text-xs font-semibold text-theme-primary">🧶 Sweaters</p>
                    <p className="text-[10px] text-theme-secondary">{lowStock.filter(i => i.category === 'Sweaters').length} variants low</p>
                  </div>
                  <span className="text-sm font-extrabold" style={{ color: '#ef4444' }}>
                    {lowStock.filter(i => i.category === 'Sweaters').length}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Recent Orders ── */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-theme-primary">📋 Recent Orders</h3>
            <p className="text-xs text-theme-secondary mt-0.5">Latest {recentOrders.length} of {orders.length} orders</p>
          </div>
          <span
            className="px-2 py-0.5 rounded-full text-[10px] font-bold"
            style={{ background: 'rgba(99,102,241,0.12)', color: '#6366f1' }}
          >
            {orders.length} total
          </span>
        </div>
        {loading ? (
          <div className="space-y-2">{[1,2,3,4].map(i => <div key={i} className="h-12 rounded-lg animate-pulse" style={{ background: 'var(--bg-muted)' }} />)}</div>
        ) : recentOrders.length === 0 ? (
          <p className="text-sm text-center py-8 text-theme-secondary">No orders yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-light)' }}>
                  {['Order #', 'Client', 'Date', 'Total', 'Status'].map(h => (
                    <th key={h} className="text-left py-2 pr-3 text-theme-secondary font-semibold uppercase tracking-wide text-[10px]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentOrders.map(order => (
                  <tr key={order.id} className="hover-theme" style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td className="py-3 pr-3 font-bold" style={{ color: '#6366f1' }}>#{order.id}</td>
                    <td className="py-3 pr-3 font-medium text-theme-primary truncate max-w-[120px]">{order.client_name || '—'}</td>
                    <td className="py-3 pr-3 text-theme-secondary">{new Date(order.order_date).toLocaleDateString()}</td>
                    <td className="py-3 pr-3 font-semibold text-theme-primary">{KSH}{(order.total_price || 0).toLocaleString()}</td>
                    <td className="py-3"><StatusBadge status={order.status} /></td>
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
