import { NavLink } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

interface NavItem {
  label: string;
  to: string;
  permission?: string;
  icon: string;
}

interface ProtectedNavigationProps {
  variant?: 'sidebar' | 'horizontal';
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', to: '/dashboard', icon: '◫' },
  { label: 'Hotels', to: '/hotels', permission: 'hotels.read', icon: '⌂' },
  { label: 'Rooms', to: '/rooms', permission: 'rooms.read', icon: '▣' },
  { label: 'Guests', to: '/guests', permission: 'guests.read', icon: '◎' },
  { label: 'Reservations', to: '/reservations', permission: 'reservations.read', icon: '☰' },
];

export function ProtectedNavigation({ variant = 'sidebar' }: ProtectedNavigationProps) {
  const user = useAuthStore((state) => state.user);
  const permissions = user?.permissions ?? [];

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.permission || permissions.includes(item.permission),
  );

  const isHorizontal = variant === 'horizontal';

  return (
    <nav
      className={`flex gap-1 ${isHorizontal ? 'flex-row overflow-x-auto p-2' : 'flex-col p-4'}`}
    >
      {visibleItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            `flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
              isActive
                ? 'bg-stayflow-50 text-stayflow-700'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`
          }
        >
          <span className="text-base">{item.icon}</span>
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
