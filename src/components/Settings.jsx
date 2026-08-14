import React, { useState, useEffect } from 'react';
import PageHeader from './PageHeader';
import InputField from './ui/InputField';
import Button from './ui/Button';
import { updateProfile } from '../utils/db';

function Toggle({ id, defaultOn }) {
  const [on, setOn] = useState(defaultOn);
  return (
    <button
      id={id}
      type="button"
      className="toggle-switch"
      data-on={on.toString()}
      onClick={() => setOn(!on)}
      aria-pressed={on}
    >
      <span className="toggle-dot" />
    </button>
  );
}

function ToggleRow({ id, label, description, defaultOn }) {
  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-900">{label}</p>
          <p className="text-xs text-gray-500 mt-0.5">{description}</p>
        </div>
        <Toggle id={id} defaultOn={defaultOn} />
      </div>
      <div className="border-t border-gray-100" />
    </>
  );
}

export default function Settings({ profile, onProfileUpdate }) {
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [organization, setOrganization] = useState(profile?.organization || '');
  const [defaultNpi, setDefaultNpi] = useState(profile?.npi || '');
  const [taxId, setTaxId] = useState(profile?.tax_id || '');
  const [callbackNumber, setCallbackNumber] = useState(profile?.callback_number || '');
  
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setOrganization(profile.organization || '');
      setDefaultNpi(profile.npi || '');
      setTaxId(profile.tax_id || '');
      setCallbackNumber(profile.callback_number || '');
    }
  }, [profile]);

  // Hardcore Validation Rules
  useEffect(() => {
    const newErrors = {};
    
    // Name: 2-50 chars, no numbers or weird symbols
    if (fullName) {
      if (fullName.length < 2) newErrors.fullName = 'Name must be at least 2 characters';
      else if (fullName.length > 50) newErrors.fullName = 'Name cannot exceed 50 characters';
      else if (!/^[a-zA-Z\s\-']+$/.test(fullName)) newErrors.fullName = 'Name can only contain letters, spaces, hyphens, and apostrophes';
    }

    // Organization: 2-100 chars
    if (organization) {
      if (organization.length < 2) newErrors.organization = 'Practice name must be at least 2 characters';
      else if (organization.length > 100) newErrors.organization = 'Practice name cannot exceed 100 characters';
      else if (!/^[a-zA-Z0-9\s\-',.&]+$/.test(organization)) newErrors.organization = 'Contains invalid characters';
    }

    // NPI: Exactly 10 digits
    if (defaultNpi && !/^\d{10}$/.test(defaultNpi)) {
      newErrors.defaultNpi = 'NPI must be exactly 10 digits';
    }

    // Tax ID: XX-XXXXXXX
    if (taxId && !/^\d{2}-\d{7}$/.test(taxId)) {
      newErrors.taxId = 'Tax ID must be in format XX-XXXXXXX';
    }

    // Callback Number: (XXX) XXX-XXXX
    if (callbackNumber && !/^\(\d{3}\)\s\d{3}-\d{4}$/.test(callbackNumber)) {
      newErrors.callbackNumber = 'Callback must be (XXX) XXX-XXXX';
    }
    
    setErrors(newErrors);
  }, [fullName, organization, defaultNpi, taxId, callbackNumber]);

  // Auto-formatters for Inputs
  const handleNpiChange = (val) => {
    setDefaultNpi(val.replace(/\D/g, '').slice(0, 10)); // Only digits, max 10
  };

  const handleTaxIdChange = (val) => {
    const cleaned = val.replace(/\D/g, '').slice(0, 9);
    const match = cleaned.match(/^(\d{0,2})(\d{0,7})$/);
    if (!match) { setTaxId(''); return; }
    if (!match[2]) { setTaxId(match[1]); return; }
    setTaxId(`${match[1]}-${match[2]}`);
  };

  const handlePhoneChange = (val) => {
    const cleaned = val.replace(/\D/g, '').slice(0, 10);
    const match = cleaned.match(/^(\d{0,3})(\d{0,3})(\d{0,4})$/);
    if (!match) { setCallbackNumber(''); return; }
    if (!match[2]) { setCallbackNumber(match[1].length === 3 ? `(${match[1]}) ` : match[1]); return; }
    if (!match[3]) { setCallbackNumber(`(${match[1]}) ${match[2]}`); return; }
    setCallbackNumber(`(${match[1]}) ${match[2]}-${match[3]}`);
  };

  const hasChanges = 
    fullName !== (profile?.full_name || '') ||
    organization !== (profile?.organization || '') ||
    defaultNpi !== (profile?.npi || '') ||
    taxId !== (profile?.tax_id || '') ||
    callbackNumber !== (profile?.callback_number || '');

  const isValid = Object.keys(errors).length === 0;
  const canSave = hasChanges && isValid;

  const handleSave = async () => {
    if (!canSave) return;
    setIsSaving(true);
    try {
      const updates = {
        full_name: fullName,
        organization: organization,
        npi: defaultNpi,
        tax_id: taxId,
        callback_number: callbackNumber,
      };
      const newProfile = await updateProfile(profile.id, updates);
      onProfileUpdate(newProfile);
      
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (err) {
      alert('Failed to save settings: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="animate-fade-in relative">
      {showToast && (
        <div className="fixed top-6 right-6 z-50 animate-fade-in bg-emerald-500 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-sm font-medium">Settings saved successfully</span>
        </div>
      )}

      <PageHeader
        title="Settings"
        subtitle="Practice profile and agent behavior"
      />

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Left Column: Main Settings */}
        <div className="xl:col-span-8 space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="border-b border-gray-100 pb-4 mb-6">
              <h2 className="text-base font-bold text-gray-900">Practice Profile</h2>
              <p className="text-sm text-gray-500 mt-1">Manage your personal and organization details.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="col-span-1 md:col-span-2">
                <InputField id="settings-fullName"     label="Full Name"           value={fullName}       onChange={setFullName}       error={errors.fullName} />
              </div>
              <InputField id="settings-organization" label="Practice Name"       value={organization}   onChange={setOrganization}   error={errors.organization} />
              <InputField id="settings-npi"          label="Default provider NPI" value={defaultNpi}      onChange={handleNpiChange}    error={errors.defaultNpi} placeholder="e.g. 1487624930" />
              <InputField id="settings-taxId"        label="Tax ID"              value={taxId}           onChange={handleTaxIdChange}  error={errors.taxId} placeholder="e.g. 84-2910337" />
              <InputField id="settings-callback"     label="Callback number"     value={callbackNumber}  onChange={handlePhoneChange}  error={errors.callbackNumber} placeholder="e.g. (312) 555-0184" />
            </div>
          </div>
        </div>

        {/* Right Column: Preferences & Actions */}
        <div className="xl:col-span-4 space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="border-b border-gray-100 pb-4 mb-5">
              <h2 className="text-base font-bold text-gray-900">Agent Behavior</h2>
              <p className="text-sm text-gray-500 mt-1">Control how Vobi handles calls.</p>
            </div>
            <div className="space-y-5">
              <ToggleRow id="toggle-api-fastpath" label="API fast-path"         description="Try payer APIs before placing a voice call."          defaultOn={true} />
              <ToggleRow id="toggle-redial"       label="Auto re-dial on hold drop" description="Redial and re-navigate the IVR if the call drops." defaultOn={true} />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Call recordings</p>
                  <p className="text-xs text-gray-500 mt-0.5">Store audio alongside transcripts.</p>
                </div>
                <Toggle id="toggle-recordings" defaultOn={false} />
              </div>
            </div>
          </div>

          <div className="bg-brand-50 rounded-xl border border-brand-100 p-6 shadow-sm">
            <h2 className="text-sm font-bold text-brand-900 mb-2">Unsaved Changes</h2>
            <p className="text-sm text-brand-700 mb-5">
              {hasChanges 
                ? isValid 
                  ? "You have modified your settings. Review and save them to apply." 
                  : "Please fix the validation errors before you can save."
                : "Your settings are up to date."}
            </p>
            <Button onClick={handleSave} disabled={!canSave || isSaving} fullWidth className="py-2.5">
              {isSaving ? 'Saving to Database...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
