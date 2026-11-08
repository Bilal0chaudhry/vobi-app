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

export default function LiveView({ job, isVisible = true, onBack, onJobComplete, onJobUpdate, onViewSummary }) {
  const [logs, setLogs] = useState(() => {
    if (Array.isArray(job.logs) && job.logs.length > 0) return job.logs;

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

  const [checklist, setChecklist] = useState(() => (
    job.checklist && Object.keys(job.checklist).length > 0
      ? job.checklist
      : {
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
          referenceNumber: "pending",
        }
  ));

  const [elapsed, setElapsed] = useState(0);
  const [callStatus, setCallStatus] = useState(job.status !== "Pending" ? job.status : "Agent on Call");
  const [callConnected, setCallConnected] = useState(() => !job.isNewCall);
  const [summary, setSummary] = useState(() => job.summary || null);
  const [showToast, setShowToast] = useState(false);
  const feedRef = useRef(null);

  const debounceRef = useRef(null);
  const prevStatusRef = useRef(callStatus);
  const callInitiatedRef = useRef(false);
  const checklistRef = useRef(checklist);
  checklistRef.current = checklist;
  const summaryRef = useRef(summary);
  summaryRef.current = summary;

  // Debounce log/checklist writes to DB (every 2s), but flush immediately on status change
  useEffect(() => {
    const statusChanged = prevStatusRef.current !== callStatus;
    prevStatusRef.current = callStatus;

    const payload = { logs, checklist, status: callStatus };
    if (summaryRef.current) payload.summary = summaryRef.current;

    if (statusChanged) {
      // Status changes are critical — flush immediately
      clearTimeout(debounceRef.current);
      onJobUpdate?.(job.id, payload);
    } else {
      // Batch log/checklist updates
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onJobUpdate?.(job.id, payload);
      }, 2000);
    }

    return () => clearTimeout(debounceRef.current);
  }, [logs, checklist, summary, callStatus]);

  useEffect(() => {
    if (job.isNewCall && !callInitiatedRef.current) {
      callInitiatedRef.current = true;
      job.isNewCall = false;

      const initiateCall = async () => {
        try {
          await startCall(job);
          setLogs((prev) => [...prev, {
            id: "connected", timestamp: timestamp(), type: "system", source: "SYSTEM",
            message: "Representative connected. Call starting...",
          }]);
          setCallConnected(true);
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
      const endRes = await endCall(job.id);
      if (endRes?.summary) {
        summaryRef.current = endRes.summary;
        setSummary(endRes.summary);
      }
    } catch (error) {
    }
    setCallStatus("Completed");
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2500);
    onJobComplete?.(job.id, summaryRef.current);
  };

  useEffect(() => {
    const timer = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const isVisibleRef = useRef(isVisible);
  isVisibleRef.current = isVisible;

  useEffect(() => {
    if (!callConnected || callStatus === "Completed" || callStatus === "Call Error") return;

    let cursor = 0;
    let endCallTriggered = false;
    let pendingTopics = [];
    let vobiTurnText = "";
    let repTurnText = "";
    let stopped = false;
    let silenceTimer = null;

    const processMessage = (data) => {
      if (data.type === "ledger") {
        if (data.summary) {
          summaryRef.current = data.summary;
          setSummary(data.summary);
        }
        if (data.checklist && typeof data.checklist === "object") {
          let changed = false;
          const next = { ...checklistRef.current };
          for (const [k, v] of Object.entries(data.checklist)) {
            if (v === "complete" && next[k] === "pending") {
              next[k] = "complete";
              changed = true;
            }
          }
          if (changed) {
            pendingTopics = pendingTopics.filter((t) => next[t] !== "complete");
            checklistRef.current = next;
            setChecklist(next);
          }
        }
        return;
      }

      const text = (data.message || "").toLowerCase();

      setLogs((prev) => {
        const lastLog = prev[prev.length - 1];
        if (lastLog && lastLog.source === data.source) {
          const updatedLogs = [...prev];
          if (data.source === "REP") {
            const base = lastLog.committedText ?? (lastLog.interim ? "" : lastLog.message);
            const sep = base ? " " : "";
            const nextCommitted = data.interim ? base : `${base}${sep}${data.message.trim()}`;
            const display = data.interim ? `${base}${sep}${data.message.trim()}` : nextCommitted;
            updatedLogs[updatedLogs.length - 1] = {
              ...lastLog,
              message: display,
              committedText: nextCommitted,
              interim: Boolean(data.interim),
              timestamp: timestamp(),
            };
            return updatedLogs;
          }
          const rawText = (lastLog.rawMessage ?? lastLog.message) + data.message;
          updatedLogs[updatedLogs.length - 1] = {
            ...lastLog,
            rawMessage: rawText,
            message: rawText.replace(/\[\s*END\s*_?\s*CALL\s*\]/gi, "").trim(),
            timestamp: timestamp(),
          };
          return updatedLogs;
        }
        const rawInitial = data.message;
        return [
          ...prev,
          {
            id: Date.now() + Math.random(),
            timestamp: timestamp(),
            type: data.type,
            source: data.source,
            rawMessage: rawInitial,
            message:
              data.source === "VOBI"
                ? rawInitial.replace(/\[\s*END\s*_?\s*CALL\s*\]/gi, "").trim()
                : rawInitial,
            committedText: data.source === "REP" && !data.interim ? data.message.trim() : "",
            interim: Boolean(data.interim),
          },
        ];
      });

      if (data.source === "VOBI") {
        repTurnText = "";
        vobiTurnText += data.message;
        const detected = detectTopics(vobiTurnText, job.cptCodes);
        if (isDispute(vobiTurnText)) {
          const disputeTargets = detected.filter((t) => t !== "cpt");
          if (disputeTargets.length > 0) {
            const next = { ...checklistRef.current };
            for (const topic of disputeTargets) {
              if (next[topic] === "complete") next[topic] = "pending";
              if (!pendingTopics.includes(topic)) pendingTopics.push(topic);
            }
            checklistRef.current = next;
            setChecklist(next);
          }
        } else {
          pendingTopics = pendingTopics.filter((t) => checklistRef.current[t] !== "complete");
          for (const topic of detected) {
            if (checklistRef.current[topic] !== "complete" && !pendingTopics.includes(topic)) {
              pendingTopics.push(topic);
            }
          }
        }
      }

      if (data.source === "REP" && !data.interim) {
        vobiTurnText = "";
        repTurnText = repTurnText ? `${repTurnText} ${text.trim()}` : text.trim();
        const result = updateChecklistFromRep(
          repTurnText,
          checklistRef.current,
          pendingTopics,
          job.cptCodes
        );
        pendingTopics = result.pendingTopics;
        checklistRef.current = result.checklist;
        setChecklist(result.checklist);
      }
    };

    const poll = async () => {
      if (stopped) return;
      try {
        const res = await pollMessages(job.id, cursor);
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
      if (!stopped) setTimeout(poll, isVisibleRef.current ? 150 : 500);
    };

    poll();

    return () => {
      stopped = true;
      if (silenceTimer) clearTimeout(silenceTimer);
    };
  }, [job.id, callConnected, callStatus]);

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
          {callStatus === "Completed" && onViewSummary ? (
            <Button onClick={() => onViewSummary(job.id, summaryRef.current)} variant="primary">
              View Summary
            </Button>
          ) : (
            <Button onClick={handleEndCall} disabled={callStatus === "Completed"} variant="danger">
              End Call
            </Button>
          )}
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
