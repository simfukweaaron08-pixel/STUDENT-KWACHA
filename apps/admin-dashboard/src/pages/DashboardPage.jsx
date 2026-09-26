import React, { useState, useEffect } from 'react';
import { api } from '../store/authStore';
import { Users, Receipt, Wallet, Target } from 'lucide-react';

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const { data } = await api.get('/admin/stats');
      setStats(data.data);
    } catch {}
    setLoading(false);
  };

  if (loading) return <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" /></div>;

  const cards = [
    { label: 'Total Users', value: stats?.users?.total ?? 0, icon: Users, color: 'bg-blue-500' },
    { label: 'Active Users', value: stats?.users?.active ?? 0, icon: Users, color: 'bg-green-500' },
    { label: 'Total Transactions', value: stats?.transactions?.total ?? 0, icon: Receipt, color: 'bg-purple-500' },
    { label: 'Monthly Volume', value: `K${(stats?.monthly_volume ?? 0).toLocaleString()}`, icon: Wallet, color: 'bg-orange-500' },
    { label: 'Active Budgets', value: stats?.budgets ?? 0, icon: Target, color: 'bg-teal-500' },
    { label: 'Savings Goals', value: stats?.savings_goals ?? 0, icon: Target, color: 'bg-pink-500' },
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Dashboard Overview</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card) => (
          <div key={card.label} className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-lg ${card.color}`}>
                <card.icon className="text-white" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-500">{card.label}</p>
                <p className="text-2xl font-bold">{card.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 bg-white rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-bold mb-4">Quick Actions</h3>
        <div className="flex gap-4">
          <a href="/users" className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Manage Users</a>
          <a href="/categories" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Manage Categories</a>
          <a href="/audit-logs" className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">View Audit Logs</a>
        </div>
      </div>
    </div>
  );
}
