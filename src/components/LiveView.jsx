import React, { useState, useEffect, useRef } from 'react';
import LiveFeed from './LiveFeed';
import VerificationChecklist from './VerificationChecklist';
import Badge from './ui/Badge';
import Button from './ui/Button';
import { formatTime } from '../utils/formatters';
import { normalizeNumbers } from '../utils/textNormalizer';
import { endCall, getEventsUrl, startCall } from '../utils/api';
import { IconArrowLeft, IconClock } from './icons';

export default function LiveView({ job, onBack, onJobComplete, onJobUpdate }) {
  const [logs, setLogs] = useState(() => {
    if (job.logs) return job.logs;
    
    if (job.isNewCall) {
      return [
        {
          id: 'start',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          type: 'system',
          source: 'SYSTEM',
          message: `Initiating VOB request for ${job.patientFirstName} ${job.patientLastName}...`,
        },
        {
          id: 'wait',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          type: 'system',
          source: 'SYSTEM',
          message: 'Waiting for representative to connect...',
        }
      ];
    }
    
    return [
      {
        id: 'start',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        type: 'system',
        source: 'SYSTEM',
        message: `Call connected. Representative has joined the call.`,
      }
    ];
  });
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
  const [showToast, setShowToast] = useState(false);
  const feedRef = useRef(null);

  useEffect(() => {
    onJobUpdate?.(job.id, { logs, checklist, status: callStatus });
  }, [logs, checklist, callStatus]);

  useEffect(() => {
    if (job.isNewCall) {
      job.isNewCall = false; // Prevent double calls in strict mode
      
      const initiateCall = async () => {
        try {
          await startCall(job);
          setLogs(prev => [...prev, {
             id: 'connected',
             timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
             type: 'system',
             source: 'SYSTEM',
             message: 'Representative connected. Call starting...'
          }]);
        } catch (err) {
          setLogs(prev => [...prev, {
             id: 'error',
             timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
             type: 'system',
             source: 'SYSTEM',
             message: err.message || 'Call rejected: All representatives are busy.'
          }]);
          setCallStatus('Completed');
        }
      };
      
      initiateCall();
    }
  }, [job]);

  const handleEndCall = async () => {
    try {
      await endCall();
    } catch (error) {
      console.error('Failed to end call:', error);
    }
    setCallStatus('Completed');
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2500);
    onJobComplete?.(job.id);
  };

  useEffect(() => {
    const timer = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (callStatus === 'Completed') return;

    const eventSource = new EventSource(getEventsUrl());

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      const text = data.message.toLowerCase();
      
      setLogs((prev) => {
        const lastLog = prev[prev.length - 1];
        if (lastLog && lastLog.source === data.source) {
          const updatedLogs = [...prev];
          
          let suffix = data.message;
          const mergedText = lastLog.message + suffix;
          
          const isEndCall = /\[\s*END\s*_?\s*CALL\s*\]/i.test(mergedText) || (data.source === 'VOBI' && /\bgoodbye\b/i.test(mergedText));
          const wasEndCall = /\[\s*END\s*_?\s*CALL\s*\]/i.test(lastLog.message) || (data.source === 'VOBI' && /\bgoodbye\b/i.test(lastLog.message));
          
          if (isEndCall && !wasEndCall) {
             setTimeout(() => {
                handleEndCall();
             }, 4000);
          }
          
          updatedLogs[updatedLogs.length - 1] = {
            ...lastLog,
            message: mergedText.replace(/\[\s*END\s*_?\s*CALL\s*\]/gi, '').trim(),
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

      if (data.source === 'REP' || data.source === 'VOBI') {
        setChecklist((prev) => {
          const next = { ...prev };
          const lastLogMessage = (prevLogs => prevLogs[prevLogs.length - 1]?.message || '')(logs);
          const currentText = lastLogMessage + data.message;
          const normalizedText = normalizeNumbers(currentText.toLowerCase());
          const cleanText = normalizedText.replace(/[^a-z0-9%]/gi, '');
          
          if (currentText.toLowerCase().includes('deductible')) next.deductible = 'complete';
          if (currentText.toLowerCase().includes('out of pocket') || currentText.toLowerCase().includes('oop') || currentText.toLowerCase().match(/max.*pocket/)) next.oopMax = 'complete';
          if (currentText.toLowerCase().includes('copay') || currentText.toLowerCase().includes('co pay') || currentText.toLowerCase().includes('coinsurance') || currentText.toLowerCase().includes('%')) next.copay = 'complete';
          if (currentText.toLowerCase().includes('active') || currentText.toLowerCase().includes('eligible') || currentText.toLowerCase().includes('coverage is effective')) next.eligibility = 'complete';
          
          const cpt1Clean = job.cptCodes[0]?.replace(/[^a-z0-9]/gi, '');
          if (cpt1Clean && (cleanText.includes(cpt1Clean) || text.includes('cpt'))) next.cpt1 = 'complete';
          
          const cpt2Clean = job.cptCodes[1]?.replace(/[^a-z0-9]/gi, '');
          if (cpt2Clean && (cleanText.includes(cpt2Clean) || text.includes('second code'))) next.cpt2 = 'complete';
          
          return next;
        });
      }
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
          <Button
            id="btn-back-dashboard"
            onClick={onBack}
            variant="ghost"
          >
            <IconArrowLeft />
            Back
          </Button>
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
          <Button
            onClick={handleEndCall}
            disabled={callStatus === 'Completed'}
            variant="danger"
          >
            End Call
          </Button>
          <Badge status={callStatus} />
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

      {showToast && (
        <div className="fixed bottom-6 right-6 bg-gray-900 text-white px-6 py-3 rounded-xl shadow-lg shadow-gray-900/20 flex items-center gap-3 animate-fade-in z-50">
          <svg className="w-5 h-5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-sm font-semibold">Call completed successfully</span>
        </div>
      )}
    </div>
  );
}
