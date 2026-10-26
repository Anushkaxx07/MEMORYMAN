import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Activity,
  Cpu,
  HardDrive,
  Database,
  TrendingUp,
  RefreshCw,
  Download,
  Search,
  X,
  XCircle,
  AlertTriangle,
  CheckCircle2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Layers,
  Clock
} from 'lucide-react';
import './App.css';

export default function App() {
  const [data, setData] = useState({
    system: { totalMemoryMB: 0, availMemoryMB: 0, usedMemoryMB: 0, memoryLoad: 0 },
    processes: []
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Controls
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all'); // all, high, veryHigh, restricted
  const [sortKey, setSortKey] = useState('memoryMB');
  const [sortDirection, setSortDirection] = useState('desc');
  const [refreshInterval, setRefreshInterval] = useState(2000); // ms, 0 = paused

  // Kill modal state
  const [processToKill, setProcessToKill] = useState(null);
  const [killing, setKilling] = useState(false);

  // Toast notifications
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((type, message) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  }, []);

  // Fetch process data
  const fetchData = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await fetch('/api/processes');
      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }
      const json = await res.json();
      setData(json);
      setError(null);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err.message || 'Failed to fetch process data');
    } finally {
      setLoading(false);
      if (isManual) {
        setTimeout(() => setRefreshing(false), 300);
      }
    }
  }, []);

  // Initial fetch and auto-refresh timer
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const res = await fetch('/api/processes');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (active) {
          setData(json);
          setError(null);
          setLastUpdated(new Date());
          setLoading(false);
        }
      } catch (err) {
        if (active) {
          setError(err.message || 'Failed to fetch process data');
          setLoading(false);
        }
      }
    };

    load();

    if (refreshInterval > 0) {
      const timer = setInterval(load, refreshInterval);
      return () => {
        active = false;
        clearInterval(timer);
      };
    }

    return () => {
      active = false;
    };
  }, [refreshInterval]);

  // Kill Process Action
  const handleKillProcess = async () => {
    if (!processToKill) return;
    setKilling(true);
    try {
      const res = await fetch('/api/kill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pid: processToKill.pid })
      });
      const result = await res.json();
      if (!res.ok || result.error) {
        throw new Error(result.error || 'Failed to terminate process');
      }
      addToast('success', `Process "${processToKill.name}" (PID: ${processToKill.pid}) terminated successfully.`);
      setProcessToKill(null);
      fetchData();
    } catch (err) {
      addToast('error', `Error terminating "${processToKill.name}": ${err.message}`);
    } finally {
      setKilling(false);
    }
  };

  // CSV Export
  const handleExportCSV = () => {
    window.location.href = '/api/export';
    addToast('success', 'Exporting processes to CSV...');
  };

  // Sorting helper
  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection(key === 'name' ? 'asc' : 'desc');
    }
  };

  // Filtering and Sorting Processed List
  const filteredAndSortedProcesses = useMemo(() => {
    let list = [...(data.processes || [])];

    // Filter by search query
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) || String(p.pid).includes(q)
      );
    }

    // Filter by type
    if (filterType === 'high') {
      list = list.filter(p => p.memoryMB >= 100);
    } else if (filterType === 'veryHigh') {
      list = list.filter(p => p.memoryMB >= 500);
    } else if (filterType === 'restricted') {
      list = list.filter(p => p.memoryMB === 0);
    }

    // Sort
    list.sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'pid') {
        cmp = a.pid - b.pid;
      } else if (sortKey === 'name') {
        cmp = a.name.localeCompare(b.name);
      } else if (sortKey === 'memoryMB') {
        cmp = a.memoryMB - b.memoryMB;
      }
      return sortDirection === 'asc' ? cmp : -cmp;
    });

    return list;
  }, [data.processes, searchTerm, filterType, sortKey, sortDirection]);

  // Max memory consumer among processes for relative bar scaling
  const maxMemoryProcess = useMemo(() => {
    if (!data.processes || data.processes.length === 0) return null;
    return [...data.processes].sort((a, b) => b.memoryMB - a.memoryMB)[0];
  }, [data.processes]);

  // Sum of monitored process memory
  const totalMonitoredMB = useMemo(() => {
    return (data.processes || []).reduce((acc, p) => acc + p.memoryMB, 0);
  }, [data.processes]);

  const formatMemory = (mb) => {
    if (mb >= 1024) {
      return `${(mb / 1024).toFixed(2)} GB`;
    }
    return `${mb.toFixed(2)} MB`;
  };

  const getMemoryBadgeClass = (mb) => {
    if (mb >= 800) return 'critical';
    if (mb >= 300) return 'high';
    if (mb >= 50) return 'normal';
    return 'low';
  };

  const getMemoryBadgeLabel = (mb) => {
    if (mb >= 800) return 'Critical';
    if (mb >= 300) return 'High';
    if (mb >= 50) return 'Moderate';
    if (mb > 0) return 'Low';
    return 'System/Restricted';
  };

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="brand-section">
          <div className="brand-icon">
            <Activity size={24} />
          </div>
          <div className="brand-titles">
            <div className="title-row">
              <h1 className="brand-title">SysScope</h1>
              <span className="badge-version">React UI</span>
              <div className="live-badge">
                <span className="live-dot"></span>
                <span>LIVE</span>
              </div>
            </div>
            <p className="brand-subtitle">Windows Process &amp; Working Set Memory Monitor</p>
          </div>
        </div>

        <div className="header-actions">
          {/* Refresh interval selector */}
          <div className="control-group">
            <span className="control-label">
              <Clock size={13} />
              <span>Interval:</span>
            </span>
            <select
              className="select-input"
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Number(e.target.value))}
            >
              <option value={1000}>1 second</option>
              <option value={2000}>2 seconds</option>
              <option value={5000}>5 seconds</option>
              <option value={0}>Paused</option>
            </select>
          </div>

          {/* Manual Refresh Button */}
          <button
            className="btn btn-secondary"
            onClick={() => fetchData(true)}
            title="Refresh Process List"
          >
            <RefreshCw size={14} className={refreshing ? 'spin' : ''} />
            <span>Refresh</span>
          </button>

          {/* Export CSV Button */}
          <button
            className="btn btn-secondary"
            onClick={handleExportCSV}
            title="Export all processes to CSV"
          >
            <Download size={14} />
            <span>Export CSV</span>
          </button>
        </div>
      </header>

      {/* System Metrics Cards */}
      <div className="stats-grid">
        {/* Active Processes */}
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Active Processes</span>
            <div className="stat-icon-wrapper blue">
              <Layers size={18} />
            </div>
          </div>
          <div className="stat-main">
            <span className="stat-value">{data.processes.length}</span>
            <span className="stat-badge green">Online</span>
          </div>
          <span className="stat-subtext">
            {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : 'Retrieving snapshot...'}
          </span>
        </div>

        {/* System RAM Usage */}
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">System RAM Usage</span>
            <div className="stat-icon-wrapper cyan">
              <HardDrive size={18} />
            </div>
          </div>
          <div className="stat-main">
            <span className="stat-value">{data.system.memoryLoad}%</span>
            <span className={`stat-badge ${data.system.memoryLoad > 85 ? 'rose' : data.system.memoryLoad > 70 ? 'amber' : 'green'}`}>
              {formatMemory(data.system.usedMemoryMB)}
            </span>
          </div>
          <div className="stat-progress-bar">
            <div
              className={`stat-progress-fill ${data.system.memoryLoad > 85 ? 'rose' : data.system.memoryLoad > 70 ? 'amber' : 'green'}`}
              style={{ width: `${Math.min(data.system.memoryLoad, 100)}%` }}
            ></div>
          </div>
          <span className="stat-subtext">
            Total: {formatMemory(data.system.totalMemoryMB)} | Free: {formatMemory(data.system.availMemoryMB)}
          </span>
        </div>

        {/* Monitored Memory */}
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Monitored Memory</span>
            <div className="stat-icon-wrapper emerald">
              <Database size={18} />
            </div>
          </div>
          <div className="stat-main">
            <span className="stat-value">{formatMemory(totalMonitoredMB)}</span>
          </div>
          <span className="stat-subtext">Sum of accessible working sets</span>
        </div>

        {/* Top Memory Consumer */}
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Top Memory Consumer</span>
            <div className="stat-icon-wrapper purple">
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="stat-main">
            <span className="stat-value" style={{ fontSize: '18px', textOverflow: 'ellipsis', overflow: 'hidden' }}>
              {maxMemoryProcess ? maxMemoryProcess.name : '—'}
            </span>
          </div>
          <span className="stat-subtext">
            {maxMemoryProcess ? `${formatMemory(maxMemoryProcess.memoryMB)} (PID: ${maxMemoryProcess.pid})` : 'No data'}
          </span>
        </div>
      </div>

      {/* Main Process Management Panel */}
      <div className="main-panel">
        {/* Toolbar */}
        <div className="panel-toolbar">
          {/* Search Box */}
          <div className="search-container">
            <Search size={15} className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Search by name or PID (e.g. chrome, 1208)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                className="clear-search-btn"
                onClick={() => setSearchTerm('')}
                title="Clear Search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="filter-tabs">
            <button
              className={`filter-tab ${filterType === 'all' ? 'active' : ''}`}
              onClick={() => setFilterType('all')}
            >
              All ({data.processes.length})
            </button>
            <button
              className={`filter-tab ${filterType === 'high' ? 'active' : ''}`}
              onClick={() => setFilterType('high')}
            >
              &gt; 100 MB
            </button>
            <button
              className={`filter-tab ${filterType === 'veryHigh' ? 'active' : ''}`}
              onClick={() => setFilterType('veryHigh')}
            >
              &gt; 500 MB
            </button>
            <button
              className={`filter-tab ${filterType === 'restricted' ? 'active' : ''}`}
              onClick={() => setFilterType('restricted')}
            >
              System / Restricted
            </button>
          </div>

          <div className="process-count-info">
            Showing {filteredAndSortedProcesses.length} of {data.processes.length}
          </div>
        </div>

        {/* Error Notification Banner if any */}
        {error && (
          <div style={{
            background: 'rgba(244, 63, 94, 0.15)',
            borderLeft: '4px solid #f43f5e',
            padding: '12px 18px',
            color: '#fecdd3',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <AlertTriangle size={16} color="#fb7185" />
            <span>{error}</span>
            <button
              className="btn btn-secondary"
              style={{ marginLeft: 'auto', padding: '4px 8px', fontSize: '11px' }}
              onClick={() => fetchData(true)}
            >
              Retry Connection
            </button>
          </div>
        )}

        {/* Process Table */}
        <div className="table-wrapper">
          <table className="process-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('pid')} style={{ width: '100px' }}>
                  <div className="th-content">
                    <span>PID</span>
                    {sortKey === 'pid' ? (
                      sortDirection === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />
                    ) : (
                      <ArrowUpDown size={12} color="#64748b" />
                    )}
                  </div>
                </th>
                <th onClick={() => handleSort('name')}>
                  <div className="th-content">
                    <span>Process Name</span>
                    {sortKey === 'name' ? (
                      sortDirection === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />
                    ) : (
                      <ArrowUpDown size={12} color="#64748b" />
                    )}
                  </div>
                </th>
                <th onClick={() => handleSort('memoryMB')} style={{ width: '150px' }}>
                  <div className="th-content">
                    <span>Memory</span>
                    {sortKey === 'memoryMB' ? (
                      sortDirection === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />
                    ) : (
                      <ArrowUpDown size={12} color="#64748b" />
                    )}
                  </div>
                </th>
                <th style={{ width: '180px' }}>Relative Impact</th>
                <th style={{ width: '140px' }}>Status</th>
                <th style={{ width: '110px', textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6}>
                    <div className="empty-state">
                      <RefreshCw size={32} className="spin" color="#38bdf8" />
                      <h3>Loading processes...</h3>
                      <p>Taking process and memory snapshot from Windows API</p>
                    </div>
                  </td>
                </tr>
              ) : filteredAndSortedProcesses.length > 0 ? (
                filteredAndSortedProcesses.map((proc) => {
                  const maxMem = maxMemoryProcess?.memoryMB || 1;
                  const relativePercent = maxMem > 0 ? Math.min(Math.round((proc.memoryMB / maxMem) * 100), 100) : 0;
                  const initialLetter = proc.name.charAt(0) || '?';

                  return (
                    <tr key={proc.pid}>
                      <td>
                        <span className="pid-badge">{proc.pid}</span>
                      </td>
                      <td>
                        <div className="process-name-cell">
                          <div className="process-avatar">{initialLetter}</div>
                          <span className="process-name-text">{proc.name}</span>
                        </div>
                      </td>
                      <td>
                        <span className="memory-cell">{formatMemory(proc.memoryMB)}</span>
                      </td>
                      <td>
                        <div className="memory-bar-cell">
                          <div className="memory-bar-outer">
                            <div
                              className="memory-bar-inner"
                              style={{ width: `${relativePercent}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`status-badge ${getMemoryBadgeClass(proc.memoryMB)}`}>
                          {getMemoryBadgeLabel(proc.memoryMB)}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          className="btn-terminate"
                          title={`Terminate ${proc.name} (${proc.pid})`}
                          onClick={() => setProcessToKill(proc)}
                        >
                          <XCircle size={14} />
                          <span>End</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6}>
                    <div className="empty-state">
                      <Cpu size={36} color="#64748b" />
                      <h3>No processes found</h3>
                      <p>No active processes match your filter or search criteria.</p>
                      {searchTerm && (
                        <button
                          className="btn btn-secondary"
                          style={{ marginTop: '8px' }}
                          onClick={() => { setSearchTerm(''); setFilterType('all'); }}
                        >
                          Reset Filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Modal for Terminating Process */}
      {processToKill && (
        <div className="modal-overlay" onClick={() => !killing && setProcessToKill(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-icon-danger">
                <AlertTriangle size={22} />
              </div>
              <h3 className="modal-title">End Process?</h3>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to terminate this process? Any unsaved data in the application may be lost.</p>
              <div className="modal-process-card">
                <div>
                  <strong style={{ color: '#f8fafc', display: 'block', fontSize: '14px' }}>
                    {processToKill.name}
                  </strong>
                  <span style={{ color: '#94a3b8', fontSize: '12px' }}>PID: {processToKill.pid}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ color: '#38bdf8', fontFamily: 'monospace', fontWeight: 600 }}>
                    {formatMemory(processToKill.memoryMB)}
                  </span>
                </div>
              </div>
            </div>
            <div className="modal-actions">
              <button
                className="btn btn-secondary"
                disabled={killing}
                onClick={() => setProcessToKill(null)}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger"
                disabled={killing}
                onClick={handleKillProcess}
              >
                {killing ? 'Terminating...' : 'End Process'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      <div className="toast-container">
        {toasts.map(toast => (
          <div key={toast.id} className={`toast ${toast.type}`}>
            {toast.type === 'success' ? (
              <CheckCircle2 size={16} />
            ) : (
              <AlertTriangle size={16} />
            )}
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
