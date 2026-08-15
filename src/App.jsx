import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import CallHistory from './components/CallHistory';
import Settings from './components/Settings';
import LiveView from './components/LiveView';
import NewVobModal from './components/NewVobModal';
import SplashScreen from './components/SplashScreen';
import PortalVobPage from './components/PortalVobPage';
import Auth from './components/Auth';
import AdminDashboard from './components/AdminDashboard';
import { PendingScreen, RejectedScreen } from './components/StatusScreens';
import { supabase } from './utils/supabase';
import { fetchJobs, createJob, updateJob, fetchSettings } from './utils/db';
import { fetchProfiles } from './utils/admin';

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
  const [sessionChecked, setSessionChecked] = useState(false);
  const [profileChecked, setProfileChecked] = useState(false);

  useEffect(() => {
    checkHealth().then(res => setBackendStatus(!!res));
    
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsAuthenticated(!!session);
      setSessionChecked(true);
      if (!session) setProfileChecked(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setIsAuthenticated(!!session);
      setSessionChecked(true);
      if (!session) {
        setProfile(null);
        setUserSettings(null);
        setAdminProfiles([]);
        setProfileChecked(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    setProfileChecked(false);
    
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
      } finally {
        setProfileChecked(true);
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
      setJobs([]);
      return;
    }

    const loadJobs = async () => {
      const data = await fetchJobs();
      setJobs(data);
    };

    loadJobs();

    const channel = supabase
      .channel('public:jobs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, payload => {
        loadJobs();
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [session, profile]);

  useEffect(() => {
    if (!profile?.is_admin) {
      setAdminProfiles([]);
      return;
    }

    const loadAdminProfiles = async () => {
      const data = await fetchProfiles();
      setAdminProfiles(data);
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

  const handleOpenJob = (job) => {
    setActiveJob(job);
    setCurrentView(job.source === 'portal' ? 'portalVob' : 'liveView');
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const renderView = () => {
    if (currentView === 'admin' && profile?.is_admin) {
      return <AdminDashboard onLogout={handleLogout} profiles={adminProfiles} />;
    }

    switch (currentView) {
      case 'dashboard':
        return <Dashboard jobs={jobs} onOpenJob={handleOpenJob} onNewVerification={() => setShowNewVobModal(true)} />;
      case 'callHistory':
        return <CallHistory jobs={jobs} />;
      case 'settings':
        return <Settings 
          session={session} 
          profile={profile} 
          settings={userSettings} 
          onProfileUpdate={(p) => setProfile(p)} 
          onSettingsUpdate={(s) => setUserSettings(s)} 
        />;
      case 'liveView':
        return activeJob
          ? <LiveView job={jobs.find(j => j.id === activeJob.id) || activeJob} onBack={handleBackToDashboard} onJobComplete={handleJobComplete} onJobUpdate={handleJobUpdate} />
          : <Dashboard jobs={jobs} onOpenJob={handleOpenJob} onNewVerification={() => setShowNewVobModal(true)} />;
      case 'portalVob':
        return activeJob
          ? <PortalVobPage
              job={jobs.find(j => j.id === activeJob.id) || activeJob}
              onBack={handleBackToDashboard}
              onJobUpdate={handleJobUpdate}
            />
          : <Dashboard jobs={jobs} onOpenJob={handleOpenJob} onNewVerification={() => setShowNewVobModal(true)} />;
      default:
        return null;
    }
  };

  const isFullyLoaded = backendStatus !== null && sessionChecked && profileChecked;

  if (isLoading || !isFullyLoaded) {
    return <SplashScreen isReady={isFullyLoaded} onFinish={() => setIsLoading(false)} />;
  }

  if (!isAuthenticated) {
    return <Auth initialBackendStatus={backendStatus} />;
  }

  if (profile.status === 'pending') {
    return <PendingScreen onLogout={handleLogout} />;
  }
  
  if (profile.status === 'rejected') {
    return <RejectedScreen onLogout={handleLogout} />;
  }

  return (
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
    </div>
  );
}
