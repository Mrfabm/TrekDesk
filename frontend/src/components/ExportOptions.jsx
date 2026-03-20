import { useState } from 'react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

/**
 * Builds a plain row object from raw data + column definitions.
 * Skips columns without an accessor (e.g. the Actions column).
 */
const buildRows = (data, columns) => {
  const exportCols = columns.filter(c => c.accessor && c.accessor !== 'actions');
  return data.map(item => {
    const row = {};
    exportCols.forEach(col => {
      row[col.header] = item[col.accessor] ?? '';
    });
    return row;
  });
};

const ExportOptions = ({ data, filename = 'export', tableHeaders: columns }) => {
  const [showOptions, setShowOptions] = useState(false);

  const exportCols = (columns || []).filter(c => c.accessor && c.accessor !== 'actions');

  const exportToExcel = () => {
    const rows = buildRows(data, columns || []);
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Bookings');
    const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `${filename}.xlsx`);
    setShowOptions(false);
  };

  const exportToPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.autoTable({
      head: [exportCols.map(c => c.header)],
      body: data.map(item => exportCols.map(c => item[c.accessor] ?? '')),
      styles: { fontSize: 7 },
      headStyles: { fillColor: [55, 65, 81] },
    });
    doc.save(`${filename}.pdf`);
    setShowOptions(false);
  };

  const exportToCSV = () => {
    const rows = buildRows(data, columns || []);
    const headers = exportCols.map(c => c.header);
    const lines = [
      headers.join(','),
      ...rows.map(row => headers.map(h => `"${String(row[h] ?? '').replace(/"/g, '""')}"`).join(',')),
    ];
    saveAs(new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' }), `${filename}.csv`);
    setShowOptions(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowOptions(v => !v)}
        className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
      >
        Export
        <svg className="w-3.5 h-3.5 ml-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {showOptions && (
        <div className="absolute right-0 mt-1 w-44 rounded-md shadow-lg bg-white ring-1 ring-black/5 z-50">
          <div className="py-1">
            <button onClick={exportToExcel} className="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-50">
              Export to Excel (.xlsx)
            </button>
            <button onClick={exportToPDF} className="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-50">
              Export to PDF
            </button>
            <button onClick={exportToCSV} className="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-50">
              Export to CSV
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExportOptions;
