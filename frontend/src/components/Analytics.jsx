import React, { useState, useEffect, useRef } from 'react';
import { apiFetch } from '../utils/api';
import { 
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Cell, PieChart, Pie 
} from 'recharts';
import { ShoppingBag, Landmark, AlertTriangle, Layers, TrendingUp, Factory, Scissors } from 'lucide-react';

const COLORS = ['#00e676', '#3b82f6', '#fbb0e9', '#f59e0b', '#ec4899', '#06b6d4', '#8b5cf6'];
const KSH = 'Ksh ';

// Sparkline Mock Data for stat cards
const SPARKLINE_1 = [{ val: 30 }, { val: 45 }, { val: 35 }, { val: 65 }, { val: 55 }, { val: 85 }, { val: 78 }];
const SPARKLINE_2 = [{ val: 12 }, { val: 22 }, { val: 18 }, { val: 35 }, { val: 28 }, { val: 48 }, { val: 42 }];
const SPARKLINE_3 = [{ val: 70 }, { val: 65 }, { val: 85 }, { val: 75 }, { val: 95 }, { val: 80 }, { val: 110 }];
const SPARKLINE_4 = [{ val: 15 }, { val: 10 }, { val: 25 }, { val: 8 }, { val: 18 }, { val: 14 }, { val: 5 }];

function MiniSparkline({ data, color }) {
  return (
    <div className="w-20 h-10 opacity-70">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <Area type="monotone" dataKey="val" stroke={color} fill="none" strokeWidth={1.8} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function StatCard({ icon, label, value, bg, sparkData, sparkColor }) {
  return (
    <div className="card p-5 flex items-center justify-between gap-4 relative overflow-hidden transition-all hover:scale-[1.01] hover:shadow-md">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl" style={{ backgroundColor: bg }}>
          {icon}
        </div>
        <div>
          <p className="text-[10px] font-bold text-theme-secondary uppercase tracking-widest">{label}</p>
          <p className="text-2xl font-black text-theme-primary mt-1">{value}</p>
        </div>
      </div>
      {sparkData && <MiniSparkline data={sparkData} strokeWidth={2} color={sparkColor} />}
    </div>
  );
}

function StatusPill({ quantity, threshold }) {
  if (quantity === 0)
    return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-500/10 text-red-500 border border-red-500/20">Out of Stock</span>;
  if (quantity <= threshold)
    return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">Low Stock</span>;
  return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">In Stock</span>;
}

function ChartTooltip({ active, payload, label, showCurrency }) {
  if (!active || !payload || !payload.length) return null;
  const val = Number(payload[0].value);
  return (
    <div className="card px-3 py-2 text-sm shadow-xl border border-white/5 backdrop-blur-md bg-slate-950/80 rounded-xl">
      <p className="font-bold text-white mb-0.5">{label}</p>
      <p className="text-[#00e676] font-semibold">
        {showCurrency ? KSH + val.toLocaleString() : val.toLocaleString()}
      </p>
    </div>
  );
}

export default function Analytics() {
  const [summary, setSummary] = useState(null);
  const [salesData, setSalesData] = useState(null);
  const [allStock, setAllStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [sR, stR, saR] = await Promise.all([
          apiFetch('/api/orders/analytics/stock-summary'),
          apiFetch('/api/stock'),
          apiFetch('/api/orders/analytics/sales-summary')
        ]);
        setSummary(await sR.json());
        setAllStock(await stR.json());
        setSalesData(await saR.json());
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (error) return (
    <div className="rounded-lg p-4 bg-red-500/10 text-red-500 border border-red-500/20">{error}</div>
  );

  if (loading) return (
    <div className="space-y-6">
      <div className="h-8 w-48 bg-theme-muted rounded animate-pulse" />
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="card p-5 h-24 animate-pulse bg-theme-muted" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="card p-5 h-[340px] animate-pulse bg-theme-muted lg:col-span-2" />
        <div className="card p-5 h-[340px] animate-pulse bg-theme-muted" />
      </div>
    </div>
  );

  const categories = summary?.category_breakdown || [];
  const totalValue = summary?.total_value ?? 0;

  // Compute total workshop and embroidery quantities from stock
  const totalWorkshopUnits = allStock.reduce((sum, item) => sum + (item.workshop_quantity || 0), 0);
  const totalEmbroideryUnits = allStock.reduce((sum, item) => sum + (item.embroidery_quantity || 0), 0);

  // Format category breakdown for Pie Chart
  const pieData = categories.map(cat => ({
    name: cat.name,
    value: cat.total_quantity
  }));

  return (
    <div className="space-y-6">
      {/* Title & Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-theme-primary tracking-tight">Analytics Dashboard</h2>
          <p className="text-xs mt-1 text-theme-secondary font-medium">Real-time store performance, sales trends, and stock metrics</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-theme-border bg-theme-card text-xs font-semibold text-theme-primary">
          <span className="w-2 h-2 rounded-full bg-[#00e676] animate-ping" />
          <span>Live Tracking Active</span>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard 
          icon={<TrendingUp className="text-blue-500" />} 
          label="Total Revenue" 
          value={KSH + (salesData?.total_sales ?? 0).toLocaleString()} 
          bg="rgba(59,130,246,0.1)" 
          sparkData={SPARKLINE_1} 
          sparkColor="#3b82f6" 
        />
        <StatCard 
          icon={<ShoppingBag className="text-[#00e676]" />} 
          label="Units Dispatched" 
          value={(salesData?.total_units_sold ?? 0).toLocaleString()} 
          bg="rgba(0,230,118,0.1)" 
          sparkData={SPARKLINE_2} 
          sparkColor="#00e676" 
        />
        <StatCard 
          icon={<Landmark className="text-purple-400" />} 
          label="Inventory Valuation" 
          value={KSH + Number(totalValue).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} 
          bg="rgba(168,85,247,0.1)" 
          sparkData={SPARKLINE_3} 
          sparkColor="#a855f7" 
        />
        <StatCard 
          icon={<AlertTriangle className="text-amber-500" />} 
          label="Low Stock Items" 
          value={summary?.low_stock_count ?? 0} 
          bg="rgba(245,158,11,0.1)" 
          sparkData={SPARKLINE_4} 
          sparkColor="#f59e0b" 
        />
      </div>

      {/* Workshop & Embroidery Stock Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard
          icon={<Factory className="text-indigo-400" />}
          label="Workshop Inventory"
          value={totalWorkshopUnits.toLocaleString() + ' units'}
          bg="rgba(99,102,241,0.1)"
          sparkData={SPARKLINE_3}
          sparkColor="#6366f1"
        />
        <StatCard
          icon={<Scissors className="text-purple-400" />}
          label="Embroidery Inventory"
          value={totalEmbroideryUnits.toLocaleString() + ' units'}
          bg="rgba(168,85,247,0.1)"
          sparkData={SPARKLINE_2}
          sparkColor="#a855f7"
        />
      </div>

      {/* Charts Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Monthly Sales Trend Area Chart */}
        <div className="card p-5 lg:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-sm font-bold text-theme-primary uppercase tracking-wider">Monthly Sales Trend</h3>
              <p className="text-[11px] text-theme-secondary">Annual performance overview</p>
            </div>
            <span className="text-xs font-semibold px-2 py-1 rounded bg-[#00e676]/10 text-[#00e676]">+14.2% vs last month</span>
          </div>

          <div className="w-full h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesData?.monthly_sales} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00e676" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#00e676" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} tickFormatter={v => `Ksh ${v / 1000}k`} />
                <Tooltip content={<ChartTooltip showCurrency />} />
                <Area type="monotone" dataKey="total_sales" stroke="#00e676" fillOpacity={1} fill="url(#salesGrad)" strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Doughnut Chart: Category Distribution */}
        <div className="card p-5">
          <h3 className="text-sm font-bold text-theme-primary uppercase tracking-wider mb-2">Category Distribution</h3>
          <p className="text-[11px] text-theme-secondary mb-6">Stock breakdown by garment category</p>
          
          <div className="relative flex justify-center items-center h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[9px] uppercase font-bold text-theme-secondary tracking-widest">Total Units</span>
              <span className="text-2xl font-black text-theme-primary">{summary?.total_units ?? 0}</span>
            </div>
          </div>

          {/* Custom Legends list */}
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs font-semibold text-theme-secondary">
            {pieData.map((entry, index) => (
              <div key={entry.name} className="flex items-center gap-1.5 truncate">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                <span className="truncate">{entry.name}</span>
                <span className="text-[10px] text-theme-primary ml-auto">({entry.value})</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Horizontal Bar Chart: Top 5 Products by Sales */}
        <div className="card p-5">
          <h3 className="text-sm font-bold text-theme-primary uppercase tracking-wider mb-2">Top 5 Products by Sales</h3>
          <p className="text-[11px] text-theme-secondary mb-6">Fastest moving garments by sales units</p>
          
          <div className="w-full h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesData?.top_products} layout="vertical" margin={{ top: 5, right: 15, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} width={90} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={12}>
                  {salesData?.top_products.map((_, i) => (
                    <Cell key={i} fill={i === 0 ? '#00e676' : '#3b82f6'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Stock Status Table */}
        <div className="card lg:col-span-2 overflow-hidden flex flex-col justify-between">
          <div>
            <div className="px-5 py-4 border-b border-theme-border flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-theme-primary uppercase tracking-wider">Garment Stock Status</h3>
                <p className="text-[11px] text-theme-secondary">Quick status check across all garments</p>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-theme-secondary">Total Styles: {allStock.length}</span>
            </div>

            {/* Table wrapper */}
            <div className="overflow-x-auto max-h-[220px]">
              <table className="w-full text-sm">
                <thead className="bg-theme-muted text-theme-secondary font-bold text-xs uppercase border-b border-theme-border sticky top-0 z-10">
                  <tr>
                    <th className="text-left py-2.5 px-4 font-semibold">Name</th>
                    <th className="text-left py-2.5 px-4 font-semibold">Category</th>
                    <th className="text-left py-2.5 px-4 font-semibold">Size</th>
                    <th className="text-left py-2.5 px-4 font-semibold">Shop Qty</th>
                    <th className="text-left py-2.5 px-4 font-semibold">Workshop Qty</th>
                    <th className="text-left py-2.5 px-4 font-semibold">Embroidery Qty</th>
                    <th className="text-left py-2.5 px-4 font-semibold">Value</th>
                    <th className="text-left py-2.5 px-4 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-theme-border-light text-xs font-semibold text-theme-secondary">
                  {allStock.slice(0, 10).map(item => {
                    const val = (item.quantity || 0) * (item.price || 0);
                    return (
                      <tr key={item.id} className="hover-theme">
                        <td className="py-2 px-4 text-theme-primary">{item.name}</td>
                        <td className="py-2 px-4">{item.category || '--'}</td>
                        <td className="py-2 px-4">{item.size || '--'}</td>
                        <td className="py-2 px-4 text-theme-primary font-bold">{item.quantity}</td>
                        <td className="py-2 px-4 font-semibold" style={{ color: '#6366f1' }}>{item.workshop_quantity || 0}</td>
                        <td className="py-2 px-4 font-semibold" style={{ color: '#a855f7' }}>{item.embroidery_quantity || 0}</td>
                        <td className="py-2 px-4 text-theme-primary">{KSH}{val.toLocaleString()}</td>
                        <td className="py-2 px-4">
                          <StatusPill quantity={item.quantity} threshold={item.low_stock_threshold} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          
          <div className="p-3 bg-theme-muted/50 border-t border-theme-border text-center">
            <p className="text-[10px] text-theme-secondary font-bold uppercase tracking-wider">
              Showing top 10 items. Manage quantities inside Stock manager.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
