import { Star, Droplets, TreePine, Flame } from 'lucide-react';

const houseConfig = {
  'Amber': { color: 'bg-amber-400', border: 'border-amber-200', bg: 'bg-amber-50/50', icon: Star },
  'Blue': { color: 'bg-blue-500', border: 'border-blue-200', bg: 'bg-blue-50/50', icon: Droplets },
  'Emerald': { color: 'bg-emerald-500', border: 'border-emerald-200', bg: 'bg-emerald-50/50', icon: TreePine },
  'Crimson': { color: 'bg-red-500', border: 'border-red-200', bg: 'bg-red-50/50', icon: Flame },
  'Default': { color: 'bg-slate-400', border: 'border-slate-200', bg: 'bg-slate-50/50', icon: Star },
};

export default function HouseChampionship({ houses }) {
  return (
    <div className="mt-8 bg-white rounded-3xl p-8 border border-slate-100 shadow-sm relative overflow-hidden">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-xl font-bold text-slate-800">House Championship</h2>
          <p className="text-sm text-slate-400 font-medium tracking-tight">Current point standings and upcoming events.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {(houses && houses.length > 0 ? houses : [
          { name: 'Phoenix House', points: 2840 },
          { name: 'Neptune House', points: 2615 },
          { name: 'Emerald House', points: 2105 },
          { name: 'Vulcan House', points: 1980 },
        ]).map((house, idx) => {
          const config = houseConfig[house.name.split(' ')[0]] || houseConfig.Default;
          return (
            <div 
              key={house.name} 
              className={`${config.bg} ${config.border} border rounded-2xl p-6 relative group hover:-translate-y-1 transition-all duration-300 shadow-sm`}
            >
              <span className="absolute top-4 right-6 text-2xl font-black text-slate-200 tracking-tighter group-hover:text-slate-300 transition-colors uppercase">0{idx + 1}</span>
              <div className={`w-12 h-12 ${config.color} rounded-xl shadow-lg flex items-center justify-center text-white mb-6`}>
                <config.icon className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-700 mb-1">{house.name}</h3>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-slate-800">{house.points?.toLocaleString()}</span>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pts</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
