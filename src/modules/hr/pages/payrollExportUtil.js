// Utility to export payroll data to CSV
export function exportPayrollToCSV(payrollData, monthLabel = "") {
  if (!payrollData || !payrollData.length) return;
  const headers = [
    "Emp ID",
    "Name",
    "Category",
    "Pay Mode",
    "Basic Salary",
    "Gross Salary",
    "LOP Days",
    "LOP Deduction",
    "PF (Emp)",
    "ESI (Emp)",
    "Fixed Adv.",
    "Sal. Adv.",
    "Other Adv.",
    "Total Deductions",
    "Net Salary",
    "Bonus",
    "CTC",
    "Status"
  ];
  const rows = payrollData.map(p => [
    p.employeeId,
    p.staffName,
    p.category,
    p.paymentMode,
    p.basicSalary,
    p.grossSalary,
    p.lopDays,
    p.lopDeduction,
    p.pfDeduction,
    p.esiDeduction,
    p.fixedAdvanceDeduction,
    p.salaryAdvanceDeduction,
    p.otherAdvanceDeduction,
    p.totalDeductions,
    p.netSalary,
    p.bonusIncentive,
    p.ctc,
    p.status
  ]);
  let csv = headers.join(",") + "\n" + rows.map(r => r.map(x => `"${x ?? ''}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Payroll_${monthLabel || Date.now()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
