import { PAYER_PHONES } from './seedData';

/**
 * Builds a timed simulation script for a VOB call based on job data.
 * Each entry describes a log event: when it fires (delay ms), who said it,
 * and optionally which checklist item to mark complete.
 *
 * @param {object} job
 * @returns {Array<{delay: number, type: string, source: string, message: string, checklistUpdate?: string}>}
 */
export function buildSimScript(job) {
  const phone = PAYER_PHONES[job.insurance] || '1-800-555-0100';
  const cpt1 = job.cptCodes[0] || '99214';
  const cpt2 = job.cptCodes[1] || null;
  const patientName = `${job.patientFirstName} ${job.patientLastName}`;

  const script = [
    {
      delay: 0,
      type: 'system',
      source: 'SYSTEM',
      message: `Initiating VOB request for ${patientName}...`,
    },
    {
      delay: 1200,
      type: 'system',
      source: 'API',
      message: `Connecting to ${job.insurance} eligibility API...`,
    },
    {
      delay: 2800,
      type: 'system',
      source: 'API',
      message: 'API returned partial data. Routing to voice call.',
    },
    {
      delay: 4500,
      type: 'system',
      source: 'VOICE',
      message: `Dialing ${job.insurance} provider services: ${phone}`,
    },
    {
      delay: 6500,
      type: 'system',
      source: 'IVR',
      message: 'Navigating IVR menu... Pressing 1 for Provider Services',
    },
    {
      delay: 8000,
      type: 'system',
      source: 'IVR',
      message: `Entering NPI: ${job.npi}... Pressing 2 for Benefits`,
    },
    {
      delay: 9500,
      type: 'system',
      source: 'SYSTEM',
      message: 'Connected to representative. Hold time: 0m 42s',
      checklistUpdate: 'eligibility',
    },
    {
      delay: 11000,
      type: 'ai',
      source: 'VOBI',
      message: `Hi, I'm calling to verify benefits for a patient. Member ID ${job.memberId}, date of birth ${job.dob || 'on file'}.`,
    },
    {
      delay: 13500,
      type: 'rep',
      source: 'REP',
      message: 'Sure, let me pull that up. One moment please.',
    },
    {
      delay: 15500,
      type: 'rep',
      source: 'REP',
      message: 'Okay, I have the member. What information do you need?',
    },
    {
      delay: 17000,
      type: 'ai',
      source: 'VOBI',
      message: 'I need to verify eligibility status, deductible, and out-of-pocket maximum.',
    },
    {
      delay: 19000,
      type: 'rep',
      source: 'REP',
      message: 'The member is active. Individual deductible is $1,500, $2,800 remaining. OOP max is $6,000.',
      checklistUpdate: 'deductible',
    },
    {
      delay: 20500,
      type: 'system',
      source: 'DATA',
      message: '📊 Extracted: Deductible $1,500 (remaining $2,800) · OOP Max $6,000',
      checklistUpdate: 'oopMax',
    },
    {
      delay: 22000,
      type: 'ai',
      source: 'VOBI',
      message: `Thank you. I also need to check benefits for CPT ${cpt1}.`,
    },
    {
      delay: 24000,
      type: 'rep',
      source: 'REP',
      message: `CPT ${cpt1} is covered. Prior auth is not required. Allowed amount is $245.00.`,
      checklistUpdate: 'cpt1',
    },
  ];

  if (cpt2) {
    script.push(
      {
        delay: 26000,
        type: 'ai',
        source: 'VOBI',
        message: `And CPT ${cpt2}?`,
      },
      {
        delay: 28000,
        type: 'rep',
        source: 'REP',
        message: `CPT ${cpt2} is also covered. No prior auth needed. Allowed amount is $180.00.`,
        checklistUpdate: 'cpt2',
      }
    );
  }

  const afterCptDelay = cpt2 ? 29500 : 26000;

  script.push(
    {
      delay: afterCptDelay,
      type: 'ai',
      source: 'VOBI',
      message: "What's the copay or coinsurance for these services?",
    },
    {
      delay: afterCptDelay + 2000,
      type: 'rep',
      source: 'REP',
      message: "It's a 20% coinsurance after deductible for both codes.",
      checklistUpdate: 'copay',
    },
    {
      delay: afterCptDelay + 3500,
      type: 'ai',
      source: 'VOBI',
      message: "Perfect, that's everything I need. Thank you for your help.",
    },
    {
      delay: afterCptDelay + 5000,
      type: 'system',
      source: 'SYSTEM',
      message: '✅ Call complete. All verification items confirmed. Updating record.',
      checklistUpdate: 'done',
    }
  );

  return script;
}
