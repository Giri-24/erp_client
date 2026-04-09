import { ShoppingBag, TrendingUp } from 'lucide-react';

export default function ShopCard({ data }) {
  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
          <ShoppingBag className="w-5 h-5 text-blue-500" />
        </div>
        <h2 className="text-lg font-bold text-slate-800">Institutional Shop</h2>
      </div>

      <div className="flex justify-between items-end mb-8">
        <div>
          <h3 className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mb-1">Daily Sales</h3>
          <p className="text-3xl font-black text-slate-800">₹{data?.dailySales?.toLocaleString() || 0}</p>
        </div>
        <div className="flex items-center gap-1.5 text-cyan-500 text-[10px] font-bold">
          <TrendingUp className="w-3 h-3" />
          <span>TRENDING</span>
        </div>
      </div>

      <div className="mt-auto">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Inventory Alerts</h3>
        <p className="text-xs text-slate-500">{data?.lowStockItems || 0} items are below reorder level.</p>
      </div>
    </div>
  );
}
