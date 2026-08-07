import React from 'react';
import Section from './Section';
import InfoRow from './InfoRow';
import { IconUser } from '../icons';

export default function PatientDetails({ patient, subscriber, fallbackJob }) {
  return (
    <Section title="Patient" icon={<IconUser />}>
      <InfoRow 
        label="Name" 
        value={patient.name || `${fallbackJob?.patientFirstName || ''} ${fallbackJob?.patientLastName || ''}`.trim() || '-'} 
      />
      <InfoRow 
        label="Date of Birth" 
        value={patient.dob || fallbackJob?.dob || '-'} 
      />
      <InfoRow 
        label="Member ID" 
        value={patient.memberId || subscriber?.memberId || fallbackJob?.memberId || '-'} 
      />
      {subscriber?.groupNumber && (
        <InfoRow label="Group #" value={subscriber.groupNumber} />
      )}
      {patient.relationship && (
        <InfoRow label="Relationship" value={patient.relationship} />
      )}
    </Section>
  );
}
