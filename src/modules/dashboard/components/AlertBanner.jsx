import { useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

export default function AlertBanner() {
  const [open, setOpen] = useState(true);
  const alertText = "Fleet Maintenance Due for Route B-12";

  return (
    <div className="bg-[#0f243a] text-white rounded-2xl p-4 flex items-center justify-between shadow-lg shadow-slate-200/50 mb-8 overflow-hidden relative group">
      <div className="flex items-center flex-1 min-w-0 gap-4">
        <span className="bg-red-600 text-[10px] font-black px-2 py-0.5 rounded tracking-tighter">URGENT</span>
        <h2 className="text-xs font-bold uppercase tracking-widest text-[#64ffda]">Critical Alerts:</h2>
        <div className="relative flex items-center flex-1 min-w-0 gap-2 ml-4 overflow-hidden">
          <div className="w-2 h-2 bg-white rounded-full shrink-0 animate-pulse"></div>
          <div className="flex-1 min-w-0 marquee-container">
            <div className="marquee whitespace-nowrap">
              <span className="text-sm font-medium text-slate-300">{alertText}</span>
            </div>
          </div>
        </div>
      </div>
      <button className="z-10 p-2 ml-4 transition-all rounded-lg hover:bg-white/10">
        <ChevronUp className="w-4 h-4 text-slate-400 group-hover:text-white" />
      </button>
      <div className="absolute top-0 right-0 w-32 h-full pointer-events-none bg-linear-to-l from-[#0f243a] to-transparent"></div>
      <style>{`
        .marquee-container {
          position: relative;
          overflow: hidden;
          width: 100%;
        }
        .marquee {
          display: inline-block;
          white-space: nowrap;
          animation: marquee-scroll 19s linear infinite;
          min-width: 100%;
        }
        @keyframes marquee-scroll {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
      `}</style>
    </div>
  );
}
