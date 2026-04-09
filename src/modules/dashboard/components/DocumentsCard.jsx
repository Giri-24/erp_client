import { ShieldAlert, FileText } from 'lucide-react';

export default function DocumentsCard({ data }) {
  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-lg font-bold text-slate-800 leading-tight">Documents &<br />Compliance</h2>
        <FileText className="w-5 h-5 text-slate-300" />
      </div>

      <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex items-center gap-4">
        <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center relative">
          <ShieldAlert className="w-6 h-6 text-red-500" />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
        </div>
        <div>
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Pending Verifications</h3>
          <p className="text-xl font-black text-red-500">{data?.pendingVerifications || 0} Files</p>
        </div>
      </div>
    </div>
  );
}
