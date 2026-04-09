import { Users, X, Check } from 'lucide-react';

export default function StaffCard({ data }) {
  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-lg font-bold text-slate-800 leading-tight">Staff & Human<br />Resources</h2>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-8">
        <div className="text-center">
          <p className="text-2xl font-black text-slate-800">{data?.total || 0}</p>
          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-tight">Total Staff</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-black text-cyan-400">{data?.onLeave || 0}</p>
          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-tight">On<br />Leave</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-black text-slate-800">{data?.vacancies || 0}</p>
          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-tight">Vacancies</p>
        </div>
      </div>

      <div>
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Pending Approvals</h3>
        <div className="bg-slate-50 p-3 rounded-2xl flex items-center justify-between border border-slate-100">
          <div className="flex items-center gap-2">
            <p className="text-xs font-bold text-slate-800">{data?.pendingApprovals || 0} Request(s)</p>
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter leading-tight">Awaiting Review</p>
          </div>
        </div>
      </div>
    </div>
  );
}
