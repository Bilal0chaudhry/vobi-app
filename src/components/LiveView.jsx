import React, { useState, useEffect, useRef } from 'react';
import StatusBadge from './StatusBadge';
import VerificationChecklist from './VerificationChecklist';
import LiveFeed from './LiveFeed';
import { buildSimScript } from '../data/simScript';
import { IconArrowLeft, IconClock } from './icons';

/** Format seconds as m:ss */
function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function LiveView({ job, onBack, onJobComplete }) {
  const [logs, setLogs] = useState([]);
  const [checklist, setChecklist] = useState({
    eligibility: 'pending',
    deductible: 'pending',
    oopMax: 'pending',
    cpt1: 'pending',
    cpt2: job.cptCodes.length > 1 ? 'pending' : 'n/a',
    copay: 'pending',
  });
  const [elapsed, setElapsed] = useState(0);
  const [callStatus, setCallStatus] = useState('Agent on Call');
  const feedRef = useRef(null);

  // Elapsed timer
  useEffect(() => {
    const timer = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  // Simulation engine — fires log entries on schedule
  useEffect(() => {
    const script = buildSimScript(job);
    const timers = script.map((entry, idx) =>
      setTimeout(() => {
        setLogs((prev) => [
          ...prev,
          {
            id: idx,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            type: entry.type,
            source: entry.source,
            message: entry.message,
          },
        ]);

        if (entry.checklistUpdate) {
          if (entry.checklistUpdate === 'done') {
            setCallStatus('Completed');
            onJobComplete?.(job.id);
          } else {
            setChecklist((prev) => ({ ...prev, [entry.checklistUpdate]: 'complete' }));
          }
        }
      }, entry.delay)
    );

    return () => timers.forEach(clearTimeout);
  }, [job]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll feed to bottom
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
      {/* Header */}
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
          <StatusBadge status={callStatus} />
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 rounded-lg">
            <IconClock className="w-3.5 h-3.5 text-gray-500" />
            <span className="text-sm font-mono font-semibold text-gray-700">
              {formatTime(elapsed)}
            </span>
          </div>
        </div>
      </div>

      {/* Split panel */}
      <div className="flex gap-4 flex-1 min-h-0">
        <VerificationChecklist checklist={checklist} items={checklistItems} />
        <LiveFeed logs={logs} feedRef={feedRef} />
      </div>
    </div>
  );
}
