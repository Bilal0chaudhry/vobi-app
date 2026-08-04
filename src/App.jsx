import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import CallHistory from './components/CallHistory';
import Settings from './components/Settings';
import LiveView from './components/LiveView';
import NewVobModal from './components/NewVobModal';
import { initialJobs } from './data/seedData';

export default function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [showNewVobModal, setShowNewVobModal] = useState(false);
  const [jobs, setJobs] = useState(initialJobs);
  const [activeJob, setActiveJob] = useState(null);

  const handleNavigate = (view) => {
    setCurrentView(view);
    setActiveJob(null);
  };

  const handleSubmitNewVob = (newJob) => {
    setJobs((prev) => [newJob, ...prev]);
    setActiveJob(newJob);
    setCurrentView('liveView');
    setShowNewVobModal(false);
  };

  const handleOpenJob = (job) => {
    setActiveJob(job);
    setCurrentView('liveView');
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
          ? <LiveView job={activeJob} onBack={handleBackToDashboard} onJobComplete={handleJobComplete} />
          : <Dashboard jobs={jobs} onOpenJob={handleOpenJob} onNewVerification={() => setShowNewVobModal(true)} />;
      default:
        return null;
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar currentView={currentView} onNavigate={handleNavigate} />

      <main className="ml-[200px] flex-1 p-6">
        {renderView()}
      </main>

      {showNewVobModal && (
        <NewVobModal
          onClose={() => setShowNewVobModal(false)}
          onSubmit={handleSubmitNewVob}
        />
      )}
    </div>
  );
}
