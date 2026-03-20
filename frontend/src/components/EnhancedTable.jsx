import React, { useState, useEffect, useRef } from 'react';
import ExportOptions from './ExportOptions';
import DatePicker from 'react-datepicker';
import { Disclosure } from '@headlessui/react';
import {
  ChevronUpIcon,
  FunnelIcon,
  CalendarIcon,
  AdjustmentsHorizontalIcon,
  ChevronDownIcon,
  HashtagIcon,
  DocumentTextIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  UserGroupIcon,
  ClockIcon,
  ViewColumnsIcon
} from '@heroicons/react/24/outline';
import "react-datepicker/dist/react-datepicker.css";

const EnhancedTable = ({
  data,
  columns,
  onRowClick,
  rowClassName,
  defaultHiddenColumns = [],
  onSelectionChange,
}) => {
  const [selectedRows, setSelectedRows] = useState([]);
  const [filteredData, setFilteredData] = useState(data);
  const [filters, setFilters] = useState({});
  const [selectAll, setSelectAll] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [hiddenColumns, setHiddenColumns] = useState(new Set(defaultHiddenColumns));
  const [showColumnPicker, setShowColumnPicker] = useState(false);
  const columnPickerRef = useRef(null);

  // Get unique values for dropdowns
  const uniqueProducts = [...new Set(data.map(item => item.product))];
  const uniqueUsers = [...new Set(data.map(item => item.head_of_file))];
  const uniqueAgents = [...new Set(data.map(item => item.agent_client).filter(Boolean))];
  const paymentStatuses = ['pending', 'fully_paid', 'deposit_paid', 'cancelled', 'partial', 'overdue', 'authorized', 'rolling_deposit'];
  const validationStatuses = ['pending', 'ok_to_purchase_full', 'ok_to_purchase_deposit', 'do_not_purchase'];

  // Get color for status values
  const getStatusColor = (status) => {
    if (status === 'fully_paid') return 'text-green-600';
    if (status === 'deposit_paid') return 'text-yellow-600';
    if (status === 'pending') return 'text-gray-600';
    if (status === 'cancelled') return 'text-red-600';
    if (status === 'partial') return 'text-orange-600';
    if (status === 'overdue') return 'text-red-600';
    if (status === 'authorized') return 'text-blue-600';
    if (status === 'rolling_deposit') return 'text-purple-600';
    if (status === 'ok_to_purchase_full') return 'text-green-600';
    if (status === 'ok_to_purchase_deposit') return 'text-yellow-600';
    if (status === 'do_not_purchase') return 'text-red-600';
    return 'text-gray-600';
  };

  // Update filtered data when filters change
  useEffect(() => {
    let result = data;
    Object.keys(filters).forEach(key => {
      if (filters[key]) {
        if (key === 'date_of_request') {
          const { startDate, endDate } = filters[key];
          if (startDate) {
            result = result.filter(item => new Date(item[key]) >= new Date(startDate));
          }
          if (endDate) {
            result = result.filter(item => new Date(item[key]) <= new Date(endDate));
          }
        } else {
          result = result.filter(item => {
            const value = item[key]?.toString().toLowerCase();
            return value?.includes(filters[key].toLowerCase());
          });
        }
      }
    });
    setFilteredData(result);
  }, [filters, data]);

  // Clear selection when data changes (tab/filter switch)
  useEffect(() => {
    setSelectedRows([]);
    setSelectAll(false);
  }, [data]);

  // Notify parent when selection changes
  useEffect(() => {
    if (onSelectionChange) {
      onSelectionChange(filteredData.filter(row => selectedRows.includes(row.id)));
    }
  }, [selectedRows]);

  // Close column picker when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (columnPickerRef.current && !columnPickerRef.current.contains(e.target)) {
        setShowColumnPicker(false);
      }
    };
    if (showColumnPicker) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showColumnPicker]);

  const toggleColumn = (accessor) => {
    setHiddenColumns(prev => {
      const next = new Set(prev);
      next.has(accessor) ? next.delete(accessor) : next.add(accessor);
      return next;
    });
  };

  const visibleColumns = columns.filter(c => !hiddenColumns.has(c.accessor));

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

  // Clear all filters
  const clearFilters = () => {
    setFilters({});
  };

  // Render appropriate input based on column type
  const renderInput = (column) => {
    const commonClasses = "h-[26px] text-[13px] border border-gray-200 rounded bg-white focus:outline-none focus:ring-0 focus:border-blue-500 placeholder-gray-400";
    
    switch (column.accessor) {
      case 'date_of_request':
        return (
          <div className="flex items-center space-x-1">
            <div className="relative w-[120px] group">
              <DatePicker
                selected={filters[column.accessor]?.startDate ? new Date(filters[column.accessor].startDate) : null}
                onChange={(date) => handleFilterChange(column.accessor, { 
                  ...filters[column.accessor],
                  startDate: date?.toISOString()
                })}
                className={`${commonClasses} pl-6 pr-2 w-full transition-colors`}
                placeholderText="From"
                dateFormat="yyyy-MM-dd"
                isClearable
              />
              <CalendarIcon className="absolute left-2 top-1.5 w-3.5 h-3.5 text-gray-400 group-hover:text-gray-500" />
            </div>
            <span className="text-gray-400">-</span>
            <div className="relative w-[120px] group">
              <DatePicker
                selected={filters[column.accessor]?.endDate ? new Date(filters[column.accessor].endDate) : null}
                onChange={(date) => handleFilterChange(column.accessor, {
                  ...filters[column.accessor],
                  endDate: date?.toISOString()
                })}
                className={`${commonClasses} pl-6 pr-2 w-full transition-colors`}
                placeholderText="To"
                dateFormat="yyyy-MM-dd"
                isClearable
              />
              <CalendarIcon className="absolute left-2 top-1.5 w-3.5 h-3.5 text-gray-400 group-hover:text-gray-500" />
            </div>
          </div>
        );
      
      case 'product':
      case 'head_of_file':
      case 'agent_client':
      case 'payment_status':
      case 'validation_status':
        return (
          <div className="relative w-[120px] group">
            <select
              className={`${commonClasses} pl-6 pr-6 appearance-none w-full cursor-pointer transition-colors hover:bg-gray-50`}
              value={filters[column.accessor] || ''}
              onChange={(e) => handleFilterChange(column.accessor, e.target.value)}
            >
              <option value="">All</option>
              {(column.accessor === 'product' ? uniqueProducts
                : column.accessor === 'head_of_file' ? uniqueUsers
                : column.accessor === 'agent_client' ? uniqueAgents
                : column.accessor === 'payment_status' ? paymentStatuses
                : validationStatuses).map(option => (
                  <option key={option} value={option}>
                    {option.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                  </option>
                ))}
            </select>
            <AdjustmentsHorizontalIcon className="absolute left-2 top-1.5 w-3.5 h-3.5 text-gray-400 group-hover:text-gray-500" />
            <ChevronDownIcon className="absolute right-2 top-1.5 w-3.5 h-3.5 text-gray-400 group-hover:text-gray-500" />
          </div>
        );

      default:
        return (
          <div className="relative w-[120px] group">
            <input
              type="text"
              className={`${commonClasses} pl-6 pr-2 w-full transition-colors hover:bg-gray-50`}
              placeholder={column.accessor === 'id' ? '#' : '...'}
              value={filters[column.accessor] || ''}
              onChange={(e) => handleFilterChange(column.accessor, e.target.value)}
            />
            {column.accessor === 'id' ? (
              <HashtagIcon className="absolute left-2 top-1.5 w-3.5 h-3.5 text-gray-400 group-hover:text-gray-500" />
            ) : (
              <DocumentTextIcon className="absolute left-2 top-1.5 w-3.5 h-3.5 text-gray-400 group-hover:text-gray-500" />
            )}
          </div>
        );
    }
  };

  // Group columns for better organization
  const filterGroups = [
    {
      name: "Basic Information",
      columns: ['booking_name', 'booking_ref', 'id']
    },
    {
      name: "Dates & Products",
      columns: ['date_of_request', 'product']
    },
    {
      name: "People & Organizations",
      columns: ['head_of_file', 'originating_agent']
    },
    {
      name: "Status Information",
      columns: ['payment_status', 'validation_status']
    }
  ];

  const activeFiltersCount = Object.values(filters).filter(Boolean).length;

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      {/* Table Controls */}
      <div className="border-b border-gray-200">
        <div className="px-4 py-2.5 bg-white">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`inline-flex items-center px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  showFilters
                    ? 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <FunnelIcon className="w-4 h-4 mr-1.5" />
                Filters
                {activeFiltersCount > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-600 rounded-full">
                    {activeFiltersCount}
                  </span>
                )}
              </button>

              {/* Column visibility picker */}
              <div className="relative" ref={columnPickerRef}>
                <button
                  onClick={() => setShowColumnPicker(v => !v)}
                  className={`inline-flex items-center px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    showColumnPicker
                      ? 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <ViewColumnsIcon className="w-4 h-4 mr-1.5" />
                  Columns
                  {hiddenColumns.size > 0 && (
                    <span className="ml-1.5 px-1.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-600 rounded-full">
                      {hiddenColumns.size} hidden
                    </span>
                  )}
                </button>
                {showColumnPicker && (
                  <div className="absolute left-0 top-full mt-1 z-30 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[180px]">
                    <div className="px-3 py-1.5 border-b border-gray-100 flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-600">Toggle columns</span>
                      {hiddenColumns.size > 0 && (
                        <button
                          onClick={() => setHiddenColumns(new Set())}
                          className="text-xs text-blue-600 hover:text-blue-800"
                        >
                          Show all
                        </button>
                      )}
                    </div>
                    {columns.map(col => (
                      <label
                        key={col.accessor}
                        className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={!hiddenColumns.has(col.accessor)}
                          onChange={() => toggleColumn(col.accessor)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-3 w-3"
                        />
                        <span className="text-xs text-gray-700">{col.header}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {activeFiltersCount > 0 && (
                <button
                  onClick={clearFilters}
                  className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Clear all
                </button>
              )}
            </div>
            
            {/* Export Options */}
            <div className="flex items-center space-x-2">
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

          {/* Filter Groups */}
          {showFilters && (
            <div className="pt-2 pb-3">
              <div className="grid grid-cols-[250px_250px_1fr] gap-x-4 bg-gray-50/70 px-4 py-3 rounded-lg">
                {/* Column 1: Basic Information */}
                <div>
                  <h3 className="text-[13px] font-medium text-gray-900 mb-2.5 flex items-center">
                    <DocumentTextIcon className="w-4 h-4 mr-1.5 text-gray-500" />
                    Basic Information
                  </h3>
                  <div className="space-y-2.5">
                    <div>
                      <label className="block text-[13px] text-gray-600 mb-1 font-medium">
                        ID
                      </label>
                      {renderInput({ accessor: 'id', header: 'ID' })}
                    </div>
                    <div>
                      <label className="block text-[13px] text-gray-600 mb-1 font-medium">
                        Booking Name
                      </label>
                      {renderInput({ accessor: 'booking_name', header: 'Booking Name' })}
                    </div>
                    <div>
                      <label className="block text-[13px] text-gray-600 mb-1 font-medium">
                        Booking Ref
                      </label>
                      {renderInput({ accessor: 'booking_ref', header: 'Booking Ref' })}
                    </div>
                  </div>
                </div>

                {/* Column 2: People & Products */}
                <div>
                  <h3 className="text-[13px] font-medium text-gray-900 mb-2.5 flex items-center">
                    <UserGroupIcon className="w-4 h-4 mr-1.5 text-gray-500" />
                    People & Products
                  </h3>
                  <div className="space-y-2.5">
                    <div>
                      <label className="block text-[13px] text-gray-600 mb-1 font-medium">
                        Head of File
                      </label>
                      {renderInput({ accessor: 'head_of_file', header: 'Head of File' })}
                    </div>
                    <div>
                      <label className="block text-[13px] text-gray-600 mb-1 font-medium">
                        Client
                      </label>
                      {renderInput({ accessor: 'agent_client', header: 'Client' })}
                    </div>
                    <div>
                      <label className="block text-[13px] text-gray-600 mb-1 font-medium">
                        Product
                      </label>
                      {renderInput({ accessor: 'product', header: 'Product' })}
                    </div>
                  </div>
                </div>

                {/* Column 3: Status & Dates */}
                <div>
                  <h3 className="text-[13px] font-medium text-gray-900 mb-2.5 flex items-center">
                    <ClockIcon className="w-4 h-4 mr-1.5 text-gray-500" />
                    Status & Dates
                  </h3>
                  <div className="space-y-2.5">
                    <div>
                      <label className="block text-[13px] text-gray-600 mb-1 font-medium">
                        Date of Request
                      </label>
                      {renderInput({ accessor: 'date_of_request', header: 'Date of Request' })}
                    </div>
                    <div>
                      <label className="block text-[13px] text-gray-600 mb-1 font-medium">
                        Payment Status
                      </label>
                      {renderInput({ accessor: 'payment_status', header: 'Payment Status' })}
                    </div>
                    <div>
                      <label className="block text-[13px] text-gray-600 mb-1 font-medium">
                        Validation Status
                      </label>
                      {renderInput({ accessor: 'validation_status', header: 'Validation Status' })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
              <th className="px-3 py-3 text-left align-middle w-8">
                <input
                  type="checkbox"
                  checked={selectAll}
                  onChange={handleSelectAll}
                  className="rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500/20"
                />
              </th>
              {visibleColumns.map(column => (
                <th
                  key={column.accessor}
                  className={column.headerClassName || "px-3 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wider align-middle"}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {filteredData.map((row, rowIndex) => {
              const isSelected = selectedRows.includes(row.id);
              const customRowClass = typeof rowClassName === 'function' ? rowClassName(row) : rowClassName;
              
              return (
                <tr 
                  key={row.id}
                  onClick={(e) => {
                    // Don't trigger row click when clicking checkbox
                    if (e.target.type !== 'checkbox' && onRowClick) {
                      onRowClick(row);
                    }
                  }}
                  className={`
                    border-b border-gray-200 dark:border-gray-700 last:border-0
                    ${isSelected ? 'bg-blue-50/80 dark:bg-blue-900/20' : 'bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/50'}
                    ${onRowClick ? 'cursor-pointer' : ''}
                    ${customRowClass || ''}
                    transition-colors duration-150
                  `}
                >
                  <td className="px-3 py-2.5 align-middle w-8">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleSelectRow(row.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500/20"
                    />
                  </td>
                  {visibleColumns.map(column => (
                    <td
                      key={column.accessor}
                      className={column.cellClassName || "px-3 py-2.5 text-xs text-gray-700 dark:text-gray-200 align-middle whitespace-nowrap"}
                    >
                      {column.render ? column.render(row) : row[column.accessor]}
                    </td>
                  ))}
                </tr>
              );
            })}
            {filteredData.length === 0 && (
              <tr>
                <td 
                  colSpan={visibleColumns.length + 1}
                  className="px-3 py-6 text-xs text-center text-gray-400 dark:text-gray-500"
                >
                  No results found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Table Footer */}
      <div className="border-t border-gray-200 dark:border-gray-800 px-4 py-2 bg-white dark:bg-gray-900">
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <div>
            {selectedRows.length > 0 ? (
              <span>
                Selected {selectedRows.length} of {filteredData.length} {filteredData.length === 1 ? 'row' : 'rows'}
              </span>
            ) : (
              <span>
                {filteredData.length} {filteredData.length === 1 ? 'row' : 'rows'}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {/* Add pagination controls here if needed */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedTable; 