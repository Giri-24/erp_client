import { useState, useEffect } from "react";

export default function TransportExpensePage() {
  const vans = ["A","B","C","D","E","F","G","H","I","J","K","L","M"];

  const [type, setType] = useState("FUEL");

  const [form, setForm] = useState({
    busNo: "",
    date: "",
    fuelStation: "",
    paymentMode: "CASH",
    cardName: "",
    litres: "",
    pricePerLitre: "",
    amount: "",
    workshop: "",
    description: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  // 🔥 Fuel auto calculation
  useEffect(() => {
    if (type === "FUEL") {
      const l = Number(form.litres);
      const p = Number(form.pricePerLitre);

      if (l > 0 && p > 0) {
        setForm((prev) => ({
          ...prev,
          amount: (l * p).toFixed(2),
        }));
      }
    }
  }, [form.litres, form.pricePerLitre, type]);

  return (
    <div className="bg-gray-100 min-h-screen p-6">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow p-6">

        {/* HEADER BUTTONS */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setType("FUEL")}
            className={`px-4 py-2 rounded-lg ${
              type === "FUEL" ? "bg-blue-900 text-white" : "bg-gray-200"
            }`}
          >
            Fuel
          </button>

          <button
            onClick={() => setType("MAINTENANCE")}
            className={`px-4 py-2 rounded-lg ${
              type === "MAINTENANCE" ? "bg-blue-900 text-white" : "bg-gray-200"
            }`}
          >
            Maintenance
          </button>
        </div>

        <h2 className="text-lg font-semibold mb-4">
          {type === "FUEL" ? "⛽ Fuel Entry" : "🔧 Maintenance Entry"}
        </h2>

        {/* COMMON FIELDS */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label>Van</label>
            <select name="busNo" onChange={handleChange} className="input">
              <option>Select</option>
              {vans.map(v => <option key={v}>Van {v}</option>)}
            </select>
          </div>

          <div>
            <label>Date</label>
            <input type="date" name="date" onChange={handleChange} className="input" />
          </div>
        </div>

        {/* 🔥 FUEL UI */}
        {type === "FUEL" && (
          <>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <input name="fuelStation" placeholder="Petrol Bunk" onChange={handleChange} className="input" />
              
              <select name="paymentMode" onChange={handleChange} className="input">
                <option value="CASH">Cash</option>
                <option value="CARD">Card</option>
              </select>
            </div>

            {form.paymentMode === "CARD" && (
              <input name="cardName" placeholder="Card Name" onChange={handleChange} className="input mt-4" />
            )}

            <div className="grid grid-cols-3 gap-4 mt-4">
              <input name="litres" placeholder="Litres" onChange={handleChange} className="input" />
              <input name="pricePerLitre" placeholder="Price/Litre" onChange={handleChange} className="input" />
              <input value={form.amount} readOnly className="input bg-gray-100" />
            </div>
          </>
        )}

        {/* 🔧 MAINTENANCE UI */}
        {type === "MAINTENANCE" && (
          <>
            <input name="workshop" placeholder="Workshop" onChange={handleChange} className="input mt-4" />
            <input name="amount" placeholder="Amount" onChange={handleChange} className="input mt-4" />
            <textarea name="description" placeholder="Description" onChange={handleChange} className="input mt-4" />
          </>
        )}

        {/* BUTTON */}
        <button className="mt-6 w-full bg-blue-900 text-white py-3 rounded-lg">
          Save
        </button>
      </div>
    </div>
  );
}