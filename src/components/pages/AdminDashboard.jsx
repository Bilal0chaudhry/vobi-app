import React, { useState } from 'react';
import { approveProfile, rejectProfile, deleteAccount } from '../../utils/db';
import { ProfileBadge } from '../ui/Badge';
import PageHeader from '../ui/PageHeader';
import Toast from '../ui/Toast';

const IconTrash = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const IconCheck = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
  </svg>
);

const IconCross = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

export default function AdminDashboard({ onLogout, profiles }) {
  const [toast, setToast] = useState({ show: false, type: 'success', message: '' });
  const [deletingId, setDeletingId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const showToastMsg = (type, message) => {
    setToast({ show: false, type, message: '' });
    setTimeout(() => setToast({ show: true, type, message }), 10);
  };

  const handleApprove = async (id) => {
    try {
      await approveProfile(id);
      showToastMsg('success', 'User has been approved.');
    } catch (err) {
      showToastMsg('error', "Failed to approve: " + err.message);
    }
  };

  const handleReject = async (id) => {
    if (confirm("Are you sure you want to reject this user?")) {
      try {
        await rejectProfile(id);
        showToastMsg('success', 'User has been rejected.');
      } catch (err) {
        showToastMsg('error', "Failed to reject: " + err.message);
      }
    }
  };

  const confirmDelete = async (id) => {
    setIsDeleting(true);
    try {
      await deleteAccount(id);
      showToastMsg('success', 'Account completely deleted.');
      setDeletingId(null);
    } catch (err) {
      showToastMsg('error', "Failed to delete: " + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="animate-fade-in relative">
      <style>
        {`
          @keyframes slideInRightBounce {
            0% { transform: translateX(20px); opacity: 0; }
            70% { transform: translateX(-4px); }
            100% { transform: translateX(0); opacity: 1; }
          }
          .animate-slide-in-right-bounce {
            animation: slideInRightBounce 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          }
          @keyframes popIn {
            0% { transform: scale(0.5); opacity: 0; }
            60% { transform: scale(1.1); opacity: 1; }
            100% { transform: scale(1); opacity: 1; }
          }
          .animate-pop-in-1 {
            animation: popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
          }
          .animate-pop-in-2 {
            animation: popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) 0.1s forwards;
            opacity: 0;
          }
        `}
      </style>
      
      {toast.show && (
        <Toast 
          type={toast.type} 
          message={toast.message} 
          onClose={() => setToast({ show: false, type: 'success', message: '' })} 
        />
      )}
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
        <div className="overflow-x-auto relative">
          <table className="w-full text-left text-sm table-fixed">
            <thead className="bg-gray-50 border-b border-gray-200 relative z-20">
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
                  <tr key={profile.id} className="hover:bg-gray-50 relative group transition-colors">
                    
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
                    <td className="px-6 py-4 text-right h-[72px] relative overflow-hidden">
                      <div className="flex items-center justify-end w-full h-full relative">
                        {profile.status === 'pending' && (
                          <div className={`flex items-center justify-end gap-2 transition-all duration-300 ${deletingId === profile.id ? 'opacity-0 scale-95 pointer-events-none absolute' : 'opacity-100 scale-100'}`}>
                            <button
                              onClick={() => handleApprove(profile.id)}
                              className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 transition-colors shadow-sm"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleReject(profile.id)}
                              className="px-3 py-1.5 bg-red-50 border border-red-200 text-red-600 rounded-lg text-xs font-medium hover:bg-red-100 transition-colors shadow-sm"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                        
                        {/* The initial tiny delete icon that shows on hover */}
                        {profile.status === 'approved' && !profile.is_admin && (
                          <button 
                            onClick={() => setDeletingId(profile.id)} 
                            className={`opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all duration-300 p-2 rounded-lg hover:bg-red-50 focus:opacity-100 outline-none absolute right-6 ${deletingId === profile.id ? 'opacity-0 scale-50 pointer-events-none' : 'scale-100'}`}
                            title="Delete Account"
                          >
                            <IconTrash />
                          </button>
                        )}

                        {/* In-place popping confirmation buttons */}
                        {deletingId === profile.id && (
                          <div className="absolute right-6 flex items-center gap-2">
                            <button 
                              disabled={isDeleting}
                              onClick={() => confirmDelete(profile.id)} 
                              className="w-9 h-9 rounded-full bg-red-50 text-red-500 border border-red-100 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-sm active:scale-95 disabled:opacity-50 animate-pop-in-1"
                              title="Confirm Delete"
                            >
                              <IconCheck />
                            </button>
                            <button 
                              disabled={isDeleting}
                              onClick={() => setDeletingId(null)} 
                              className="w-9 h-9 rounded-full bg-gray-50 text-gray-500 border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition-all shadow-sm active:scale-95 disabled:opacity-50 animate-pop-in-2"
                              title="Cancel"
                            >
                              <IconCross />
                            </button>
                          </div>
                        )}
                      </div>
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
