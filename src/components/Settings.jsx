import React, { useState, useEffect } from 'react';
import PageHeader from './PageHeader';
import InputField from './InputField';

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

export default function Settings({ onNewVerification }) {
  const [practiceName, setPracticeName] = useState(() => localStorage.getItem('practiceName') || 'Northside Cardiology');
  const [defaultNpi, setDefaultNpi] = useState(() => localStorage.getItem('defaultNpi') || '1487624930');
  const [taxId, setTaxId] = useState(() => localStorage.getItem('taxId') || '84-2910337');
  const [callbackNumber, setCallbackNumber] = useState(() => localStorage.getItem('callbackNumber') || '(312) 555-0184');

  useEffect(() => { localStorage.setItem('practiceName', practiceName); }, [practiceName]);
  useEffect(() => { localStorage.setItem('defaultNpi', defaultNpi); }, [defaultNpi]);
  useEffect(() => { localStorage.setItem('taxId', taxId); }, [taxId]);
  useEffect(() => { localStorage.setItem('callbackNumber', callbackNumber); }, [callbackNumber]);

  return (
    <div className="animate-fade-in max-w-2xl mx-auto">
      <PageHeader
        title="Settings"
        subtitle="Practice profile and agent behavior"
        onNewVerification={onNewVerification}
        buttonId="btn-new-verification-settings"
      />

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
        <h2 className="text-sm font-bold text-gray-900 mb-4">Practice</h2>
        <div className="grid grid-cols-2 gap-4">
          <InputField id="settings-practiceName" label="Practice name"       value={practiceName}   onChange={setPracticeName} />
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
      </div>
    </div>
  );
}
