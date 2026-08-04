import React, { useState, useEffect, useRef } from 'react';
import StatusBadge from './StatusBadge';
import VerificationChecklist from './VerificationChecklist';
import LiveFeed from './LiveFeed';

import { IconArrowLeft, IconClock } from './icons';

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function LiveView({ job, onBack, onJobComplete, onJobUpdate }) {
  const [logs, setLogs] = useState(() => job.logs || [
    {
      id: 'start',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      type: 'system',
      source: 'SYSTEM',
      message: `Initiating VOB request for ${job.patientFirstName} ${job.patientLastName}...`,
    },
    {
      id: 'connect',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      type: 'system',
      source: 'SYSTEM',
      message: 'Vobi is active on your local machine. Please speak into your microphone to verify benefits.',
    }
  ]);
  const [checklist, setChecklist] = useState(() => job.checklist || {
    eligibility: 'pending',
    deductible: 'pending',
    oopMax: 'pending',
    cpt1: 'pending',
    cpt2: job.cptCodes.length > 1 ? 'pending' : 'n/a',
    copay: 'pending',
  });
  const [elapsed, setElapsed] = useState(0);
  const [callStatus, setCallStatus] = useState(job.status !== 'Pending' ? job.status : 'Agent on Call');
  const feedRef = useRef(null);

  // Sync state up to App.jsx so it saves to localStorage
  useEffect(() => {
    onJobUpdate?.(job.id, { logs, checklist, status: callStatus });
  }, [logs, checklist, callStatus]);

  const handleEndCall = async () => {
    try {
      await fetch('http://localhost:8000/end-call', { method: 'POST' });
    } catch (error) {
      console.error('Failed to end call:', error);
    }
    setCallStatus('Completed');
    onJobComplete?.(job.id);
  };

  useEffect(() => {
    const timer = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (callStatus === 'Completed') return;

    const eventSource = new EventSource('http://localhost:8000/events');

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      const text = data.message.toLowerCase();
      
      setLogs((prev) => {
        const lastLog = prev[prev.length - 1];
        if (lastLog && lastLog.source === data.source) {
          // Aggregate chunks from the same source
          const updatedLogs = [...prev];
          const suffix = (data.source === 'VOBI' ? '' : ' ') + data.message;
          const mergedText = lastLog.message + suffix;
          
          if (mergedText.includes('[END_CALL]')) {
             handleEndCall();
          }
          
          updatedLogs[updatedLogs.length - 1] = {
            ...lastLog,
            message: mergedText.replace('[END_CALL]', ''),
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
          };
          return updatedLogs;
        } else {
          return [
            ...prev,
            {
              id: Date.now() + Math.random(),
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
              type: data.type,
              source: data.source,
              message: data.message,
            }
          ];
        }
      });

      // Smarter keyword matching for checklist updates
      setChecklist((prev) => {
        const next = { ...prev };
        if (text.includes('deductible')) next.deductible = 'complete';
        if (text.includes('out of pocket') || text.includes('oop') || text.match(/max.*pocket/)) next.oopMax = 'complete';
        if (text.includes('copay') || text.includes('coinsurance') || text.includes('%')) next.copay = 'complete';
        if (text.includes('active') || text.includes('eligible') || text.includes('coverage is effective')) next.eligibility = 'complete';
        if (job.cptCodes[0] && (text.includes(job.cptCodes[0]) || text.includes('cpt'))) next.cpt1 = 'complete';
        if (job.cptCodes[1] && (text.includes(job.cptCodes[1]) || text.includes('second code'))) next.cpt2 = 'complete';
        
        return next;
      });
    };

    eventSource.onerror = () => {
      console.error('SSE connection error');
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [job.id, callStatus]);

  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [logs]);

  const checklistItems = [
    { key: 'eligibility', label: 'Eligibility Status' },
    { key: 'deductible', label: 'Deductible' },
    { key: 'oopMax', label: 'Out-of-Pocket Max' },
    { key: 'cpt1', label: `CPT ${job.cptCodes[0] || '—'}` },
    ...(job.cptCodes.length > 1 ? [{ key: 'cpt2', label: `CPT ${job.cptCodes[1]}` }] : []),
    { key: 'copay', label: 'Copay / Coinsurance' },
  ];

  return (
    <div className="animate-fade-in h-[calc(100vh-32px)] flex flex-col">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center gap-4">
          <button
            id="btn-back-dashboard"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <IconArrowLeft />
            Back
          </button>
          <div>
            <h1 className="text-lg font-bold text-gray-900">
              {job.patientFirstName} {job.patientLastName}
            </h1>
            <p className="text-xs text-gray-500">
              {job.insurance} · {job.memberId}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={handleEndCall}
            disabled={callStatus === 'Completed'}
            className="px-4 py-1.5 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            End Call
          </button>
          <StatusBadge status={callStatus} />
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 rounded-lg">
            <IconClock className="w-3.5 h-3.5 text-gray-500" />
            <span className="text-sm font-mono font-semibold text-gray-700">
              {formatTime(elapsed)}
            </span>
          </div>
        </div>
      </div>

      <div className="flex gap-4 flex-1 min-h-0">
        <VerificationChecklist checklist={checklist} items={checklistItems} />
        <LiveFeed logs={logs} feedRef={feedRef} />
      </div>
    </div>
  );
}
