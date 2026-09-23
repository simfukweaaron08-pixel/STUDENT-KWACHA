import React, { useState, useEffect } from 'react';
import { api } from '../store/authStore';

export default function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#4ECDC4');

  useEffect(() => { loadCategories(); }, []);

  const loadCategories = async () => {
    try {
      const { data } = await api.get('/categories');
      setCategories(data.data);
    } catch {}
    setLoading(false);
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Category Management</h2>

      <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
        <h3 className="font-bold mb-4">Add Category</h3>
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Category name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 flex-1"
          />
          <input
            type="color"
            value={newColor}
            onChange={(e) => setNewColor(e.target.value)}
            className="w-12 h-10 rounded-lg border cursor-pointer"
          />
          <button
            onClick={async () => {
              if (!newName.trim()) return;
              try {
                await api.post('/categories', { name: newName, color: newColor });
                setNewName('');
                loadCategories();
              } catch {}
            }}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Add
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            {categories.map((cat) => (
              <div key={cat.id} className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: cat.color || '#AEB6BF' }} />
                <div className="flex-1">
                  <p className="font-medium">{cat.name}</p>
                  <p className="text-xs text-gray-500">
                    {cat.is_system ? 'System default' : 'User-created'}
                  </p>
                </div>
                {cat.is_system && (
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">System</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
