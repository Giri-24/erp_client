import { useState, useEffect } from "react";
import { createTransportExpense, getAllBuses } from "../transport.service";

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
      alert("Please fill required fields");
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

      alert("Saved successfully ✅");

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
      alert("Error saving ❌");
    }
  };

  return (
    <div className="bg-gray-100 min-h-screen p-6">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow p-6">

        {/* TYPE SWITCH */}
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

        {/* COMMON */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label>Bus</label>
            <select
              name="busNo"
              value={form.busNo}
              onChange={handleChange}
              className="input"
            >
              <option value="">Select</option>
              {buses.map((bus) => (
                <option key={bus.id} value={bus.id}>
                  {bus.name || bus.busNo || `Bus ${bus.id}`}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label>Date</label>
            <input
              type="date"
              name="date"
              value={form.date}
              onChange={handleChange}
              className="input"
            />
          </div>
        </div>

        {/* FUEL */}
        {type === "FUEL" && (
          <>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <input
                name="fuelStation"
                placeholder="Petrol Bunk"
                value={form.fuelStation}
                onChange={handleChange}
                className="input"
              />

              <select
                name="paymentMode"
                value={form.paymentMode}
                onChange={handleChange}
                className="input"
              >
                <option value="CASH">Cash</option>
                <option value="CARD">Card</option>
              </select>

               {form.paymentMode === "CARD" && (
  <input
    name="cardName"
    placeholder="Card Number / Card Name"
    value={form.cardName}
    onChange={handleChange}
    className="input mt-4"
  />
)}
            </div>

            <div className="grid grid-cols-3 gap-4 mt-4">
              <input
                name="litres"
                placeholder="Litres"
                value={form.litres}
                onChange={handleChange}
                className="input"
              />
              <input
                name="pricePerLitre"
                placeholder="Price/Litre"
                value={form.pricePerLitre}
                onChange={handleChange}
                className="input"
              />
              <input
                value={form.amount}
                readOnly
                className="input bg-gray-100"
              />
            </div>
          </>
        )}

        {/* MAINTENANCE */}
        {type === "MAINTENANCE" && (
          <>
            <input
              name="workshop"
              placeholder="Workshop"
              value={form.workshop}
              onChange={handleChange}
              className="input mt-4"
            />
            <input
              name="amount"
              placeholder="Amount"
              value={form.amount}
              onChange={handleChange}
              className="input mt-4"
            />
            <textarea
              name="description"
              placeholder="Description"
              value={form.description}
              onChange={handleChange}
              className="input mt-4"
            />
          </>
        )}

        {/* SAVE BUTTON */}
        <button
          onClick={handleSave}
          className="mt-6 w-full bg-blue-900 text-white py-3 rounded-lg"
        >
          Save
        </button>

      </div>
    </div>
  );
}