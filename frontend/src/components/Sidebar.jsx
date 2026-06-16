const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: '🏠' },
  { id: 'stock', label: 'Stock', icon: '📦' },
  { id: 'orders', label: 'Orders', icon: '📋' },
  { id: 'clients', label: 'Clients', icon: '👥' },
  { id: 'analytics', label: 'Analytics', icon: '📊' },
];

export default function Sidebar({ activePage, setActivePage, dark, onToggleDark }) {
  return (
    <aside className="w-56 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col shadow-sm shrink-0 h-full">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <span className="text-2xl">👕</span>
          <div>
            <h1 className="text-lg font-bold text-indigo-600 leading-tight">UniStore</h1>
            <p className="text-xs text-gray-400 dark:text-gray-500">Uniform Manager</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActivePage(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
                isActive
                  ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
            >
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
              {isActive && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer — theme toggle */}
      <div className="px-4 py-4 border-t border-gray-100 dark:border-gray-700">
        <button
          onClick={onToggleDark}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-medium"
          aria-label="Toggle dark mode"
        >
          <span className="text-base">{dark ? '☀️' : '🌙'}</span>
          <span>{dark ? 'Light Mode' : 'Dark Mode'}</span>
        </button>
        <p className="text-xs text-gray-400 dark:text-gray-600 text-center mt-2">UniStore v1.0</p>
      </div>
    </aside>
  );
}
