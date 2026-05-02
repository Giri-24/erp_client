import { useState, useEffect, useMemo } from "react";
import {
  createTransportExpense,
  getAllBuses,
} from "../transport.service";
import toast from "react-hot-toast";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const EXPENSE_TYPES = [
  { key: "FUEL", label: "Fuel" },
  { key: "MAINTENANCE", label: "Maintenance" },
  { key: "PARTS", label: "Parts" },
  { key: "TAX", label: "Tax" },
];

const MULTI_BUS_TYPES = new Set(["MAINTENANCE", "PARTS", "TAX"]);

const PART_NAME_OPTIONS = [
  "New Tyre",
  "Retread tyre",
  "Gear box",
  "Engine",
  "Radiator",
  "Electrical",
  "Clutch",
  "Main Axil",
  "Spring Cut",
  "Streeing Box",
  "Camera, GPRS",
];

const MAINTENANCE_OPTIONS = [
  "FC work",
  "Greeze filling",
  "Puncture & Tyre Checking",
  "Other Expense",
];

const INITIAL_FORM = {
  busNo: "",
  busIds: [],
  date: "",
  fuelStation: "",
  paymentMode: "CASH",
  cardName: "",
  litres: "",
  pricePerLitre: "",
  amount: "",
  workshop: "",
  workshopName: "",
  description: "",
  partName: "",
  quantity: "",
  unitCost: "",
  isShared: false,
  taxType: "ROAD TAX",
  referenceNo: "",
};

const distributeAmounts = (totalAmount, count, splitEqually) => {
  const normalizedTotal = Number(totalAmount || 0);
  if (!splitEqually || count <= 1) {
    return Array.from({ length: count }, () => normalizedTotal);
  }

  const totalPaise = Math.round(normalizedTotal * 100);
  const basePaise = Math.floor(totalPaise / count);
  let remainder = totalPaise - (basePaise * count);

  return Array.from({ length: count }, () => {
    const currentPaise = basePaise + (remainder > 0 ? 1 : 0);
    if (remainder > 0) {
      remainder -= 1;
    }
    return Number((currentPaise / 100).toFixed(2));
  });
};

export default function TransportExpensePage() {
  const [type, setType] = useState("FUEL");
  const [buses, setBuses] = useState([]);
  const [form, setForm] = useState(INITIAL_FORM);
  const [saving, setSaving] = useState(false);

  const getBusLabel = (bus) => {
    return (
      bus?.number ||
      bus?.busNo ||
      bus?.busNumber ||
      bus?.vanNo ||
      bus?.vehicleNo ||
      bus?.vehicleNumber ||
      bus?.plateNo ||
      bus?.registrationNo ||
      bus?.regNo ||
      bus?.name ||
      "Unnamed Bus"
    );
  };

  const getBusId = (bus) => bus?.id || bus?._id || bus?.busId || "";
  const isMultiBusType = MULTI_BUS_TYPES.has(type);

  const fuelAmount = useMemo(() => {
    const litres = Number(form.litres);
    const pricePerLitre = Number(form.pricePerLitre);
    if (litres > 0 && pricePerLitre > 0) {
      return (litres * pricePerLitre).toFixed(2);
    }
    return "";
  }, [form.litres, form.pricePerLitre]);

  const partsAmount = useMemo(() => {
    const quantity = Number(form.quantity);
    const unitCost = Number(form.unitCost);
    if (quantity > 0 && unitCost > 0) {
      return (quantity * unitCost).toFixed(2);
    }
    return "";
  }, [form.quantity, form.unitCost]);

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
    const { name, value, type: inputType, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: inputType === "checkbox" ? checked : value,
    }));
  };

  const handleBusCheckboxChange = (busId, checked) => {
    setForm((prev) => {
      const selected = new Set(prev.busIds);
      if (checked) {
        selected.add(busId);
      } else {
        selected.delete(busId);
      }
      return { ...prev, busIds: Array.from(selected) };
    });
  };

  const handleSelectAllBuses = () => {
    setForm((prev) => ({
      ...prev,
      busIds: buses.map(getBusId).filter(Boolean),
    }));
  };

  const handleClearBusSelection = () => {
    setForm((prev) => ({ ...prev, busIds: [] }));
  };

  const resetForm = () => {
    setForm(INITIAL_FORM);
  };

  const getSelectedBusIds = () => {
    if (isMultiBusType) {
      return form.busIds;
    }
    return form.busNo ? [form.busNo] : [];
  };

  const getValidationMessage = (selectedBusIds) => {
    if (selectedBusIds.length === 0) {
      return isMultiBusType ? "Please select at least one bus" : "Please select a bus";
    }
    if (!form.date) {
      return "Please select a date";
    }

    switch (type) {
      case "FUEL":
        if (!form.fuelStation || !form.litres || !form.pricePerLitre || !fuelAmount) {
          return "Please fill all fuel details";
        }
        if (form.paymentMode === "CARD" && !form.cardName) {
          return "Please enter card details";
        }
        return "";
      case "MAINTENANCE":
        if (!form.workshop || !form.amount) {
          return "Please fill workshop and amount";
        }
        return "";
      case "PARTS":
        if (!form.partName || !form.quantity || !form.unitCost || !partsAmount) {
          return "Please fill all parts details";
        }
        return "";
      case "TAX":
        if (!form.taxType || !form.amount) {
          return "Please fill tax details";
        }
        return "";
      default:
        return "";
    }
  };

  const buildEntries = (selectedBusIds) => {
    switch (type) {
      case "FUEL":
        return [
          {
            busId: selectedBusIds[0],
            date: form.date,
            category: "FUEL",
            fuelStation: form.fuelStation,
            paymentMode: form.paymentMode,
            description: form.paymentMode === "CARD" && form.cardName
              ? `Card: ${form.cardName}`
              : "",
            litres: Number(form.litres || 0),
            pricePerLitre: Number(form.pricePerLitre || 0),
            amount: Number(fuelAmount || 0),
          },
        ];
      case "MAINTENANCE":
        const maintenanceDescriptionParts = [];
        if (form.workshopName) {
          maintenanceDescriptionParts.push(`Workshop: ${form.workshopName}`);
        }
        if (form.description) {
          maintenanceDescriptionParts.push(form.description);
        }
        if (form.isShared) {
          maintenanceDescriptionParts.push("(Shared split equally)");
        }

        return selectedBusIds.map((busId, index) => ({
          busId,
          date: form.date,
          category: "MAINTENANCE",
          workshop: form.workshop,
          description: maintenanceDescriptionParts.join(" ").trim(),
          amount: distributeAmounts(Number(form.amount || 0), selectedBusIds.length, Boolean(form.isShared))[index],
        }));
      case "PARTS":
        return selectedBusIds.map((busId, index) => ({
          busId,
          date: form.date,
          category: "PARTS",
          partName: form.partName,
          description: `${form.partName} x ${Number(form.quantity || 0)} @ ${Number(form.unitCost || 0)}`,
          amount: distributeAmounts(Number(partsAmount || 0), selectedBusIds.length, Boolean(form.isShared))[index],
          isShared: Boolean(form.isShared),
        }));
      case "TAX":
        return selectedBusIds.map((busId) => ({
          busId,

          date: form.date,
          category: "TAX",
          taxType: form.taxType,
          description: form.referenceNo ? `Ref No: ${form.referenceNo}` : "",
          amount: Number(form.amount || 0),
        }));
      default:
        return [];
    }
  };

  // ✅ SAVE FUNCTION
  const handleSave = async () => {
    const selectedBusIds = getSelectedBusIds();
    const validationMessage = getValidationMessage(selectedBusIds);

    if (validationMessage) {
      toast.error(validationMessage);
      return;
    }

    try {
      setSaving(true);
      const entries = buildEntries(selectedBusIds);
      await Promise.all(entries.map((entry) => createTransportExpense(entry)));
      toast.success(
        entries.length > 1
          ? `${entries.length} expenses saved successfully!`
          : "Expense saved successfully!"
      );
      resetForm();
    } catch (err) {
      console.error(err);
      const backendMessage = err?.response?.data?.message;
      const message = Array.isArray(backendMessage)
        ? backendMessage.join(", ")
        : backendMessage;
      toast.error(message || "Failed to save expense. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
<div className="w-full min-h-screen bg-gray-100 p-6">
     <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow-lg p-8">

      {/* HEADER */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-800">
          Transport Expense
        </h2>
      </div>

      {/* TABS */}
      <div className="flex flex-wrap gap-3 mb-8">
        {EXPENSE_TYPES.map((expenseType) => (
          <button
            key={expenseType.key}
            type="button"
            onClick={() => setType(expenseType.key)}
            className={`px-6 py-2 rounded-lg font-medium transition ${
              type === expenseType.key
                ? "bg-[#00152a] text-white shadow"
                : "bg-gray-200 hover:bg-gray-300"
            }`}
          >
            {expenseType.label}
          </button>
        ))}
      </div>

      {/* COMMON FIELDS */}
      <div className="grid md:grid-cols-2 gap-5">
        <div>
          <label className="text-sm font-medium text-gray-700">
            {isMultiBusType ? "Buses" : "Bus"}
          </label>
          {isMultiBusType ? (
            <>
              <div className="mt-1 border border-gray-300 rounded-xl px-3 py-2 bg-white">
                <div className="flex items-center justify-between gap-3 border-b border-gray-200 pb-2 mb-2">
                  <p className="text-xs text-gray-500">Select one or more buses</p>
                  <div className="flex items-center gap-3 text-xs font-medium">
                    <button
                      type="button"
                      onClick={handleSelectAllBuses}
                      className="text-[#00152a] hover:underline"
                    >
                      Select all
                    </button>
                    <button
                      type="button"
                      onClick={handleClearBusSelection}
                      className="text-gray-500 hover:underline"
                    >
                      Clear
                    </button>
                  </div>
                </div>
                <div className="max-h-40 overflow-y-auto">
                {buses.map((bus) => {
                  const busId = getBusId(bus);
                  const busLabel = getBusLabel(bus);
                  const isChecked = form.busIds.includes(busId);

                  if (!busId) return null;

                  return (
                    <label key={busId} className="flex items-center gap-3 py-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => handleBusCheckboxChange(busId, e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-[#00152a] focus:ring-[#00152a]"
                      />
                      <span className="text-sm text-gray-800">{busLabel}</span>
                    </label>
                  );
                })}
                {buses.length === 0 && (
                  <p className="text-sm text-gray-500 py-1">No buses available</p>
                )}
                </div>
              </div>
              <p className="mt-1 text-xs text-gray-500">Selected: {form.busIds.length}</p>
            </>
          ) : (
            <select
              name="busNo"
              value={form.busNo}
              onChange={handleChange}
              className="w-full mt-1 border border-gray-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#00152a] focus:border-[#00152a] transition"
            >
              <option value="">Select Bus</option>
              {buses.map((bus) => (
                <option key={getBusId(bus)} value={getBusId(bus)}>
                  {getBusLabel(bus)}
                </option>
              ))}
            </select>
          )}
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700">Date</label>
          <input
            type="date"
            name="date"
            value={form.date}
            onChange={handleChange}
            className="w-full mt-1 border border-gray-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#00152a] focus:border-[#00152a] transition"
          />
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
                type="number"
                value={form.litres}
                onChange={handleChange}
                className="w-full mt-1 border rounded-xl px-3 py-2"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Price / Litre</label>
              <input
                name="pricePerLitre"
                type="number"
                value={form.pricePerLitre}
                onChange={handleChange}
                className="w-full mt-1 border rounded-xl px-3 py-2"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Total Amount</label>
              <input
                value={fuelAmount}
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
              <label className="text-sm font-medium">Maintenance Type</label>
              <select
                name="workshop"
                value={form.workshop}
                onChange={handleChange}
                className="w-full mt-1 border rounded-xl px-3 py-2"
              >
                <option value="">Select maintenance type</option>
                {MAINTENANCE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">Workshop Name</label>
              <input
                name="workshopName"
                value={form.workshopName}
                onChange={handleChange}
                placeholder="Enter workshop name"
                className="w-full mt-1 border rounded-xl px-3 py-2"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-5 mt-5">
            <div>
              <label className="text-sm font-medium">Amount</label>
              <input
                name="amount"
                type="number"
                value={form.amount}
                onChange={handleChange}
                className="w-full mt-1 border rounded-xl px-3 py-2"
              />
            </div>
          </div>

          <div className="mt-5">
            <label className="text-sm font-medium">Notes</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              className="w-full mt-1 border rounded-xl px-3 py-2"
            />
          </div>

          <label className="mt-5 inline-flex items-center gap-3 text-sm font-medium text-gray-700">
            <input
              type="checkbox"
              name="isShared"
              checked={form.isShared}
              onChange={handleChange}
              className="h-4 w-4 rounded border-gray-300 text-[#00152a] focus:ring-[#00152a]"
            />
            Shared Expense (Split equally)
          </label>
        </>
      )}

      {/* ================= PARTS ================= */}
      {type === "PARTS" && (
        <>
          <div className="grid md:grid-cols-2 gap-5 mt-5">
            <div>
              <label className="text-sm font-medium">Part Name</label>
              <select
                name="partName"
                value={form.partName}
                onChange={handleChange}
                className="w-full mt-1 border rounded-xl px-3 py-2"
              >
                <option value="">Select part name</option>
                {PART_NAME_OPTIONS.map((partName) => (
                  <option key={partName} value={partName}>
                    {partName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">Quantity</label>
              <input
                name="quantity"
                type="number"
                value={form.quantity}
                onChange={handleChange}
                className="w-full mt-1 border rounded-xl px-3 py-2"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-5 mt-5">
            <div>
              <label className="text-sm font-medium">Unit Cost</label>
              <input
                name="unitCost"
                type="number"
                value={form.unitCost}
                onChange={handleChange}
                className="w-full mt-1 border rounded-xl px-3 py-2"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Amount</label>
              <input
                value={partsAmount}
                readOnly
                className="w-full mt-1 border rounded-xl px-3 py-2 bg-blue-50 font-semibold text-blue-900"
              />
            </div>
          </div>

          <label className="mt-5 inline-flex items-center gap-3 text-sm font-medium text-gray-700">
            <input
              type="checkbox"
              name="isShared"
              checked={form.isShared}
              onChange={handleChange}
              className="h-4 w-4 rounded border-gray-300 text-[#00152a] focus:ring-[#00152a]"
            />
            Shared Expense (Split equally)
          </label>
        </>
      )}

      {/* ================= TAX ================= */}
      {type === "TAX" && (
        <>
          <div className="grid md:grid-cols-2 gap-5 mt-5">
            <div>
              <label className="text-sm font-medium">Tax Type</label>
              <select
                name="taxType"
                value={form.taxType}
                onChange={handleChange}
                className="w-full mt-1 border rounded-xl px-3 py-2"
              >
                <option value="ROAD TAX">Road Tax</option>
                <option value="PERMIT">Permit</option>
                <option value="INSURANCE">Insurance</option>
                <option value="Green Tax">Green tax</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">Amount</label>
              <input
                name="amount"
                type="number"
                value={form.amount}
                onChange={handleChange}
                className="w-full mt-1 border rounded-xl px-3 py-2"
              />
            </div>
          </div>

          <div className="mt-5">
            <label className="text-sm font-medium">Reference No</label>
            <input
              name="referenceNo"
              value={form.referenceNo}
              onChange={handleChange}
              className="w-full mt-1 border rounded-xl px-3 py-2"
            />
          </div>
        </>
      )}

      {/* SAVE BUTTON */}
     <button
      type="button"
      onClick={handleSave}
      disabled={saving}
      className="mt-8 w-full bg-[#00152a] hover:bg-[#002a4d] text-white py-3 rounded-xl font-semibold shadow-md transition disabled:opacity-60"
    >
      {saving ? "Saving..." : "Save Expense"}
    </button>

    </div>
  </div>
);

}