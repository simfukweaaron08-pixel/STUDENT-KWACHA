import React, { useState, useEffect } from 'react';
import { api } from '../store/authStore';

export default function SettingsPage() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadConfig(); }, []);

  const loadConfig = async () => {
    try {
      const { data } = await api.get('/admin/system');
      setConfig(data.data);
    } catch {}
    setLoading(false);
  };

  if (loading) return <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" /></div>;

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">System Settings</h2>

      <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
        <h3 className="font-bold mb-4">System Information</h3>
        <div className="space-y-3">
          <div className="flex justify-between py-2 border-b">
            <span className="text-gray-600">Application Name</span>
            <span className="font-medium">{config?.app_name || 'Smart Budget ZM'}</span>
          </div>
          <div className="flex justify-between py-2 border-b">
            <span className="text-gray-600">Version</span>
            <span className="font-medium">{config?.version || '1.0.0'}</span>
          </div>
          <div className="flex justify-between py-2 border-b">
            <span className="text-gray-600">Environment</span>
            <span className={`px-2 py-1 text-xs rounded-full ${
              config?.environment === 'production' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
            }`}>{config?.environment || 'development'}</span>
          </div>
          <div className="flex justify-between py-2 border-b">
            <span className="text-gray-600">Default Currency</span>
            <span className="font-medium">{config?.default_currency || 'ZMW'}</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h3 className="font-bold mb-4">About</h3>
        <p className="text-gray-600 text-sm">
          Smart Budget ZM is a mobile budgeting application designed for the Zambian market.
          It provides transaction tracking, budgeting, savings goals, and financial insights
          to help users manage their personal finances effectively.
        </p>
        <p className="text-gray-500 text-xs mt-4">
          Financial Disclaimer: All insights and recommendations provided by Smart Budget ZM
          are for informational purposes only and should not be considered professional financial advice.
        </p>
      </div>
    </div>
  );
}
