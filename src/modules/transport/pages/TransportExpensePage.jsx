import { useState, useEffect } from "react";
import { createTransportExpense, getAllBuses } from "../transport.service";
import toast from "react-hot-toast";


export default function TransportExpensePage() {

  const [type, setType] = useState("FUEL");
  const [buses, setBuses] = useState([]);

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

  // ✅ LOAD BUSES FROM DB
  useEffect(() => {
    const loadBuses = async () => {
      try {
        const data = await getAllBuses();
        setBuses(data);
      } catch (err) {
        console.error("Error loading buses", err);
      }
    };
    loadBuses();
  }, []);

  // 🔁 handle input change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // 🔥 AUTO CALCULATION
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

  // ✅ SAVE FUNCTION
  const handleSave = async () => {
    if (!form.busNo || !form.date) {
      toast.error("Please fill required fields");
      return;
    }

    try {
      const payload = {
        busId: form.busNo, // ✅ REAL DB ID
        date: form.date,
        category: type,
        amount: Number(form.amount || 0),

        ...(type === "FUEL" && {
          fuelStation: form.fuelStation,
          paymentMode: form.paymentMode,
          litres: Number(form.litres || 0),
          pricePerLitre: Number(form.pricePerLitre || 0),
        }),

        ...(type === "MAINTENANCE" && {
          workshop: form.workshop,
          description: form.description,
        }),
      };

      console.log("Payload:", payload);

      await createTransportExpense(payload);

toast.success("Expense saved successfully!");
      setForm({
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

    } catch (err) {
      console.error(err);
toast.error("Failed to save expense. Please try again.");
    }
  };

  return (
<div className="w-full min-h-screen bg-gray-100 p-6"> 
  
     <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow-lg p-8">

      {/* HEADER */}
      <h2 className="text-xl font-bold text-gray-800 mb-6">
        Transport Expense
      </h2>

      {/* TABS */}
      <div className="flex gap-3 mb-8">
        <button
          onClick={() => setType("FUEL")}
          className={`px-6 py-2 rounded-lg font-medium transition ${
            type === "FUEL"
  ? "bg-[#00152a] text-white shadow"
  : "bg-gray-200 hover:bg-gray-300"
          }`}
        >
           Fuel
        </button>

        <button
          onClick={() => setType("MAINTENANCE")}
          className={`px-6 py-2 rounded-lg font-medium transition ${
          type === "MAINTENANCE"
  ? "bg-[#00152a] text-white shadow"
  : "bg-gray-200 hover:bg-gray-300"
          }`}
        >
           Maintenance
        </button>
      </div>

      {/* COMMON FIELDS */}
      <div className="grid md:grid-cols-2 gap-5">
        <div>
          <label className="text-sm font-medium text-gray-700">Bus</label>
          <select
            name="busNo"
            value={form.busNo}
            onChange={handleChange}
className="w-full mt-1 border border-gray-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#00152a] focus:border-[#00152a] transition"          >
            <option value="">Select Bus</option>
            {buses.map((bus) => (
              <option key={bus.id} value={bus.id}>
                {bus.busNo || bus.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700">Date</label>
          <input
            type="date"
            name="date"
            value={form.date}
            onChange={handleChange}
className="w-full mt-1 border border-gray-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#00152a] focus:border-[#00152a] transition"          />
        </div>
      </div>

      {/* ================= FUEL ================= */}
      {type === "FUEL" && (
        <>
          <div className="grid md:grid-cols-2 gap-5 mt-5">
            <div>
              <label className="text-sm font-medium">Petrol Bunk</label>
              <input
                name="fuelStation"
                value={form.fuelStation}
                onChange={handleChange}
                placeholder="Enter petrol bunk"
                className="w-full mt-1 border rounded-xl px-3 py-2"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Payment Mode</label>
              <select
                name="paymentMode"
                value={form.paymentMode}
                onChange={handleChange}
                className="w-full mt-1 border rounded-xl px-3 py-2"
              >
                <option value="CASH">Cash</option>
                <option value="CARD">Card</option>
              </select>
            </div>
          </div>

          {/* CARD FIELD */}
          {form.paymentMode === "CARD" && (
            <div className="mt-4">
              <label className="text-sm font-medium">Card Details</label>
              <input
                name="cardName"
                value={form.cardName}
                onChange={handleChange}
                placeholder="Card number / name"
                className="w-full mt-1 border rounded-xl px-3 py-2"
              />
            </div>
          )}

          {/* CALCULATION */}
          <div className="grid md:grid-cols-3 gap-5 mt-5">
            <div>
              <label className="text-sm font-medium">Litres</label>
              <input
                name="litres"
                value={form.litres}
                onChange={handleChange}
                className="w-full mt-1 border rounded-xl px-3 py-2"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Price / Litre</label>
              <input
                name="pricePerLitre"
                value={form.pricePerLitre}
                onChange={handleChange}
                className="w-full mt-1 border rounded-xl px-3 py-2"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Total Amount</label>
              <input
                value={form.amount}
                readOnly
                className="w-full mt-1 border rounded-xl px-3 py-2 bg-blue-50 font-semibold text-blue-900"
              />
            </div>
          </div>
        </>
      )}

      {/* ================= MAINTENANCE ================= */}
      {type === "MAINTENANCE" && (
        <>
          <div className="grid md:grid-cols-2 gap-5 mt-5">
            <div>
              <label className="text-sm font-medium">Workshop</label>
              <input
                name="workshop"
                value={form.workshop}
                onChange={handleChange}
                className="w-full mt-1 border rounded-xl px-3 py-2"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Amount</label>
              <input
                name="amount"
                value={form.amount}
                onChange={handleChange}
                className="w-full mt-1 border rounded-xl px-3 py-2"
              />
            </div>
          </div>

          <div className="mt-5">
            <label className="text-sm font-medium">Description</label>
            <textarea
              name="description"colour
              value={form.description}
              onChange={handleChange}
              className="w-full mt-1 border rounded-xl px-3 py-2"
            />
          </div>
        </>
      )}

      {/* SAVE BUTTON */}
     <button
  onClick={handleSave}
  className="mt-8 w-full bg-[#00152a] hover:bg-[#002a4d] text-white py-3 rounded-xl font-semibold shadow-md transition"
>
  Save Expense
</button>

    </div>
  </div>
);

}