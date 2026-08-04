import React, { useState, useRef } from 'react';
import { PAYERS } from '../data/seedData';
import { IconX } from './icons';
import InputField from './InputField';

export default function NewVobModal({ onClose, onSubmit }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dob, setDob] = useState('');
  const [payer, setPayer] = useState('Aetna');
  const [memberId, setMemberId] = useState('');
  const [npi, setNpi] = useState('1487624930');
  const [cptCodes, setCptCodes] = useState([]);
  const [cptInput, setCptInput] = useState('');
  const cptRef = useRef(null);

  const handleAddCpt = (e) => {
    if (e.key === 'Enter' && cptInput.trim()) {
      e.preventDefault();
      const code = cptInput.trim();
      if (!cptCodes.includes(code)) {
        setCptCodes([...cptCodes, code]);
      }
      setCptInput('');
    }
  };

  const handleRemoveCpt = (code) => {
    setCptCodes(cptCodes.filter((c) => c !== code));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!firstName || !lastName || !memberId || cptCodes.length === 0) return;

    const jobData = {
      id: `VOB-${Date.now()}`,
      patientFirstName: firstName,
      patientLastName: lastName,
      dob,
      insurance: payer,
      memberId,
      npi,
      cptCodes,
      submitted: 'Just now',
      status: 'Agent on Call',
    };

    try {
      // Trigger the local Python backend to start the Pipecat agent
      await fetch('http://localhost:8000/start-call', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(jobData),
      });
    } catch (error) {
      console.error("Failed to start Vobi backend:", error);
    }

    onSubmit(jobData);
  };

  const isValid = firstName && lastName && memberId && cptCodes.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex justify-end modal-overlay" onClick={onClose}>
      <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]" />

      <div
        className="relative w-full max-w-md bg-white shadow-2xl border-l border-gray-200 flex flex-col modal-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          id="close-modal"
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
        >
          <IconX className="w-4 h-4 text-gray-500" />
        </button>

        <div className="p-6 flex-1 overflow-y-auto">
          <h2 className="text-lg font-bold text-gray-900 mb-1">New VOB request</h2>
          <p className="text-sm text-gray-500 mb-6">
            Vobi tries the payer API first, then calls the insurer if needed.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <InputField id="input-firstName" label="Patient first name" value={firstName} onChange={setFirstName} placeholder="John" />
              <InputField id="input-lastName" label="Patient last name" value={lastName} onChange={setLastName} placeholder="Doe" />
            </div>

            <InputField id="input-dob" label="Date of birth" type="date" value={dob} onChange={setDob} />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Payer</label>
                <select
                  id="input-payer"
                  value={payer}
                  onChange={(e) => setPayer(e.target.value)}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 transition-all appearance-none"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                    backgroundPosition: 'right 0.5rem center',
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: '1.5em 1.5em',
                  }}
                >
                  {PAYERS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <InputField id="input-memberId" label="Member ID" value={memberId} onChange={setMemberId} placeholder="W2749183021" />
            </div>

            <InputField id="input-npi" label="Provider NPI" value={npi} onChange={setNpi} placeholder="1487624930" />

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-gray-600">CPT codes</label>
                <span className="text-[10px] text-gray-400">Press Enter to add</span>
              </div>
              <div
                className="flex flex-wrap items-center gap-1.5 min-h-[44px] px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus-within:ring-2 focus-within:ring-brand-500/20 focus-within:border-brand-400 transition-all cursor-text"
                onClick={() => cptRef.current?.focus()}
              >
                {cptCodes.map((code) => (
                  <span
                    key={code}
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-brand-100 text-brand-700 rounded text-xs font-medium"
                  >
                    {code}
                    <button
                      type="button"
                      onClick={() => handleRemoveCpt(code)}
                      className="text-brand-400 hover:text-brand-700 transition-colors"
                    >
                      <IconX className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                <input
                  ref={cptRef}
                  id="input-cpt"
                  type="text"
                  value={cptInput}
                  onChange={(e) => setCptInput(e.target.value)}
                  onKeyDown={handleAddCpt}
                  placeholder={cptCodes.length === 0 ? 'e.g. 99214' : ''}
                  className="flex-1 min-w-[60px] bg-transparent text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none"
                />
              </div>
            </div>

            <button
              id="btn-start-agent"
              type="submit"
              disabled={!isValid}
              className={`w-full flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-semibold transition-all duration-200 ${
                isValid
                  ? 'bg-brand-600 text-white shadow-md shadow-brand-600/25 hover:bg-brand-700 hover:shadow-lg hover:shadow-brand-600/30 active:scale-[0.98]'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
              Start Vobi Agent
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
