import React, { useState } from 'react';
import { ArrowUpTrayIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { useTheme } from '../utils/ThemeAndAccessibility';


const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export default function ImportExport() {
  const { darkMode } = useTheme();
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [importType, setImportType] = useState('conversations');
  const [platformType, setPlatformType] = useState('jira');
  const [platformProjectName, setPlatformProjectName] = useState('');
  const [platformFile, setPlatformFile] = useState(null);
  const [includeContext, setIncludeContext] = useState(true);
  const [importingPlatform, setImportingPlatform] = useState(false);
  const [previewingPlatform, setPreviewingPlatform] = useState(false);
  const [platformPreview, setPlatformPreview] = useState(null);
  const [strictPreviewMatch, setStrictPreviewMatch] = useState(true);
  const [exportType, setExportType] = useState('conversations');
  const [exportFormat, setExportFormat] = useState('json');

  const bgColor = darkMode ? 'var(--app-surface)' : 'var(--app-surface-alt)';
  const textColor = darkMode ? 'var(--app-text)' : 'var(--app-text)';
  const borderColor = darkMode ? '#292524' : 'var(--app-border)';
  const secondaryText = darkMode ? 'var(--app-muted)' : 'var(--app-muted)';

  const dataTypes = [
    { value: 'conversations', label: 'Conversations' },
    { value: 'decisions', label: 'Decisions' },
    { value: 'knowledge', label: 'Knowledge Articles' },
    { value: 'goals', label: 'Goals' },
    { value: 'meetings', label: 'Meetings' },
    { value: 'tasks', label: 'Tasks' }
  ];

  const platformOptions = [
    { value: 'jira', label: 'Jira' },
    { value: 'notion', label: 'Notion' },
    { value: 'github', label: 'GitHub Projects / Kanban' },
    { value: 'jetbrains_space', label: 'JetBrains Space' }
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
      const response = await fetch(`${API_BASE}/api/organizations/import/`, {
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
        `${API_BASE}/api/organizations/data-export/?type=${exportType}&format=${exportFormat}`,
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

  const handlePlatformImport = async () => {
    if (!platformFile) {
      alert('Please select an export file');
      return;
    }

    setImportingPlatform(true);
    const formData = new FormData();
    formData.append('file', platformFile);
    formData.append('platform', platformType);
    formData.append('project_name', platformProjectName);
    formData.append('include_context', includeContext ? 'true' : 'false');
    if (strictPreviewMatch) {
      if (!platformPreview?.preview_hash) {
        alert('Run preview first before importing with strict preview matching enabled.');
        setImportingPlatform(false);
        return;
      }
      formData.append('strict_preview', 'true');
      formData.append('preview_hash', platformPreview.preview_hash);
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/organizations/import/platform/`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      const data = await response.json();
      if (response.ok) {
        const issues = data?.result?.issues_imported || 0;
        const context = data?.result?.context_imported || 0;
        alert(`Imported workflow successfully. Issues: ${issues}, Context items: ${context}`);
        setPlatformFile(null);
        setPlatformProjectName('');
        setPlatformPreview(null);
      } else {
        alert(`Error: ${data.error || 'Import failed'}`);
      }
    } catch (error) {
      alert('Platform import failed: ' + error.message);
    } finally {
      setImportingPlatform(false);
    }
  };

  const handlePlatformPreview = async () => {
    if (!platformFile) {
      alert('Please select an export file');
      return;
    }

    setPreviewingPlatform(true);
    const formData = new FormData();
    formData.append('file', platformFile);
    formData.append('platform', platformType);
    formData.append('project_name', platformProjectName);
    formData.append('include_context', includeContext ? 'true' : 'false');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/organizations/import/platform/preview/`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const data = await response.json();
      if (response.ok) {
        setPlatformPreview(data.preview || null);
      } else {
        alert(`Error: ${data.error || 'Preview failed'}`);
      }
    } catch (error) {
      alert('Preview failed: ' + error.message);
    } finally {
      setPreviewingPlatform(false);
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
              style={{ width: '100%', padding: '10px', backgroundColor: 'var(--app-info)', color: 'var(--app-surface-alt)', border: 'none', borderRadius: '5px', fontSize: '13px', fontWeight: 500, cursor: importing || !selectedFile ? 'not-allowed' : 'pointer', opacity: importing || !selectedFile ? 0.5 : 1 }}
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
              style={{ width: '100%', padding: '10px', backgroundColor: 'var(--app-info)', color: 'var(--app-surface-alt)', border: 'none', borderRadius: '5px', fontSize: '13px', fontWeight: 500, cursor: exporting ? 'not-allowed' : 'pointer', opacity: exporting ? 0.5 : 1 }}
            >
              {exporting ? 'Exporting...' : 'Export Data'}
            </button>
          </div>
        </div>
      </div>

      <div style={{ backgroundColor: bgColor, border: `1px solid ${borderColor}`, borderRadius: '5px', padding: '20px', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 600, color: textColor, marginBottom: '8px' }}>Platform Migration</h2>
        <p style={{ fontSize: '12px', color: secondaryText, marginBottom: '16px' }}>
          Import workflow + project context from Notion, Jira, GitHub Kanban/Projects, or JetBrains Space exports (CSV/JSON).
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: textColor, marginBottom: '6px' }}>Source Platform</label>
            <select
              value={platformType}
              onChange={(e) => {
                setPlatformType(e.target.value);
                setPlatformPreview(null);
              }}
              style={{ width: '100%', border: `1px solid ${borderColor}`, borderRadius: '5px', padding: '8px 10px', backgroundColor: bgColor, color: textColor, fontSize: '13px' }}
            >
              {platformOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: textColor, marginBottom: '6px' }}>Project Name Override (optional)</label>
            <input
              value={platformProjectName}
              onChange={(e) => {
                setPlatformProjectName(e.target.value);
                setPlatformPreview(null);
              }}
              placeholder="e.g. Mobile App Revamp"
              style={{ width: '100%', border: `1px solid ${borderColor}`, borderRadius: '5px', padding: '8px 10px', backgroundColor: bgColor, color: textColor, fontSize: '13px' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: textColor, marginBottom: '6px' }}>Export File</label>
            <input
              type="file"
              accept=".csv,.json"
              onChange={(e) => {
                setPlatformFile(e.target.files[0]);
                setPlatformPreview(null);
              }}
              style={{ width: '100%', border: `1px solid ${borderColor}`, borderRadius: '5px', padding: '8px 10px', backgroundColor: bgColor, color: textColor, fontSize: '13px' }}
            />
          </div>
        </div>

        <div style={{ marginTop: '12px', marginBottom: '14px' }}>
          <label style={{ fontSize: '13px', color: textColor, display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="checkbox"
              checked={includeContext}
              onChange={(e) => {
                setIncludeContext(e.target.checked);
                setPlatformPreview(null);
              }}
            />
            Import context notes/comments as updates
          </label>
        </div>

        <div style={{ marginTop: '-4px', marginBottom: '14px' }}>
          <label style={{ fontSize: '13px', color: textColor, display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="checkbox"
              checked={strictPreviewMatch}
              onChange={(e) => setStrictPreviewMatch(e.target.checked)}
            />
            Require preview hash match before import (recommended)
          </label>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={handlePlatformPreview}
            disabled={previewingPlatform || !platformFile}
            style={{ padding: '10px 14px', backgroundColor: 'transparent', color: textColor, border: `1px solid ${borderColor}`, borderRadius: '5px', fontSize: '13px', fontWeight: 500, cursor: previewingPlatform || !platformFile ? 'not-allowed' : 'pointer', opacity: previewingPlatform || !platformFile ? 0.5 : 1 }}
          >
            {previewingPlatform ? 'Previewing...' : 'Preview Mapping'}
          </button>
          <button
            onClick={handlePlatformImport}
            disabled={importingPlatform || !platformFile || (strictPreviewMatch && !platformPreview?.preview_hash)}
            style={{ padding: '10px 14px', backgroundColor: 'var(--app-info)', color: 'var(--app-surface-alt)', border: 'none', borderRadius: '5px', fontSize: '13px', fontWeight: 500, cursor: importingPlatform || !platformFile || (strictPreviewMatch && !platformPreview?.preview_hash) ? 'not-allowed' : 'pointer', opacity: importingPlatform || !platformFile || (strictPreviewMatch && !platformPreview?.preview_hash) ? 0.5 : 1 }}
          >
            {importingPlatform ? 'Importing Workflow...' : 'Import Platform Workflow'}
          </button>
        </div>

        {platformPreview && (
          <div style={{ marginTop: '14px', borderTop: `1px solid ${borderColor}`, paddingTop: '14px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: textColor, marginBottom: '10px' }}>Preview Result</h3>
            <p style={{ fontSize: '12px', color: secondaryText, margin: 0 }}>
              Project: {platformPreview.project_name} | Issues: {platformPreview.issues_detected} | Context items: {platformPreview.context_items_detected}
            </p>
            <p style={{ fontSize: '12px', color: secondaryText, marginTop: '6px' }}>
              Preview hash: {(platformPreview.preview_hash || '').slice(0, 16)}...
            </p>
            <p style={{ fontSize: '12px', color: secondaryText, marginTop: '6px' }}>
              Workflow stages: {(platformPreview.workflow_stages || []).join(', ')}
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '10px', marginTop: '10px' }}>
              <div style={{ border: `1px solid ${borderColor}`, borderRadius: '5px', padding: '10px' }}>
                <p style={{ fontSize: '12px', color: textColor, margin: '0 0 6px 0', fontWeight: 600 }}>Status Distribution</p>
                <pre style={{ margin: 0, fontSize: '11px', color: secondaryText, whiteSpace: 'pre-wrap' }}>{JSON.stringify(platformPreview.status_distribution || {}, null, 2)}</pre>
              </div>
              <div style={{ border: `1px solid ${borderColor}`, borderRadius: '5px', padding: '10px' }}>
                <p style={{ fontSize: '12px', color: textColor, margin: '0 0 6px 0', fontWeight: 600 }}>Priority Distribution</p>
                <pre style={{ margin: 0, fontSize: '11px', color: secondaryText, whiteSpace: 'pre-wrap' }}>{JSON.stringify(platformPreview.priority_distribution || {}, null, 2)}</pre>
              </div>
              <div style={{ border: `1px solid ${borderColor}`, borderRadius: '5px', padding: '10px' }}>
                <p style={{ fontSize: '12px', color: textColor, margin: '0 0 6px 0', fontWeight: 600 }}>Issue Type Distribution</p>
                <pre style={{ margin: 0, fontSize: '11px', color: secondaryText, whiteSpace: 'pre-wrap' }}>{JSON.stringify(platformPreview.issue_type_distribution || {}, null, 2)}</pre>
              </div>
            </div>

            <div style={{ marginTop: '10px' }}>
              <p style={{ fontSize: '12px', color: textColor, margin: '0 0 6px 0', fontWeight: 600 }}>Sample Mapped Issues</p>
              <pre style={{ margin: 0, fontSize: '11px', color: secondaryText, whiteSpace: 'pre-wrap' }}>{JSON.stringify(platformPreview.sample_issues || [], null, 2)}</pre>
            </div>
          </div>
        )}
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
            <p style={{ fontSize: '12px', color: secondaryText }}>You can either use generic CSV/JSON import, or use Platform Migration to auto-map workflow stages and statuses.</p>
          </div>
          <div>
            <h3 style={{ fontSize: '13px', fontWeight: 500, color: textColor }}>Step 3: Import to Recall</h3>
            <p style={{ fontSize: '12px', color: secondaryText }}>Choose your source platform and upload exported CSV/JSON. Knoledgr will create a project board, issues, and context updates.</p>
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



