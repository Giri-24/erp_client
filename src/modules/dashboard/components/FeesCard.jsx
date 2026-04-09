import { Banknote } from 'lucide-react';

export default function FeesCard({ data }) {
  const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
          <Banknote className="w-5 h-5 text-emerald-500" />
        </div>
        <h2 className="text-lg font-bold text-slate-800">Fees & Revenue</h2>
      </div>

      <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-50 mb-6">
        <h3 className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mb-1">Today's Intake</h3>
        <p className="text-3xl font-black text-slate-800">{formatCurrency(data?.todayIntake || 0)}</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <h3 className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mb-1">Total Revenue</h3>
          <p className="text-xl font-black text-slate-800">{(data?.totalRevenue / 100000).toFixed(1)}L</p>
        </div>
        <div className="text-right">
          <h3 className="text-[10px] font-bold text-red-400 tracking-widest uppercase mb-1">Pending</h3>
          <p className="text-xl font-black text-red-500">{(data?.pending / 100000).toFixed(1)}L</p>
        </div>
      </div>
    </div>
  );
}
