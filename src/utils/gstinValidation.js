// GSTIN Validation Utility
// Validates GSTIN format according to Government of India GSTIN rules

// MOD-36 checksum validation
function calculateGSTINChecksum(first14Chars) {
  const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let sum = 0;
  let multiplier = 2;

  for (let i = first14Chars.length - 1; i >= 0; i--) {
    const charIndex = alphabet.indexOf(first14Chars[i]);
    if (charIndex === -1) return null;

    let product = charIndex * multiplier;
    if (product >= 36) {
      product = Math.floor(product / 36) + (product % 36);
    }
    sum += product;
    multiplier = multiplier === 2 ? 1 : 2;
  }

  const checksumIndex = (36 - (sum % 36)) % 36;
  return alphabet[checksumIndex];
}

export function validateGSTIN(gstin) {
  const cleanGSTIN = (gstin || '').trim().toUpperCase();

  if (cleanGSTIN.length !== 15) {
    return {
      isValid: false,
      validationLevel: 'FORMAT_ONLY',
      error: 'GSTIN must be exactly 15 characters long.',
    };
  }

  const stateCode = cleanGSTIN.substring(0, 2);
  if (!/^\d{2}$/.test(stateCode)) {
    return {
      isValid: false,
      validationLevel: 'FORMAT_ONLY',
      error: 'State code must be numeric.',
    };
  }

  const stateCodeNum = parseInt(stateCode, 10);
  if (stateCodeNum < 1 || stateCodeNum > 37) {
    return {
      isValid: false,
      validationLevel: 'FORMAT_ONLY',
      error: 'State code must be between 01 and 37.',
    };
  }

  const panPortion = cleanGSTIN.substring(2, 12);

  if (!/^[A-Z]{5}/.test(panPortion)) {
    return {
      isValid: false,
      validationLevel: 'FORMAT_ONLY',
      error: 'Characters 3-7 (PAN portion) must be uppercase letters (A-Z).',
    };
  }

  if (!/\d{4}/.test(panPortion.substring(5, 9))) {
    return {
      isValid: false,
      validationLevel: 'FORMAT_ONLY',
      error: 'Characters 8-11 (PAN portion) must be digits (0-9).',
    };
  }

  if (!/[A-Z]$/.test(panPortion)) {
    return {
      isValid: false,
      validationLevel: 'FORMAT_ONLY',
      error: 'Character 12 (PAN portion) must be an uppercase letter (A-Z).',
    };
  }

  const entityCode = cleanGSTIN[12];
  if (!/[1-9A-Z]/.test(entityCode)) {
    return {
      isValid: false,
      validationLevel: 'FORMAT_ONLY',
      error: 'Character 13 (entity code) must be alphanumeric (1-9 or A-Z).',
    };
  }

  if (cleanGSTIN[13] !== 'Z') {
    return {
      isValid: false,
      validationLevel: 'FORMAT_ONLY',
      error: 'Character 14 must always be "Z".',
    };
  }

  const first14 = cleanGSTIN.substring(0, 14);
  const expectedChecksum = calculateGSTINChecksum(first14);

  if (expectedChecksum === null) {
    return {
      isValid: false,
      validationLevel: 'FORMAT_ONLY',
      error: 'Invalid characters in GSTIN.',
    };
  }

  const providedChecksum = cleanGSTIN[14];
  if (providedChecksum !== expectedChecksum) {
    return {
      isValid: false,
      validationLevel: 'FORMAT_ONLY',
      error: 'Invalid GSTIN.',
    };
  }

  return {
    isValid: true,
    validationLevel: 'FORMAT_ONLY',
    message: 'GSTIN format is valid. This does not confirm registration status.',
  };
}

export default validateGSTIN;
