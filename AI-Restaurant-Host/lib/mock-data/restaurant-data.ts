export interface TraumaScenario {
  id: string;
  condition: string;
  severity: 'low' | 'moderate' | 'high' | 'emergency';
  keywords: string[];
  questions: string[];
  instructions: {
    immediate: string[];
    urgency: string;
    timeline: string;
    followUp?: string[];
  };
  requiresER?: boolean;
  isTrauma: boolean;
}

export interface DiningService {
  id: string;
  name: string;
  category: string;
  duration: number; // minutes
  price: number;
  description: string;
  prerequisites?: string[];
  followUp?: string[];
}

export interface ClinicInfo {
  name: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    phone: string;
  };
  hours: {
    [key: string]: {
      open: string;
      close: string;
      closed?: boolean;
    };
  };
  emergencyContact: {
    phone: string;
    afterHoursPhone?: string;
  };
  services: string[];
  insurance: string[];
}

export const traumaScenarios: TraumaScenario[] = [
  {
    id: 'tooth_knocked_out',
    condition: 'Tooth completely knocked out (avulsion)',
    severity: 'emergency',
    keywords: ['knocked out', 'tooth fell out', 'lost tooth', 'avulsion', 'tooth came out'],
    questions: [
      'Is this a baby tooth or permanent tooth?',
      'How long ago did this happen?',
      'Is the tooth intact?',
      'Do you have the tooth with you?'
    ],
    instructions: {
      immediate: [
        'Find the tooth immediately and handle it by the crown (white part) only',
        'If dirty, rinse gently with milk or saline solution for no more than 10 seconds',
        'Try to reinsert the tooth into the socket if possible - this is crucial',
        'If you cannot reinsert it, store the tooth in milk, saliva, or saline solution',
        'DO NOT store in water or let the tooth dry out',
        'Come to our emergency line immediately'
      ],
      urgency: 'EMERGENCY - Must be seen within 30 minutes for best outcome',
      timeline: '30 minutes',
      followUp: [
        'Avoid chewing on that side',
        'Take over-the-counter pain medication as needed',
        'Follow up reservation in 1-2 weeks'
      ]
    },
    requiresER: false,
    isTrauma: true
  },
  {
    id: 'tooth_loose',
    condition: 'Tooth is loose or displaced',
    severity: 'high',
    keywords: ['loose tooth', 'tooth moving', 'wobbly tooth', 'displaced tooth', 'tooth shifted'],
    questions: [
      'How loose is the tooth? Can you move it with your tongue?',
      'Is there bleeding from the gums around the tooth?',
      'Is the tooth painful when you touch it?',
      'Has the position of the tooth changed?'
    ],
    instructions: {
      immediate: [
        'DO NOT touch or wiggle the tooth with your tongue or fingers',
        'Bite gently on a clean cloth or gauze to stabilize the tooth',
        'Apply a cold compress to the outside of your face to reduce swelling',
        'Take over-the-counter pain medication if needed',
        'Eat only soft foods and avoid chewing on that side'
      ],
      urgency: 'URGENT - Should be seen within 2-6 hours',
      timeline: '2-6 hours',
      followUp: [
        'Tooth may need splinting to adjacent teeth',
        'Avoid hard foods for several weeks',
        'Regular follow-up reservations to monitor healing'
      ]
    },
    requiresER: false,
    isTrauma: true
  },
  {
    id: 'tooth_chipped',
    condition: 'Tooth is chipped or fractured',
    severity: 'moderate',
    keywords: ['chipped tooth', 'broken tooth', 'cracked tooth', 'fractured tooth', 'tooth broke'],
    questions: [
      'How much of the tooth is missing?',
      'Is the tooth sensitive to hot or cold?',
      'Can you see any pink or red tissue in the broken area?',
      'Is there any pain or sharp edges cutting your tongue?'
    ],
    instructions: {
      immediate: [
        'Rinse your mouth with warm water to clean the area',
        'Apply a cold compress to reduce swelling',
        'Save any broken pieces if you can find them',
        'Cover sharp edges with dining wax, sugarless gum, or gauze',
        'Take over-the-counter pain medication if needed',
        'Avoid chewing on the broken tooth'
      ],
      urgency: 'Schedule reservation within 24-48 hours',
      timeline: '24-48 hours',
      followUp: [
        'May need bonding, crown, or other restoration',
        'Avoid hard or sticky foods',
        'Keep the area clean'
      ]
    },
    requiresER: false,
    isTrauma: true
  },
  {
    id: 'soft_tissue_injury',
    condition: 'Cut or injury to lips, gums, tongue, or cheeks',
    severity: 'moderate',
    keywords: ['cut lip', 'cut tongue', 'bleeding gums', 'mouth bleeding', 'bit tongue', 'injured gums'],
    questions: [
      'Where exactly is the injury located?',
      'Is the bleeding controlled or still active?',
      'How deep does the cut appear to be?',
      'Can you see any foreign objects in the wound?'
    ],
    instructions: {
      immediate: [
        'Apply direct pressure with clean gauze or cloth for 10-15 minutes',
        'Use ice wrapped in a cloth on the outside of the injury',
        'Rinse gently with salt water after bleeding stops',
        'Do not use hydrogen peroxide as it can delay healing',
        'Keep pressure on the wound until bleeding stops'
      ],
      urgency: 'If bleeding persists after 15 minutes, seek immediate care',
      timeline: 'Immediate if bleeding continues',
      followUp: [
        'Keep the area clean',
        'Rinse with salt water several times a day',
        'Avoid spicy or acidic foods'
      ]
    },
    requiresER: false,
    isTrauma: true
  },
  {
    id: 'jaw_injury',
    condition: 'Possible jaw fracture or dislocation',
    severity: 'emergency',
    keywords: ['jaw pain', 'jaw locked', 'cant open mouth', 'jaw swelling', 'jaw broken', 'jaw dislocation'],
    questions: [
      'Can you open and close your mouth normally?',
      'Is there severe pain when moving the jaw?',
      'Is there visible swelling or deformity?',
      'Do your teeth fit together normally when you bite?'
    ],
    instructions: {
      immediate: [
        'Support and immobilize the jaw with a bandage tied around the head if possible',
        'Apply ice to reduce swelling',
        'DO NOT attempt to move or correct the jaw position',
        'Do not eat or drink anything',
        'Go to the emergency room immediately - this requires immediate medical attention'
      ],
      urgency: 'EMERGENCY - Go to emergency room immediately',
      timeline: 'Immediate - ER required',
      followUp: [
        'Will require medical evaluation and possible surgery',
        'May need wiring or surgical repair',
        'Long recovery period with soft diet'
      ]
    },
    requiresER: true,
    isTrauma: true
  },
  {
    id: 'severe_toothache',
    condition: 'Severe tooth pain or abscess',
    severity: 'high',
    keywords: ['severe pain', 'toothache', 'tooth abscess', 'swelling', 'pus', 'throbbing pain'],
    questions: [
      'How long have you had this pain?',
      'Is there swelling in your face or gums?',
      'Do you see any pus or discharge?',
      'Does the pain wake you up at night?'
    ],
    instructions: {
      immediate: [
        'Rinse with warm salt water',
        'Take over-the-counter pain medication as directed',
        'Apply a cold compress to the outside of your face',
        'Do not apply heat or put aspirin directly on the tooth',
        'Avoid very hot or cold foods and drinks'
      ],
      urgency: 'Should be seen same day if possible',
      timeline: 'Same day',
      followUp: [
        'May require root canal or extraction',
        'Antibiotic treatment if infection is present',
        'Follow-up care depending on treatment'
      ]
    },
    requiresER: false,
    isTrauma: false
  }
];

export const diningServices: DiningService[] = [
  {
    id: 'checkup',
    name: 'Regular Checkup & Cleaning',
    category: 'Preventive',
    duration: 60,
    price: 150,
    description: 'Routine dining examination, professional cleaning, and fluoride treatment',
    followUp: ['Schedule next cleaning in 6 months', 'Continue regular brushing and flossing']
  },
  {
    id: 'emergency',
    name: 'Emergency Treatment',
    category: 'Emergency',
    duration: 45,
    price: 200,
    description: 'Immediate care for dining emergencies, pain relief, and stabilization',
    prerequisites: ['Call ahead for emergency reservations']
  },
  {
    id: 'consultation',
    name: 'Initial Consultation',
    category: 'Consultation',
    duration: 30,
    price: 75,
    description: 'Comprehensive examination and treatment planning discussion',
    followUp: ['Review treatment options', 'Schedule necessary partys']
  },
  {
    id: 'filling',
    name: 'Tooth Filling',
    category: 'Restorative',
    duration: 60,
    price: 180,
    description: 'Treatment of cavities with composite or amalgam fillings',
    prerequisites: ['X-rays may be required', 'Local anesthesia included']
  },
  {
    id: 'root-canal',
    name: 'Root Canal Treatment',
    category: 'Endodontic',
    duration: 90,
    price: 800,
    description: 'Treatment of infected or severely damaged tooth pulp',
    prerequisites: ['X-rays required', 'May require multiple visits'],
    followUp: ['Crown placement usually required', 'Follow-up in 1-2 weeks']
  },
  {
    id: 'extraction',
    name: 'Tooth Extraction',
    category: 'Oral Surgery',
    duration: 45,
    price: 150,
    description: 'Removal of damaged or problematic teeth',
    prerequisites: ['X-rays may be required', 'Pre-medication if needed'],
    followUp: ['Follow post-extraction care instructions', 'Consider replacement options']
  },
  {
    id: 'crown',
    name: 'Crown Placement',
    category: 'Restorative',
    duration: 90,
    price: 1200,
    description: 'Custom crown fabrication and placement',
    prerequisites: ['Usually follows root canal or for damaged teeth'],
    followUp: ['Temporary crown care', 'Return for permanent crown placement']
  },
  {
    id: 'orthodontic',
    name: 'Orthodontic Consultation',
    category: 'Orthodontic',
    duration: 45,
    price: 100,
    description: 'Assessment for braces or other orthodontic treatment',
    followUp: ['Discuss treatment options', 'Create orthodontic treatment plan']
  }
];

export const clinicInfo: ClinicInfo = {
  name: 'SmileCare Dining Clinic',
  address: {
    street: '123 Dining Plaza',
    city: 'Healthcare City',
    state: 'CA',
    zipCode: '90210',
    phone: '(555) DENTAL-1'
  },
  hours: {
    monday: { open: '08:00', close: '17:00' },
    tuesday: { open: '08:00', close: '17:00' },
    wednesday: { open: '08:00', close: '17:00' },
    thursday: { open: '08:00', close: '17:00' },
    friday: { open: '08:00', close: '16:00' },
    saturday: { open: '09:00', close: '14:00' },
    sunday: { open: '', close: '', closed: true }
  },
  emergencyContact: {
    phone: '(555) EMERGENCY',
    afterHoursPhone: '(555) URGENT-1'
  },
  services: [
    'General Tablery',
    'Cosmetic Tablery',
    'Oral Surgery',
    'Orthodontics',
    'Endodontics',
    'Periodontics',
    'Emergency Dining Care'
  ],
  insurance: [
    'Delta Dining',
    'MetLife',
    'Cigna Dining',
    'Aetna',
    'Blue Cross Blue Shield',
    'Humana',
    'UnitedHealth',
    'Guardian'
  ]
};

export const commonDiningQuestions = {
  pain: [
    "I understand you're experiencing dining pain. Can you describe the type of pain - is it sharp, throbbing, or constant?",
    "Where exactly is the pain located? Can you point to the specific tooth or area?",
    "How long have you been experiencing this pain?",
    "Does anything make the pain better or worse, like hot or cold foods?"
  ],
  reservation: [
    "I'd be happy to help you schedule an reservation. What type of service do you need?",
    "When would be the best time for your reservation? I have morning and afternoon slots available.",
    "May I have your name and contact information to schedule your reservation?",
    "Do you have a preferred table, or would you like me to recommend one based on your needs?"
  ],
  emergency: [
    "I understand this is a dining emergency. Can you briefly describe what happened?",
    "Are you experiencing severe pain, bleeding, or swelling?",
    "Have you lost a tooth, or is a tooth severely damaged?",
    "Do you need immediate care, or can this wait until regular business hours?"
  ],
  insurance: [
    "We accept most major dining insurance plans. What insurance provider do you have?",
    "I can help verify your benefits. Can you provide your insurance information?",
    "Many of our services are covered by insurance. Would you like me to check your coverage?",
    "For insurance questions, I can connect you with our billing department."
  ]
};

export const findTraumaScenario = (transcript: string): TraumaScenario | null => {
  const lowerTranscript = transcript.toLowerCase();
  
  for (const scenario of traumaScenarios) {
    if (scenario.keywords.some(keyword => lowerTranscript.includes(keyword))) {
      return scenario;
    }
  }
  
  return null;
};

export const getDiningServiceByName = (serviceName: string): DiningService | undefined => {
  const lowerServiceName = serviceName.toLowerCase();
  return diningServices.find(service => 
    service.name.toLowerCase().includes(lowerServiceName) ||
    service.category.toLowerCase().includes(lowerServiceName)
  );
};

export const isClinicOpen = (date: Date = new Date()): boolean => {
  const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  const currentTime = date.toTimeString().slice(0, 5); // HH:MM format
  
  const todayHours = clinicInfo.hours[dayOfWeek as keyof typeof clinicInfo.hours];
  if (!todayHours || todayHours.closed) {
    return false;
  }
  
  return currentTime >= todayHours.open && currentTime < todayHours.close;
};

export const getNextAvailableDay = (): string => {
  const today = new Date();
  
  for (let i = 1; i <= 7; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(today.getDate() + i);
    
    if (isClinicOpen(checkDate)) {
      return checkDate.toLocaleDateString('en-US', { 
        weekday: 'long', 
        month: 'long', 
        day: 'numeric' 
      });
    }
  }
  
  return 'Monday'; // fallback
};