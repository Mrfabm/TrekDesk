import { useState } from 'react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const ExportOptions = ({ data, filename = 'export', tableHeaders }) => {
  const [showOptions, setShowOptions] = useState(false);

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const dataBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(dataBlob, `${filename}.xlsx`);
    setShowOptions(false);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.autoTable({
      head: [tableHeaders],
      body: data.map(item => tableHeaders.map(header => item[header.key])),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [66, 66, 66] }
    });
    doc.save(`${filename}.pdf`);
    setShowOptions(false);
  };

  const exportToWord = () => {
    // Create a table in HTML format
    let html = '<table><tr>';
    tableHeaders.forEach(header => {
      html += `<th>${header.label}</th>`;
    });
    html += '</tr>';

    data.forEach(item => {
      html += '<tr>';
      tableHeaders.forEach(header => {
        html += `<td>${item[header.key]}</td>`;
      });
      html += '</tr>';
    });
    html += '</table>';

    // Create a Blob and download
    const blob = new Blob(['\ufeff', html], {
      type: 'application/msword'
    });
    saveAs(blob, `${filename}.doc`);
    setShowOptions(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowOptions(!showOptions)}
        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        Export
        <svg className="w-4 h-4 ml-2 -mr-1 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {showOptions && (
        <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
          <div className="py-1" role="menu">
            <button
              onClick={exportToExcel}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              role="menuitem"
            >
              Export to Excel
            </button>
            <button
              onClick={exportToPDF}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              role="menuitem"
            >
              Export to PDF
            </button>
            <button
              onClick={exportToWord}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              role="menuitem"
            >
              Export to Word
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExportOptions; 