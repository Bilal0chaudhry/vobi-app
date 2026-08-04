import React, { useState } from 'react';
import { IconPlus } from './icons';

/** Reusable toggle switch */
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

/** Single labeled input field */
function SettingsField({ id, label, value, onChange }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1.5">{label}</label>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 transition-all"
      />
    </div>
  );
}

/** Single labeled toggle row */
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

export default function Settings({ onNewVerification }) {
  const [practiceName, setPracticeName] = useState('Northside Cardiology');
  const [defaultNpi, setDefaultNpi] = useState('1487624930');
  const [taxId, setTaxId] = useState('84-2910337');
  const [callbackNumber, setCallbackNumber] = useState('(312) 555-0184');

  return (
    <div className="animate-fade-in max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-500 mt-0.5">Practice profile and agent behavior</p>
        </div>
        <button
          id="btn-new-verification-settings"
          onClick={onNewVerification}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white text-sm font-semibold rounded-lg shadow-md shadow-brand-600/25 hover:bg-brand-700 hover:shadow-lg hover:shadow-brand-600/30 transition-all duration-200 active:scale-[0.97]"
        >
          <IconPlus />
          New Verification
        </button>
      </div>

      {/* Practice */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
        <h2 className="text-sm font-bold text-gray-900 mb-4">Practice</h2>
        <div className="grid grid-cols-2 gap-4">
          <SettingsField id="settings-practiceName" label="Practice name"       value={practiceName}    onChange={setPracticeName} />
          <SettingsField id="settings-npi"          label="Default provider NPI" value={defaultNpi}    onChange={setDefaultNpi} />
          <SettingsField id="settings-taxId"        label="Tax ID"              value={taxId}           onChange={setTaxId} />
          <SettingsField id="settings-callback"     label="Callback number"     value={callbackNumber}  onChange={setCallbackNumber} />
        </div>
      </div>

      {/* Agent behavior */}
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
      </div>
    </div>
  );
}
