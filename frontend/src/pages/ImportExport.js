import React, { useState } from 'react';
import { ArrowUpTrayIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { useTheme } from '../utils/ThemeAndAccessibility';

export default function ImportExport() {
  const { darkMode } = useTheme();
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [importType, setImportType] = useState('conversations');
  const [exportType, setExportType] = useState('conversations');
  const [exportFormat, setExportFormat] = useState('json');

  const bgColor = darkMode ? '#1c1917' : '#ffffff';
  const textColor = darkMode ? '#e7e5e4' : '#111827';
  const borderColor = darkMode ? '#292524' : '#e5e7eb';
  const secondaryText = darkMode ? '#a8a29e' : '#6b7280';

  const dataTypes = [
    { value: 'conversations', label: 'Conversations' },
    { value: 'decisions', label: 'Decisions' },
    { value: 'knowledge', label: 'Knowledge Articles' },
    { value: 'goals', label: 'Goals' },
    { value: 'meetings', label: 'Meetings' },
    { value: 'tasks', label: 'Tasks' }
  ];

  const handleImport = async () => {
    if (!selectedFile) {
      alert('Please select a file');
      return;
    }

    setImporting(true);
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('type', importType);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8000/api/organizations/import/', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      const data = await response.json();
      if (response.ok) {
        alert(`Successfully imported ${data.count} records`);
        setSelectedFile(null);
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      alert('Import failed: ' + error.message);
    } finally {
      setImporting(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `http://localhost:8000/api/organizations/data-export/?type=${exportType}&format=${exportFormat}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${exportType}_export.${exportFormat}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert('Export failed');
      }
    } catch (error) {
      alert('Export failed: ' + error.message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 600, color: textColor, marginBottom: '24px' }}>Import/Export Data</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '16px', marginBottom: '16px' }}>
        {/* Import Section */}
        <div style={{ backgroundColor: bgColor, border: `1px solid ${borderColor}`, borderRadius: '5px', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <ArrowUpTrayIcon style={{ width: '20px', height: '20px', color: textColor }} />
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 600, color: textColor }}>Import Data</h2>
              <p style={{ fontSize: '12px', color: secondaryText }}>Upload CSV or JSON files</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: textColor, marginBottom: '6px' }}>Data Type</label>
              <select
                value={importType}
                onChange={(e) => setImportType(e.target.value)}
                style={{ width: '100%', border: `1px solid ${borderColor}`, borderRadius: '5px', padding: '8px 10px', backgroundColor: bgColor, color: textColor, fontSize: '13px' }}
              >
                {dataTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: textColor, marginBottom: '6px' }}>Select File</label>
              <input
                type="file"
                accept=".csv,.json"
                onChange={(e) => setSelectedFile(e.target.files[0])}
                style={{ width: '100%', border: `1px solid ${borderColor}`, borderRadius: '5px', padding: '8px 10px', backgroundColor: bgColor, color: textColor, fontSize: '13px' }}
              />
              {selectedFile && (
                <p style={{ fontSize: '12px', color: secondaryText, marginTop: '6px' }}>
                  Selected: {selectedFile.name}
                </p>
              )}
            </div>

            <button
              onClick={handleImport}
              disabled={importing || !selectedFile}
              style={{ width: '100%', padding: '10px', backgroundColor: '#3b82f6', color: '#ffffff', border: 'none', borderRadius: '5px', fontSize: '13px', fontWeight: 500, cursor: importing || !selectedFile ? 'not-allowed' : 'pointer', opacity: importing || !selectedFile ? 0.5 : 1 }}
            >
              {importing ? 'Importing...' : 'Import Data'}
            </button>
          </div>
        </div>

        {/* Export Section */}
        <div style={{ backgroundColor: bgColor, border: `1px solid ${borderColor}`, borderRadius: '5px', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <ArrowDownTrayIcon style={{ width: '20px', height: '20px', color: textColor }} />
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 600, color: textColor }}>Export Data</h2>
              <p style={{ fontSize: '12px', color: secondaryText }}>Download your data</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: textColor, marginBottom: '6px' }}>Data Type</label>
              <select
                value={exportType}
                onChange={(e) => setExportType(e.target.value)}
                style={{ width: '100%', border: `1px solid ${borderColor}`, borderRadius: '5px', padding: '8px 10px', backgroundColor: bgColor, color: textColor, fontSize: '13px' }}
              >
                {dataTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: textColor, marginBottom: '6px' }}>Format</label>
              <select
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value)}
                style={{ width: '100%', border: `1px solid ${borderColor}`, borderRadius: '5px', padding: '8px 10px', backgroundColor: bgColor, color: textColor, fontSize: '13px' }}
              >
                <option value="json">JSON</option>
                <option value="csv">CSV</option>
              </select>
            </div>

            <button
              onClick={handleExport}
              disabled={exporting}
              style={{ width: '100%', padding: '10px', backgroundColor: '#3b82f6', color: '#ffffff', border: 'none', borderRadius: '5px', fontSize: '13px', fontWeight: 500, cursor: exporting ? 'not-allowed' : 'pointer', opacity: exporting ? 0.5 : 1 }}
            >
              {exporting ? 'Exporting...' : 'Export Data'}
            </button>
          </div>
        </div>
      </div>

      {/* Migration Guide */}
      <div style={{ backgroundColor: bgColor, border: `1px solid ${borderColor}`, borderRadius: '5px', padding: '20px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 600, color: textColor, marginBottom: '16px' }}>Migration Support</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <h3 style={{ fontSize: '13px', fontWeight: 500, color: textColor }}>Step 1: Export from old system</h3>
            <p style={{ fontSize: '12px', color: secondaryText }}>Export your data in CSV or JSON format from your current system</p>
          </div>
          <div>
            <h3 style={{ fontSize: '13px', fontWeight: 500, color: textColor }}>Step 2: Format data</h3>
            <p style={{ fontSize: '12px', color: secondaryText }}>Ensure field names match: title, content, description, status, etc.</p>
          </div>
          <div>
            <h3 style={{ fontSize: '13px', fontWeight: 500, color: textColor }}>Step 3: Import to Recall</h3>
            <p style={{ fontSize: '12px', color: secondaryText }}>Select data type and upload your file using the import tool above</p>
          </div>
          <div>
            <h3 style={{ fontSize: '13px', fontWeight: 500, color: textColor }}>Step 4: Verify</h3>
            <p style={{ fontSize: '12px', color: secondaryText }}>Check imported data in the respective sections</p>
          </div>
        </div>
      </div>
    </div>
  );
}
