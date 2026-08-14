import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { fetchProfiles, approveProfile, rejectProfile } from '../utils/admin';

export default function AdminDashboard({ onLogout }) {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadProfiles = async () => {
    setLoading(true);
    const data = await fetchProfiles();
    setProfiles(data);
    setLoading(false);
  };

  useEffect(() => {
    loadProfiles();
  }, []);

  const handleApprove = async (id) => {
    await approveProfile(id);
    loadProfiles();
  };

  const handleReject = async (id) => {
    if (confirm("Are you sure you want to reject this user?")) {
      await rejectProfile(id);
      loadProfiles();
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-sm text-gray-500">Manage user access and approvals.</p>
        </div>
        <button onClick={onLogout} className="text-sm font-medium text-gray-600 hover:text-gray-900">
          Sign out
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 font-semibold text-gray-900">User</th>
                <th className="px-6 py-4 font-semibold text-gray-900">Organization</th>
                <th className="px-6 py-4 font-semibold text-gray-900">Status</th>
                <th className="px-6 py-4 font-semibold text-gray-900 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="4" className="px-6 py-8 text-center text-gray-500">Loading users...</td>
                </tr>
              ) : profiles.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-8 text-center text-gray-500">No users found.</td>
                </tr>
              ) : (
                profiles.map(profile => (
                  <tr key={profile.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{profile.full_name || 'No Name Provided'}</div>
                      <div className="text-gray-500">{profile.email}</div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {profile.organization || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                        ${profile.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : ''}
                        ${profile.status === 'pending' ? 'bg-amber-100 text-amber-800' : ''}
                        ${profile.status === 'rejected' ? 'bg-red-100 text-red-800' : ''}
                      `}>
                        {profile.status}
                      </span>
                      {profile.is_admin && (
                        <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          Admin
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {profile.status === 'pending' && (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleApprove(profile.id)}
                            className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 transition-colors"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleReject(profile.id)}
                            className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
