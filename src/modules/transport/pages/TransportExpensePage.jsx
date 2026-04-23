import { useState, useEffect } from "react";
import { createTransportExpense, getAllBuses, getTransportFinanceReport } from "../transport.service";
import toast from "react-hot-toast";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";


export default function TransportExpensePage() {

  const [type, setType] = useState("FUEL");
  const [buses, setBuses] = useState([]);
  const [reportMonth, setReportMonth] = useState(new Date().toISOString().slice(0, 7));
  const [financeReport, setFinanceReport] = useState(null);

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

  const downloadCsv = (filename, headers, rows) => {
    const escapeCell = (value) => {
      if (value === null || value === undefined) return "";
      const text = String(value).replace(/"/g, '""');
      return /[",\n]/.test(text) ? `"${text}"` : text;
    };

    const csv = [
      headers.map(escapeCell).join(","),
      ...rows.map((row) => row.map(escapeCell).join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  };

  const exportSalaryCsv = () => {
    const rows = financeReport?.salaryRows || [];
    downloadCsv(
      `transport-salary-report-${reportMonth}.csv`,
      ["Employee ID", "Name", "Designation", "Category", "Present Days", "Daily Rate", "Salary Expense", "Source"],
      rows.map((r) => [
        r.employeeId || "",
        r.name || "",
        r.designation || "",
        r.category || "",
        r.presentDays || 0,
        Number(r.dailyRate || 0).toFixed(2),
        Number(r.salaryExpense || 0).toFixed(2),
        r.source || "",
      ]),
    );
  };

  const exportFinanceCsv = () => {
    const income = Number(financeReport?.income?.transportFees || 0);
    const salaryExpense = Number(financeReport?.expense?.salary || 0);
    const manualExpense = Number(financeReport?.expense?.manual || 0);
    const totalExpense = Number(financeReport?.expense?.total || 0);
    const net = Number(financeReport?.net || 0);

    downloadCsv(
      `transport-finance-summary-${reportMonth}.csv`,
      ["Month", "Metric", "Amount"],
      [
        [reportMonth, "Transport Income", income.toFixed(2)],
        [reportMonth, "Salary Expense", salaryExpense.toFixed(2)],
        [reportMonth, "Manual Expense", manualExpense.toFixed(2)],
        [reportMonth, "Total Expense", totalExpense.toFixed(2)],
        [reportMonth, "Net (Income - Expense)", net.toFixed(2)],
      ],
    );
  };

  const exportSalaryPdf = () => {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    doc.setFontSize(14);
    doc.text(`Transport Salary Report - ${reportMonth}`, 40, 40);
    doc.setFontSize(10);
    doc.text(`Total Salary Expense: INR ${Number(financeReport?.expense?.salary || 0).toLocaleString()}`, 40, 58);

    const rows = (financeReport?.salaryRows || []).map((r) => [
      r.employeeId || "",
      r.name || "",
      r.designation || "",
      String(r.presentDays || 0),
      Number(r.dailyRate || 0).toFixed(2),
      Number(r.salaryExpense || 0).toFixed(2),
      r.source || "",
    ]);

    autoTable(doc, {
      startY: 72,
      head: [["Employee ID", "Name", "Designation", "Present Days", "Daily Rate", "Expense", "Source"]],
      body: rows,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [0, 21, 42] },
    });

    doc.save(`transport-salary-report-${reportMonth}.pdf`);
  };

  const exportFinancePdf = () => {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    doc.setFontSize(14);
    doc.text(`Transport Finance Summary - ${reportMonth}`, 40, 40);

    const income = Number(financeReport?.income?.transportFees || 0);
    const salaryExpense = Number(financeReport?.expense?.salary || 0);
    const manualExpense = Number(financeReport?.expense?.manual || 0);
    const totalExpense = Number(financeReport?.expense?.total || 0);
    const net = Number(financeReport?.net || 0);

    autoTable(doc, {
      startY: 60,
      head: [["Metric", "Amount (INR)"]],
      body: [
        ["Transport Income", income.toFixed(2)],
        ["Salary Expense", salaryExpense.toFixed(2)],
        ["Manual Expense", manualExpense.toFixed(2)],
        ["Total Expense", totalExpense.toFixed(2)],
        ["Net (Income - Expense)", net.toFixed(2)],
      ],
      styles: { fontSize: 10 },
      headStyles: { fillColor: [0, 21, 42] },
      columnStyles: {
        0: { cellWidth: 280 },
        1: { halign: "right" },
      },
    });

    doc.save(`transport-finance-summary-${reportMonth}.pdf`);
  };

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

  useEffect(() => {
    const loadFinanceReport = async () => {
      try {
        const data = await getTransportFinanceReport(reportMonth);
        setFinanceReport(data);
      } catch (err) {
        console.error("Finance report load failed", err);
      }
    };
    loadFinanceReport();
  }, [reportMonth]);

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
      try {
        const data = await getTransportFinanceReport(reportMonth);
        setFinanceReport(data);
      } catch {
        // ignore report refresh failures after save
      }
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

      <div className="grid md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
          <p className="text-xs text-blue-700 font-semibold">REPORT MONTH</p>
          <input
            type="month"
            value={reportMonth}
            onChange={(e) => setReportMonth(e.target.value)}
            className="mt-2 w-full border rounded-lg px-2 py-1 bg-white"
          />
        </div>
        <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
          <p className="text-xs text-emerald-700 font-semibold">TRANSPORT INCOME</p>
          <p className="text-lg font-bold text-emerald-800">₹ {Number(financeReport?.income?.transportFees || 0).toLocaleString()}</p>
        </div>
        <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
          <p className="text-xs text-amber-700 font-semibold">SALARY EXPENSE</p>
          <p className="text-lg font-bold text-amber-800">₹ {Number(financeReport?.expense?.salary || 0).toLocaleString()}</p>
        </div>
        <div className="bg-rose-50 rounded-xl p-4 border border-rose-100">
          <p className="text-xs text-rose-700 font-semibold">NET (INCOME - EXPENSE)</p>
          <p className="text-lg font-bold text-rose-800">₹ {Number(financeReport?.net || 0).toLocaleString()}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={exportFinanceCsv}
          className="px-4 py-2 rounded-lg bg-emerald-700 text-white text-sm font-medium hover:bg-emerald-800 transition"
        >
          Export Finance CSV
        </button>
        <button
          onClick={exportFinancePdf}
          className="px-4 py-2 rounded-lg bg-emerald-900 text-white text-sm font-medium hover:bg-emerald-950 transition"
        >
          Export Finance PDF
        </button>
        <button
          onClick={exportSalaryCsv}
          className="px-4 py-2 rounded-lg bg-blue-700 text-white text-sm font-medium hover:bg-blue-800 transition"
        >
          Export Salary CSV
        </button>
        <button
          onClick={exportSalaryPdf}
          className="px-4 py-2 rounded-lg bg-blue-900 text-white text-sm font-medium hover:bg-blue-950 transition"
        >
          Export Salary PDF
        </button>
      </div>

      <div className="mb-8 bg-slate-50 rounded-2xl border border-slate-200 p-4">
        <h3 className="font-semibold text-slate-700 mb-3">Driver / Conductor / Acting Driver Salary Report</h3>
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2 pr-3">Employee ID</th>
                <th className="py-2 pr-3">Name</th>
                <th className="py-2 pr-3">Designation</th>
                <th className="py-2 pr-3">Present Days</th>
                <th className="py-2 pr-3">Daily Rate</th>
                <th className="py-2 pr-3">Expense</th>
                <th className="py-2 pr-3">Source</th>
              </tr>
            </thead>
            <tbody>
              {(financeReport?.salaryRows || []).map((r) => (
                <tr key={r.staffId} className="border-b last:border-0">
                  <td className="py-2 pr-3">{r.employeeId}</td>
                  <td className="py-2 pr-3">{r.name}</td>
                  <td className="py-2 pr-3">{r.designation}</td>
                  <td className="py-2 pr-3">{r.presentDays}</td>
                  <td className="py-2 pr-3">₹ {Number(r.dailyRate || 0).toLocaleString()}</td>
                  <td className="py-2 pr-3 font-semibold">₹ {Number(r.salaryExpense || 0).toLocaleString()}</td>
                  <td className="py-2 pr-3">{r.source}</td>
                </tr>
              ))}
              {(!financeReport?.salaryRows || financeReport.salaryRows.length === 0) && (
                <tr>
                  <td colSpan={7} className="py-4 text-center text-gray-500">No salary rows found for selected month</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

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