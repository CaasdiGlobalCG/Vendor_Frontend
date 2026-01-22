// PAN Validation Utility
// Validates PAN format according to Income Tax Department of India rules

export function validatePAN(pan) {
  const cleanPAN = (pan || '').trim().toUpperCase();

  if (cleanPAN.length !== 10) {
    return {
      isValid: false,
      validationLevel: 'FORMAT_ONLY',
      error: 'PAN must be exactly 10 characters long.',
    };
  }

  if (!/^[A-Z]{5}$/.test(cleanPAN.substring(0, 5))) {
    return {
      isValid: false,
      validationLevel: 'FORMAT_ONLY',
      error: 'Characters 1-5 must be uppercase letters (A-Z).',
    };
  }

  if (!/^\d{4}$/.test(cleanPAN.substring(5, 9))) {
    return {
      isValid: false,
      validationLevel: 'FORMAT_ONLY',
      error: 'Characters 6-9 must be digits (0-9).',
    };
  }

  if (!/^[A-Z]$/.test(cleanPAN.substring(9, 10))) {
    return {
      isValid: false,
      validationLevel: 'FORMAT_ONLY',
      error: 'Character 10 must be an uppercase letter (A-Z).',
    };
  }

  return {
    isValid: true,
    validationLevel: 'FORMAT_ONLY',
    message: 'PAN format is valid.',
  };
}

export default validatePAN;
