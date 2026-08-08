import React, { useState, useEffect, useRef } from "react";
import LiveFeed from "./LiveFeed";
import VerificationChecklist from "./VerificationChecklist";
import Badge from "./ui/Badge";
import Button from "./ui/Button";
import { formatTime } from "../utils/formatters";
import { endCall, pollMessages, startCall } from "../utils/api";
import { detectTopics, isDispute, updateChecklistFromRep } from "../utils/checklistDetector";
import { IconArrowLeft, IconClock, IconCheckCircle } from "./icons";

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
    deductible: "pending",
    oopMax: "pending",
    cpt1: "pending",
    cpt2: job.cptCodes.length > 1 ? "pending" : "n/a",
    copay: "pending",
  });

  const [elapsed, setElapsed] = useState(0);
  const [callStatus, setCallStatus] = useState(job.status !== "Pending" ? job.status : "Agent on Call");
  const [showToast, setShowToast] = useState(false);
  const feedRef = useRef(null);

  useEffect(() => {
    onJobUpdate?.(job.id, { logs, checklist, status: callStatus });
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
          setCallStatus("Completed");
        }
      };

      initiateCall();
    }
  }, [job]);

  const handleEndCall = async () => {
    try {
      await endCall();
    } catch (error) {
      /* silently continue */
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
        /* retry on next tick */
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

  const checklistItems = [
    { key: "eligibility", label: "Eligibility Status" },
    { key: "deductible", label: "Deductible" },
    { key: "oopMax", label: "Out-of-Pocket Max" },
    { key: "cpt1", label: `CPT ${job.cptCodes[0] || "—"}` },
    ...(job.cptCodes.length > 1 ? [{ key: "cpt2", label: `CPT ${job.cptCodes[1]}` }] : []),
    { key: "copay", label: "Copay / Coinsurance" },
  ];

  return (
    <div className="animate-fade-in h-[calc(100vh-32px)] flex flex-col">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center gap-4">
          <Button id="btn-back-dashboard" onClick={onBack} variant="ghost">
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
          <Button onClick={handleEndCall} disabled={callStatus === "Completed"} variant="danger">
            End Call
          </Button>
          <Badge status={callStatus} />
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 rounded-lg">
            <IconClock className="w-3.5 h-3.5 text-gray-500" />
            <span className="text-sm font-mono font-semibold text-gray-700">{formatTime(elapsed)}</span>
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
