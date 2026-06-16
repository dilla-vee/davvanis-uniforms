import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const COLORS = ['#6366f1','#22c55e','#f59e0b','#ef4444','#06b6d4','#a855f7','#ec4899','#14b8a6'];

function StatCard({ icon, label, value, bg }) {
  return (
    <div className="card p-5 flex items-center gap-4">
      <div className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl" style={{backgroundColor:bg}}>{icon}</div>
      <div>
        <p className="text-sm font-medium text-theme-secondary">{label}</p>
        <p className="text-2xl font-bold text-theme-primary">{value}</p>
      </div>
    </div>
  );
}

function StatusPill({ quantity, threshold }) {
  if (quantity===0) return <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{background:'#fee2e2',color:'#991b1b'}}>Out of Stock</span>;
  if (quantity<=threshold) return <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{background:'#fef3c7',color:'#92400e'}}>Low Stock</span>;
  return <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{background:'#d1fae5',color:'#065f46'}}>In Stock</span>;
}

function ChartTooltip({ active, payload, label, prefix='' }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="card px-3 py-2 text-sm shadow-lg" style={{borderRadius:'0.5rem'}}>
      <p className="font-medium text-theme-primary mb-1">{label}</p>
      <p className="text-theme-secondary">{prefix}{prefix==='£'?Number(payload[0].value).toFixed(2):payload[0].value}</p>
    </div>
  );
}

export default function Analytics() {
  const [summary, setSummary] = useState(null);
  const [allStock, setAllStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [sR, stR] = await Promise.all([fetch('/api/orders/analytics/stock-summary'), fetch('/api/stock')]);
        setSummary(await sR.json()); setAllStock(await stR.json());
      } catch (e) { setError(e.message); } finally { setLoading(false); }
    };
    load();
  }, []);

  if (error) return <div className="rounded-lg p-4" style={{background:'#fee2e2',color:'#991b1b'}}>{error}</div>;

  if (loading) return (
    <div className="space-y-5">
      <h2 className="text-2xl font-bold text-theme-primary">Analytics</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1,2,3,4].map(i=><div key={i} className="card p-5 h-20 animate-pulse" style={{backgroundColor:'var(--bg-muted)'}} />)}
      </div>
    </div>
  );

  const categories = summary?.category_breakdown || [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-theme-primary">Analytics</h2>
        <p className="text-sm mt-1 text-theme-secondary">Inventory insights and stock overview</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon="📦" label="Unique Items"      value={summary?.total_items??0}                          bg="rgba(99,102,241,0.1)" />
        <StatCard icon="🔢" label="Total Units"       value={summary?.total_units??0}                          bg="rgba(59,130,246,0.1)" />
        <StatCard icon="💷" label="Inventory Value"   value={`£${(summary?.total_value??0).toFixed(2)}`}       bg="rgba(34,197,94,0.1)"  />
        <StatCard icon="⚠️" label="Low Stock Items"   value={summary?.low_stock_count??0}                      bg="rgba(239,68,68,0.1)"  />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card p-5">
          <h3 className="text-base font-semibold text-theme-primary mb-4">Stock by Category (Units)</h3>
          {categories.length===0 ? <p className="text-center py-10 text-theme-muted text-sm">No data available.</p> : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={categories} margin={{top:5,right:10,left:0,bottom:5}}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" tick={{fontSize:12,fill:'var(--text-secondary)'}} />
                <YAxis tick={{fontSize:12,fill:'var(--text-secondary)'}} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="total_quantity" radius={[4,4,0,0]}>
                  {categories.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="card p-5">
          <h3 className="text-base font-semibold text-theme-primary mb-4">Inventory Value by Category (£)</h3>
          {categories.length===0 ? <p className="text-center py-10 text-theme-muted text-sm">No data available.</p> : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={categories} margin={{top:5,right:10,left:0,bottom:5}}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" tick={{fontSize:12,fill:'var(--text-secondary)'}} />
                <YAxis tick={{fontSize:12,fill:'var(--text-secondary)'}} tickFormatter={v=>`£${v}`} />
                <Tooltip content={<ChartTooltip prefix="£" />} />
                <Bar dataKey="total_value" radius={[4,4,0,0]}>
                  {categories.map((_,i)=><Cell key={i} fill={COLORS[(i+2)%COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-4" style={{borderBottom:'1px solid var(--border)'}}>
          <h3 className="text-base font-semibold text-theme-primary">Stock Status</h3>
          <p className="text-xs text-theme-secondary mt-0.5">Full inventory breakdown</p>
        </div>
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead style={{backgroundColor:'var(--bg-muted)',borderBottom:'1px solid var(--border)'}}>
              <tr>{['Name','Category','Size','Quantity','Unit Price','Total Value','Status'].map(h=>(
                <th key={h} className="text-left py-3 px-4 text-xs uppercase tracking-wide text-theme-secondary font-medium">{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {allStock.map(item=>{
                const val=(item.quantity||0)*(item.price||0);
                return (
                  <tr key={item.id} className="hover-theme" style={{borderBottom:'1px solid var(--border-light)'}}>
                    <td className="py-3 px-4 font-medium text-theme-primary">{item.name}</td>
                    <td className="py-3 px-4 text-theme-secondary">{item.category||'—'}</td>
                    <td className="py-3 px-4 text-theme-secondary">{item.size||'—'}</td>
                    <td className="py-3 px-4 font-semibold text-theme-primary">{item.quantity}</td>
                    <td className="py-3 px-4 text-theme-primary">{item.price!=null?`£${Number(item.price).toFixed(2)}`:'—'}</td>
                    <td className="py-3 px-4 font-medium text-theme-primary">£{val.toFixed(2)}</td>
                    <td className="py-3 px-4"><StatusPill quantity={item.quantity} threshold={item.low_stock_threshold} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="md:hidden">
          {allStock.map(item=>{
            const val=(item.quantity||0)*(item.price||0);
            return (
              <div key={item.id} className="p-4" style={{borderBottom:'1px solid var(--border-light)'}}>
                <div className="flex items-start justify-between mb-1.5">
                  <div>
                    <p className="font-semibold text-theme-primary">{item.name}</p>
                    <p className="text-xs text-theme-secondary">{item.category||'—'}{item.size?` · ${item.size}`:''}</p>
                  </div>
                  <StatusPill quantity={item.quantity} threshold={item.low_stock_threshold} />
                </div>
                <div className="flex gap-4 text-xs text-theme-secondary mt-1">
                  <span>Qty: <strong className="text-theme-primary">{item.quantity}</strong></span>
                  <span>Price: <strong className="text-theme-primary">{item.price!=null?`£${Number(item.price).toFixed(2)}`:'—'}</strong></span>
                  <span>Value: <strong className="text-theme-primary">£{val.toFixed(2)}</strong></span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
