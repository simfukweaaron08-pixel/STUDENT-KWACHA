import React, { useState, useEffect } from 'react';
import { api } from '../store/authStore';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => { loadLogs(); }, [filter]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/audit-logs', { params: { limit: 50, action: filter || undefined } });
      setLogs(data.data);
    } catch {}
    setLoading(false);
  };

  const getActionColor = (action) => {
    if (action?.includes('login')) return 'bg-green-100 text-green-700';
    if (action?.includes('logout')) return 'bg-gray-100 text-gray-700';
    if (action?.includes('register')) return 'bg-blue-100 text-blue-700';
    if (action?.includes('admin')) return 'bg-purple-100 text-purple-700';
    return 'bg-yellow-100 text-yellow-700';
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Audit Logs</h2>

      <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
        <input
          type="text"
          placeholder="Filter by action (e.g., user.login, admin.deactivate_user)..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Timestamp</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Actor</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Action</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Resource</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">IP Address</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan="5" className="text-center p-8 text-gray-500">Loading...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan="5" className="text-center p-8 text-gray-500">No audit logs found</td></tr>
            ) : logs.map((log) => (
              <tr key={log.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm text-gray-600">
                  {new Date(log.created_at).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-sm">
                  {log.actor?.full_name || 'System'}
                  <span className="ml-1 text-xs text-gray-400">({log.actor_type})</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-1 rounded-full ${getActionColor(log.action)}`}>
                    {log.action}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {log.resource_type || '-'}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500 font-mono">
                  {log.ip_address || '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
