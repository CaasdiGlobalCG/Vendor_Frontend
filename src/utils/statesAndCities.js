// Indian States and Major Cities
export const STATES_AND_CITIES = {
  "Andhra Pradesh": ["Hyderabad", "Vijayawada", "Visakhapatnam", "Tirupati", "Guntur", "Nellore"],
  "Arunachal Pradesh": ["Itanagar", "Naharlagun", "Pasighat", "Tezu"],
  "Assam": ["Guwahati", "Silchar", "Nagaon", "Dibrugarh", "Barpeta"],
  "Bihar": ["Patna", "Gaya", "Bhagalpur", "Muzaffarpur", "Darbhanga"],
  "Chhattisgarh": ["Raipur", "Bhilai", "Durg", "Bilaspur", "Rajnandgaon"],
  "Goa": ["Panaji", "Margao", "Vasco da Gama", "Mormugao"],
  "Gujarat": ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Jamnagar", "Gandhinagar", "Bhavnagar"],
  "Haryana": ["Faridabad", "Gurgaon", "Hisar", "Rohtak", "Panipat", "Ambala"],
  "Himachal Pradesh": ["Shimla", "Mandi", "Solan", "Kangra", "Kullu"],
  "Jharkhand": ["Ranchi", "Dhanbad", "Giridih", "Jamshedpur", "Hazaribagh"],
  "Karnataka": ["Bangalore", "Mysore", "Mangalore", "Belgaum", "Hubli", "Davanagere", "Kochi"],
  "Kerala": ["Kochi", "Thiruvananthapuram", "Kozhikode", "Thrissur", "Kottayam"],
  "Madhya Pradesh": ["Indore", "Bhopal", "Jabalpur", "Gwalior", "Ujjain", "Sagar"],
  "Maharashtra": ["Mumbai", "Pune", "Nagpur", "Nashik", "Aurangabad", "Solapur", "Kolhapur"],
  "Manipur": ["Imphal", "Bishnupur", "Kakching"],
  "Meghalaya": ["Shillong", "Tura", "Jowai"],
  "Mizoram": ["Aizawl", "Lunglei", "Saiha"],
  "Nagaland": ["Kohima", "Dimapur", "Mokokchung"],
  "Odisha": ["Bhubaneswar", "Cuttack", "Rourkela", "Sambalpur", "Balasore"],
  "Punjab": ["Ludhiana", "Amritsar", "Patiala", "Jalandhar", "Chandigarh"],
  "Rajasthan": ["Jaipur", "Jodhpur", "Ajmer", "Udaipur", "Bikaner", "Alwar"],
  "Sikkim": ["Gangtok", "Pelling", "Lachung"],
  "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Tiruppur", "Tirunelveli", "Erode"],
  "Telangana": ["Hyderabad", "Warangal", "Karimnagar", "Khammam", "Nizamabad"],
  "Tripura": ["Agartala", "Udaipur", "Ambassa"],
  "Uttar Pradesh": ["Lucknow", "Kanpur", "Varanasi", "Agra", "Meerut", "Ghaziabad", "Noida"],
  "Uttarakhand": ["Dehradun", "Haridwar", "Rishikesh", "Nainital", "Almora"],
  "West Bengal": ["Kolkata", "Howrah", "Darjeeling", "Siliguri", "Asansol"],
  "Delhi": ["New Delhi", "Old Delhi", "East Delhi", "West Delhi", "North Delhi"],
  "Chandigarh": ["Chandigarh"],
  "Puducherry": ["Puducherry", "Yanam", "Mahe"],
  "Ladakh": ["Leh", "Kargil"],
  "Jammu and Kashmir": ["Srinagar", "Jammu", "Anantnag", "Baramulla"],
};

export const getStates = () => {
  return Object.keys(STATES_AND_CITIES).sort();
};

export const getCitiesByState = (state) => {
  return STATES_AND_CITIES[state] || [];
};
