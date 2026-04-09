import { Sparkles, ArrowUpRight } from 'lucide-react';

export default function StrategicInsights({ data }) {
  const insights = [
    { label: 'CONVERSION', value: `${Math.round(data?.admissions?.conversionRate || 0)}%`, trend: 'up', sub: 'Projected admission growth based on current funnel trends.' },
    { label: 'EFFICIENCY', value: '98.2%', trend: 'neutral', sub: 'Transport fleet uptime across all active academic routes.' },
    { label: 'RETENTION', value: '0.92', trend: 'neutral', sub: 'Staff charm index remains above critical industry thresholds.' },
  ];

  return (
    <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm relative overflow-hidden flex-1">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Strategic Insights</h2>
          <p className="text-sm text-slate-400 font-medium">AI-curated summary of institutional pulse.</p>
        </div>
        <div className="w-10 h-10 bg-cyan-50 rounded-xl flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-cyan-500" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {insights.map((item) => (
          <div key={item.label} className="bg-slate-50/50 p-6 rounded-2xl border border-slate-50 relative group hover:bg-slate-50 transition-all">
            <h3 className="text-[10px] font-bold text-slate-400 tracking-widest mb-3 uppercase">{item.label}</h3>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-3xl font-black text-slate-800">{item.value}</span>
              {item.trend === 'up' && <ArrowUpRight className="w-4 h-4 text-cyan-400" />}
            </div>
            <p className="text-[10px] leading-relaxed text-slate-400 font-medium">{item.sub}</p>
          </div>
        ))}
      </div>
      <div className="absolute left-0 top-[20%] bottom-[20%] w-1 bg-cyan-400 rounded-r-full"></div>
    </div>
  );
}
