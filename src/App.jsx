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
import { supabase } from './utils/supabase';
import { fetchJobs, createJob, updateJob } from './utils/db';

export default function App() {
  const [session, setSession] = useState(null);
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
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) {
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
  }, [session]);

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

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard jobs={jobs} onOpenJob={handleOpenJob} onNewVerification={() => setShowNewVobModal(true)} />;
      case 'callHistory':
        return <CallHistory jobs={jobs} onNewVerification={() => setShowNewVobModal(true)} />;
      case 'settings':
        return <Settings onNewVerification={() => setShowNewVobModal(true)} session={session} />;
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

  return (
    <>
      {isLoading && (
        <SplashScreen onFinish={() => setIsLoading(false)} />
      )}

      {!isAuthenticated ? (
        <Auth />
      ) : (
        <div className="flex min-h-screen bg-slate-50">
        <Sidebar currentView={currentView} onNavigate={handleNavigate} />

        <main className="ml-[200px] flex-1 p-6">
          {renderView()}
        </main>

        {showNewVobModal && (
          <NewVobModal
            onClose={() => setShowNewVobModal(false)}
            onSubmit={handleSubmitNewVob}
            onPortalSubmit={handlePortalSubmit}
          />
        )}
      </div>
      )}
    </>
  );
}
