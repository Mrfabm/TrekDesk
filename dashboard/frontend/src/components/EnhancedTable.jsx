import React, { useState, useEffect } from 'react';
import ExportOptions from './ExportOptions';

const EnhancedTable = ({ data, columns }) => {
  const [selectedRows, setSelectedRows] = useState([]);
  const [filteredData, setFilteredData] = useState(data);
  const [filters, setFilters] = useState({});
  const [selectAll, setSelectAll] = useState(false);

  // Update filtered data when filters change
  useEffect(() => {
    let result = data;
    Object.keys(filters).forEach(key => {
      if (filters[key]) {
        result = result.filter(item => {
          const value = item[key]?.toString().toLowerCase();
          return value?.includes(filters[key].toLowerCase());
        });
      }
    });
    setFilteredData(result);
  }, [filters, data]);

  // Handle select all checkbox
  const handleSelectAll = () => {
    setSelectAll(!selectAll);
    setSelectedRows(selectAll ? [] : filteredData.map(row => row.id));
  };

  // Handle individual row selection
  const handleSelectRow = (id) => {
    setSelectedRows(prev => 
      prev.includes(id) 
        ? prev.filter(rowId => rowId !== id)
        : [...prev, id]
    );
  };

  // Handle filter change
  const handleFilterChange = (column, value) => {
    setFilters(prev => ({
      ...prev,
      [column]: value
    }));
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      {/* Table Controls */}
      <div className="p-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-start gap-4">
          <div className="grid grid-cols-4 gap-3 flex-1">
            {/* Filter Controls */}
            {columns.map(column => (
              <div key={column.accessor} className="flex flex-col">
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  {column.header}
                </label>
                <input
                  type="text"
                  className="px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white w-full"
                  placeholder={`Filter ${column.header}`}
                  onChange={(e) => handleFilterChange(column.accessor, e.target.value)}
                />
              </div>
            ))}
          </div>
          
          {/* Export Options */}
          <div className="flex-shrink-0">
            <ExportOptions 
              data={selectedRows.length > 0 
                ? filteredData.filter(row => selectedRows.includes(row.id))
                : filteredData
              }
              filename="table-export"
              tableHeaders={columns}
            />
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto">
        <table className="w-full table-fixed">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-700/50">
              <th className="w-16 p-3 border-b border-gray-200 dark:border-gray-700">
                <input
                  type="checkbox"
                  checked={selectAll}
                  onChange={handleSelectAll}
                  className="rounded border-gray-300 text-blue-600 focus:ring-1 focus:ring-blue-500"
                />
              </th>
              {columns.map(column => (
                <th 
                  key={column.accessor}
                  style={{ width: column.width }}
                  className="p-3 border-b border-gray-200 dark:border-gray-700 text-left"
                >
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {column.header}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredData.map((row, index) => (
              <tr 
                key={row.id || index}
                className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/25"
              >
                <td className="w-16 p-3">
                  <input
                    type="checkbox"
                    checked={selectedRows.includes(row.id)}
                    onChange={() => handleSelectRow(row.id)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-1 focus:ring-blue-500"
                  />
                </td>
                {columns.map(column => (
                  <td 
                    key={column.accessor}
                    style={{ width: column.width }}
                    className="p-3 text-sm text-gray-900 dark:text-gray-200"
                  >
                    <div className="truncate">
                      {column.cell ? column.cell(row[column.accessor], row) : row[column.accessor]}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Selection Summary */}
      {selectedRows.length > 0 && (
        <div className="px-3 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {selectedRows.length} row{selectedRows.length !== 1 ? 's' : ''} selected
          </span>
        </div>
      )}
    </div>
  );
};

export default EnhancedTable; 