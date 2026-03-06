import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, ArrowLeftRight, Tag, Wallet, PiggyBank } from 'lucide-react';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/transacciones', label: 'Transacciones', icon: ArrowLeftRight },
  { to: '/ahorro', label: 'Ahorro', icon: PiggyBank },
  { to: '/categorias', label: 'Categorias', icon: Tag },
];

export default function Layout() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-3">
          <Wallet className="text-emerald-600" size={24} />
          <span className="text-lg font-bold text-gray-800">Mi Dinero</span>
        </div>
      </header>

      <div className="flex flex-1 max-w-6xl mx-auto w-full md:px-4 md:py-6 md:gap-6">
        {/* Sidebar — desktop only */}
        <nav className="hidden md:block w-52 shrink-0">
          <ul className="space-y-1">
            {navItems.map(({ to, label, icon: Icon }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={to === '/'}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`
                  }
                >
                  <Icon size={18} />
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Main content */}
        <main className="flex-1 min-w-0 px-4 py-4 md:px-0 md:py-0 pb-24 md:pb-0">
          <Outlet />
        </main>
      </div>

      {/* Bottom nav — mobile only */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 z-30 safe-area-pb">
        <ul className="flex">
          {navItems.map(({ to, label, icon: Icon }) => (
            <li key={to} className="flex-1">
              <NavLink
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center gap-0.5 py-2 text-xs font-medium transition-colors ${
                    isActive ? 'text-emerald-600' : 'text-gray-400'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className={`p-1.5 rounded-lg transition-colors ${isActive ? 'bg-emerald-50' : ''}`}>
                      <Icon size={20} />
                    </div>
                    <span className="truncate w-full text-center px-1">{label}</span>
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
