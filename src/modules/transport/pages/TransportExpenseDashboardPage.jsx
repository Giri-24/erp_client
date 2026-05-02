import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  exportTransportExpenses,
  getAllBuses,
  getTransportExpenses,
} from "../transport.service";
import { getAcademicYears, getPaymentStatusReport } from "../../fees/fees.service";

const CATEGORY_TABS = ["ALL", "FUEL", "MAINTENANCE", "PARTS", "TAX"];

const CATEGORY_BADGE_CLASS = {
  FUEL: "bg-teal-100 text-teal-700",
  MAINTENANCE: "bg-blue-100 text-blue-700",
  PARTS: "bg-indigo-100 text-indigo-700",
  TAX: "bg-amber-100 text-amber-700",
};

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

const toCsvDateText = (value) => {
  const dateKey = toDateKey(value);
  if (!dateKey) return "";

  const [year, month, day] = dateKey.split("-");
  const ddmmyyyy = day && month && year ? `${day}-${month}-${year}` : dateKey;
  return `\t${ddmmyyyy}`;
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

const getBusOptionLabel = (bus) => {
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

const normalizeBusFilterValue = (value) => String(value || "").trim().toUpperCase();

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
      0,
    );
    if (transportComponent > 0) {
      return transportComponent;
    }
  }

  const directAmount = Number(
    payment?.transportAmount ??
    payment?.transportFee ??
    0,
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

export default function TransportExpenseDashboardPage({ onNavigate }) {
  const [monthlyExpenses, setMonthlyExpenses] = useState([]);
  const [buses, setBuses] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState("");
  const [transportPayments, setTransportPayments] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [activeCategory, setActiveCategory] = useState("ALL");
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

    getAllBuses()
      .then((data) => {
        if (!cancelled) {
          setBuses(Array.isArray(data) ? data : []);
        }
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) {
          toast.error("Failed to load buses");
          setBuses([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

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

  const handleExportXlsx = async () => {
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
      0,
    );

    const distinctStudents = new Set(
      collectedPayments
        .map(getPaymentStudentId)
        .filter(Boolean),
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
      if (activeCategory !== "ALL" && expense?.category !== activeCategory) {
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
    const map = new Map();

    buses.forEach((bus) => {
      const label = getBusOptionLabel(bus);
      const normalizedLabel = normalizeBusFilterValue(label);
      if (!normalizedLabel || map.has(normalizedLabel)) return;
      map.set(normalizedLabel, label);
    });

    scopedEntries.forEach((expense) => {
      const label = getBusLabel(expense);
      const normalizedLabel = normalizeBusFilterValue(label);
      if (!normalizedLabel || map.has(normalizedLabel)) return;
      map.set(normalizedLabel, label);
    });

    return Array.from(map.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((left, right) => left.label.localeCompare(right.label));
  }, [buses, scopedEntries]);

  const filteredEntries = useMemo(() => {
    const keyword = keywordFilter.trim().toLowerCase();

    return scopedEntries.filter((expense) => {
      const busLabel = getBusLabel(expense);
      const normalizedBusLabel = normalizeBusFilterValue(busLabel);

      if (busFilter !== "ALL" && normalizedBusLabel !== busFilter) {
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

  const orderedEntries = useMemo(() => {
    return filteredEntries
      .slice()
      .sort((left, right) => {
        const leftTime = new Date(left?.date || 0).getTime();
        const rightTime = new Date(right?.date || 0).getTime();
        if (rightTime !== leftTime) {
          return rightTime - leftTime;
        }

        const leftCreated = new Date(left?.createdAt || 0).getTime();
        const rightCreated = new Date(right?.createdAt || 0).getTime();
        if (rightCreated !== leftCreated) {
          return rightCreated - leftCreated;
        }

        const leftId = String(left?.id || left?._id || "");
        const rightId = String(right?.id || right?._id || "");
        return rightId.localeCompare(leftId);
      });
  }, [filteredEntries]);

  useEffect(() => {
    if (busFilter === "ALL") {
      return;
    }

    const exists = busFilterOptions.some((option) => option.value === busFilter);
    if (!exists) {
      setBusFilter("ALL");
    }
  }, [busFilter, busFilterOptions]);

  const handleExportCsv = () => {
    if (!orderedEntries.length) {
      toast.error("No records found to export");
      return;
    }

    const headers = ["Date", "Bus", "Category", "Details", "Amount"];
    const rows = orderedEntries.map((expense) => [
      toCsvDateText(expense?.date),
      getBusLabel(expense),
      expense?.category || "",
      getDetails(expense),
      Number(expense?.amount || 0).toFixed(2),
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map(escapeCsv).join(","))
      .join("\n");

    const dateSuffix = selectedDate || selectedMonth || currentMonthKey();
    const categorySuffix = activeCategory.toLowerCase();
    const keywordSuffix = keywordFilter.trim() ? `-${keywordFilter.trim().replace(/\s+/g, "-").slice(0, 20)}` : "";
    const filename = `transport-expense-${categorySuffix}-${dateSuffix}${keywordSuffix}.csv`;

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
    ? `Showing ${activeCategory === "ALL" ? "all" : activeCategory.toLowerCase()} entries for current month (${currentMonthLabel})`
    : selectedDate
      ? `Showing ${activeCategory === "ALL" ? "all" : activeCategory.toLowerCase()} entries for ${formatDateHeading(selectedDate)}`
      : `Showing ${activeCategory === "ALL" ? "all" : activeCategory.toLowerCase()} entries for ${selectedMonth}`;

  return (
    <div className="min-h-screen w-full bg-[#f6fafe] p-4 md:p-8">
      <div className="mx-auto w-full max-w-[1400px] space-y-8">
        <section className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight text-[#00152a]">Transport Expense Dashboard</h2>
            <p className="mt-2 max-w-3xl text-sm md:text-base text-slate-500">
              Monitor operational expense, transport income, and net performance with daily and monthly history controls.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 md:gap-3">
            <button
              type="button"
              onClick={() => {
                if (typeof onNavigate === "function") {
                  onNavigate("transport-expense");
                  return;
                }
                toast("Open Add Expense from Transport > Add Expense in sidebar");
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-black uppercase tracking-widest text-[#00152a] shadow-sm ring-1 ring-slate-200 hover:bg-slate-50"
            >
              <span className="material-symbols-outlined text-base">add_circle</span>
              Add Expense
            </button>

            <button
              type="button"
              onClick={handleExportXlsx}
              disabled={exporting}
              className="inline-flex items-center gap-2 rounded-xl bg-[#44ddc1] px-4 py-2.5 text-xs font-black uppercase tracking-widest text-[#00152a] shadow-lg shadow-teal-200/60 hover:brightness-95 disabled:opacity-60"
            >
              <span className="material-symbols-outlined text-base">download</span>
              {exporting ? "Exporting" : "Export CSV"}
            </button>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <article className="rounded-3xl bg-white p-6 shadow-[0_20px_40px_rgba(1,29,53,0.06)] ring-1 ring-slate-100">
            <div className="mb-4 flex items-start justify-between">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600">
                <span className="material-symbols-outlined">trending_down</span>
              </span>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{selectedMonth || currentMonthLabel}</span>
            </div>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Total Expenses</p>
            <p className="mt-2 text-3xl font-black text-[#00152a]">{formatCurrency(monthlyOverallTotal)}</p>
            <p className="mt-2 text-xs text-slate-500">Overall monthly total remains stable while switching category tabs.</p>
          </article>

          <article className="rounded-3xl bg-white p-6 shadow-[0_20px_40px_rgba(1,29,53,0.06)] ring-1 ring-teal-100">
            <div className="mb-4 flex items-start justify-between gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                <span className="material-symbols-outlined">account_balance</span>
              </span>
              <select
                value={selectedAcademicYear}
                onChange={(e) => setSelectedAcademicYear(e.target.value)}
                className="rounded-lg border border-teal-100 bg-white px-2.5 py-1.5 text-xs font-bold text-teal-700"
              >
                {(academicYears.length ? academicYears : [selectedAcademicYear]).filter(Boolean).map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Transport Income</p>
            <p className="mt-2 text-3xl font-black text-[#00152a]">{formatCurrency(academicIncomeSummary.totalIncome)}</p>
            <p className="mt-2 text-xs text-slate-500">Collected from {academicIncomeSummary.studentCount} students (success receipts only).</p>
          </article>

          <article className={`rounded-3xl p-6 shadow-[0_20px_40px_rgba(1,29,53,0.06)] ${profitSummary.isProfit ? "bg-[#00152a] text-white" : "bg-red-700 text-white"}`}>
            <div className="mb-4 flex items-start justify-between">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-[#44ddc1]">
                <span className="material-symbols-outlined">insights</span>
              </span>
              <span className="text-[10px] font-black uppercase tracking-widest text-white/70">Net {profitSummary.statusLabel}</span>
            </div>
            <p className="text-xs font-bold uppercase tracking-widest text-white/70">Transport Profit</p>
            <p className="mt-2 text-3xl font-black">{formatCurrency(profitSummary.profit)}</p>
            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/15 pt-3 text-xs">
              <div>
                <p className="font-bold uppercase tracking-widest text-white/70">Income</p>
                <p className="mt-1 text-sm font-black">{formatCurrency(profitSummary.income)}</p>
              </div>
              <div>
                <p className="font-bold uppercase tracking-widest text-white/70">Expense</p>
                <p className="mt-1 text-sm font-black">{formatCurrency(profitSummary.expense)}</p>
              </div>
            </div>
          </article>
        </section>

        <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Object.entries(moduleTotals).map(([category, total]) => (
            <div key={category} className="rounded-2xl bg-white p-4 ring-1 ring-slate-100 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{category}</p>
              <p className="mt-2 text-xl font-black text-[#00152a]">{formatCurrency(total)}</p>
            </div>
          ))}
        </section>

        <section className="overflow-hidden rounded-3xl bg-white shadow-[0_40px_80px_rgba(1,29,53,0.04)] ring-1 ring-slate-100">
          <div className="border-b border-slate-100 px-5 py-5 md:px-8 md:py-6">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-wrap gap-2">
                {CATEGORY_TABS.map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setActiveCategory(category)}
                    className={`rounded-full px-4 py-2 text-xs font-black uppercase tracking-widest transition ${
                      activeCategory === category
                        ? "bg-[#00152a] text-white shadow"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {category === "ALL" ? "All Expenses" : category}
                  </button>
                ))}
              </div>

              <div className="inline-flex w-full max-w-md rounded-full bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={handleCurrentView}
                  className={`w-1/2 rounded-full px-4 py-2 text-xs font-black uppercase tracking-widest ${
                    !showPastHistory ? "bg-white text-[#00152a] shadow-sm" : "text-slate-500"
                  }`}
                >
                  Current View
                </button>
                <button
                  type="button"
                  onClick={handlePastHistoryView}
                  className={`w-1/2 rounded-full px-4 py-2 text-xs font-black uppercase tracking-widest ${
                    showPastHistory ? "bg-white text-[#00152a] shadow-sm" : "text-slate-500"
                  }`}
                >
                  See Past History
                </button>
              </div>
            </div>
          </div>

          <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-5 md:px-8">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
              <div>
                <label className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-slate-400">Select Date</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-[#00152a]/20 focus:ring"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-slate-400">Select Month</label>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => handleMonthChange(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-[#00152a]/20 focus:ring"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-slate-400">Bus Filter</label>
                <select
                  value={busFilter}
                  onChange={(e) => setBusFilter(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-[#00152a]/20 focus:ring"
                >
                  <option value="ALL">All Buses</option>
                  {busFilterOptions.map((busOption) => (
                    <option key={busOption.value} value={busOption.value}>{busOption.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-slate-400">Category Filter</label>
                <select
                  value={activeCategory}
                  onChange={(e) => setActiveCategory(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-[#00152a]/20 focus:ring"
                >
                  {CATEGORY_TABS.map((category) => (
                    <option key={`flt-${category}`} value={category}>{category === "ALL" ? "All" : category}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-slate-400">Search</label>
                <input
                  type="text"
                  value={keywordFilter}
                  onChange={(e) => setKeywordFilter(e.target.value)}
                  placeholder="Bus / details / category"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-[#00152a]/20 focus:ring"
                />
              </div>

              <div className="flex items-end gap-2">
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="w-1/2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-50"
                >
                  Reset Date
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBusFilter("ALL");
                    setKeywordFilter("");
                  }}
                  className="w-1/2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-50"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>

          <div className="px-5 py-5 md:px-8">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-semibold text-slate-800">Expense History</p>
              <p className="text-xs text-slate-500">{historyLabel}</p>
            </div>

            {loading ? (
              <div className="py-14 text-center text-slate-500">Loading expenses...</div>
            ) : orderedEntries.length === 0 ? (
              <div className="py-14 text-center text-slate-500">No entries found for the selected filters.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[780px] text-left">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-400">
                      <th className="py-3">Date / Time</th>
                      <th className="py-3">Category</th>
                      <th className="py-3">Vehicle Unit</th>
                      <th className="py-3">Details</th>
                      <th className="py-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {orderedEntries.map((expense, index) => {
                      const category = String(expense?.category || "").toUpperCase();
                      const badgeClass = CATEGORY_BADGE_CLASS[category] || "bg-slate-100 text-slate-700";
                      return (
                        <tr
                          key={expense?.id || expense?._id || `${toDateKey(expense?.date)}-${expense?.busId || "bus"}-${index}`}
                          className="hover:bg-slate-50/80"
                        >
                          <td className="py-4">
                            <p className="text-sm font-black text-[#00152a]">{formatDateHeading(expense?.date)}</p>
                            <p className="text-xs text-slate-400">{toDateKey(expense?.date)}</p>
                          </td>
                          <td className="py-4">
                            <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ${badgeClass}`}>
                              {category || "UNKNOWN"}
                            </span>
                          </td>
                          <td className="py-4 text-sm font-semibold text-[#00152a]">{getBusLabel(expense)}</td>
                          <td className="py-4 text-sm text-slate-600">{getDetails(expense)}</td>
                          <td className="py-4 text-right text-sm font-black text-[#00152a]">{formatCurrency(expense?.amount)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
