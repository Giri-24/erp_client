/**
 * Export data to CSV and trigger download.
 * @param {Array<Object>} data - Array of row objects.
 * @param {Array<{key: string, label: string}>} columns - Column definitions.
 * @param {string} filename - File name without extension.
 */
export function exportToCSV(data, columns, filename) {
  if (!data || data.length === 0) return;

  const header = columns.map((c) => `"${c.label}"`).join(",");
  const rows = data.map((row) =>
    columns
      .map((c) => {
        let val = typeof c.key === "function" ? c.key(row) : row[c.key];
        if (val === null || val === undefined) val = "";
        val = String(val).replace(/"/g, '""');
        return `"${val}"`;
      })
      .join(",")
  );

  const csv = [header, ...rows].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
