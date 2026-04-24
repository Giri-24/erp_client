import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  exportTransportExpenses,
  getTransportExpenses,
} from "../transport.service";
import { getAcademicYears, getPaymentStatusReport } from "../../fees/fees.service";

const CATEGORY_TABS = ["FUEL", "MAINTENANCE", "PARTS", "TAX"];

const formatCurrency = (value) => {
  const amount = Number(value || 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);
};

const toDateKey = (value) => {
  if (!value) return "";
  try {
    return new Date(value).toISOString().slice(0, 10);
  } catch {
    return String(value).slice(0, 10);
  }
};

const toMonthKey = (value) => toDateKey(value).slice(0, 7);

const currentMonthKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

const formatDateHeading = (value) => {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return value;
  }
};

const getBusLabel = (expense) => {
  const bus = expense?.bus;
  return (
    bus?.number ||
    bus?.busNo ||
    bus?.busNumber ||
    bus?.plateNo ||
    bus?.vehicleNo ||
    expense?.busNumber ||
    expense?.busNo ||
    expense?.plateNo ||
    expense?.vehicleNo ||
    expense?.busId ||
    "Unassigned"
  );
};

const getDetails = (expense) => {
  switch (expense?.category) {
    case "FUEL":
      return `${expense?.litres || 0}L @ ${expense?.pricePerLitre || 0}`;
    case "MAINTENANCE":
      return expense?.workshop || expense?.description || "Maintenance";
    case "PARTS":
      return expense?.partName || expense?.description || "Parts";
    case "TAX":
      return expense?.taxType || "Tax";
    default:
      return expense?.description || "-";
  }
};

const escapeCsv = (value) => {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
};

const getTransportCollectedAmount = (payment) => {
  const paidComponents = payment?.paidComponents;
  if (paidComponents && typeof paidComponents === "object") {
    const transportComponent = Number(
      paidComponents.transport ??
      paidComponents.transportFee ??
      paidComponents.transportAmount ??
      0
    );
    if (transportComponent > 0) {
      return transportComponent;
    }
  }

  const directAmount = Number(
    payment?.transportAmount ??
    payment?.transportFee ??
    0
  );
  if (directAmount > 0) {
    return directAmount;
  }

  const receiptComponents = Array.isArray(payment?.receiptComponents)
    ? payment.receiptComponents
    : [];
  if (receiptComponents.includes("transportFee")) {
    return Number(payment?.amount || 0);
  }

  return 0;
};

const getPaymentStudentId = (payment) => {
  return (
    payment?.studentId ||
    payment?.studentFee?.studentId ||
    payment?.studentFee?.student?.id ||
    payment?.student?.id ||
    payment?.admissionId ||
    payment?.studentFeeId ||
    ""
  );
};

export default function TransportExpenseDashboardPage() {
  const [monthlyExpenses, setMonthlyExpenses] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState("");
  const [transportPayments, setTransportPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [activeCategory, setActiveCategory] = useState("FUEL");
  const [showPastHistory, setShowPastHistory] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey());
  const [busFilter, setBusFilter] = useState("ALL");
  const [keywordFilter, setKeywordFilter] = useState("");

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    getTransportExpenses({ month: selectedMonth })
      .then((data) => {
        if (!cancelled) {
          setMonthlyExpenses(Array.isArray(data) ? data : []);
        }
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) {
          toast.error("Failed to load transport expenses");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedMonth]);

  useEffect(() => {
    let cancelled = false;

    const loadTransportIncome = async () => {
      try {
        const years = await getAcademicYears();
        const validYears = Array.isArray(years) ? years : [];
        if (!cancelled) {
          setAcademicYears(validYears);
        }

        const fallbackYear = validYears[0] || "";
        const yearToLoad = selectedAcademicYear || fallbackYear;
        if (!yearToLoad) {
          if (!cancelled) {
            setTransportPayments([]);
          }
          return;
        }

        if (!selectedAcademicYear && !cancelled) {
          setSelectedAcademicYear(yearToLoad);
        }

        const reportRows = await getPaymentStatusReport(yearToLoad);
        if (!cancelled) {
          setTransportPayments(Array.isArray(reportRows) ? reportRows : []);
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          toast.error("Failed to load academic transport income");
          setTransportPayments([]);
        }
      }
    };

    loadTransportIncome();

    return () => {
      cancelled = true;
    };
  }, [selectedAcademicYear]);

  const refreshExpenses = async () => {
    try {
      setRefreshing(true);
      const [expenseData, reportRows] = await Promise.all([
        getTransportExpenses({ month: selectedMonth }),
        selectedAcademicYear ? getPaymentStatusReport(selectedAcademicYear) : Promise.resolve([]),
      ]);
      setMonthlyExpenses(Array.isArray(expenseData) ? expenseData : []);
      setTransportPayments(Array.isArray(reportRows) ? reportRows : []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to refresh transport dashboard");
    } finally {
      setRefreshing(false);
    }
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      await exportTransportExpenses(activeCategory.toLowerCase(), {
        month: selectedMonth,
        ...(selectedDate ? { date: selectedDate } : {}),
      });
    } catch (err) {
      console.error(err);
      toast.error("Failed to export transport expenses");
    } finally {
      setExporting(false);
    }
  };

  const handleDateChange = (value) => {
    setSelectedDate(value);
    if (value) {
      setSelectedMonth(value.slice(0, 7));
    }
    if (!showPastHistory) {
      setShowPastHistory(true);
    }
  };

  const handleMonthChange = (value) => {
    setSelectedMonth(value || currentMonthKey());
    setSelectedDate("");
    if (!showPastHistory) {
      setShowPastHistory(true);
    }
  };

  const handleResetFilters = () => {
    setSelectedMonth(currentMonthKey());
    setSelectedDate("");
  };

  const handleCurrentView = () => {
    setShowPastHistory(false);
    setSelectedDate("");
    setSelectedMonth(currentMonthKey());
  };

  const handlePastHistoryView = () => {
    setShowPastHistory(true);
  };

  const monthlyOverallTotal = useMemo(() => (
    monthlyExpenses.reduce((sum, expense) => sum + Number(expense?.amount || 0), 0)
  ), [monthlyExpenses]);

  const moduleTotals = useMemo(() => {
    const totals = {
      FUEL: 0,
      MAINTENANCE: 0,
      PARTS: 0,
      TAX: 0,
    };

    monthlyExpenses.forEach((expense) => {
      const category = expense?.category;
      if (Object.prototype.hasOwnProperty.call(totals, category)) {
        totals[category] += Number(expense?.amount || 0);
      }
    });

    return totals;
  }, [monthlyExpenses]);

  const academicIncomeSummary = useMemo(() => {
    const collectedPayments = transportPayments.filter((payment) => {
      const status = String(payment?.status || "SUCCESS").toUpperCase();
      return status === "SUCCESS" && getTransportCollectedAmount(payment) > 0;
    });

    const totalIncome = collectedPayments.reduce(
      (sum, payment) => sum + getTransportCollectedAmount(payment),
      0
    );

    const distinctStudents = new Set(
      collectedPayments
        .map(getPaymentStudentId)
        .filter(Boolean)
    );

    return {
      totalIncome,
      studentCount: distinctStudents.size,
    };
  }, [transportPayments]);

  const currentMonthLabel = currentMonthKey();

  const isInActiveHistoryWindow = useCallback((dateValue) => {
    const dateKey = toDateKey(dateValue);
    if (!dateKey) return false;

    if (!showPastHistory) {
      return dateKey.startsWith(currentMonthLabel);
    }

    if (selectedDate) {
      return dateKey === selectedDate;
    }

    return dateKey.startsWith(selectedMonth);
  }, [showPastHistory, currentMonthLabel, selectedDate, selectedMonth]);

  const scopedEntries = useMemo(() => {
    return monthlyExpenses.filter((expense) => {
      if (expense?.category !== activeCategory) {
        return false;
      }

      if (!showPastHistory) {
        return toMonthKey(expense?.date) === currentMonthLabel;
      }

      if (selectedDate) {
        return toDateKey(expense?.date) === selectedDate;
      }

      return toMonthKey(expense?.date) === selectedMonth;
    });
  }, [monthlyExpenses, activeCategory, showPastHistory, selectedDate, selectedMonth, currentMonthLabel]);

  const busFilterOptions = useMemo(() => {
    const options = new Set();
    scopedEntries.forEach((expense) => {
      options.add(getBusLabel(expense));
    });
    return Array.from(options).sort((left, right) => left.localeCompare(right));
  }, [scopedEntries]);

  const filteredEntries = useMemo(() => {
    const keyword = keywordFilter.trim().toLowerCase();

    return scopedEntries.filter((expense) => {
      const busLabel = getBusLabel(expense);
      if (busFilter !== "ALL" && busLabel !== busFilter) {
        return false;
      }

      if (!keyword) {
        return true;
      }

      const details = getDetails(expense);
      const category = String(expense?.category || "");
      return `${busLabel} ${details} ${category}`.toLowerCase().includes(keyword);
    });
  }, [scopedEntries, busFilter, keywordFilter]);

  const groupedByDate = useMemo(() => {
    const map = new Map();

    filteredEntries.forEach((expense) => {
      const dateKey = toDateKey(expense?.date);
      if (!map.has(dateKey)) {
        map.set(dateKey, {
          date: dateKey,
          entries: [],
          total: 0,
        });
      }
      const group = map.get(dateKey);
      group.entries.push(expense);
      group.total += Number(expense?.amount || 0);
    });

    return Array.from(map.values()).sort((left, right) => new Date(right.date) - new Date(left.date));
  }, [filteredEntries]);

  const handleExportCsv = () => {
    if (!filteredEntries.length) {
      toast.error("No records found to export");
      return;
    }

    const headers = ["Date", "Bus", "Category", "Details", "Amount"];
    const rows = filteredEntries
      .slice()
      .sort((left, right) => new Date(right?.date || 0) - new Date(left?.date || 0))
      .map((expense) => [
        toDateKey(expense?.date),
        getBusLabel(expense),
        expense?.category || "",
        getDetails(expense),
        Number(expense?.amount || 0).toFixed(2),
      ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map(escapeCsv).join(","))
      .join("\n");

    const dateSuffix = selectedDate || selectedMonth || currentMonthKey();
    const keywordSuffix = keywordFilter.trim() ? `-${keywordFilter.trim().replace(/\s+/g, "-").slice(0, 20)}` : "";
    const filename = `transport-expense-${activeCategory.toLowerCase()}-${dateSuffix}${keywordSuffix}.csv`;

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const profitSummary = useMemo(() => {
    const income = transportPayments
      .filter((payment) => {
        const status = String(payment?.status || "SUCCESS").toUpperCase();
        if (status !== "SUCCESS") return false;
        const collectedAmount = getTransportCollectedAmount(payment);
        if (collectedAmount <= 0) return false;
        return isInActiveHistoryWindow(payment?.paymentDate || payment?.date);
      })
      .reduce((sum, payment) => sum + getTransportCollectedAmount(payment), 0);

    const expense = monthlyExpenses
      .filter((expenseRow) => isInActiveHistoryWindow(expenseRow?.date))
      .reduce((sum, expenseRow) => sum + Number(expenseRow?.amount || 0), 0);

    const profit = Number((income - expense).toFixed(2));

    return {
      income,
      expense,
      profit,
      isProfit: profit >= 0,
      statusLabel: profit >= 0 ? "Profit" : "Loss",
    };
  }, [transportPayments, monthlyExpenses, isInActiveHistoryWindow]);

  const historyLabel = !showPastHistory
    ? `Showing ${activeCategory} entries for current month (${currentMonthLabel})`
    : selectedDate
      ? `Showing ${activeCategory} entries for ${formatDateHeading(selectedDate)}`
      : `Showing ${activeCategory} entries for ${selectedMonth}`;

  return (
    <div className="w-full min-h-screen bg-gray-100 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="bg-white rounded-2xl shadow-lg p-8 space-y-6">
          <div className="flex flex-col gap-2">
            <h2 className="text-2xl font-bold text-gray-900">Transport Expense Dashboard</h2>
            <p className="text-sm text-gray-500">Monthly tracking with day-wise history and category tabs.</p>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-sm font-medium text-gray-500">Total Expenses ({selectedMonth})</p>
              <p className="text-3xl font-bold text-[#00152a] mt-1">{formatCurrency(monthlyOverallTotal)}</p>
              <p className="text-xs text-gray-500 mt-1">Overall monthly total stays constant when switching tabs.</p>
            </div>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-emerald-700">Transport Income (Academic Year)</p>
                <select
                  value={selectedAcademicYear}
                  onChange={(e) => setSelectedAcademicYear(e.target.value)}
                  className="border border-emerald-200 rounded-lg px-2.5 py-1.5 text-xs bg-white text-emerald-800"
                >
                  {(academicYears.length ? academicYears : [selectedAcademicYear]).filter(Boolean).map((year) => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
              <p className="text-3xl font-bold text-emerald-900 mt-2">{formatCurrency(academicIncomeSummary.totalIncome)}</p>
              <p className="text-sm text-emerald-700 mt-1">Collected from {academicIncomeSummary.studentCount} students</p>
              <p className="text-xs text-emerald-700/80 mt-1">Income includes only received transport fee payments (paidAmount &gt; 0).</p>
            </div>

            <div className={`rounded-xl border p-4 ${profitSummary.isProfit ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
              <p className={`text-sm font-medium ${profitSummary.isProfit ? "text-green-700" : "text-red-700"}`}>Transport Profit</p>
              <p className={`text-3xl font-bold mt-2 ${profitSummary.isProfit ? "text-green-900" : "text-red-900"}`}>
                {formatCurrency(profitSummary.profit)}
              </p>
              <p className={`text-sm font-semibold mt-1 ${profitSummary.isProfit ? "text-green-700" : "text-red-700"}`}>
                {profitSummary.isProfit ? "Profit" : "Loss"}
              </p>
              <p className={`text-xs mt-2 ${profitSummary.isProfit ? "text-green-700/90" : "text-red-700/90"}`}>
                Income: {formatCurrency(profitSummary.income)}
              </p>
              <p className={`text-xs ${profitSummary.isProfit ? "text-green-700/90" : "text-red-700/90"}`}>
                Expense: {formatCurrency(profitSummary.expense)}
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {CATEGORY_TABS.map((category) => (
              <div key={`total-${category}`} className="rounded-xl border border-gray-200 bg-white p-4">
                <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                  {category.charAt(0) + category.slice(1).toLowerCase()} Overall
                </p>
                <p className="mt-2 text-xl font-bold text-gray-900">{formatCurrency(moduleTotals[category])}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-3">
            {CATEGORY_TABS.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setActiveCategory(category)}
                className={`px-5 py-2 rounded-lg font-medium transition ${
                  activeCategory === category
                    ? "bg-[#00152a] text-white shadow"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                {category.charAt(0) + category.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleCurrentView}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                !showPastHistory
                  ? "bg-[#00152a] text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              Current View
            </button>
            <button
              type="button"
              onClick={handlePastHistoryView}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                showPastHistory
                  ? "bg-[#00152a] text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              See Past History
            </button>
          </div>

          {showPastHistory && (
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => handleDateChange(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#00152a] focus:border-[#00152a]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Month</label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => handleMonthChange(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#00152a] focus:border-[#00152a]"
              />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={handleResetFilters}
                className="w-full px-4 py-2 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Reset Filter
              </button>
            </div>
            <div className="flex items-end gap-2">
              <button
                type="button"
                onClick={refreshExpenses}
                disabled={refreshing}
                className="w-1/2 px-4 py-2 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-60"
              >
                {refreshing ? "..." : "Refresh"}
              </button>
              <button
                type="button"
                onClick={handleExport}
                disabled={exporting}
                className="w-1/2 px-4 py-2 rounded-xl bg-[#00152a] text-white hover:bg-[#002a4d] disabled:opacity-60"
              >
                {exporting ? "..." : "Export"}
              </button>
            </div>
          </div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Expense History</h3>
            <p className="text-sm text-gray-500">{historyLabel}</p>
          </div>

          <div className="mb-4 grid gap-3 md:grid-cols-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bus Filter</label>
              <select
                value={busFilter}
                onChange={(e) => setBusFilter(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#00152a] focus:border-[#00152a]"
              >
                <option value="ALL">All Buses</option>
                {busFilterOptions.map((label) => (
                  <option key={label} value={label}>{label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <input
                type="text"
                value={keywordFilter}
                onChange={(e) => setKeywordFilter(e.target.value)}
                placeholder="Bus / category / details"
                className="w-full border border-gray-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#00152a] focus:border-[#00152a]"
              />
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={() => {
                  setBusFilter("ALL");
                  setKeywordFilter("");
                }}
                className="w-full px-4 py-2 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Clear Filters
              </button>
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={handleExportCsv}
                className="w-full px-4 py-2 rounded-xl bg-[#00152a] text-white hover:bg-[#002a4d]"
              >
                Export CSV
              </button>
            </div>
          </div>

          {loading ? (
            <div className="py-10 text-center text-gray-500">Loading expenses...</div>
          ) : groupedByDate.length === 0 ? (
            <div className="py-10 text-center text-gray-500">No entries found for the selected filters.</div>
          ) : (
            <div className="space-y-5">
              {groupedByDate.map((group) => (
                <div key={group.date} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between mb-3">
                    <p className="font-semibold text-gray-900">{formatDateHeading(group.date)}</p>
                    <p className="text-sm font-semibold text-[#00152a]">Daily Total: {formatCurrency(group.total)}</p>
                  </div>

                  <div className="space-y-2">
                    {group.entries
                      .slice()
                      .sort((left, right) => new Date(right?.date || 0) - new Date(left?.date || 0))
                      .map((expense, index) => (
                        <div
                          key={expense?.id || expense?._id || `${group.date}-${expense?.busId || "bus"}-${index}`}
                          className="grid grid-cols-1 gap-2 rounded-lg bg-white p-3 border border-gray-100 sm:grid-cols-12"
                        >
                          <div className="sm:col-span-4 text-sm font-medium text-gray-900">
                            {getBusLabel(expense)}
                          </div>
                          <div className="sm:col-span-5 text-sm text-gray-600">
                            {expense?.category} • {getDetails(expense)}
                          </div>
                          <div className="sm:col-span-3 text-sm font-semibold text-right text-gray-900">
                            {formatCurrency(expense?.amount)}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}