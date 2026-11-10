import { GeoPoint, VehicleOption } from '../types';

export const POPULAR_LOCATIONS: GeoPoint[] = [
  {
    name: 'Sector V Metro Station (Gate 2)',
    address: 'Salt Lake Sector V, Bidhannagar, Kolkata, West Bengal',
    landmark: 'Opposite RDB Cinemas & Metro Pillar 42',
    lat: 22.5804,
    lng: 88.4378,
    zone: 'Metro Transit'
  },
  {
    name: 'City Centre 1 Mall',
    address: 'DC Block, Sector 1, Bidhannagar, Kolkata, West Bengal',
    landmark: 'Main Entrance Gate 1, Kund Area',
    lat: 22.5898,
    lng: 88.4087,
    zone: 'Shopping & Leisure'
  },
  {
    name: 'Karunamoyee Bus & Metro Terminal',
    address: 'Central Park East, Salt Lake, Kolkata, West Bengal',
    landmark: 'Near Bikas Bhavan & Central Park Gate 3',
    lat: 22.5866,
    lng: 88.4208,
    zone: 'Bus & Metro'
  },
  {
    name: 'DLF 2 IT Park',
    address: 'Action Area II, New Town, Kolkata, West Bengal',
    landmark: 'Near Akankha More & Tata Medical Center',
    lat: 22.5936,
    lng: 88.4725,
    zone: 'IT & Offices'
  },
  {
    name: 'Eco Space Business Park',
    address: 'Plot IIF/11, Action Area II, New Town, Kolkata, West Bengal',
    landmark: 'Amity University Road',
    lat: 22.5865,
    lng: 88.4878,
    zone: 'IT & Offices'
  },
  {
    name: 'City Centre 2 (Rajarhat)',
    address: 'Action Area IID, Rajarhat, Kolkata, West Bengal',
    landmark: 'Near Chinar Park Crossing',
    lat: 22.6312,
    lng: 88.4485,
    zone: 'Shopping & Leisure'
  },
  {
    name: 'Park Street Metro & Dining',
    address: 'Park Street, Chowringhee, Kolkata, West Bengal',
    landmark: 'Near Flurys & Apeejay House',
    lat: 22.5535,
    lng: 88.3518,
    zone: 'Heritage & Dining'
  },
  {
    name: 'Gariahat More Crossing',
    address: 'Gariahat Road, Ballygunge, Kolkata, West Bengal',
    landmark: 'Near Gariahat Flyover Market & Pantaloons',
    lat: 22.5186,
    lng: 88.3664,
    zone: 'Shopping & Transit'
  },
  {
    name: 'Jadavpur 8B Bus Stand',
    address: 'Raja SC Mullick Road, Jadavpur, Kolkata, West Bengal',
    landmark: 'Opposite Jadavpur University Main Gate',
    lat: 22.4988,
    lng: 88.3718,
    zone: 'Transit & University'
  },
  {
    name: 'Shyambazar Five-Point Crossing',
    address: 'Bhupen Bose Avenue, Shyambazar, Kolkata, West Bengal',
    landmark: 'Near Netaji Statue & Shyambazar Metro Gate 1',
    lat: 22.6025,
    lng: 88.3715,
    zone: 'North Kolkata Hub'
  },
  {
    name: 'Dum Dum Junction & Metro',
    address: 'Dum Dum Road, Motijheel, Kolkata, West Bengal',
    landmark: 'Near Dum Dum Metro Platform 1',
    lat: 22.6214,
    lng: 88.3934,
    zone: 'Transit Junction'
  },
  {
    name: 'Apollo Multispeciality Hospital',
    address: '58 Canal Circular Road, Kadapara, Kolkata, West Bengal',
    landmark: 'EM Bypass Junction',
    lat: 22.5732,
    lng: 88.3982,
    zone: 'Healthcare'
  },
  {
    name: 'Howrah Railway Station',
    address: 'Station Road, Howrah, West Bengal',
    landmark: 'Old Complex & New Complex Terminal',
    lat: 22.5840,
    lng: 88.3426,
    zone: 'Railway Terminal'
  },
  {
    name: 'Sealdah Railway & Metro Station',
    address: 'Acharya Prafulla Chandra Road, Sealdah, Kolkata, West Bengal',
    landmark: 'Kaiser Street Junction',
    lat: 22.5675,
    lng: 88.3712,
    zone: 'Railway Terminal'
  },
  {
    name: 'Netaji Subhash Chandra Bose Int Airport (CCU)',
    address: 'Jessore Road, Dum Dum, Kolkata, West Bengal',
    landmark: 'Terminal 2 Departure Gate 3',
    lat: 22.6547,
    lng: 88.4467,
    zone: 'Airport Hub'
  },
  {
    name: 'Rajiv Chowk Metro Station (Connaught Place)',
    address: 'Connaught Place Inner Circle, New Delhi, Delhi',
    landmark: 'Block B, Central Park Gate 7',
    lat: 28.6328,
    lng: 77.2197,
    zone: 'Delhi Metro Hub'
  },
  {
    name: 'Indira Gandhi International Airport (T3)',
    address: 'Palam, New Delhi, Delhi 110037',
    landmark: 'Terminal 3 International & Domestic',
    lat: 28.5562,
    lng: 77.1000,
    zone: 'Airport Hub'
  },
  {
    name: 'Cyber City & DLF Phase 2',
    address: 'DLF Cyber City, Sector 24, Gurugram, Haryana',
    landmark: 'Cyber Hub Amphitheatre',
    lat: 28.4952,
    lng: 77.0891,
    zone: 'Tech & IT Hub'
  },
  {
    name: 'Sector 18 Metro & Mall of India',
    address: 'Sector 18, Noida, Gautam Buddha Nagar, Uttar Pradesh',
    landmark: 'DLF Mall of India Main Atrium',
    lat: 28.5708,
    lng: 77.3218,
    zone: 'Shopping & Metro'
  },
  {
    name: 'Chhatrapati Shivaji Maharaj Terminus (CSMT)',
    address: 'Fort, Mumbai, Maharashtra 400001',
    landmark: 'Opposite BMC Headquarters & Crawford Market',
    lat: 18.9401,
    lng: 72.8347,
    zone: 'Railway & Heritage'
  },
  {
    name: 'Bandra Kurla Complex (BKC)',
    address: 'G Block, Bandra East, Mumbai, Maharashtra',
    landmark: 'Jio World Drive & MCA Club',
    lat: 19.0657,
    lng: 72.8687,
    zone: 'Financial & IT'
  },
  {
    name: 'CSMI Airport Terminal 2 (BOM)',
    address: 'Sahar, Andheri East, Mumbai, Maharashtra',
    landmark: 'Arrival Gate P4 & Departure Forecourt',
    lat: 19.0990,
    lng: 72.8745,
    zone: 'Airport Hub'
  },
  {
    name: 'Koramangala 5th Block Hub',
    address: 'Koramangala, Bengaluru, Karnataka 560095',
    landmark: 'Near Jyoti Nivas College & Forum Mall',
    lat: 12.9352,
    lng: 77.6245,
    zone: 'Startup & Food Hub'
  },
  {
    name: 'MG Road Metro & Brigade Road',
    address: 'Mahatma Gandhi Road, Bengaluru, Karnataka 560001',
    landmark: 'Near Church Street Junction & Cauvery Emporium',
    lat: 12.9756,
    lng: 77.6066,
    zone: 'Transit & Shopping'
  },
  {
    name: 'Kempegowda International Airport (BLR)',
    address: 'KIAL Road, Devanahalli, Bengaluru, Karnataka',
    landmark: 'Terminal 1 & Terminal 2 Plaza',
    lat: 13.1986,
    lng: 77.7066,
    zone: 'Airport Hub'
  },
  {
    name: 'HITEC City Cyber Towers',
    address: 'Madhapur, HITEC City, Hyderabad, Telangana',
    landmark: 'Cyber Towers Quadrangle & Metro Pillar A10',
    lat: 17.4504,
    lng: 78.3808,
    zone: 'IT & Business Hub'
  },
  {
    name: 'Secunderabad Railway Station',
    address: 'Station Road, Secunderabad, Hyderabad, Telangana',
    landmark: 'Platform 1 Main Portico & Clock Tower',
    lat: 17.4344,
    lng: 78.5013,
    zone: 'Railway Terminal'
  },
  {
    name: 'Puratchi Thalaivar Dr. MGR Central Station',
    address: 'Kannappar Thidal, Periyamet, Chennai, Tamil Nadu',
    landmark: 'Chennai Central Main Gate & Metro Concourse',
    lat: 13.0827,
    lng: 80.2707,
    zone: 'Railway Terminal'
  },
  {
    name: 'Hinjewadi Phase 1 IT Park',
    address: 'Rajiv Gandhi Infotech Park, Hinjewadi, Pune, Maharashtra',
    landmark: 'Wipro Circle & Infosys Campus Gate 1',
    lat: 18.5913,
    lng: 73.7389,
    zone: 'IT Park Hub'
  },
  {
    name: 'World Trade Park & Malviya Nagar',
    address: 'Jawahar Lal Nehru Marg, D-Block, Malviya Nagar, Jaipur, Rajasthan',
    landmark: 'North Block Entrance & Gaurav Tower Crossing',
    lat: 26.8543,
    lng: 75.8053,
    zone: 'Shopping & Leisure'
  }
];

export const VEHICLE_OPTIONS: VehicleOption[] = [
  {
    id: 'toto',
    name: 'Toto Partner Electric',
    tagline: 'Eco-friendly E-Rickshaw for short & daily hops',
    iconType: 'toto',
    capacity: '3 Seats',
    etaMins: 2,
    baseFare: 25,
    perKmRate: 16.0,
    ecoFriendly: true,
    badge: 'Popular & Green ⚡',
    description: 'Zero emission, quick neighborhood navigation, budget friendly'
  },
  {
    id: 'toto_express',
    name: 'Toto Express Direct',
    tagline: 'Direct point-to-point without intermediate stops',
    iconType: 'express',
    capacity: '3 Seats',
    etaMins: 3,
    baseFare: 30,
    perKmRate: 18.0,
    ecoFriendly: true,
    badge: 'Fast Route 🚀',
    description: 'Guaranteed non-stop priority ride for urgent commutes'
  },
  {
    id: 'bike',
    name: 'Rapido Bike',
    tagline: 'Beat city traffic in solo style',
    iconType: 'bike',
    capacity: '1 Helmeted Seat',
    etaMins: 1,
    baseFare: 30,
    perKmRate: 14.0,
    badge: 'Quickest ⚡',
    description: 'Fastest way through narrow lanes and rush hour traffic'
  },
  {
    id: 'auto',
    name: 'Rapido Auto',
    tagline: 'Standard CNG 3-wheeler for family/luggage',
    iconType: 'auto',
    capacity: '3-4 Seats',
    etaMins: 4,
    baseFare: 40,
    perKmRate: 20.0,
    description: 'Spacious auto with metered fare reliability'
  }
];

export const PROMO_CODES: Record<string, { code: string; discountPct: number; maxDiscount: number; minFare: number; desc: string }> = {
  RAPIDOTOTO: { code: 'RAPIDOTOTO', discountPct: 25, maxDiscount: 20, minFare: 25, desc: '25% OFF up to ₹20 on any Toto ride' },
  GREENRIDE: { code: 'GREENRIDE', discountPct: 20, maxDiscount: 15, minFare: 20, desc: '₹15 ECO rebate for choosing E-Rickshaw' },
  WELCOME50: { code: 'WELCOME50', discountPct: 50, maxDiscount: 35, minFare: 30, desc: '50% OFF up to ₹35 on 1st booking' }
};
