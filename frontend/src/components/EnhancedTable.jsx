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
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
      {/* Table Controls */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
        <div className="flex space-x-4">
          {/* Filter Controls */}
          {columns.map(column => (
            <div key={column.key} className="flex flex-col">
              <label className="text-sm text-gray-600 dark:text-gray-400">
                {column.label}
              </label>
              <input
                type="text"
                className="mt-1 px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm"
                placeholder={`Filter ${column.label}`}
                onChange={(e) => handleFilterChange(column.key, e.target.value)}
              />
            </div>
          ))}
        </div>
        
        {/* Export Options */}
        <ExportOptions 
          data={selectedRows.length > 0 
            ? filteredData.filter(row => selectedRows.includes(row.id))
            : filteredData
          }
          filename="table-export"
          tableHeaders={columns}
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-4 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selectAll}
                  onChange={handleSelectAll}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </th>
              {columns.map(column => (
                <th 
                  key={column.key}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredData.map((row, index) => (
              <tr 
                key={row.id || index}
                className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
              >
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedRows.includes(row.id)}
                    onChange={() => handleSelectRow(row.id)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </td>
                {columns.map(column => (
                  <td 
                    key={column.key}
                    className="px-4 py-3 text-sm text-gray-900 dark:text-white"
                  >
                    {column.render ? column.render(row[column.key], row) : row[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Selection Summary */}
      {selectedRows.length > 0 && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
          <span className="text-sm text-gray-600 dark:text-gray-300">
            {selectedRows.length} row{selectedRows.length !== 1 ? 's' : ''} selected
          </span>
        </div>
      )}
    </div>
  );
};

export default EnhancedTable; 