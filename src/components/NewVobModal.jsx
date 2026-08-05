import React, { useState, useRef } from 'react';
import { PAYERS } from '../data/seedData';
import { IconX } from './icons';
import InputField from './ui/InputField';
import Button from './ui/Button';
import Select from './ui/Select';
import Modal from './ui/Modal';

function SourceToggle({ value, onChange }) {
  return (
    <div className="flex items-center justify-between p-1 bg-gray-100 rounded-xl mb-6">
      <button
        type="button"
        id="toggle-call"
        onClick={() => onChange('call')}
        className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-semibold transition-all duration-200 ${
          value === 'call'
            ? 'bg-white text-brand-700 shadow-sm shadow-brand-600/10 border border-gray-200'
            : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.5 10.43a19.79 19.79 0 01-3.07-8.67A2 2 0 012.41 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.91a16 16 0 006.18 6.18l1.27-.76a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
        </svg>
        Call
      </button>

      <button
        type="button"
        id="toggle-portal"
        onClick={() => onChange('portal')}
        className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-semibold transition-all duration-200 ${
          value === 'portal'
            ? 'bg-white text-brand-700 shadow-sm shadow-brand-600/10 border border-gray-200'
            : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
        </svg>
        Portal
      </button>
    </div>
  );
}

export default function NewVobModal({ onClose, onSubmit, onPortalSubmit }) {
  const [source, setSource] = useState('call');
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
      status: source === 'portal' ? 'Portal Lookup' : 'Agent on Call',
      source,
    };

    if (source === 'portal') {
      // Route to the portal page
      onPortalSubmit(jobData);
      return;
    }

    // Call flow — existing behaviour
    try {
      await fetch('http://localhost:8000/start-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(jobData),
      });
    } catch (error) {
      console.error('Failed to start Vobi backend:', error);
    }

    onSubmit(jobData);
  };

  const isValid = firstName && lastName && memberId && cptCodes.length > 0;

  const description =
    source === 'call'
      ? 'Vobi tries the payer API first, then calls the insurer if needed.'
      : 'Vobi will query the Availity portal to retrieve benefits in real time.';

  const buttonIcon = (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
    </svg>
  );

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="New VOB request"
      description={description}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Source Toggle */}
        <div>
          <label className="text-xs font-medium text-gray-600 mb-2 block">
            Verification source
          </label>
          <SourceToggle value={source} onChange={setSource} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <InputField id="input-firstName" label="Patient first name" value={firstName} onChange={setFirstName} />
          <InputField id="input-lastName" label="Patient last name" value={lastName} onChange={setLastName} />
        </div>

        <InputField id="input-dob" label="Date of birth" type="date" value={dob} onChange={setDob} />

        <div className="grid grid-cols-2 gap-3">
          <Select
            id="input-payer"
            label="Payer"
            value={payer}
            onChange={(e) => setPayer(e.target.value)}
            options={PAYERS}
          />
          <InputField id="input-memberId" label="Member ID" value={memberId} onChange={setMemberId} />
        </div>

        <InputField id="input-npi" label="Provider NPI" value={npi} onChange={setNpi} />

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

        <Button
          id="btn-start-agent"
          type="submit"
          disabled={!isValid}
          fullWidth
        >
          {buttonIcon}
          Start Vobi Agent
        </Button>
      </form>
    </Modal>
  );
}
