import { Bus, ShieldCheck } from 'lucide-react';

export default function TransportCard({ data }) {
  const percentage = data?.totalFleet > 0 ? Math.round((data.activeFleet / data.totalFleet) * 100) : 0;
  const strokeDashoffset = 251.2 * (1 - percentage / 100);

  return (
    <div className="bg-[#0f243a] rounded-3xl p-6 border border-white/5 shadow-sm text-white h-full flex flex-col">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-cyan-500/10 rounded-xl flex items-center justify-center">
          <Bus className="w-5 h-5 text-cyan-400" />
        </div>
        <h2 className="text-lg font-bold">Transport Fleet</h2>
      </div>

      <div className="flex items-center gap-6 mb-8">
        <div className="relative w-24 h-24 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90">
            <circle cx="48" cy="48" r="40" stroke="rgba(255,255,255,0.05)" strokeWidth="8" fill="transparent" />
            <circle cx="48" cy="48" r="40" stroke="#06b6d4" strokeWidth="8" fill="transparent" strokeDasharray="251.2" strokeDashoffset={strokeDashoffset} strokeLinecap="round" />
          </svg>
          <span className="absolute text-xl font-black">{percentage}%</span>
        </div>
        <div>
          <h3 className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mb-1">Fleet Status</h3>
          <p className="text-xl font-black mb-2">{data?.activeFleet}/{data?.totalFleet} Active</p>
          <div className="flex items-center gap-1.5 text-emerald-400">
            <ShieldCheck className="w-3 h-3" />
            <span className="text-[10px] font-bold uppercase tracking-widest">{data?.status || 'Safe'}</span>
          </div>
        </div>
      </div>

      <div className="mt-auto bg-white/5 p-4 rounded-2xl border border-white/5">
        <div className="flex justify-between items-center mb-1">
          <h4 className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Recent Activity</h4>
          <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Live</span>
        </div>
        <p className="text-[10px] text-slate-300 font-medium leading-tight">All buses are on their designated routes.</p>
      </div>
    </div>
  );
}
