export const validateName = (name) => /^[a-zA-Z\s]{2,50}$/.test(name);
export const validateOrganization = (org) => /^[a-zA-Z0-9\s.\-&]{2,100}$/.test(org);
export const validatePassword = (pass) => pass.length >= 8;
export const validateNpi = (npi) => /^\d{10}$/.test(npi);
export const validateTaxId = (taxId) => /^\d{2}-\d{7}$/.test(taxId);
export const validatePhone = (phone) => /^\(\d{3}\) \d{3}-\d{4}$/.test(phone);

export const formatTaxId = (value) => {
  const digits = value.replace(/\D/g, '').substring(0, 9);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}-${digits.slice(2)}`;
};

export const formatPhone = (value) => {
  const digits = value.replace(/\D/g, '').substring(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
};
