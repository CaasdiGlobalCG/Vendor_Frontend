import ifscCsvData from '../data/IFSC.csv?raw';

// Parse CSV data into an array of objects
export const parseIFSCData = () => {
  const lines = ifscCsvData.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  
  const data = [];
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '') continue;
    
    // Handle quoted CSV values
    const row = {};
    const values = parseCSVLine(lines[i]);
    
    headers.forEach((header, index) => {
      row[header] = values[index] ? values[index].trim() : '';
    });
    
    data.push(row);
  }
  
  return data;
};

// Helper function to parse CSV line with proper quote handling
const parseCSVLine = (line) => {
  const result = [];
  let current = '';
  let insideQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        current += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current);
  return result;
};

// Search for IFSC code and return bank details
export const searchIFSCCode = (ifscCode) => {
  if (!ifscCode || ifscCode.trim() === '') {
    return null;
  }
  
  const ifscData = parseIFSCData();
  const upperIFSC = ifscCode.toUpperCase().trim();
  
  // Search for exact match
  const result = ifscData.find(row => row.IFSC && row.IFSC.toUpperCase().trim() === upperIFSC);
  
  if (result) {
    return {
      bankName: result.BANK || '',
      branchName: result.BRANCH || '',
      branchAddress: result.ADDRESS || '',
      city: result.CITY || '',
      state: result.STATE || '',
      district: result.DISTRICT || '',
      found: true
    };
  }
  
  return {
    found: false,
    bankName: '',
    branchName: '',
    branchAddress: '',
    city: '',
    state: '',
    district: ''
  };
};
