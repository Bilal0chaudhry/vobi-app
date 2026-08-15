import React, { useState, useEffect } from 'react';
import PageHeader from '../ui/PageHeader';
import InputField from '../ui/InputField';
import Button from '../ui/Button';
import Toast from '../ui/Toast';
import { updateProfile, updateSettings } from '../../utils/db';
import { validateName, validateOrganization, validateNpi, validateTaxId, validatePhone, formatTaxId, formatPhone } from '../../utils/validation';

function Toggle({ id, checked, onChange }) {
  return (
    <button
      id={id}
      type="button"
      className="toggle-switch"
      data-on={checked.toString()}
      onClick={() => onChange(!checked)}
      aria-pressed={checked}
    >
      <span className="toggle-dot" />
    </button>
  );
}

function ToggleRow({ id, label, description, checked, onChange }) {
  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-900">{label}</p>
          <p className="text-xs text-gray-500 mt-0.5">{description}</p>
        </div>
        <Toggle id={id} checked={checked} onChange={onChange} />
      </div>
      <div className="border-t border-gray-100" />
    </>
  );
}

export default function Settings({ profile, settings, onProfileUpdate, onSettingsUpdate }) {
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [organization, setOrganization] = useState(profile?.organization || '');
  const [defaultNpi, setDefaultNpi] = useState(settings?.npi || '');
  const [taxId, setTaxId] = useState(settings?.tax_id || '');
  const [callbackNumber, setCallbackNumber] = useState(settings?.callback_number || '');
  const [autoRedial, setAutoRedial] = useState(settings?.auto_redial ?? false);
  const [callRecording, setCallRecording] = useState(settings?.call_recording ?? false);
  
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState({ show: false, type: 'success', message: '' });

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setOrganization(profile.organization || '');
    }
  }, [profile]);

  useEffect(() => {
    if (settings) {
      setDefaultNpi(settings.npi || '');
      setTaxId(settings.tax_id || '');
      setCallbackNumber(settings.callback_number || '');
      setAutoRedial(settings.auto_redial ?? false);
      setCallRecording(settings.call_recording ?? false);
    }
  }, [settings]);

  useEffect(() => {
    const newErrors = {};
    
    if (fullName) {
      if (fullName.length < 2) newErrors.fullName = 'Name must be at least 2 characters';
      else if (fullName.length > 50) newErrors.fullName = 'Name cannot exceed 50 characters';
      else if (!validateName(fullName)) {
        newErrors.fullName = 'Name must contain only letters and single spaces (no symbols)';
      }
    }

    if (organization) {
      if (organization.length < 2) newErrors.organization = 'Practice name must be at least 2 characters';
      else if (organization.length > 100) newErrors.organization = 'Practice name cannot exceed 100 characters';
      else if (!validateOrganization(organization)) {
        newErrors.organization = 'Practice name cannot contain special symbols or trailing spaces';
      }
    }

    if (defaultNpi && !validateNpi(defaultNpi)) {
      newErrors.defaultNpi = 'NPI must be exactly 10 digits';
    }

    if (taxId && !validateTaxId(taxId)) {
      newErrors.taxId = 'Tax ID must be in format XX-XXXXXXX';
    }

    if (callbackNumber && !validatePhone(callbackNumber)) {
      newErrors.callbackNumber = 'Callback must be (XXX) XXX-XXXX';
    }
    
    setErrors(newErrors);
  }, [fullName, organization, defaultNpi, taxId, callbackNumber]);
  const handleNpiChange = (val) => setDefaultNpi(val.replace(/\D/g, '').slice(0, 10));
  const handleTaxIdChange = (val) => setTaxId(formatTaxId(val));
  const handlePhoneChange = (val) => setCallbackNumber(formatPhone(val));

  const profileHasChanges = 
    fullName !== (profile?.full_name || '') ||
    organization !== (profile?.organization || '');

  const settingsHasChanges = 
    defaultNpi !== (settings?.npi || '') ||
    taxId !== (settings?.tax_id || '') ||
    callbackNumber !== (settings?.callback_number || '') ||
    autoRedial !== (settings?.auto_redial ?? false) ||
    callRecording !== (settings?.call_recording ?? false);

  const isValid = Object.keys(errors).length === 0;
  const canSave = (profileHasChanges || settingsHasChanges) && isValid;

  const showToastMsg = (type, message) => {
    setToast({ show: false, type, message: '' });
    setTimeout(() => setToast({ show: true, type, message }), 10);
  };

  const handleSave = async () => {
    if (!canSave) return;
    setIsSaving(true);
    try {
      if (profileHasChanges) {
        const p = await updateProfile(profile.id, { full_name: fullName, organization });
        onProfileUpdate(p);
      }
      
      if (settingsHasChanges) {
        const s = await updateSettings(profile.id, {
          npi: defaultNpi,
          tax_id: taxId,
          callback_number: callbackNumber,
          auto_redial: autoRedial,
          call_recording: callRecording,
        });
        onSettingsUpdate(s);
      }
      
      showToastMsg('success', 'Settings saved successfully');
    } catch (err) {
      if (err.message === 'Failed to fetch') {
        showToastMsg('error', 'Network error. Please check your connection.');
      } else {
        showToastMsg('error', 'Failed to save settings: ' + err.message);
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="animate-fade-in relative">
      {toast.show && (
        <Toast 
          type={toast.type} 
          message={toast.message} 
          onClose={() => setToast({ show: false, type: 'success', message: '' })} 
        />
      )}

      <PageHeader title="Settings" subtitle="Practice profile and agent behavior" />

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
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

        <div className="xl:col-span-4 space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="border-b border-gray-100 pb-4 mb-5">
              <h2 className="text-base font-bold text-gray-900">Agent Behavior</h2>
              <p className="text-sm text-gray-500 mt-1">Control how Vobi handles calls.</p>
            </div>
            <div className="space-y-5">
              <ToggleRow 
                id="toggle-redial"       
                label="Auto re-dial on hold drop" 
                description="Redial and re-navigate the IVR if the call drops." 
                checked={autoRedial} 
                onChange={setAutoRedial} 
              />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Call recordings</p>
                  <p className="text-xs text-gray-500 mt-0.5">Store audio alongside transcripts.</p>
                </div>
                <Toggle 
                  id="toggle-recordings" 
                  checked={callRecording} 
                  onChange={setCallRecording} 
                />
              </div>
            </div>
          </div>

          <div className="bg-brand-50 rounded-xl border border-brand-100 p-6 shadow-sm">
            <h2 className="text-sm font-bold text-brand-900 mb-2">Unsaved Changes</h2>
            <p className="text-sm text-brand-700 mb-5">
              {canSave 
                ? "You have modified your settings. Review and save them to apply." 
                : (!isValid 
                    ? "Please fix the validation errors before you can save." 
                    : "Your settings are up to date.")}
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
