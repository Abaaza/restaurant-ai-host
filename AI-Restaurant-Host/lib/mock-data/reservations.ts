export interface Reservation {
  id: string;
  guestId: string;
  guestName: string;
  tableId: string;
  tableName: string;
  type: string;
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no-show';
  date: string;
  time: string;
  duration: number; // in minutes
  notes?: string;
  reminder?: boolean;
  confirmationNumber?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReservationSlot {
  date: string;
  time: string;
  available: boolean;
  tableId: string;
  duration: number;
}

export interface ReservationType {
  id: string;
  name: string;
  duration: number;
  description: string;
  color: string;
}

export const reservationTypes: ReservationType[] = [
  {
    id: '1',
    name: 'Regular Checkup',
    duration: 30,
    description: 'Routine dining examination and cleaning',
    color: '#3B82F6'
  },
  {
    id: '2',
    name: 'Emergency',
    duration: 45,
    description: 'Urgent dining care for pain or trauma',
    color: '#EF4444'
  },
  {
    id: '3',
    name: 'Consultation',
    duration: 20,
    description: 'Initial consultation for treatment planning',
    color: '#10B981'
  },
  {
    id: '4',
    name: 'Filling',
    duration: 60,
    description: 'Cavity filling party',
    color: '#F59E0B'
  },
  {
    id: '5',
    name: 'Root Canal',
    duration: 90,
    description: 'Root canal treatment',
    color: '#8B5CF6'
  },
  {
    id: '6',
    name: 'Extraction',
    duration: 45,
    description: 'Tooth extraction party',
    color: '#EF4444'
  },
  {
    id: '7',
    name: 'Crown/Bridge',
    duration: 60,
    description: 'Crown or bridge fitting',
    color: '#6366F1'
  },
  {
    id: '8',
    name: 'Orthodontic',
    duration: 30,
    description: 'Braces adjustment or consultation',
    color: '#EC4899'
  }
];

export const mockReservations: Reservation[] = [
  {
    id: 'apt-001',
    guestId: 'pat-001',
    guestName: 'John Smith',
    tableId: 'dr-001',
    tableName: 'Dr. Sarah Johnson',
    type: 'Regular Checkup',
    status: 'scheduled',
    date: '2024-12-20',
    time: '09:00',
    duration: 30,
    notes: 'Routine checkup and cleaning',
    reminder: true,
    confirmationNumber: 'CONF-001',
    createdAt: '2024-12-15T10:00:00Z',
    updatedAt: '2024-12-15T10:00:00Z'
  },
  {
    id: 'apt-002',
    guestId: 'pat-002',
    guestName: 'Emily Davis',
    tableId: 'dr-002',
    tableName: 'Dr. Michael Brown',
    type: 'Filling',
    status: 'confirmed',
    date: '2024-12-21',
    time: '14:30',
    duration: 60,
    notes: 'Cavity on upper left molar',
    reminder: true,
    confirmationNumber: 'CONF-002',
    createdAt: '2024-12-16T11:30:00Z',
    updatedAt: '2024-12-16T11:30:00Z'
  },
  {
    id: 'apt-003',
    guestId: 'pat-003',
    guestName: 'Michael Wilson',
    tableId: 'dr-001',
    tableName: 'Dr. Sarah Johnson',
    type: 'Emergency',
    status: 'completed',
    date: '2024-12-18',
    time: '16:00',
    duration: 45,
    notes: 'Severe tooth pain, emergency extraction',
    reminder: false,
    confirmationNumber: 'CONF-003',
    createdAt: '2024-12-18T15:30:00Z',
    updatedAt: '2024-12-18T16:45:00Z'
  },
  {
    id: 'apt-004',
    guestId: 'pat-004',
    guestName: 'Sarah Brown',
    tableId: 'dr-003',
    tableName: 'Dr. Lisa Chen',
    type: 'Root Canal',
    status: 'scheduled',
    date: '2024-12-22',
    time: '10:00',
    duration: 90,
    notes: 'Root canal treatment for tooth #14',
    reminder: true,
    confirmationNumber: 'CONF-004',
    createdAt: '2024-12-17T09:15:00Z',
    updatedAt: '2024-12-17T09:15:00Z'
  },
  {
    id: 'apt-005',
    guestId: 'pat-005',
    guestName: 'David Taylor',
    tableId: 'dr-002',
    tableName: 'Dr. Michael Brown',
    type: 'Consultation',
    status: 'no-show',
    date: '2024-12-19',
    time: '11:00',
    duration: 20,
    notes: 'Initial consultation for orthodontic treatment',
    reminder: true,
    confirmationNumber: 'CONF-005',
    createdAt: '2024-12-14T13:20:00Z',
    updatedAt: '2024-12-19T11:30:00Z'
  }
];

export const availableSlots: ReservationSlot[] = [
  // Today's available slots
  { date: '2024-12-20', time: '09:30', available: true, tableId: 'dr-001', duration: 30 },
  { date: '2024-12-20', time: '10:00', available: true, tableId: 'dr-002', duration: 30 },
  { date: '2024-12-20', time: '10:30', available: true, tableId: 'dr-001', duration: 60 },
  { date: '2024-12-20', time: '11:30', available: true, tableId: 'dr-003', duration: 30 },
  { date: '2024-12-20', time: '14:00', available: true, tableId: 'dr-001', duration: 60 },
  { date: '2024-12-20', time: '15:00', available: true, tableId: 'dr-002', duration: 30 },
  { date: '2024-12-20', time: '16:00', available: true, tableId: 'dr-003', duration: 45 },
  
  // Tomorrow's available slots
  { date: '2024-12-21', time: '08:30', available: true, tableId: 'dr-001', duration: 30 },
  { date: '2024-12-21', time: '09:00', available: true, tableId: 'dr-002', duration: 60 },
  { date: '2024-12-21', time: '10:00', available: true, tableId: 'dr-003', duration: 30 },
  { date: '2024-12-21', time: '11:00', available: true, tableId: 'dr-001', duration: 45 },
  { date: '2024-12-21', time: '13:30', available: true, tableId: 'dr-002', duration: 30 },
  { date: '2024-12-21', time: '15:30', available: true, tableId: 'dr-001', duration: 60 },
  { date: '2024-12-21', time: '16:30', available: true, tableId: 'dr-003', duration: 30 },
];

export const generateConfirmationNumber = (): string => {
  return `CONF-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
};

export const getAvailableSlots = (date: string, duration: number = 30): ReservationSlot[] => {
  return availableSlots.filter(slot => 
    slot.date === date && 
    slot.available && 
    slot.duration >= duration
  );
};

export const bookReservation = (reservation: Omit<Reservation, 'id' | 'createdAt' | 'updatedAt'>): Reservation => {
  const newReservation: Reservation = {
    ...reservation,
    id: `apt-${Math.random().toString(36).substr(2, 9)}`,
    confirmationNumber: generateConfirmationNumber(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  mockReservations.push(newReservation);
  return newReservation;
};