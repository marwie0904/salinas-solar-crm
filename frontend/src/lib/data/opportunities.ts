import {
  PipelineStage,
  ContactSource,
  AppointmentStatus,
  AppointmentType,
  InvoiceStatus,
  TaskStatus,
} from "@/lib/types";

// Local mock interfaces for frontend (will be replaced with Convex data)
export interface MockContact {
  _id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  address?: string;
  source: ContactSource;
}

export interface MockMessage {
  _id: string;
  content: string;
  senderName: string;
  createdAt: number;
  isOutgoing: boolean;
}

export interface MockTask {
  _id: string;
  title: string;
  description?: string;
  contactName?: string;
  opportunityName?: string;
  dueDate?: number;
  assignedUserName?: string;
  status: TaskStatus;
}

export interface MockAppointment {
  _id: string;
  title: string;
  date: string;
  time: string;
  location?: string;
  contactId: string;
  contactName: string;
  opportunityId: string;
  opportunityName: string;
  assignedUserId: string;
  assignedUserName: string;
  status: AppointmentStatus;
  appointmentType: AppointmentType;
}

export interface MockDocument {
  _id: string;
  name: string;
  mimeType: string;
  url: string;
  createdAt: number;
}

export interface MockInvoice {
  _id: string;
  invoiceNumber: string;
  opportunityId: string;
  opportunityName: string;
  total: number;
  amountPaid: number;
  status: InvoiceStatus;
  notes?: string;
  dueDate: number;
  dateSent?: number;
  documents: MockDocument[];
}

export interface MockOpportunity {
  _id: string;
  name: string;
  stage: PipelineStage;
  estimatedValue: number;
  contact: MockContact;
  scheduledAppointment?: MockAppointment;
  documents: MockDocument[];
  invoices: MockInvoice[];
  messages: MockMessage[];
  tasks: MockTask[];
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export const placeholderOpportunities: MockOpportunity[] = [
  {
    _id: "1",
    name: "Santos Residence - 5kW System",
    stage: "inbox",
    estimatedValue: 150000,
    contact: {
      _id: "c1",
      firstName: "Juan",
      lastName: "Santos",
      email: "juan.santos@email.com",
      phone: "+63 917 123 4567",
      address: "123 Mabini St, Makati City",
      source: "website",
    },
    documents: [],
    invoices: [],
    messages: [
      {
        _id: "m1",
        content: "Interested in solar panel installation for my home",
        senderName: "Juan Santos",
        createdAt: Date.parse("2024-12-18T10:30:00"),
        isOutgoing: false,
      },
    ],
    tasks: [
      {
        _id: "t1",
        title: "Initial contact call",
        description: "Call to introduce services",
        contactName: "Juan Santos",
        dueDate: Date.parse("2024-12-20"),
        assignedUserName: "Maria Garcia",
        status: "pending",
      },
    ],
    createdAt: Date.parse("2024-12-18"),
    updatedAt: Date.parse("2024-12-18"),
  },
  {
    _id: "2",
    name: "Rodriguez Commercial Building",
    stage: "to_call",
    estimatedValue: 450000,
    contact: {
      _id: "c2",
      firstName: "Pedro",
      lastName: "Rodriguez",
      email: "pedro.rodriguez@company.com",
      phone: "+63 918 234 5678",
      address: "456 Ayala Ave, BGC",
      source: "referral",
    },
    scheduledAppointment: {
      _id: "a1",
      title: "Site Assessment",
      date: "2024-12-21",
      time: "10:00 AM",
      location: "456 Ayala Ave, BGC",
      contactId: "c2",
      contactName: "Pedro Rodriguez",
      opportunityId: "2",
      opportunityName: "Rodriguez Commercial Building",
      assignedUserId: "u1",
      assignedUserName: "Maria Garcia",
      status: "pending",
      appointmentType: "field_inspection",
    },
    documents: [],
    invoices: [],
    messages: [
      {
        _id: "m2",
        content: "Hello, we spoke on the phone about your commercial solar needs.",
        senderName: "Maria Garcia",
        createdAt: Date.parse("2024-12-17T14:00:00"),
        isOutgoing: true,
      },
      {
        _id: "m3",
        content: "Yes, looking forward to the site visit!",
        senderName: "Pedro Rodriguez",
        createdAt: Date.parse("2024-12-17T15:30:00"),
        isOutgoing: false,
      },
    ],
    tasks: [
      {
        _id: "t2",
        title: "Prepare site assessment checklist",
        description: "Review building specs before visit",
        contactName: "Pedro Rodriguez",
        dueDate: Date.parse("2024-12-20"),
        assignedUserName: "Carlos Reyes",
        status: "doing",
      },
    ],
    createdAt: Date.parse("2024-12-15"),
    updatedAt: Date.parse("2024-12-17"),
  },
  {
    _id: "3",
    name: "Dela Cruz Family Home",
    stage: "booked_call",
    estimatedValue: 180000,
    contact: {
      _id: "c3",
      firstName: "Ana",
      lastName: "Dela Cruz",
      email: "ana.delacruz@gmail.com",
      phone: "+63 919 345 6789",
      address: "789 Rizal St, Quezon City",
      source: "facebook",
    },
    scheduledAppointment: {
      _id: "a2",
      title: "Proposal Presentation",
      date: "2024-12-22",
      time: "2:00 PM",
      location: "789 Rizal St, Quezon City",
      contactId: "c3",
      contactName: "Ana Dela Cruz",
      opportunityId: "3",
      opportunityName: "Dela Cruz Family Home",
      assignedUserId: "u1",
      assignedUserName: "Maria Garcia",
      status: "pending",
      appointmentType: "discovery_call",
    },
    documents: [
      {
        _id: "d1",
        name: "Site Photos.zip",
        mimeType: "application/zip",
        url: "/documents/site-photos.zip",
        createdAt: Date.parse("2024-12-16"),
      },
    ],
    invoices: [],
    messages: [],
    tasks: [
      {
        _id: "t3",
        title: "Prepare proposal document",
        description: "Include financing options",
        contactName: "Ana Dela Cruz",
        dueDate: Date.parse("2024-12-21"),
        assignedUserName: "Maria Garcia",
        status: "doing",
      },
    ],
    createdAt: Date.parse("2024-12-10"),
    updatedAt: Date.parse("2024-12-16"),
  },
  {
    _id: "4",
    name: "Mendoza Warehouse Project",
    stage: "contract_sent",
    estimatedValue: 850000,
    contact: {
      _id: "c4",
      firstName: "Roberto",
      lastName: "Mendoza",
      email: "r.mendoza@mendozalogistics.com",
      phone: "+63 920 456 7890",
      address: "Industrial Park, Laguna",
      source: "other",
    },
    documents: [
      {
        _id: "d2",
        name: "Proposal_Mendoza_v2.pdf",
        mimeType: "application/pdf",
        url: "/documents/proposal-mendoza.pdf",
        createdAt: Date.parse("2024-12-14"),
      },
      {
        _id: "d3",
        name: "ROI_Analysis.xlsx",
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        url: "/documents/roi-analysis.xlsx",
        createdAt: Date.parse("2024-12-14"),
      },
    ],
    invoices: [],
    messages: [
      {
        _id: "m4",
        content: "Please find attached our revised proposal.",
        senderName: "Maria Garcia",
        createdAt: Date.parse("2024-12-14T09:00:00"),
        isOutgoing: true,
      },
      {
        _id: "m5",
        content: "Thanks! We're reviewing with our finance team.",
        senderName: "Roberto Mendoza",
        createdAt: Date.parse("2024-12-14T16:00:00"),
        isOutgoing: false,
      },
    ],
    tasks: [
      {
        _id: "t4",
        title: "Follow up on proposal",
        description: "Check if they have questions",
        contactName: "Roberto Mendoza",
        dueDate: Date.parse("2024-12-19"),
        assignedUserName: "Maria Garcia",
        status: "pending",
      },
    ],
    createdAt: Date.parse("2024-12-05"),
    updatedAt: Date.parse("2024-12-14"),
  },
  {
    _id: "5",
    name: "Villanueva Residence",
    stage: "invoice_sent",
    estimatedValue: 220000,
    contact: {
      _id: "c5",
      firstName: "Teresa",
      lastName: "Villanueva",
      email: "teresa.v@email.com",
      phone: "+63 921 567 8901",
      address: "321 Bonifacio St, Paranaque",
      source: "referral",
    },
    scheduledAppointment: {
      _id: "a3",
      title: "Contract Discussion",
      date: "2024-12-20",
      time: "3:00 PM",
      location: "Office",
      contactId: "c5",
      contactName: "Teresa Villanueva",
      opportunityId: "5",
      opportunityName: "Villanueva Residence",
      assignedUserId: "u1",
      assignedUserName: "Maria Garcia",
      status: "pending",
      appointmentType: "discovery_call",
    },
    documents: [
      {
        _id: "d4",
        name: "Draft_Contract.pdf",
        mimeType: "application/pdf",
        url: "/documents/draft-contract.pdf",
        createdAt: Date.parse("2024-12-17"),
      },
    ],
    invoices: [
      {
        _id: "i1",
        invoiceNumber: "INV-2024-001",
        opportunityId: "5",
        opportunityName: "Villanueva Residence",
        total: 44000,
        amountPaid: 0,
        status: "pending",
        notes: "Draft invoice awaiting approval",
        dueDate: Date.parse("2024-12-30"),
        documents: [],
      },
    ],
    messages: [],
    tasks: [],
    createdAt: Date.parse("2024-12-01"),
    updatedAt: Date.parse("2024-12-17"),
  },
  {
    _id: "6",
    name: "Tan Office Building",
    stage: "closed",
    estimatedValue: 380000,
    contact: {
      _id: "c6",
      firstName: "Mark",
      lastName: "Tan",
      email: "mark.tan@tanenterprises.com",
      phone: "+63 922 678 9012",
      address: "555 EDSA, Mandaluyong",
      source: "referral",
    },
    documents: [
      {
        _id: "d5",
        name: "Signed_Contract.pdf",
        mimeType: "application/pdf",
        url: "/documents/signed-contract.pdf",
        createdAt: Date.parse("2024-12-10"),
      },
    ],
    invoices: [
      {
        _id: "i2",
        invoiceNumber: "INV-2024-002",
        opportunityId: "6",
        opportunityName: "Tan Office Building",
        total: 190000,
        amountPaid: 190000,
        status: "paid_full",
        notes: "First installment - 50% of total",
        dueDate: Date.parse("2024-12-15"),
        dateSent: Date.parse("2024-12-01"),
        documents: [],
      },
      {
        _id: "i3",
        invoiceNumber: "INV-2024-003",
        opportunityId: "6",
        opportunityName: "Tan Office Building",
        total: 190000,
        amountPaid: 0,
        status: "pending",
        notes: "Second installment - 50% upon completion",
        dueDate: Date.parse("2025-01-15"),
        dateSent: Date.parse("2024-12-15"),
        documents: [],
      },
    ],
    messages: [],
    tasks: [
      {
        _id: "t5",
        title: "Schedule installation",
        description: "Coordinate with installation team",
        contactName: "Mark Tan",
        dueDate: Date.parse("2024-12-22"),
        assignedUserName: "Carlos Reyes",
        status: "doing",
      },
    ],
    createdAt: Date.parse("2024-11-15"),
    updatedAt: Date.parse("2024-12-10"),
  },
  {
    _id: "7",
    name: "Garcia Condo Unit",
    stage: "did_not_answer",
    estimatedValue: 95000,
    contact: {
      _id: "c7",
      firstName: "Lisa",
      lastName: "Garcia",
      email: "lisa.garcia@email.com",
      phone: "+63 923 789 0123",
      address: "Unit 1201, Condo Tower, Pasig",
      source: "google_ads",
    },
    documents: [],
    invoices: [],
    messages: [
      {
        _id: "m6",
        content: "Unfortunately, the condo association did not approve the installation.",
        senderName: "Lisa Garcia",
        createdAt: Date.parse("2024-12-16T11:00:00"),
        isOutgoing: false,
      },
    ],
    tasks: [],
    createdAt: Date.parse("2024-11-20"),
    updatedAt: Date.parse("2024-12-16"),
  },
  {
    _id: "8",
    name: "Reyes Farm Solar",
    stage: "for_ocular",
    estimatedValue: 520000,
    contact: {
      _id: "c8",
      firstName: "Antonio",
      lastName: "Reyes",
      email: "antonio.reyes@farm.com",
      phone: "+63 924 890 1234",
      address: "Reyes Farm, Batangas",
      source: "walk_in",
    },
    scheduledAppointment: {
      _id: "a4",
      title: "Farm Site Visit",
      date: "2024-12-23",
      time: "9:00 AM",
      location: "Reyes Farm, Batangas",
      contactId: "c8",
      contactName: "Antonio Reyes",
      opportunityId: "8",
      opportunityName: "Reyes Farm Solar",
      assignedUserId: "u2",
      assignedUserName: "Carlos Reyes",
      status: "pending",
      appointmentType: "field_inspection",
    },
    documents: [],
    invoices: [],
    messages: [],
    tasks: [
      {
        _id: "t6",
        title: "Research agricultural solar incentives",
        description: "Check government programs for farm solar",
        contactName: "Antonio Reyes",
        dueDate: Date.parse("2024-12-22"),
        assignedUserName: "Maria Garcia",
        status: "pending",
      },
    ],
    createdAt: Date.parse("2024-12-12"),
    updatedAt: Date.parse("2024-12-18"),
  },
];
