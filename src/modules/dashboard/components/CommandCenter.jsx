import { UserPlus, CreditCard, BusFront, CalendarCheck } from 'lucide-react';

const actions = [
  { icon: UserPlus, label: 'New Admission', key: 'admission', dark: true },
  { icon: CreditCard, label: 'Collect Fee', key: 'fees-collect', dark: false },
  { icon: BusFront, label: 'Bus Report', key: 'transport-bus-report', dark: false },
  { icon: CalendarCheck, label: 'Approve Leave', key: 'hr-leaves', dark: false },
];

export default function CommandCenter({ onNavigate }) {
  return (
    <div className="w-full lg:w-80">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-1.5 h-1.5 bg-[#0f243a] rounded-full"></div>
        <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">Command Center</h2>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {actions.map((action) => (
          <button
            key={action.label}
            onClick={() => onNavigate(action.key)}
            className={`flex flex-col items-center justify-center gap-3 h-32 rounded-2xl transition-all shadow-sm active:scale-95 group ${
              action.dark 
              ? 'bg-[#0f243a] text-white hover:bg-[#1a3a5a]' 
              : 'bg-slate-200/50 text-slate-800 hover:bg-slate-200'
            }`}
          >
            <div className={`p-2.5 rounded-lg ${action.dark ? 'bg-white/10' : 'bg-white shadow-xs'}`}>
              <action.icon className={`w-5 h-5 ${action.dark ? 'text-[#64ffda]' : 'text-slate-600'}`} />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-tight">{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
