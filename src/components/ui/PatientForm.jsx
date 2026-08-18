import React, { useRef, useState } from 'react';
import InputField from './InputField';
import Select from './Select';
import { IconX } from './icons';
import { PAYERS } from '../../utils/constants';

export default function PatientForm({ 
  formData, 
  onChange, 
  showCptCodes = false 
}) {
  const [cptInput, setCptInput] = useState('');
  const cptRef = useRef(null);

  const updateField = (field, value) => {
    onChange({ ...formData, [field]: value });
  };

  const handleAddCpt = (e) => {
    if (e.key === 'Enter' && cptInput.trim()) {
      e.preventDefault();
      const code = cptInput.trim();
      const currentCodes = formData.cptCodes || [];
      if (!currentCodes.includes(code)) {
        updateField('cptCodes', [...currentCodes, code]);
      }
      setCptInput('');
    }
  };

  const handleRemoveCpt = (code) => {
    const currentCodes = formData.cptCodes || [];
    updateField('cptCodes', currentCodes.filter((c) => c !== code));
  };

  const fillDemoData = (e) => {
    e.preventDefault();
    onChange({
      ...formData,
      firstName: 'James',
      lastName: 'Jones',
      dob: '1991-02-02',
      payer: 'Cigna',
      memberId: '23456789100',
      npi: '1999999984',
      providerOrgName: 'Vobi Healthcare LLC',
      groupNumber: '00123874',
      cptCodes: formData.cptCodes || []
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex justify-end mb-2">
        <button
          type="button"
          onClick={fillDemoData}
          className="text-xs text-brand-600 font-semibold hover:text-brand-800 transition-colors"
        >
          Fill Demo Data
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <InputField id="input-firstName" label="Patient first name" value={formData.firstName || ''} onChange={(val) => updateField('firstName', val)} />
        <InputField id="input-lastName" label="Patient last name" value={formData.lastName || ''} onChange={(val) => updateField('lastName', val)} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <InputField id="input-dob" label="Date of birth" type="date" value={formData.dob || ''} onChange={(val) => updateField('dob', val)} max="9999-12-31" />
        <InputField id="input-memberId" label="Member ID" value={formData.memberId || ''} onChange={(val) => updateField('memberId', val)} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Select
          id="input-payer"
          label="Payer"
          value={formData.payer || 'Aetna'}
          onChange={(e) => updateField('payer', e.target.value)}
          options={PAYERS.map(p => ({ value: p, label: p }))}
        />
        <InputField id="input-groupNumber" label="Group Number (Optional)" value={formData.groupNumber || ''} onChange={(val) => updateField('groupNumber', val)} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <InputField id="input-providerOrgName" label="Provider Org Name" value={formData.providerOrgName || ''} onChange={(val) => updateField('providerOrgName', val)} placeholder="e.g. Vobi Healthcare LLC" />
        <InputField id="input-npi" label="Provider NPI" value={formData.npi || '1487624930'} onChange={(val) => updateField('npi', val)} />
      </div>

      {showCptCodes && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-medium text-gray-600">CPT codes</label>
            <span className="text-[10px] text-gray-400">Press Enter to add</span>
          </div>
          <div
            className="flex flex-wrap items-center gap-1.5 min-h-[44px] px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus-within:ring-2 focus-within:ring-brand-500/20 focus-within:border-brand-400 transition-all cursor-text"
            onClick={() => cptRef.current?.focus()}
          >
            {(formData.cptCodes || []).map((code) => (
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
              placeholder={(formData.cptCodes || []).length === 0 ? 'e.g. 99214' : ''}
              className="flex-1 min-w-[60px] bg-transparent text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none"
            />
          </div>
        </div>
      )}
    </div>
  );
}
