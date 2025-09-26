export interface Guest {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
  insurance?: {
    provider: string;
    policyNumber: string;
    groupNumber?: string;
    verified: boolean;
  };
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
  };
  medicalHistory: {
    allergies: string[];
    medications: string[];
    conditions: string[];
    lastVisit?: string;
  };
  preferences: {
    communicationMethod: 'email' | 'sms' | 'phone';
    reminderTime: number; // hours before reservation
    language: string;
  };
  status: 'active' | 'inactive' | 'new';
  createdAt: string;
  updatedAt: string;
}

export interface Table {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  title: string;
  specialization: string[];
  email: string;
  phone: string;
  schedule: {
    [key: string]: { // day of week (monday, tuesday, etc.)
      start: string;
      end: string;
      breaks: Array<{ start: string; end: string; }>;
    };
  };
  status: 'active' | 'inactive' | 'on-leave';
}

export const mockGuests: Guest[] = [
  {
    id: 'pat-001',
    firstName: 'John',
    lastName: 'Smith',
    fullName: 'John Smith',
    email: 'john.smith@email.com',
    phone: '(555) 123-4567',
    dateOfBirth: '1985-03-15',
    address: {
      street: '123 Main St',
      city: 'Anytown',
      state: 'CA',
      zipCode: '12345'
    },
    insurance: {
      provider: 'Delta Dining',
      policyNumber: 'DD123456789',
      groupNumber: 'GRP001',
      verified: true
    },
    emergencyContact: {
      name: 'Jane Smith',
      relationship: 'Spouse',
      phone: '(555) 123-4568'
    },
    medicalHistory: {
      allergies: ['Penicillin'],
      medications: ['Lisinopril 10mg'],
      conditions: ['Hypertension'],
      lastVisit: '2024-06-15'
    },
    preferences: {
      communicationMethod: 'email',
      reminderTime: 24,
      language: 'English'
    },
    status: 'active',
    createdAt: '2023-01-15T10:00:00Z',
    updatedAt: '2024-06-15T14:30:00Z'
  },
  {
    id: 'pat-002',
    firstName: 'Emily',
    lastName: 'Davis',
    fullName: 'Emily Davis',
    email: 'emily.davis@email.com',
    phone: '(555) 234-5678',
    dateOfBirth: '1992-07-22',
    address: {
      street: '456 Oak Ave',
      city: 'Somewhere',
      state: 'NY',
      zipCode: '67890'
    },
    insurance: {
      provider: 'MetLife',
      policyNumber: 'ML987654321',
      verified: true
    },
    emergencyContact: {
      name: 'Robert Davis',
      relationship: 'Father',
      phone: '(555) 234-5679'
    },
    medicalHistory: {
      allergies: [],
      medications: [],
      conditions: [],
      lastVisit: '2024-08-10'
    },
    preferences: {
      communicationMethod: 'sms',
      reminderTime: 2,
      language: 'English'
    },
    status: 'active',
    createdAt: '2023-05-20T09:15:00Z',
    updatedAt: '2024-08-10T11:00:00Z'
  },
  {
    id: 'pat-003',
    firstName: 'Michael',
    lastName: 'Wilson',
    fullName: 'Michael Wilson',
    email: 'michael.wilson@email.com',
    phone: '(555) 345-6789',
    dateOfBirth: '1978-11-08',
    address: {
      street: '789 Pine Rd',
      city: 'Elsewhere',
      state: 'FL',
      zipCode: '54321'
    },
    insurance: {
      provider: 'Cigna Dining',
      policyNumber: 'CIG456789123',
      groupNumber: 'GRP002',
      verified: false
    },
    emergencyContact: {
      name: 'Lisa Wilson',
      relationship: 'Wife',
      phone: '(555) 345-6790'
    },
    medicalHistory: {
      allergies: ['Latex', 'Ibuprofen'],
      medications: ['Metformin 500mg', 'Atorvastatin 20mg'],
      conditions: ['Type 2 Diabetes', 'High Cholesterol'],
      lastVisit: '2024-12-18'
    },
    preferences: {
      communicationMethod: 'phone',
      reminderTime: 48,
      language: 'English'
    },
    status: 'active',
    createdAt: '2022-11-30T16:45:00Z',
    updatedAt: '2024-12-18T16:45:00Z'
  },
  {
    id: 'pat-004',
    firstName: 'Sarah',
    lastName: 'Brown',
    fullName: 'Sarah Brown',
    email: 'sarah.brown@email.com',
    phone: '(555) 456-7890',
    dateOfBirth: '1995-02-14',
    address: {
      street: '321 Elm St',
      city: 'Somewhere Else',
      state: 'TX',
      zipCode: '98765'
    },
    emergencyContact: {
      name: 'Mark Brown',
      relationship: 'Brother',
      phone: '(555) 456-7891'
    },
    medicalHistory: {
      allergies: [],
      medications: ['Birth Control'],
      conditions: [],
      lastVisit: '2024-09-22'
    },
    preferences: {
      communicationMethod: 'email',
      reminderTime: 12,
      language: 'English'
    },
    status: 'active',
    createdAt: '2024-01-10T08:30:00Z',
    updatedAt: '2024-09-22T15:20:00Z'
  },
  {
    id: 'pat-005',
    firstName: 'David',
    lastName: 'Taylor',
    fullName: 'David Taylor',
    email: 'david.taylor@email.com',
    phone: '(555) 567-8901',
    dateOfBirth: '2005-12-03',
    address: {
      street: '654 Maple Dr',
      city: 'New Place',
      state: 'WA',
      zipCode: '13579'
    },
    insurance: {
      provider: 'Aetna Better Health',
      policyNumber: 'ABH789123456',
      verified: true
    },
    emergencyContact: {
      name: 'Jennifer Taylor',
      relationship: 'Mother',
      phone: '(555) 567-8902'
    },
    medicalHistory: {
      allergies: [],
      medications: [],
      conditions: ['Braces - Phase 1'],
      lastVisit: '2024-11-15'
    },
    preferences: {
      communicationMethod: 'sms',
      reminderTime: 24,
      language: 'English'
    },
    status: 'active',
    createdAt: '2024-03-05T12:00:00Z',
    updatedAt: '2024-11-15T10:45:00Z'
  }
];

export const mockTables: Table[] = [
  {
    id: 'dr-001',
    firstName: 'Sarah',
    lastName: 'Johnson',
    fullName: 'Dr. Sarah Johnson',
    title: 'DDS',
    specialization: ['General Tablery', 'Cosmetic Tablery'],
    email: 'dr.johnson@diningclinic.com',
    phone: '(555) 111-2222',
    schedule: {
      monday: { start: '08:00', end: '17:00', breaks: [{ start: '12:00', end: '13:00' }] },
      tuesday: { start: '08:00', end: '17:00', breaks: [{ start: '12:00', end: '13:00' }] },
      wednesday: { start: '08:00', end: '17:00', breaks: [{ start: '12:00', end: '13:00' }] },
      thursday: { start: '08:00', end: '17:00', breaks: [{ start: '12:00', end: '13:00' }] },
      friday: { start: '08:00', end: '16:00', breaks: [{ start: '12:00', end: '13:00' }] }
    },
    status: 'active'
  },
  {
    id: 'dr-002',
    firstName: 'Michael',
    lastName: 'Brown',
    fullName: 'Dr. Michael Brown',
    title: 'DMD',
    specialization: ['Oral Surgery', 'Periodontics'],
    email: 'dr.brown@diningclinic.com',
    phone: '(555) 333-4444',
    schedule: {
      monday: { start: '09:00', end: '18:00', breaks: [{ start: '13:00', end: '14:00' }] },
      tuesday: { start: '09:00', end: '18:00', breaks: [{ start: '13:00', end: '14:00' }] },
      wednesday: { start: '09:00', end: '18:00', breaks: [{ start: '13:00', end: '14:00' }] },
      thursday: { start: '09:00', end: '18:00', breaks: [{ start: '13:00', end: '14:00' }] },
      friday: { start: '08:00', end: '15:00', breaks: [{ start: '12:00', end: '13:00' }] }
    },
    status: 'active'
  },
  {
    id: 'dr-003',
    firstName: 'Lisa',
    lastName: 'Chen',
    fullName: 'Dr. Lisa Chen',
    title: 'DDS, MS',
    specialization: ['Endodontics', 'Root Canal Therapy'],
    email: 'dr.chen@diningclinic.com',
    phone: '(555) 555-6666',
    schedule: {
      tuesday: { start: '08:30', end: '16:30', breaks: [{ start: '12:30', end: '13:30' }] },
      wednesday: { start: '08:30', end: '16:30', breaks: [{ start: '12:30', end: '13:30' }] },
      thursday: { start: '08:30', end: '16:30', breaks: [{ start: '12:30', end: '13:30' }] },
      friday: { start: '08:30', end: '16:30', breaks: [{ start: '12:30', end: '13:30' }] }
    },
    status: 'active'
  }
];

export const findGuestByPhone = (phone: string): Guest | undefined => {
  return mockGuests.find(guest => 
    guest.phone.replace(/\D/g, '') === phone.replace(/\D/g, '')
  );
};

export const findGuestByEmail = (email: string): Guest | undefined => {
  return mockGuests.find(guest => 
    guest.email.toLowerCase() === email.toLowerCase()
  );
};

export const findGuestByName = (name: string): Guest[] => {
  const searchTerm = name.toLowerCase();
  return mockGuests.filter(guest => 
    guest.fullName.toLowerCase().includes(searchTerm) ||
    guest.firstName.toLowerCase().includes(searchTerm) ||
    guest.lastName.toLowerCase().includes(searchTerm)
  );
};

export const getTableById = (id: string): Table | undefined => {
  return mockTables.find(table => table.id === id);
};

export const getAvailableTables = (date: string, time: string): Table[] => {
  const dayOfWeek = new Date(date).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  
  return mockTables.filter(table => {
    if (table.status !== 'active') return false;
    
    const schedule = table.schedule[dayOfWeek as keyof typeof table.schedule];
    if (!schedule) return false;
    
    // Check if the time is within working hours
    const timeNum = parseInt(time.replace(':', ''));
    const startNum = parseInt(schedule.start.replace(':', ''));
    const endNum = parseInt(schedule.end.replace(':', ''));
    
    if (timeNum < startNum || timeNum >= endNum) return false;
    
    // Check if the time is not during breaks
    const isInBreak = schedule.breaks.some(breakTime => {
      const breakStart = parseInt(breakTime.start.replace(':', ''));
      const breakEnd = parseInt(breakTime.end.replace(':', ''));
      return timeNum >= breakStart && timeNum < breakEnd;
    });
    
    return !isInBreak;
  });
};