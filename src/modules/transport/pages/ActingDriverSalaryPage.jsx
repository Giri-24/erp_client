import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  getActingDriverDailyRates,
  getActingDriverManualDays,
  updateActingDriverDailyRate,
  updateActingDriverManualDays,
} from "../transport.service";

const normalizeRateInput = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return Number(parsed.toFixed(2));
};

export default function ActingDriverSalaryPage() {
  const [rows, setRows] = useState([]);
  const [draftRates, setDraftRates] = useState({});
  const [draftDays, setDraftDays] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingStaffId, setSavingStaffId] = useState("");
  const [savingDaysStaffId, setSavingDaysStaffId] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

  const loadRows = async () => {
    try {
      setLoading(true);
      const [dailyRateRows, manualDaysResponse] = await Promise.all([
        getActingDriverDailyRates(),
        getActingDriverManualDays(selectedMonth),
      ]);

      const rates = Array.isArray(dailyRateRows) ? dailyRateRows : [];
      const daysRows = Array.isArray(manualDaysResponse?.rows) ? manualDaysResponse.rows : [];
      const daysMap = new Map(daysRows.map((row) => [row.staffId, row]));

      const mergedRows = rates.map((row) => {
        const days = daysMap.get(row.staffId);
        return {
          ...row,
          attendanceDays: Number(days?.attendanceDays ?? 0),
          manualDays: days?.manualDays ?? null,
          effectiveDays: Number(days?.effectiveDays ?? 0),
          estimatedSalary: Number(days?.estimatedSalary ?? 0),
        };
      });

      setRows(mergedRows);

      const initialRateDrafts = {};
      const initialDayDrafts = {};
      mergedRows.forEach((row) => {
        initialRateDrafts[row.staffId] = String(row.perDaySalary ?? row.fallbackPerDaySalary ?? "");
        initialDayDrafts[row.staffId] = String(row.manualDays ?? row.attendanceDays ?? "");
      });
      setDraftRates(initialRateDrafts);
      setDraftDays(initialDayDrafts);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load acting driver salaries");
      setRows([]);
      setDraftRates({});
      setDraftDays({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRows();
  }, [selectedMonth]);

  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
  }, [rows]);

  const onDraftChange = (staffId, value) => {
    setDraftRates((prev) => ({ ...prev, [staffId]: value }));
  };

  const onDraftDaysChange = (staffId, value) => {
    setDraftDays((prev) => ({ ...prev, [staffId]: value }));
  };

  const onSaveRate = async (staffId) => {
    const normalizedRate = normalizeRateInput(draftRates[staffId]);
    if (!normalizedRate) {
      toast.error("Per-day salary must be a positive number");
      return;
    }

    try {
      setSavingStaffId(staffId);
      const updated = await updateActingDriverDailyRate(staffId, normalizedRate);

      setRows((prev) => prev.map((row) => (
        row.staffId === staffId
          ? {
              ...row,
              perDaySalary: updated?.perDaySalary ?? normalizedRate,
            }
          : row
      )));

      setDraftRates((prev) => ({
        ...prev,
        [staffId]: String(updated?.perDaySalary ?? normalizedRate),
      }));

      toast.success("Per-day salary updated");
    } catch (err) {
      console.error(err);
      const backendMessage = err?.response?.data?.message;
      const message = Array.isArray(backendMessage)
        ? backendMessage.join(", ")
        : backendMessage;
      toast.error(message || "Failed to update per-day salary");
    } finally {
      setSavingStaffId("");
    }
  };

  const onSaveDays = async (staffId) => {
    const parsedDays = Number(draftDays[staffId]);
    if (!Number.isFinite(parsedDays) || parsedDays < 0) {
      toast.error("No. of days must be zero or a positive number");
      return;
    }

    const normalizedDays = Number(parsedDays.toFixed(1));

    try {
      setSavingDaysStaffId(staffId);
      const updated = await updateActingDriverManualDays(staffId, selectedMonth, normalizedDays);

      setRows((prev) => prev.map((row) => {
        if (row.staffId !== staffId) return row;
        const effectiveDays = Number(updated?.manualDays ?? normalizedDays);
        const perDaySalary = Number(row.perDaySalary ?? row.fallbackPerDaySalary ?? 0);
        return {
          ...row,
          manualDays: effectiveDays,
          effectiveDays,
          estimatedSalary: Number((effectiveDays * perDaySalary).toFixed(2)),
        };
      }));

      setDraftDays((prev) => ({
        ...prev,
        [staffId]: String(updated?.manualDays ?? normalizedDays),
      }));

      toast.success("Manual days updated");
    } catch (err) {
      console.error(err);
      const backendMessage = err?.response?.data?.message;
      const message = Array.isArray(backendMessage)
        ? backendMessage.join(", ")
        : backendMessage;
      toast.error(message || "Failed to update manual days");
    } finally {
      setSavingDaysStaffId("");
    }
  };

  return (
    <div className="w-full min-h-screen bg-gray-100 p-6">
      <div className="max-w-6xl mx-auto bg-white rounded-2xl shadow-lg p-8">
        <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Acting Driver Per-Day Salary</h2>
            <p className="text-sm text-gray-500 mt-1">
              Manage per-day salary and monthly no. of days used for acting-driver payroll.
            </p>
          </div>
          <div className="flex items-end gap-3 flex-wrap">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Payroll Month</label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
            <button
              type="button"
              onClick={loadRows}
              className="px-4 py-2 rounded-lg bg-[#00152a] text-white font-medium hover:opacity-90"
            >
              Refresh
            </button>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-gray-500">Loading acting drivers...</div>
        ) : sortedRows.length === 0 ? (
          <div className="py-12 text-center text-gray-500">
            No active acting drivers found.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-700">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">Employee ID</th>
                  <th className="text-left px-4 py-3 font-semibold">Name</th>
                  <th className="text-left px-4 py-3 font-semibold">Designation</th>
                  <th className="text-right px-4 py-3 font-semibold">Attendance Days</th>
                  <th className="text-right px-4 py-3 font-semibold">No. of Days ({selectedMonth})</th>
                  <th className="text-right px-4 py-3 font-semibold">Fallback</th>
                  <th className="text-right px-4 py-3 font-semibold">Per-Day Salary</th>
                  <th className="text-right px-4 py-3 font-semibold">Estimated Salary</th>
                  <th className="text-right px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sortedRows.map((row) => {
                  const isSaving = savingStaffId === row.staffId;
                  const isSavingDays = savingDaysStaffId === row.staffId;
                  return (
                    <tr key={row.staffId} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-700">{row.employeeId || "-"}</td>
                      <td className="px-4 py-3 text-gray-900 font-medium">{row.name || "-"}</td>
                      <td className="px-4 py-3 text-gray-700">{row.designation || "-"}</td>
                      <td className="px-4 py-3 text-gray-700 text-right">{Number(row.attendanceDays || 0).toFixed(1)}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end">
                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            value={draftDays[row.staffId] ?? ""}
                            onChange={(e) => onDraftDaysChange(row.staffId, e.target.value)}
                            className="w-28 border border-gray-300 rounded-lg px-3 py-2 text-right focus:outline-none focus:ring-2 focus:ring-[#00152a]"
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-700 text-right">₹{Number(row.fallbackPerDaySalary || 0).toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={draftRates[row.staffId] ?? ""}
                            onChange={(e) => onDraftChange(row.staffId, e.target.value)}
                            className="w-40 border border-gray-300 rounded-lg px-3 py-2 text-right focus:outline-none focus:ring-2 focus:ring-[#00152a]"
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-700 text-right font-medium">₹{Number(row.estimatedSalary || 0).toFixed(2)}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => onSaveDays(row.staffId)}
                            disabled={isSavingDays}
                            className="px-3 py-2 rounded-lg bg-white border border-[#00152a] text-[#00152a] font-medium disabled:opacity-60"
                          >
                            {isSavingDays ? "Saving..." : "Save Days"}
                          </button>
                          <button
                            type="button"
                            onClick={() => onSaveRate(row.staffId)}
                            disabled={isSaving}
                            className="px-4 py-2 rounded-lg bg-[#00152a] text-white font-medium disabled:opacity-60"
                          >
                            {isSaving ? "Saving..." : "Save Rate"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
