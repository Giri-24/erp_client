import { GraduationCap } from 'lucide-react';

export default function AdmissionsCard({ data }) {
  const rate = Math.round(data?.conversionRate || 0);
  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-indigo-500" />
          </div>
          <h2 className="text-lg font-bold text-slate-800">Admissions</h2>
        </div>
        <span className="bg-[#0f243a] text-white text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest">Live</span>
      </div>

      <div className="space-y-6">
        <div>
          <div className="flex justify-between text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">
            <span>Conversion Rate</span>
            <span>{rate}%</span>
          </div>
          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-[#0f243a] rounded-full" style={{ width: `${rate}%` }}></div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <h3 className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mb-1">Applications</h3>
            <p className="text-2xl font-black text-slate-800">{data?.applications?.toLocaleString() || 0}</p>
          </div>
          <div>
            <h3 className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mb-1">Waitlisted</h3>
            <p className="text-2xl font-black text-slate-800">{data?.waitlisted?.toLocaleString() || 0}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
