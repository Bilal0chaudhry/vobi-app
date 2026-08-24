import React, { useState } from 'react';
import { IconPhone, IconBrowser, IconPlay, IconAlertCircle, IconSpin } from './icons';
import Button from './Button';
import Modal from './Modal';
import PatientForm from './PatientForm';

function SourceToggle({ value, onChange }) {
  return (
    <div className="flex items-center justify-between p-1 bg-surface-inset rounded-xl mb-6">
      <button
        type="button"
        id="toggle-call"
        onClick={() => onChange('call')}
        className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-semibold transition-all duration-200 ${
          value === 'call'
            ? 'bg-surface text-accent shadow-sm border border-border'
            : 'text-text-secondary hover:text-text-primary'
        }`}
      >
        <IconPhone />
        Call
      </button>

      <button
        type="button"
        id="toggle-portal"
        onClick={() => onChange('portal')}
        className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-semibold transition-all duration-200 ${
          value === 'portal'
            ? 'bg-surface text-accent shadow-sm border border-border'
            : 'text-text-secondary hover:text-text-primary'
        }`}
      >
        <IconBrowser />
        Portal
      </button>
    </div>
  );
}

export default function NewVobModal({ onClose, onSubmit, onPortalSubmit, profile }) {
  const [source, setSource] = useState('call');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    dob: '',
    payer: 'Cigna',
    memberId: '',
    groupNumber: '',
    providerOrgName: '',
    npi: profile?.npi || '',
    cptCodes: [],
  });
  
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (
      !formData.firstName || 
      !formData.lastName || 
      !formData.memberId || 
      !formData.dob || 
      !formData.npi || 
      (source === 'portal' && !formData.providerOrgName) ||
      (source === 'call' && formData.cptCodes.length === 0)
    ) {
      setError("Please fill out all required fields (DOB, NPI, etc).");
      return;
    }

    const jobData = {
      id: `VOB-${Date.now()}`,
      patientFirstName: formData.firstName,
      patientLastName: formData.lastName,
      dob: formData.dob,
      insurance: formData.payer,
      memberId: formData.memberId,
      groupNumber: formData.groupNumber,
      providerOrgName: formData.providerOrgName,
      npi: formData.npi,
      cptCodes: formData.cptCodes,
      submitted: 'Just now',
      status: source === 'portal' ? 'Portal Lookup' : 'Agent on Call',
      source,
      isNewCall: source === 'call',
    };

    if (source === 'portal') {
      onPortalSubmit(jobData);
      return;
    }

    onSubmit(jobData);
  };

  const isValid = Boolean(
    formData.firstName && 
    formData.lastName && 
    formData.memberId && 
    formData.dob && 
    formData.npi && 
    (source === 'call' || formData.providerOrgName) &&
    (source === 'portal' || formData.cptCodes.length > 0)
  );

  const description =
    source === 'call'
      ? 'Vobi tries the payer API first, then calls the insurer if needed.'
      : 'Vobi will query the insurance portal to retrieve benefits in real time.';

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="New VOB request"
      description={description}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="text-xs font-medium text-text-secondary mb-2 block">
            Verification source
          </label>
          <SourceToggle value={source} onChange={setSource} />
        </div>

        <PatientForm 
          formData={formData} 
          onChange={setFormData} 
          showCptCodes={source === 'call'} 
        />

        {error && (
          <div className="p-3 rounded-lg bg-status-danger text-status-danger-text text-sm font-medium border border-[var(--color-danger-bg)] flex items-center gap-2 animate-fade-in">
            <IconAlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <Button
          id="btn-start-agent"
          type="submit"
          disabled={!isValid || isStarting}
          fullWidth
        >
          {isStarting ? <IconSpin className="w-4 h-4 animate-spin" /> : <IconPlay className="w-4 h-4" />}
          {isStarting ? 'Waiting for representative to connect...' : 'Start Vobi Agent'}
        </Button>
      </form>
    </Modal>
  );
}
