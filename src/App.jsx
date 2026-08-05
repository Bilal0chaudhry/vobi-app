import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import CallHistory from './components/CallHistory';
import Settings from './components/Settings';
import LiveView from './components/LiveView';
import NewVobModal from './components/NewVobModal';
import SplashScreen from './components/SplashScreen';
import PortalVobPage from './components/PortalVobPage';
import { initialJobs } from './data/seedData';

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [currentView, setCurrentView] = useState('dashboard');
  const [showNewVobModal, setShowNewVobModal] = useState(false);
  const [jobs, setJobs] = useState(() => {
    try {
      const saved = localStorage.getItem('vobi_jobs');
      return saved ? JSON.parse(saved) : initialJobs;
    } catch (e) {
      return initialJobs;
    }
  });
  const [activeJob, setActiveJob] = useState(null);

  React.useEffect(() => {
    localStorage.setItem('vobi_jobs', JSON.stringify(jobs));
  }, [jobs]);

  const handleNavigate = (view) => {
    setCurrentView(view);
    setActiveJob(null);
  };

  // ── Call flow (existing) ─────────────────────────────────────
  const handleSubmitNewVob = (newJob) => {
    setJobs((prev) => [newJob, ...prev]);
    setActiveJob(newJob);
    setCurrentView('liveView');
    setShowNewVobModal(false);
  };

  // ── Portal flow (new) ────────────────────────────────────────
  const handlePortalSubmit = (newJob) => {
    setJobs((prev) => [newJob, ...prev]);
    setActiveJob(newJob);
    setCurrentView('portalVob');
    setShowNewVobModal(false);
  };

  const handleOpenJob = (job) => {
    setActiveJob(job);
    // Route to correct view based on job source
    setCurrentView(job.source === 'portal' ? 'portalVob' : 'liveView');
  };

  const handleBackToDashboard = () => {
    setActiveJob(null);
    setCurrentView('dashboard');
  };

  const handleJobComplete = (jobId) => {
    setJobs((prev) =>
      prev.map((j) => (j.id === jobId ? { ...j, status: 'Completed' } : j))
    );
  };

  const handleJobUpdate = (jobId, updates) => {
    setJobs((prev) =>
      prev.map((j) => (j.id === jobId ? { ...j, ...updates } : j))
    );
  };

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard jobs={jobs} onOpenJob={handleOpenJob} onNewVerification={() => setShowNewVobModal(true)} />;
      case 'callHistory':
        return <CallHistory jobs={jobs} onNewVerification={() => setShowNewVobModal(true)} />;
      case 'settings':
        return <Settings onNewVerification={() => setShowNewVobModal(true)} />;
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
    </>
  );
}
