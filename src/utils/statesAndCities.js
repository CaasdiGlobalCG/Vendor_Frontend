// All Indian states and union territories with their cities and towns.
// The full list lives in src/data/indiaStatesAndCities.json (36 states and union territories,
// about 4,200 cities and towns). It is added to here with the names people commonly use that
// the dataset spells differently, and with names vendors already saved on earlier forms.
import INDIA_LOCATIONS from '../data/indiaStatesAndCities.json';

const COMMON_NAMES = {
  "Andhra Pradesh": ["Visakhapatnam", "Vijayawada", "Tirupati", "Guntur", "Nellore", "Kakinada", "Rajahmundry", "Kurnool", "Amaravati"],
  "Arunachal Pradesh": ["Itanagar", "Naharlagun", "Pasighat", "Tezu"],
  "Assam": ["Guwahati", "Silchar", "Dibrugarh", "Jorhat", "Nagaon", "Tezpur"],
  "Bihar": ["Patna", "Gaya", "Bhagalpur", "Muzaffarpur", "Darbhanga", "Purnia"],
  "Chhattisgarh": ["Raipur", "Bhilai", "Durg", "Bilaspur", "Rajnandgaon", "Korba"],
  "Goa": ["Panaji", "Margao", "Vasco da Gama", "Mormugao", "Mapusa", "Ponda"],
  "Gujarat": ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Jamnagar", "Gandhinagar", "Bhavnagar"],
  "Haryana": ["Faridabad", "Gurgaon", "Gurugram", "Hisar", "Rohtak", "Panipat", "Ambala", "Karnal", "Sonipat"],
  "Himachal Pradesh": ["Shimla", "Mandi", "Solan", "Kangra", "Kullu", "Dharamshala", "Manali"],
  "Jharkhand": ["Ranchi", "Dhanbad", "Jamshedpur", "Bokaro", "Hazaribagh", "Giridih"],
  "Karnataka": ["Bangalore", "Bengaluru", "Mysore", "Mysuru", "Mangalore", "Mangaluru", "Belgaum", "Belagavi", "Hubli", "Hubballi", "Dharwad", "Davanagere", "Tumakuru", "Shivamogga", "Ballari"],
  "Kerala": ["Kochi", "Cochin", "Thiruvananthapuram", "Trivandrum", "Kozhikode", "Calicut", "Thrissur", "Kottayam", "Kollam", "Palakkad", "Alappuzha", "Kannur"],
  "Madhya Pradesh": ["Indore", "Bhopal", "Jabalpur", "Gwalior", "Ujjain", "Sagar"],
  "Maharashtra": ["Mumbai", "Pune", "Nagpur", "Nashik", "Aurangabad", "Chhatrapati Sambhajinagar", "Solapur", "Kolhapur", "Thane", "Navi Mumbai", "Amravati"],
  "Manipur": ["Imphal", "Bishnupur", "Kakching", "Thoubal"],
  "Meghalaya": ["Shillong", "Tura", "Jowai"],
  "Mizoram": ["Aizawl", "Lunglei", "Saiha"],
  "Nagaland": ["Kohima", "Dimapur", "Mokokchung"],
  "Odisha": ["Bhubaneswar", "Cuttack", "Rourkela", "Sambalpur", "Balasore", "Puri", "Berhampur"],
  "Punjab": ["Ludhiana", "Amritsar", "Patiala", "Jalandhar", "Bathinda", "Mohali", "SAS Nagar"],
  "Rajasthan": ["Jaipur", "Jodhpur", "Ajmer", "Udaipur", "Bikaner", "Alwar", "Kota"],
  "Sikkim": ["Gangtok", "Pelling", "Lachung", "Namchi", "Mangan"],
  "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Tiruppur", "Tirunelveli", "Erode", "Salem", "Tiruchirappalli", "Trichy", "Vellore", "Thoothukudi", "Hosur"],
  "Telangana": ["Hyderabad", "Secunderabad", "Warangal", "Karimnagar", "Nizamabad", "Khammam"],
  "Tripura": ["Agartala", "Udaipur", "Dharmanagar", "Ambassa"],
  "Uttar Pradesh": ["Lucknow", "Kanpur", "Varanasi", "Agra", "Meerut", "Ghaziabad", "Noida", "Greater Noida", "Prayagraj", "Allahabad", "Bareilly", "Aligarh", "Moradabad", "Gorakhpur"],
  "Uttarakhand": ["Dehradun", "Haridwar", "Rishikesh", "Nainital", "Almora", "Haldwani", "Roorkee"],
  "West Bengal": ["Kolkata", "Howrah", "Darjeeling", "Siliguri", "Asansol", "Durgapur"],
  "Delhi": ["New Delhi", "Delhi", "Old Delhi", "East Delhi", "West Delhi", "North Delhi", "South Delhi"],
  "Chandigarh": ["Chandigarh"],
  "Puducherry": ["Puducherry", "Pondicherry", "Karaikal", "Yanam", "Mahe"],
  "Ladakh": ["Leh", "Kargil"],
  "Jammu and Kashmir": ["Srinagar", "Jammu", "Anantnag", "Baramulla", "Udhampur", "Kathua"],
  "Andaman and Nicobar Islands": ["Port Blair"],
  "Lakshadweep": ["Kavaratti"],
  "Dadra and Nagar Haveli and Daman and Diu": ["Daman", "Diu", "Silvassa"],
};

const byName = (a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' });

const build = () => {
  const out = {};
  const states = new Set([...Object.keys(INDIA_LOCATIONS), ...Object.keys(COMMON_NAMES)]);
  states.forEach((state) => {
    const merged = new Map();
    [...(INDIA_LOCATIONS[state] || []), ...(COMMON_NAMES[state] || [])].forEach((city) => {
      const name = String(city || '').trim();
      if (name) merged.set(name.toLowerCase(), merged.get(name.toLowerCase()) || name);
    });
    out[state] = [...merged.values()].sort(byName);
  });
  return out;
};

export const STATES_AND_CITIES = build();

export const getStates = () => Object.keys(STATES_AND_CITIES).sort(byName);

export const getCitiesByState = (state) => STATES_AND_CITIES[state] || [];
