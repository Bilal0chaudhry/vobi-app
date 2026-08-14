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
import { fetchJobs, createJob, updateJob } from './utils/db';

export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentView, setCurrentView] = useState('dashboard');
  const [showNewVobModal, setShowNewVobModal] = useState(false);
  const [jobs, setJobs] = useState([]);
  const [activeJob, setActiveJob] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsAuthenticated(!!session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setIsAuthenticated(!!session);
      if (!session) setProfile(null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    
    const fetchProfile = async () => {
      try {
        const { data, error } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
        if (error) {
          console.error("Profile fetch error:", error);
          // If the profile doesn't exist or table is missing, mock a pending profile
          // so the UI doesn't hang on a blank screen.
          setProfile({ id: session.user.id, status: 'pending', error: error.message });
        } else {
          setProfile(data);
        }
      } catch (err) {
        console.error("Profile catch error:", err);
        setProfile({ id: session.user.id, status: 'pending', error: err.message });
      }
    };

    fetchProfile();

    // Listen for profile changes (e.g. admin approves them while they are waiting)
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

    // Subscribe to real-time changes
    const channel = supabase
      .channel('public:jobs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, payload => {
        loadJobs(); // Reload jobs when database changes
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [session, profile]);

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
      return <AdminDashboard onLogout={handleLogout} />;
    }

    switch (currentView) {
      case 'dashboard':
        return <Dashboard jobs={jobs} onOpenJob={handleOpenJob} onNewVerification={() => setShowNewVobModal(true)} />;
      case 'callHistory':
        return <CallHistory jobs={jobs} onNewVerification={() => setShowNewVobModal(true)} />;
      case 'settings':
        return <Settings onNewVerification={() => setShowNewVobModal(true)} session={session} profile={profile} onProfileUpdate={(p) => setProfile(p)} />;
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

  // Gatekeeping Logic
  if (isLoading) {
    return <SplashScreen onFinish={() => setIsLoading(false)} />;
  }

  if (!isAuthenticated) {
    return <Auth />;
  }

  // Waiting for profile to load
  if (!profile) {
    return <SplashScreen onFinish={() => {}} />;
  }

  // Enforce profile status restrictions
  if (profile.status === 'pending') {
    return <PendingScreen onLogout={handleLogout} error={profile.error} />;
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
