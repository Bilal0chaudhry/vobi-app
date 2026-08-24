import React, { useState, useEffect, useRef } from "react";
import LiveFeed from "../ui/LiveFeed";
import VerificationChecklist from "../ui/VerificationChecklist";
import { JobBadge } from "../ui/Badge";
import Button from "../ui/Button";
import { formatTime } from "../../utils/formatters";
import { endCall, pollMessages, startCall } from "../../utils/api";
import { detectTopics, isDispute, updateChecklistFromRep } from "../../utils/checklistDetector";
import { IconArrowLeft, IconClock, IconCheckCircle } from "../ui/icons";
import { buildChecklistItems } from "../../utils/constants";

const timestamp = () =>
  new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

export default function LiveView({ job, onBack, onJobComplete, onJobUpdate }) {
  const [logs, setLogs] = useState(() => {
    if (job.logs) return job.logs;

    if (job.isNewCall) {
      return [
        { id: "start", timestamp: timestamp(), type: "system", source: "SYSTEM", message: `Initiating VOB request for ${job.patientFirstName} ${job.patientLastName}...` },
        { id: "wait", timestamp: timestamp(), type: "system", source: "SYSTEM", message: "Waiting for representative to connect..." },
      ];
    }

    return [
      { id: "start", timestamp: timestamp(), type: "system", source: "SYSTEM", message: "Call connected. Representative has joined the call." },
    ];
  });

  const [checklist, setChecklist] = useState(() => job.checklist || {
    eligibility: "pending",
    networkStatus: "pending",
    deductible: "pending",
    oopMax: "pending",
    cpt1: "pending",
    cpt2: job.cptCodes.length > 1 ? "pending" : "n/a",
    copay: "pending",
    buyAndBill: "pending",
    priorAuth: "pending",
    referral: "pending",
    formulary: "pending",
  });

  const [elapsed, setElapsed] = useState(0);
  const [callStatus, setCallStatus] = useState(job.status !== "Pending" ? job.status : "Agent on Call");
  const [showToast, setShowToast] = useState(false);
  const feedRef = useRef(null);

  const debounceRef = useRef(null);
  const prevStatusRef = useRef(callStatus);

  // Debounce log/checklist writes to DB (every 2s), but flush immediately on status change
  useEffect(() => {
    const statusChanged = prevStatusRef.current !== callStatus;
    prevStatusRef.current = callStatus;

    if (statusChanged) {
      // Status changes are critical — flush immediately
      clearTimeout(debounceRef.current);
      onJobUpdate?.(job.id, { logs, checklist, status: callStatus });
    } else {
      // Batch log/checklist updates
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onJobUpdate?.(job.id, { logs, checklist, status: callStatus });
      }, 2000);
    }

    return () => clearTimeout(debounceRef.current);
  }, [logs, checklist, callStatus]);

  useEffect(() => {
    if (job.isNewCall) {
      job.isNewCall = false;

      const initiateCall = async () => {
        try {
          await startCall(job);
          setLogs((prev) => [...prev, {
            id: "connected", timestamp: timestamp(), type: "system", source: "SYSTEM",
            message: "Representative connected. Call starting...",
          }]);
        } catch (err) {
          setLogs((prev) => [...prev, {
            id: "error", timestamp: timestamp(), type: "system", source: "SYSTEM",
            message: err.message || "Call rejected: All representatives are busy.",
          }]);
          setCallStatus("Call Error");
        }
      };

      initiateCall();
    }
  }, [job]);

  const handleEndCall = async () => {
    try {
      await endCall();
    } catch (error) {
    }
    setCallStatus("Completed");
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2500);
    onJobComplete?.(job.id);
  };

  useEffect(() => {
    const timer = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (callStatus === "Completed") return;

    let cursor = 0;
    let endCallTriggered = false;
    let pendingTopics = [];
    let stopped = false;
    let silenceTimer = null;

    const processMessage = (data) => {
      const text = data.message.toLowerCase();

      setLogs((prev) => {
        const lastLog = prev[prev.length - 1];
        if (lastLog && lastLog.source === data.source) {
          const updatedLogs = [...prev];
          const mergedText = lastLog.message + data.message;
          updatedLogs[updatedLogs.length - 1] = {
            ...lastLog,
            message: mergedText.replace(/\[\s*END\s*_?\s*CALL\s*\]/gi, "").trim(),
            timestamp: timestamp(),
          };
          return updatedLogs;
        }
        return [
          ...prev,
          { id: Date.now() + Math.random(), timestamp: timestamp(), type: data.type, source: data.source, message: data.message },
        ];
      });

      if (data.source === "VOBI") {
        if (isDispute(data.message)) {
          const disputeTargets = detectTopics(data.message).filter((t) => t !== "cpt");
          if (disputeTargets.length > 0) {
            setChecklist((prev) => {
              const next = { ...prev };
              for (const topic of disputeTargets) {
                if (next[topic] === "complete") next[topic] = "pending";
              }
              return next;
            });
            for (const topic of disputeTargets) {
              if (!pendingTopics.includes(topic)) pendingTopics.push(topic);
            }
          }
        } else {
          for (const topic of detectTopics(data.message)) {
            if (!pendingTopics.includes(topic)) pendingTopics.push(topic);
          }
        }
      }

      if (data.source === "REP") {
        setChecklist((prev) => {
          const result = updateChecklistFromRep(text, prev, pendingTopics, job.cptCodes);
          pendingTopics = result.pendingTopics;
          return result.checklist;
        });
      }
    };

    const poll = async () => {
      if (stopped) return;
      try {
        const res = await pollMessages(cursor);
        const hasNewMessages = res.messages.length > 0;

        for (const msg of res.messages) {
          processMessage(msg);
        }
        cursor = res.next;

        if (res.done) {
          if (!endCallTriggered) {
            endCallTriggered = true;
            handleEndCall();
          }
          return;
        }

        if (res.end_pending) {
          if (hasNewMessages && silenceTimer) {
            clearTimeout(silenceTimer);
            silenceTimer = null;
          }
          if (!silenceTimer && !endCallTriggered) {
            silenceTimer = setTimeout(() => {
              if (!endCallTriggered) {
                endCallTriggered = true;
                handleEndCall();
              }
            }, 5000);
          }
        }
      } catch (err) {
      }
      if (!stopped) setTimeout(poll, 500);
    };

    poll();

    return () => {
      stopped = true;
      if (silenceTimer) clearTimeout(silenceTimer);
    };
  }, [job.id, callStatus]);

  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [logs]);

  const checklistItems = buildChecklistItems(job);

  return (
    <div className="animate-fade-in h-[calc(100vh-32px)] flex flex-col">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center gap-4">
          <Button id="btn-back-dashboard" onClick={onBack} variant="ghost">
            <IconArrowLeft />
            Back
          </Button>
          <div>
            <h1 className="text-lg font-bold text-text-primary">
              {job.patientFirstName} {job.patientLastName}
            </h1>
            <p className="text-xs text-text-secondary">
              {job.insurance} · {job.memberId}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Button onClick={handleEndCall} disabled={callStatus === "Completed"} variant="danger">
            End Call
          </Button>
          <JobBadge status={callStatus} />
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-inset rounded-lg">
            <IconClock className="w-3.5 h-3.5 text-text-secondary" />
            <span className="text-sm font-mono font-semibold text-text-primary">{formatTime(elapsed)}</span>
          </div>
        </div>
      </div>

      <div className="flex gap-4 flex-1 min-h-0">
        <VerificationChecklist checklist={checklist} items={checklistItems} />
        <LiveFeed logs={logs} feedRef={feedRef} />
      </div>

      {showToast && (
        <div className="fixed bottom-6 right-6 bg-surface border border-border text-text-primary px-6 py-3 rounded-xl shadow-xl flex items-center gap-3 animate-fade-in z-50">
          <IconCheckCircle className="w-5 h-5 text-status-success-text" />
          <span className="text-sm font-semibold">Call completed successfully</span>
        </div>
      )}
    </div>
  );
}
