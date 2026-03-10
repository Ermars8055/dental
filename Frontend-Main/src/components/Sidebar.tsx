import {
  Calendar,
  DollarSign,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  CalendarPlus,
  CalendarClock,
  TrendingUp,
  BarChart2,
  PlusCircle,
} from 'lucide-react';

type Section = 'appointments' | 'money';

interface SidebarProps {
  currentSection: Section;
  currentTab: string;
  onNavigate: (section: Section, tab: string) => void;
}

interface SubItem {
  tab: string;
  label: string;
  icon: React.ReactNode;
}

interface NavGroup {
  section: Section;
  label: string;
  icon: React.ReactNode;
  defaultTab: string;
  items: SubItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    section: 'appointments',
    label: 'Appointments',
    icon: <Calendar size={18} />,
    defaultTab: 'today',
    items: [
      { tab: 'today',       label: 'Today',       icon: <ClipboardList size={14} /> },
      { tab: 'register',    label: 'Register',     icon: <CalendarPlus  size={14} /> },
      { tab: 'next-visits', label: 'Next Visits',  icon: <CalendarClock size={14} /> },
    ],
  },
  {
    section: 'money',
    label: 'Money',
    icon: <DollarSign size={18} />,
    defaultTab: 'today',
    items: [
      { tab: 'today',       label: 'Today',       icon: <TrendingUp  size={14} /> },
      { tab: 'month',       label: 'Month',        icon: <BarChart2   size={14} /> },
      { tab: 'add-expense', label: 'Add Expense',  icon: <PlusCircle  size={14} /> },
    ],
  },
];

export function Sidebar({ currentSection, currentTab, onNavigate }: SidebarProps) {
  return (
    <aside className="w-56 bg-white border-r border-[var(--color-border)] flex flex-col select-none">
      <nav className="flex-1 p-3 space-y-1">
        {NAV_GROUPS.map((group) => {
          const isActive = currentSection === group.section;
          return (
            <div key={group.section}>
              {/* Section header button */}
              <button
                onClick={() => onNavigate(group.section, group.defaultTab)}
                className={`
                  group flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg text-left
                  transition-all duration-150 font-medium text-sm
                  ${isActive
                    ? 'bg-[var(--color-accent-teal)] text-white shadow-sm'
                    : 'text-[var(--color-text-dark)] hover:bg-[var(--color-hover)]'
                  }
                `}
              >
                <span className={isActive ? 'text-white' : 'text-[var(--color-accent-teal)]'}>
                  {group.icon}
                </span>
                <span className="flex-1">{group.label}</span>
                <span className={`transition-transform duration-200 ${isActive ? 'text-white/70' : 'text-[var(--color-text-dark)]/30'}`}>
                  {isActive ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </span>
              </button>

              {/* Sub-items */}
              {isActive && (
                <div className="mt-1 mb-2 ml-3 pl-3 border-l-2 border-[var(--color-accent-teal)]/20 space-y-0.5">
                  {group.items.map((item) => {
                    const isItemActive = currentTab === item.tab;
                    return (
                      <button
                        key={item.tab}
                        onClick={() => onNavigate(group.section, item.tab)}
                        className={`
                          flex items-center gap-2 w-full px-2.5 py-2 rounded-md text-sm text-left
                          transition-all duration-150
                          ${isItemActive
                            ? 'bg-[var(--color-paper-highlight)] text-[var(--color-accent-teal)] font-medium'
                            : 'text-[var(--color-text-dark)]/65 hover:bg-[var(--color-hover)] hover:text-[var(--color-text-dark)]'
                          }
                        `}
                      >
                        <span className={isItemActive ? 'text-[var(--color-accent-teal)]' : 'text-[var(--color-text-dark)]/40'}>
                          {item.icon}
                        </span>
                        {item.label}
                        {isItemActive && (
                          <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[var(--color-accent-teal)]" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Bottom version tag */}
      <div className="p-4 border-t border-[var(--color-border)]">
        <p className="text-xs text-[var(--color-text-dark)]/30 text-center tracking-wide">Daybook v1.0</p>
      </div>
    </aside>
  );
}
