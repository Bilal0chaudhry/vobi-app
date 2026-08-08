import React, { useState, useEffect, useRef } from 'react';
import LiveFeed from './LiveFeed';
import VerificationChecklist from './VerificationChecklist';
import Badge from './ui/Badge';
import Button from './ui/Button';
import { formatTime } from '../utils/formatters';
import { normalizeNumbers } from '../utils/textNormalizer';
import { endCall, pollMessages, startCall } from '../utils/api';
import { IconArrowLeft, IconClock, IconCheckCircle } from './icons';

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

    let cursor = 0;
    let endCallTriggered = false;
    let lastVobiTopic = null; // Tracks what VOBI last asked about for context-aware detection
    // Stack of topics VOBI has asked about but REP hasn't answered yet
    let pendingTopics = [];

    const processMessage = (data) => {
      const text = data.message.toLowerCase();

      setLogs((prev) => {
        const lastLog = prev[prev.length - 1];
        if (lastLog && lastLog.source === data.source) {
          const updatedLogs = [...prev];
          const mergedText = lastLog.message + data.message;

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

      // --- VOBI topic tracking & dispute detection ---
      if (data.source === 'VOBI') {
        const msg = data.message;

        // Detect if VOBI is questioning/clarifying something (dispute)
        const isDisputing = /just to clarify|that seems|are you sure|doesn't add up|doesn't seem|making sure|double check|hmm.*clarif/i.test(msg);

        if (isDisputing) {
          // Identify which topic is being disputed and un-mark it
          const disputeTargets = [];
          if (/\bdeductible\b/i.test(msg)) disputeTargets.push('deductible');
          if (/\bout[- ]of[- ]pocket\b|\boop\b|\bmaximum\b/i.test(msg)) disputeTargets.push('oopMax');
          if (/\bcopay\b|\bco[- ]?pay\b|\bcoinsurance\b/i.test(msg)) disputeTargets.push('copay');
          if (/\beligib/i.test(msg)) disputeTargets.push('eligibility');

          if (disputeTargets.length > 0) {
            // Un-mark disputed items back to pending
            setChecklist((prev) => {
              const next = { ...prev };
              for (const topic of disputeTargets) {
                if (next[topic] === 'complete') next[topic] = 'pending';
              }
              return next;
            });
            // Re-add to pendingTopics so REP confirmation can resolve them
            for (const topic of disputeTargets) {
              if (!pendingTopics.includes(topic)) pendingTopics.push(topic);
            }
          }
        } else {
          // Normal topic tracking — accumulate into pendingTopics
          if (/\bdeductible\b/i.test(msg) && !pendingTopics.includes('deductible')) pendingTopics.push('deductible');
          if (/\bout[- ]of[- ]pocket\b|\boop\b|\bmax\w*\b.*\bpocket/i.test(msg) && !pendingTopics.includes('oopMax')) pendingTopics.push('oopMax');
          if (/\bcopay\b|\bco[- ]?pay\b|\bcoinsurance\b/i.test(msg) && !pendingTopics.includes('copay')) pendingTopics.push('copay');
          if ((/\beligib/i.test(msg) || /\bcoverage\b/i.test(msg)) && !pendingTopics.includes('eligibility')) pendingTopics.push('eligibility');
          if (/\bcpt\b/i.test(msg) && !pendingTopics.includes('cpt')) pendingTopics.push('cpt');
        }
        if (pendingTopics.length > 0) lastVobiTopic = pendingTopics[pendingTopics.length - 1];
      }

      // --- Only REP responses update the checklist ---
      if (data.source === 'REP') {
        setChecklist((prev) => {
          const next = { ...prev };

          // Word-form number detection (STT transcribes "500 dollars" as "five hundred dollars")
          const NUM_WORD = /\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand)\b/;
          const hasDollarAmount = /\$\s?\d/.test(text) || /\d+\s*(dollars?|hundred|thousand)\b/.test(text) || (NUM_WORD.test(text) && /\bdollars?\b/.test(text)) || (NUM_WORD.test(text) && /\bhundred\b/.test(text));
          const hasPercentage = /\d+\s*(%|percent)\b/.test(text) || (NUM_WORD.test(text) && /\bpercent\b/.test(text));
          const hasConfirmation = /\byes\b|\byeah\b|\bcorrect\b|\bthat'?s right\b|\bright\b/.test(text);

          // --- Direct keyword matches (with word boundaries) ---
          if (/\beligib\w*\b/.test(text) || /\bactive\b/.test(text) || /\bcoverage.+effective\b/.test(text)) {
            next.eligibility = 'complete';
            pendingTopics = pendingTopics.filter(t => t !== 'eligibility');
          }
          if (/\bdeductible\b/.test(text) && (hasDollarAmount || hasConfirmation)) {
            next.deductible = 'complete';
            pendingTopics = pendingTopics.filter(t => t !== 'deductible');
          }
          if ((/\bout[- ]of[- ]pocket\b/.test(text) || /\boop\b/.test(text) || /\bmax\w*\b.*\bpocket\b/.test(text)) && (hasDollarAmount || hasConfirmation)) {
            next.oopMax = 'complete';
            pendingTopics = pendingTopics.filter(t => t !== 'oopMax');
          }
          if ((/\bcopay\b/.test(text) || /\bco[- ]?pay\b/.test(text) || /\bcoinsurance\b/.test(text)) && (hasDollarAmount || hasPercentage || hasConfirmation)) {
            next.copay = 'complete';
            pendingTopics = pendingTopics.filter(t => t !== 'copay');
          }

          // --- Context-aware: REP gives a dollar/percentage without naming the topic ---
          if ((hasDollarAmount || hasPercentage) && pendingTopics.length > 0) {
            const financialTopics = ['deductible', 'oopMax', 'copay'];
            const match = pendingTopics.find(t => financialTopics.includes(t) && next[t] !== 'complete');
            if (match) {
              next[match] = 'complete';
              pendingTopics = pendingTopics.filter(t => t !== match);
            }
          }

          // --- Confirmation resolves ALL pending topics (disputed or not) ---
          if (hasConfirmation && pendingTopics.length > 0) {
            const resolvable = pendingTopics.filter(t => t !== 'cpt' && next[t] !== 'complete');
            for (const topic of resolvable) {
              next[topic] = 'complete';
            }
            pendingTopics = pendingTopics.filter(t => !resolvable.includes(t));
          }

          // --- CPT code matches ---
          const normalizedText = normalizeNumbers(text);
          const cleanText = normalizedText.replace(/[^a-z0-9]/gi, '');

          const cpt1Clean = job.cptCodes[0]?.replace(/[^a-z0-9]/gi, '');
          if (cpt1Clean && cleanText.includes(cpt1Clean)) next.cpt1 = 'complete';

          const cpt2Clean = job.cptCodes[1]?.replace(/[^a-z0-9]/gi, '');
          if (cpt2Clean && cleanText.includes(cpt2Clean)) next.cpt2 = 'complete';

          // Context-aware CPT: REP confirms after VOBI asked about CPT
          if (pendingTopics.includes('cpt') && (/\byes\b|\byeah\b|\bcovered\b|\bauthorized\b/.test(text))) {
            if (next.cpt1 === 'pending') next.cpt1 = 'complete';
            else if (next.cpt2 === 'pending') next.cpt2 = 'complete';
            pendingTopics = pendingTopics.filter(t => t !== 'cpt');
          }

          return next;
        });
      }
    };

    let stopped = false;

    const poll = async () => {
      if (stopped) return;
      try {
        const res = await pollMessages(cursor);
        for (const msg of res.messages) {
          processMessage(msg);
        }
        cursor = res.next;
        if (res.done) return;
      } catch (err) {
        // Silently retry on next tick
      }
      if (!stopped) setTimeout(poll, 500);
    };

    // Start the first poll
    poll();

    return () => { stopped = true; };
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
          <IconCheckCircle className="w-5 h-5 text-emerald-400" />
          <span className="text-sm font-semibold">Call completed successfully</span>
        </div>
      )}
    </div>
  );
}
