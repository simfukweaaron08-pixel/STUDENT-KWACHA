import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../store/authStore';

export default function UserDetailPage() {
  const { id } = useParams();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadUser(); }, [id]);

  const loadUser = async () => {
    try {
      const { data } = await api.get(`/admin/users/${id}`);
      setUser(data.data);
    } catch {}
    setLoading(false);
  };

  if (loading) return <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" /></div>;
  if (!user) return <div className="text-center p-8 text-gray-500">User not found</div>;

  return (
    <div>
      <Link to="/users" className="text-green-600 hover:underline text-sm mb-4 inline-block">← Back to Users</Link>

      <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-green-600 flex items-center justify-center text-white text-2xl font-bold">
            {user.full_name?.[0]?.toUpperCase()}
          </div>
          <div>
            <h2 className="text-2xl font-bold">{user.full_name}</h2>
            <p className="text-gray-500">{user.email}</p>
            {user.phone_number && <p className="text-gray-500 text-sm">{user.phone_number}</p>}
          </div>
          <div className="ml-auto">
            <span className={`px-3 py-1 text-sm rounded-full ${
              user.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>{user.status}</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{user.stats?.transactions ?? 0}</p>
            <p className="text-sm text-gray-500">Transactions</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{user.stats?.budgets ?? 0}</p>
            <p className="text-sm text-gray-500">Budgets</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-purple-600">{user.stats?.savings_goals ?? 0}</p>
            <p className="text-sm text-gray-500">Savings Goals</p>
          </div>
        </div>

        <div className="mt-6 text-sm text-gray-500">
          <p>Joined: {new Date(user.created_at).toLocaleDateString()}</p>
          <p>Currency: {user.currency}</p>
          {user.adminRole && <p>Role: <span className="font-medium text-green-700">{user.adminRole.role}</span></p>}
        </div>
      </div>
    </div>
  );
}
