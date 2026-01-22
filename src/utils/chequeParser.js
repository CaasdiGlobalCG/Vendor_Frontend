/**
 * Parse extracted text from AWS Textract to extract cheque details
 * Specifically designed for Indian bank cheques
 */

export const parseChequeData = (textractBlocks) => {
  if (!textractBlocks || textractBlocks.length === 0) {
    return {
      success: false,
      accountNumber: null,
      accountName: null,
      confidence: 0,
      errors: ['No text detected in image']
    };
  }

  // Combine all detected text
  const fullText = textractBlocks
    .map(block => block.Text || '')
    .join(' ')
    .toUpperCase();

  const errors = [];
  let accountNumber = null;
  let accountName = null;
  let ifscCode = null;
  let accountNumberConfidence = 0;
  let accountNameConfidence = 0;
  let ifscConfidence = 0;

  // Extract Account Number
  const accountNumberResult = extractAccountNumber(fullText);
  if (accountNumberResult) {
    accountNumber = accountNumberResult.value;
    accountNumberConfidence = accountNumberResult.confidence;
  } else {
    errors.push('Account number not detected');
  }

  // Extract Account Name
  const accountNameResult = extractAccountName(textractBlocks);
  if (accountNameResult) {
    accountName = accountNameResult.value;
    accountNameConfidence = accountNameResult.confidence;
  } else {
    errors.push('Account name not detected');
  }

  // Extract IFSC Code
  const ifscResult = extractIFSCCode(fullText);
  if (ifscResult) {
    ifscCode = ifscResult.value;
    ifscConfidence = ifscResult.confidence;
  }

  // Calculate overall confidence (average of detected fields)
  let detectionCount = 0;
  let confidenceSum = 0;

  if (accountNumber) {
    detectionCount++;
    confidenceSum += accountNumberConfidence;
  }
  if (accountName) {
    detectionCount++;
    confidenceSum += accountNameConfidence;
  }
  if (ifscCode) {
    detectionCount++;
    confidenceSum += ifscConfidence;
  }

  const overallConfidence = detectionCount > 0 ? Math.round(confidenceSum / detectionCount) : 0;

  return {
    success: errors.length === 0,
    accountNumber,
    accountName,
    ifscCode,
    confidence: overallConfidence,
    fieldConfidence: {
      accountNumber: accountNumberConfidence,
      accountName: accountNameConfidence,
      ifscCode: ifscConfidence
    },
    errors: errors.length > 0 ? errors : null,
    warnings: generateWarnings(accountNumber, accountName, ifscCode)
  };
};

/**
 * Extract account number from cheque text
 * Indian cheques typically have account number at bottom left
 * Format: 9-18 consecutive digits
 */
const extractAccountNumber = (text) => {
  // Remove common prefixes that might appear before account number
  const cleanedText = text
    .replace(/ACCOUNT\s*(?:NO|NUMBER|#)?[\s:]*(?=\d)/gi, '')
    .replace(/ACCT\s*(?:NO|#)?[\s:]*(?=\d)/gi, '');

  // Pattern 1: Account number with 9-18 digits (most common)
  const pattern1 = /\b(\d{9,18})\b/;
  const match1 = cleanedText.match(pattern1);
  
  if (match1) {
    return {
      value: match1[1],
      confidence: 95 // High confidence for clear number patterns
    };
  }

  // Pattern 2: Look for "ACCOUNT" keyword followed by digits
  const pattern2 = /ACCOUNT\s*(?:NO|NUMBER|#)?[\s:]*(\d{9,18})/i;
  const match2 = text.match(pattern2);
  
  if (match2) {
    return {
      value: match2[1],
      confidence: 90
    };
  }

  // Pattern 3: Look for digits at end of lines (account number often at bottom)
  const lines = text.split(/[\n\r]+/);
  for (let i = lines.length - 1; i >= Math.max(0, lines.length - 5); i--) {
    const numberMatch = lines[i].match(/(\d{9,18})/);
    if (numberMatch) {
      return {
        value: numberMatch[1],
        confidence: 70 // Lower confidence for loose pattern
      };
    }
  }

  return null;
};

/**
 * Extract account holder name from cheque text
 * Typically appears after "For" keyword on the cheque
 * Usually 3-30 characters, single word or short phrase
 */
const extractAccountName = (textractBlocks) => {
  const blocks = textractBlocks || [];
  
  // Search through ALL blocks for "For" keyword
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const blockText = (block.Text || '').trim();
    
    // Look for "For" in the current block
    if (blockText.toUpperCase().includes('FOR')) {
      // Extract what comes after "For" in the same block or next block
      const forMatch = blockText.match(/FOR\s+([A-Za-z\s&.,'-]+?)$/i);
      
      if (forMatch && forMatch[1]) {
        const nameAfterFor = cleanNameText(forMatch[1].trim());
        if (nameAfterFor && nameAfterFor.length >= 3 && nameAfterFor.length <= 50) {
          return {
            value: nameAfterFor,
            confidence: 95
          };
        }
      }
      
      // If not found in same block, check the next block
      if (i + 1 < blocks.length) {
        const nextBlock = blocks[i + 1];
        const nextText = (nextBlock.Text || '').trim();
        
        // Only take the next block if it's not a keyword and is a reasonable length
        if (
          nextText &&
          nextText.length > 2 &&
          nextText.length <= 50 &&
          !nextText.match(/^(ACCOUNT|CURRENT|BANK|DATE|PAY|RS|RUPEES|CHEQUE|NO|VOID|MICR|IFSC|THREE|MONTHS|FROM|THE|AGAINST|PAYABLE|DRAWER|SIGNATURE)$/i)
        ) {
          const cleanedNext = cleanNameText(nextText);
          if (cleanedNext && cleanedNext.length >= 3) {
            return {
              value: cleanedNext,
              confidence: 92
            };
          }
        }
      }
    }
  }

  // Fallback: Try to find name in the entire text with strict pattern
  const fullText = blocks
    .map(block => block.Text || '')
    .join(' ');

  // Very strict pattern - "For" followed by 1-3 words, max 30 chars
  const forPattern = /FOR\s+([A-Z][A-Za-z\s&.,'-]{2,28})(?:\s{2,}|$)/i;
  const forMatch = fullText.match(forPattern);
  
  if (forMatch && forMatch[1]) {
    const extractedName = cleanNameText(forMatch[1].trim());
    if (extractedName && extractedName.length >= 3 && extractedName.length <= 50) {
      return {
        value: extractedName,
        confidence: 88
      };
    }
  }

  return null;
};

/**
 * Extract IFSC Code from cheque text
 * IFSC format: 4 uppercase letters + 0 + 6 alphanumeric characters (e.g., SBIN0001234)
 */
const extractIFSCCode = (text) => {
  // IFSC code pattern: 4 letters + 0 + 6 alphanumeric (case-insensitive in input, normalized to uppercase)
  const ifscPattern = /\b([A-Z]{4}0[A-Z0-9]{6})\b/gi;
  
  const matches = text.match(ifscPattern);
  if (matches && matches.length > 0) {
    // Take the first match found
    const ifscCode = matches[0].toUpperCase();
    return {
      value: ifscCode,
      confidence: 98 // IFSC is a standard format so high confidence
    };
  }

  // Try alternative format (sometimes there might be spaces)
  const alternativePattern = /([A-Z]{4})\s*0\s*([A-Z0-9]{6})/gi;
  const altMatch = text.match(alternativePattern);
  if (altMatch && altMatch.length > 0) {
    const cleaned = altMatch[0].replace(/\s+/g, '').toUpperCase();
    if (/^[A-Z]{4}0[A-Z0-9]{6}$/.test(cleaned)) {
      return {
        value: cleaned,
        confidence: 90
      };
    }
  }

  return null;
};

/**
 * Clean and normalize extracted name text
 */
const cleanNameText = (text) => {
  return text
    .replace(/[^A-Z\s&.,'-]/g, '') // Remove special characters
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim()
    .split(' ')
    .filter(word => word.length > 1) // Remove single letters
    .join(' ');
};

/**
 * Generate warnings for extracted data
 */
const generateWarnings = (accountNumber, accountName, ifscCode) => {
  const warnings = [];

  if (accountNumber) {
    // Check if account number format is valid
    if (accountNumber.length < 9 || accountNumber.length > 18) {
      warnings.push('Account number length is unusual. Please verify.');
    }

    // Check for common OCR errors in numbers
    if (/[O0]{2,}/.test(accountNumber)) {
      warnings.push('Account number may contain OCR errors (0/O confusion)');
    }
  }

  if (accountName) {
    // Check if name has only initials or is very short
    if (accountName.split(' ').length === 1 || accountName.length < 5) {
      warnings.push('Account name appears incomplete. Please verify.');
    }

    // Check for unusual patterns
    if (/\d{3,}/.test(accountName)) {
      warnings.push('Account name contains numbers. Please verify.');
    }
  }

  return warnings.length > 0 ? warnings : null;
};

/**
 * Validate extracted cheque data before accepting
 */
export const validateChequeData = (accountNumber, accountName) => {
  const validationErrors = [];

  if (!accountNumber) {
    validationErrors.push('Account number is required');
  } else if (!/^\d{9,18}$/.test(accountNumber.trim())) {
    validationErrors.push('Account number must be 9-18 digits');
  }

  if (!accountName) {
    validationErrors.push('Account name is required');
  } else if (accountName.trim().length < 3) {
    validationErrors.push('Account name must be at least 3 characters');
  }

  return {
    valid: validationErrors.length === 0,
    errors: validationErrors
  };
};
