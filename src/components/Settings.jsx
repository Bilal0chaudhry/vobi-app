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

export default function Settings({ onNewVerification, profile, onProfileUpdate }) {
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [organization, setOrganization] = useState(profile?.organization || '');
  const [defaultNpi, setDefaultNpi] = useState(profile?.npi || '');
  const [taxId, setTaxId] = useState(profile?.tax_id || '');
  const [callbackNumber, setCallbackNumber] = useState(profile?.callback_number || '');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setOrganization(profile.organization || '');
      setDefaultNpi(profile.npi || '');
      setTaxId(profile.tax_id || '');
      setCallbackNumber(profile.callback_number || '');
    }
  }, [profile]);

  const handleSave = async () => {
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
      alert('Settings saved successfully!');
    } catch (err) {
      alert('Failed to save settings: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="animate-fade-in max-w-2xl mx-auto">
      <PageHeader
        title="Settings"
        subtitle="Practice profile and agent behavior"
        onNewVerification={onNewVerification}
        buttonId="btn-new-verification-settings"
      />

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
        <h2 className="text-sm font-bold text-gray-900 mb-4">Profile</h2>
        <div className="grid grid-cols-2 gap-4">
          <InputField id="settings-fullName"     label="Full Name"           value={fullName}       onChange={setFullName} />
          <InputField id="settings-organization" label="Practice Name"       value={organization}   onChange={setOrganization} />
          <InputField id="settings-npi"          label="Default provider NPI" value={defaultNpi}      onChange={setDefaultNpi} />
          <InputField id="settings-taxId"        label="Tax ID"              value={taxId}           onChange={setTaxId} />
          <InputField id="settings-callback"     label="Callback number"     value={callbackNumber}  onChange={setCallbackNumber} />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-sm font-bold text-gray-900 mb-5">Agent behavior</h2>
        <div className="space-y-5">
          <ToggleRow id="toggle-api-fastpath" label="API fast-path"         description="Try payer APIs before placing a voice call."          defaultOn={true} />
          <ToggleRow id="toggle-redial"       label="Auto re-dial on hold drop" description="Redial and re-navigate the IVR if the call drops." defaultOn={true} />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-900">Call recordings</p>
              <p className="text-xs text-gray-500 mt-0.5">Store audio alongside transcripts for 90 days.</p>
            </div>
            <Toggle id="toggle-recordings" defaultOn={false} />
          </div>
        </div>
        <div className="mt-8 pt-5 border-t border-gray-100 flex justify-end">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}
