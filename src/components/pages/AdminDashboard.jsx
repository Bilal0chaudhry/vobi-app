import React, { useState, useRef } from 'react';
import useClickOutside from '../../hooks/useClickOutside';
import { approveProfile, rejectProfile, deleteAccount } from '../../utils/db';
import { ProfileBadge } from '../ui/Badge';
import { IconCheck, IconX, IconTrash } from '../ui/icons';
import PageHeader from '../ui/PageHeader';
import Toast from '../ui/Toast';

export default function AdminDashboard({ onLogout, profiles }) {
  const [toast, setToast] = useState({ show: false, type: 'success', message: '' });
  const [deletingId, setDeletingId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const showToastMsg = (type, message) => {
    setToast({ show: false, type, message: '' });
    setTimeout(() => setToast({ show: true, type, message }), 10);
  };

  const tableRef = useRef(null);

  useClickOutside(tableRef, () => setDeletingId(null), !!deletingId);

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
        <button onClick={onLogout} className="text-sm font-medium text-text-secondary hover:text-text-primary mt-2">
          Sign out
        </button>
      </div>

      <div className="bg-surface rounded-xl border border-border overflow-hidden" ref={tableRef}>
        <div className="overflow-x-auto relative">
          <table className="w-full text-left text-sm table-fixed">
            <thead className="bg-surface-inset border-b border-border relative z-20">
              <tr>
                <th className="w-2/5 px-6 py-4 font-semibold text-text-primary">User</th>
                <th className="w-1/4 px-6 py-4 font-semibold text-text-primary">Organization</th>
                <th className="w-1/6 px-6 py-4 font-semibold text-text-primary">Status</th>
                <th className="w-1/6 px-6 py-4 font-semibold text-text-primary">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {profiles.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-8 text-center text-text-secondary">No users found.</td>
                </tr>
              ) : (
                profiles.map(profile => (
                  <tr key={profile.id} className="hover:bg-surface-hover relative group transition-colors">
                    
                    <td className="px-6 py-4 truncate">
                      <div className="font-medium text-text-primary truncate">{profile.full_name || 'No Name Provided'}</div>
                      <div className="text-text-secondary truncate">{profile.email}</div>
                    </td>
                    <td className="px-6 py-4 text-text-secondary truncate">
                      {profile.organization || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <ProfileBadge status={profile.status} />
                      {profile.is_admin && <span className="ml-2"><ProfileBadge status="admin" role={true} /></span>}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-start gap-2 min-h-[36px]">
                        {profile.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApprove(profile.id)}
                              className="px-3 py-1.5 bg-[var(--color-success-text)] text-white rounded-lg text-xs font-medium hover:opacity-90 transition-opacity shadow-sm"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleReject(profile.id)}
                              className="px-3 py-1.5 bg-status-danger border border-[var(--color-danger-bg)] text-status-danger-text rounded-lg text-xs font-medium hover:opacity-80 transition-opacity shadow-sm"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        
                        {profile.status === 'approved' && !profile.is_admin && (
                          <div className="relative w-24 h-9 flex items-center justify-start">
                            <div 
                              className={`absolute left-0 flex items-center gap-1 transition-all duration-300 transform
                                ${deletingId !== profile.id
                                  ? 'opacity-0 group-hover:opacity-100 translate-x-[-4px] group-hover:translate-x-0'
                                  : 'opacity-0 translate-x-[-4px] pointer-events-none'
                                }`}
                            >
                              <button 
                                onClick={() => setDeletingId(profile.id)} 
                                className="text-text-tertiary hover:text-status-danger-text p-2 rounded-lg hover:bg-status-danger outline-none transition-colors"
                                title="Delete Account"
                              >
                                <IconTrash />
                              </button>
                            </div>
                            
                            <div 
                              className={`absolute left-0 flex items-center gap-2 transition-all duration-300 transform origin-left
                                ${deletingId === profile.id ? 'opacity-100 scale-100' : 'opacity-0 scale-75 pointer-events-none'}`}
                            >
                              <button 
                                disabled={isDeleting}
                                onClick={() => confirmDelete(profile.id)} 
                                className={`w-9 h-9 rounded-full bg-status-danger text-status-danger-text border border-[var(--color-danger-bg)] flex items-center justify-center hover:bg-[var(--color-danger-text)] hover:text-white transition-all shadow-sm active:scale-95 disabled:opacity-50 ${deletingId === profile.id ? 'animate-pop-in-1' : ''}`}
                                title="Confirm Delete"
                              >
                                <IconCheck />
                              </button>
                              <button 
                                disabled={isDeleting}
                                onClick={() => setDeletingId(null)} 
                                className={`w-9 h-9 rounded-full bg-surface-inset text-text-secondary border border-border flex items-center justify-center hover:bg-surface-hover transition-all shadow-sm active:scale-95 disabled:opacity-50 ${deletingId === profile.id ? 'animate-pop-in-2' : ''}`}
                                title="Cancel"
                              >
                                <IconX />
                              </button>
                            </div>
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
