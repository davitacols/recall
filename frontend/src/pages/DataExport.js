import React, { useState } from 'react';
import { useTheme } from '../utils/ThemeAndAccessibility';
import api from '../services/api';
import { ArrowDownTrayIcon, DocumentTextIcon, TableCellsIcon } from '@heroicons/react/24/outline';

function DataExport() {
  const { darkMode } = useTheme();
  const [exporting, setExporting] = useState(false);
  const [selectedType, setSelectedType] = useState('all');
  const [selectedFormat, setSelectedFormat] = useState('json');

  const bgColor = darkMode ? 'bg-stone-950' : 'bg-white';
  const cardBg = darkMode ? 'bg-stone-900' : 'bg-white';
  const borderColor = darkMode ? 'border-stone-800' : 'border-gray-200';
  const textColor = darkMode ? 'text-stone-100' : 'text-gray-900';
  const textSecondary = darkMode ? 'text-stone-400' : 'text-gray-600';

  const exportTypes = [
    { value: 'all', label: 'All Data', description: 'Export everything' },
    { value: 'conversations', label: 'Conversations', description: 'All conversations and messages' },
    { value: 'decisions', label: 'Decisions', description: 'All decisions and outcomes' },
    { value: 'projects', label: 'Projects', description: 'Projects, sprints, and issues' }
  ];

  const handleExport = async () => {
    setExporting(true);
    try {
      const response = await api.post('/api/organizations/export/', {
        type: selectedType,
        format: selectedFormat
      }, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `recall_export_${selectedType}.${selectedFormat}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      alert('Export failed: ' + (error.response?.data?.error || error.message));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className={`min-h-screen ${bgColor}`}>
      <div className="max-w-4xl mx-auto px-4 md:px-8 py-12">
        <div className="mb-8">
          <h1 className={`text-4xl font-bold ${textColor} mb-2`}>Data Export</h1>
          <p className={textSecondary}>Export your organizational data</p>
        </div>

        <div className={`${cardBg} border ${borderColor} rounded-lg p-6 mb-6`}>
          <h2 className={`text-xl font-bold ${textColor} mb-4`}>Select Data Type</h2>
          <div className="space-y-3">
            {exportTypes.map(type => (
              <label
                key={type.value}
                className={`flex items-start gap-3 p-4 border ${borderColor} rounded-lg cursor-pointer transition-all ${
                  selectedType === type.value
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'hover:bg-gray-50 dark:hover:bg-stone-800'
                }`}
              >
                <input
                  type="radio"
                  name="exportType"
                  value={type.value}
                  checked={selectedType === type.value}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="mt-1"
                />
                <div>
                  <div className={`font-semibold ${textColor}`}>{type.label}</div>
                  <div className={`text-sm ${textSecondary}`}>{type.description}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className={`${cardBg} border ${borderColor} rounded-lg p-6 mb-6`}>
          <h2 className={`text-xl font-bold ${textColor} mb-4`}>Select Format</h2>
          <div className="grid grid-cols-2 gap-4">
            <label
              className={`flex items-center gap-3 p-4 border ${borderColor} rounded-lg cursor-pointer transition-all ${
                selectedFormat === 'json'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'hover:bg-gray-50 dark:hover:bg-stone-800'
              }`}
            >
              <input
                type="radio"
                name="format"
                value="json"
                checked={selectedFormat === 'json'}
                onChange={(e) => setSelectedFormat(e.target.value)}
              />
              <DocumentTextIcon className="w-6 h-6" />
              <div>
                <div className={`font-semibold ${textColor}`}>JSON</div>
                <div className={`text-xs ${textSecondary}`}>Structured data</div>
              </div>
            </label>
            <label
              className={`flex items-center gap-3 p-4 border ${borderColor} rounded-lg cursor-pointer transition-all ${
                selectedFormat === 'csv'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'hover:bg-gray-50 dark:hover:bg-stone-800'
              }`}
            >
              <input
                type="radio"
                name="format"
                value="csv"
                checked={selectedFormat === 'csv'}
                onChange={(e) => setSelectedFormat(e.target.value)}
              />
              <TableCellsIcon className="w-6 h-6" />
              <div>
                <div className={`font-semibold ${textColor}`}>CSV</div>
                <div className={`text-xs ${textSecondary}`}>Spreadsheet format</div>
              </div>
            </label>
          </div>
        </div>

        <div className={`${cardBg} border ${borderColor} rounded-lg p-6`}>
          <div className={`flex items-start gap-3 mb-4 p-3 ${darkMode ? 'bg-yellow-900/20' : 'bg-yellow-50'} border ${darkMode ? 'border-yellow-800' : 'border-yellow-200'} rounded-lg`}>
            <div className="text-yellow-600">⚠️</div>
            <div className={`text-sm ${darkMode ? 'text-yellow-200' : 'text-yellow-800'}`}>
              <strong>Note:</strong> Exports may take a few moments for large datasets. The file will download automatically when ready.
            </div>
          </div>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exporting ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Exporting...
              </>
            ) : (
              <>
                <ArrowDownTrayIcon className="w-5 h-5" />
                Export Data
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default DataExport;
