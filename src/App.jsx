import React, { useState, useEffect } from 'react';
import Sidebar from './components/layout/Sidebar';
import Dashboard from './components/pages/Dashboard';
import History from './components/pages/History';
import Settings from './components/pages/Settings';
import LiveView from './components/pages/LiveView';
import NewVobModal from './components/ui/NewVobModal';
import SplashScreen from './components/layout/SplashScreen';
import PortalVobPage from './components/pages/PortalVobPage';
import Auth from './components/auth/Auth';
import AdminDashboard from './components/pages/AdminDashboard';
import { PendingScreen, RejectedScreen } from './components/layout/StatusScreens';
import { supabase } from './utils/supabase';
import { fetchJobsList, fetchJobById, createJob, updateJob, deleteJob, fetchSettings, fetchProfiles } from './utils/db';
import { checkHealth } from './utils/api';

export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [userSettings, setUserSettings] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentView, setCurrentView] = useState('dashboard');
  const [showNewVobModal, setShowNewVobModal] = useState(false);
  const [jobs, setJobs] = useState([]);
  const [activeJob, setActiveJob] = useState(null);
  const [adminProfiles, setAdminProfiles] = useState([]);
  const [backendStatus, setBackendStatus] = useState(null);
  const [jobsLoaded, setJobsLoaded] = useState(false);
  const [adminProfilesLoaded, setAdminProfilesLoaded] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [showCapacityToast, setShowCapacityToast] = useState(false);

  const activeJobsCount = jobs.filter(j => !['Completed', 'Verified (Portal)', 'Portal Error', 'Call Error'].includes(j.status)).length;

  const handleNewVerificationClick = () => {
    if (activeJobsCount >= 10) {
      setShowCapacityToast(true);
      setTimeout(() => setShowCapacityToast(false), 4000);
    } else {
      setShowNewVobModal(true);
    }
  };

  useEffect(() => {
    checkHealth().then(res => setBackendStatus(!!res));
    
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setIsLoading(true);
      setSession(session);
      setIsAuthenticated(!!session);
      setSessionChecked(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) setIsLoading(true);
      setSession(session);
      setIsAuthenticated(!!session);
      setSessionChecked(true);
      if (!session) {
        setProfile(null);
        setUserSettings(null);
        setAdminProfiles([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    
    const fetchUserData = async () => {
      try {
        const { data, error } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
        if (error) {
          setProfile({ id: session.user.id, status: 'pending', error: error.message });
        } else {
          setProfile(data);
          const settingsData = await fetchSettings(session.user.id);
          setUserSettings(settingsData || { id: session.user.id });
        }
      } catch (err) {
        setProfile({ id: session.user.id, status: 'pending', error: err.message });
      }
    };

    fetchUserData();

    const profileChannel = supabase
      .channel('public:profiles')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${session.user.id}` }, payload => {
        setProfile(payload.new);
      })
      .subscribe();

    return () => supabase.removeChannel(profileChannel);
  }, [session]);

  useEffect(() => {
    if (!session || !profile || profile.status !== 'approved') {
      setJobsLoaded(true);
      setJobs([]);
      return;
    }

    setJobsLoaded(false);
    const loadJobs = async () => {
      const data = await fetchJobsList();
      setJobs(data);
      setJobsLoaded(true);
    };

    loadJobs();

    const channel = supabase
      .channel('public:jobs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, payload => {
        loadJobs();
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [session, profile?.status]);

  useEffect(() => {
    if (!profile?.is_admin) {
      setAdminProfilesLoaded(true);
      setAdminProfiles([]);
      return;
    }

    setAdminProfilesLoaded(false);
    const loadAdminProfiles = async () => {
      const data = await fetchProfiles();
      setAdminProfiles(data);
      setAdminProfilesLoaded(true);
    };

    loadAdminProfiles();

    const adminChannel = supabase
      .channel('admin:profiles')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        loadAdminProfiles();
      })
      .subscribe();

    return () => supabase.removeChannel(adminChannel);
  }, [profile?.is_admin]);

  const handleNavigate = (view) => {
    setCurrentView(view);
    setActiveJob(null);
  };

  const handleSubmitNewVob = async (newJobData) => {
    try {
      const newJob = await createJob(newJobData, session.user.id);
      setActiveJob(newJob);
      setCurrentView('liveView');
      setShowNewVobModal(false);
    } catch (err) {
      alert("Failed to create verification request.");
    }
  };

  const handlePortalSubmit = async (newJobData) => {
    try {
      const newJob = await createJob({ ...newJobData, status: 'Verified (Portal)' }, session.user.id);
      setActiveJob(newJob);
      setCurrentView('portalVob');
      setShowNewVobModal(false);
    } catch (err) {
      alert("Failed to create verification request.");
    }
  };

  const handleOpenJob = async (job) => {
    // Fetch full job detail (including call_logs, checklist, availity_result)
    const fullJob = await fetchJobById(job.id);
    const resolved = fullJob || job;
    setActiveJob(resolved);
    setCurrentView(resolved.source === 'portal' ? 'portalVob' : 'liveView');
  };

  const handleBackToDashboard = () => {
    setActiveJob(null);
    setCurrentView('dashboard');
  };

  const handleJobComplete = async (jobId) => {
    await updateJob(jobId, { status: 'Completed' });
  };

  const handleJobUpdate = async (jobId, updates) => {
    await updateJob(jobId, updates);
  };

  const handleDeleteJob = async (jobId) => {
    try {
      await deleteJob(jobId);
      setJobs(prev => prev.filter(j => j.id !== jobId));
    } catch (err) {
      alert("Failed to delete the request.");
    }
  };

  const handleLogout = async () => {
    setIsLoading(true);
    await supabase.auth.signOut();
  };

  const renderView = () => {
    if (currentView === 'admin' && profile?.is_admin) {
      return <AdminDashboard onLogout={handleLogout} profiles={adminProfiles} />;
    }

    switch (currentView) {
      case 'dashboard':
        return <Dashboard jobs={jobs} onOpenJob={handleOpenJob} onNewVerification={handleNewVerificationClick} />;
      case 'callHistory':
        return <History jobs={jobs} onOpenJob={handleOpenJob} onNewVerification={handleNewVerificationClick} onDeleteJob={handleDeleteJob} />;
      case 'settings':
        return <Settings 
          profile={profile} 
          settings={userSettings} 
          onProfileUpdate={(p) => setProfile(p)} 
          onSettingsUpdate={(s) => setUserSettings(s)} 
        />;
      case 'liveView':
        return activeJob
          ? <LiveView job={jobs.find(j => j.id === activeJob.id) || activeJob} onBack={handleBackToDashboard} onJobComplete={handleJobComplete} onJobUpdate={handleJobUpdate} />
          : <Dashboard jobs={jobs} onOpenJob={handleOpenJob} onNewVerification={handleNewVerificationClick} />;
      case 'portalVob':
        return activeJob
          ? <PortalVobPage
              job={jobs.find(j => j.id === activeJob.id) || activeJob}
              onBack={handleBackToDashboard}
              onJobUpdate={handleJobUpdate}
            />
          : <Dashboard jobs={jobs} onOpenJob={handleOpenJob} onNewVerification={handleNewVerificationClick} />;
      default:
        return null;
    }
  };

  const isFullyLoaded = 
    backendStatus !== null && 
    sessionChecked && 
    (!session || profile !== null) &&
    (!session || profile?.status !== 'approved' || jobsLoaded) &&
    (!profile?.is_admin || adminProfilesLoaded);

  return (
    <>
      {(!isAuthenticated && isFullyLoaded) && (
        <Auth initialBackendStatus={backendStatus} onBackendChange={setBackendStatus} />
      )}

      {(isAuthenticated && isFullyLoaded && profile?.status === 'pending') && (
        <PendingScreen onLogout={handleLogout} />
      )}
      
      {(isAuthenticated && isFullyLoaded && profile?.status === 'rejected') && (
        <RejectedScreen onLogout={handleLogout} />
      )}

      {(isAuthenticated && isFullyLoaded && profile?.status === 'approved') && (
        <div className="flex min-h-screen bg-slate-50">
          <Sidebar 
            currentView={currentView} 
            onNavigate={handleNavigate} 
            isAdmin={profile.is_admin} 
            onLogout={handleLogout} 
            profile={profile}
          />

          <main className="ml-[200px] flex-1 p-6">
            {renderView()}
          </main>

          {showNewVobModal && (
            <NewVobModal
              onClose={() => setShowNewVobModal(false)}
              onSubmit={handleSubmitNewVob}
              onPortalSubmit={handlePortalSubmit}
              profile={profile}
            />
          )}

          {/* Capacity Toast Notification */}
          {showCapacityToast && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
              <div className="bg-gray-900 text-white px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-3">
                <div className="bg-amber-500/20 text-amber-500 p-1.5 rounded-lg">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-sm font-bold">Queue is full</h4>
                  <p className="text-xs text-gray-300 mt-0.5">You must wait for an active request to complete before making a new one.</p>
                </div>
                <button onClick={() => setShowCapacityToast(false)} className="ml-4 text-gray-400 hover:text-white transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {(isLoading || !isFullyLoaded) && (
        <SplashScreen isReady={isFullyLoaded} onFinish={() => setIsLoading(false)} />
      )}
    </>
  );
}
