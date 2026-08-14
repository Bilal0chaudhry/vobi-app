import React from 'react';
import { approveProfile, rejectProfile } from '../utils/admin';
import { ProfileBadge } from './ui/Badge';
import PageHeader from './PageHeader';

export default function AdminDashboard({ onLogout, profiles }) {
  const handleApprove = async (id) => {
    await approveProfile(id);
  };

  const handleReject = async (id) => {
    if (confirm("Are you sure you want to reject this user?")) {
      await rejectProfile(id);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-start justify-between mb-6">
        <PageHeader
          title="Admin Dashboard"
          subtitle="Manage user access and approvals"
        />
        <button onClick={onLogout} className="text-sm font-medium text-gray-600 hover:text-gray-900 mt-2">
          Sign out
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm table-fixed">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="w-2/5 px-6 py-4 font-semibold text-gray-900">User</th>
                <th className="w-1/4 px-6 py-4 font-semibold text-gray-900">Organization</th>
                <th className="w-1/6 px-6 py-4 font-semibold text-gray-900">Status</th>
                <th className="w-1/6 px-6 py-4 font-semibold text-gray-900 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {profiles.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-8 text-center text-gray-500">No users found.</td>
                </tr>
              ) : (
                profiles.map(profile => (
                  <tr key={profile.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 truncate">
                      <div className="font-medium text-gray-900 truncate">{profile.full_name || 'No Name Provided'}</div>
                      <div className="text-gray-500 truncate">{profile.email}</div>
                    </td>
                    <td className="px-6 py-4 text-gray-600 truncate">
                      {profile.organization || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <ProfileBadge status={profile.status} />
                      {profile.is_admin && <span className="ml-2"><ProfileBadge status="admin" role={true} /></span>}
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
