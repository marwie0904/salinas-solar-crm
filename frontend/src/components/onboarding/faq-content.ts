export interface FaqItem {
  question: string;
  answer: string;
}

export interface FaqSection {
  id: string;
  title: string;
  icon: string;
  items: FaqItem[];
}

export const faqSections: FaqSection[] = [
  {
    id: "dashboard",
    title: "Dashboard",
    icon: "LayoutDashboard",
    items: [
      {
        question: "What do the dashboard stats show?",
        answer:
          "The dashboard displays real-time metrics: 'New Leads This Week' shows contacts created in the current week, 'Appointments Today' shows scheduled appointments for today. The line chart tracks your monthly lead acquisition trends.",
      },
      {
        question: "How do notifications work?",
        answer:
          "Notifications appear based on your role. You'll see alerts for: lead assignments, scheduled appointments, task reminders (due soon, tomorrow, overdue), and agreement updates. Unread notifications have an orange highlight.",
      },
      {
        question: "Why is some data not showing?",
        answer:
          "Data updates in real-time. If you don't see expected data, check if: the date filters are correct, you have the right permissions for that data, or if the records exist in the system.",
      },
    ],
  },
  {
    id: "pipeline",
    title: "Pipeline",
    icon: "GitBranch",
    items: [
      {
        question: "What are the pipeline stages?",
        answer:
          "The 10 stages are: Inbox (new leads) → To Call (awaiting contact) → Did Not Answer (retry) → Booked Call (scheduled) → Did Not Book Call (needs follow-up) → For Ocular (site visit) → Follow Up (awaiting decision) → Contract Sent (agreement sent) → For Installation (ready to install) → Closed (completed).",
      },
      {
        question: "How do I move opportunities between stages?",
        answer:
          "Drag and drop opportunity cards between stage columns. Some stage transitions trigger automatic actions like SMS notifications or email sends.",
      },
      {
        question: "Why can't I move an opportunity to 'Closed'?",
        answer:
          "Only Project Managers can move opportunities to the 'Closed' stage. This ensures proper verification of installation completion before marking a project as done. This also triggers automatic receipt generation.",
      },
      {
        question: "What automations run for each stage?",
        answer:
          "Stage automations include: SMS confirmations when moving to certain stages, weekly follow-up messages for 'Did Not Book Call' and 'Follow Up' stages (Mon & Thu at 9 AM), 3-day reminders after sending contracts, and receipt generation on closure.",
      },
    ],
  },
  {
    id: "contacts",
    title: "Contacts",
    icon: "Users",
    items: [
      {
        question: "Where do contacts come from?",
        answer:
          "Contacts can come from: Website forms, Facebook leads, Instagram inquiries, Google Ads, Referrals, Walk-ins, or Cold Calls. The source is tracked for ROI analysis.",
      },
      {
        question: "How do I create a new contact?",
        answer:
          "Click the 'Add Contact' button on the Contacts page. Fill in the required fields (name, source) and optional details (email, phone, address, company). You can also set their preferred messaging channel.",
      },
      {
        question: "Can a contact have multiple opportunities?",
        answer:
          "Yes. A single contact can have multiple solar project opportunities. Each opportunity is tracked independently through the pipeline.",
      },
      {
        question: "What is the preferred message channel?",
        answer:
          "You can set how each contact prefers to be contacted: SMS, Facebook Messenger, or Instagram DM. This helps ensure communication reaches them through their preferred platform.",
      },
    ],
  },
  {
    id: "opportunities",
    title: "Opportunities",
    icon: "Target",
    items: [
      {
        question: "How do I create an opportunity?",
        answer:
          "Opportunities are created from contacts. Open a contact and click 'Add Opportunity'. Enter the project name, estimated value, and optionally assign a System Consultant.",
      },
      {
        question: "How do I capture a location?",
        answer:
          "In the opportunity detail view, click 'Capture Location'. Use the map interface to pinpoint the exact installation location. This helps with site planning and field inspections.",
      },
      {
        question: "What is OpenSolar integration?",
        answer:
          "OpenSolar is a solar design tool. When linked, you can import project data (system size, specifications, bill analysis) directly into agreements, saving time on data entry.",
      },
      {
        question: "Who can be assigned to opportunities?",
        answer:
          "System Consultants and System Associates can be assigned to opportunities. They receive notifications when assigned and are responsible for managing the sales process.",
      },
    ],
  },
  {
    id: "appointments",
    title: "Appointments",
    icon: "Calendar",
    items: [
      {
        question: "What types of appointments can I create?",
        answer:
          "Two types: Discovery Calls (initial phone/video consultations to understand customer needs) and Field Inspections (on-site ocular visits to assess installation location).",
      },
      {
        question: "What automated messages are sent for appointments?",
        answer:
          "When you create an appointment: an SMS confirmation is sent immediately with date, time, and consultant name. On the day of the appointment, a reminder SMS is sent at 7:00 AM.",
      },
      {
        question: "How do I reschedule or cancel an appointment?",
        answer:
          "Open the appointment and change its status to 'Cancelled' with a reason, or edit the date/time for rescheduling. The contact will receive updated notifications.",
      },
      {
        question: "What appointment statuses are available?",
        answer:
          "Statuses include: Pending (scheduled), Completed (done), Cancelled (with reason), and No-Show (customer didn't attend).",
      },
    ],
  },
  {
    id: "agreements",
    title: "Agreements",
    icon: "FileSignature",
    items: [
      {
        question: "How do I create an agreement?",
        answer:
          "Go to Agreements page and click 'Create Agreement'. Select the opportunity, enter system specifications (type, size, battery), add materials, payment schedule, and warranty terms. You can also pre-fill data from OpenSolar projects.",
      },
      {
        question: "How does the signing process work?",
        answer:
          "When you send an agreement, the customer receives an email and SMS with a signing link. They can view the agreement, draw their signature, and submit. The link is valid for 30 days.",
      },
      {
        question: "What happens after 30 days if not signed?",
        answer:
          "The agreement expires and the status changes to 'Expired'. You'll need to create a new agreement if the customer still wants to proceed.",
      },
      {
        question: "Are there automatic reminders for unsigned agreements?",
        answer:
          "Yes. If an agreement isn't signed within 3 days of sending, an automatic reminder SMS is sent to the customer encouraging them to review and sign.",
      },
    ],
  },
  {
    id: "invoices",
    title: "Invoices",
    icon: "FileText",
    items: [
      {
        question: "What payment types are supported?",
        answer:
          "One-time (full payment), Installment (multiple equal payments), Downpayment (initial payment before work), and Progress Billing (payments at project milestones).",
      },
      {
        question: "What payment methods can I record?",
        answer:
          "Cash, Bank Transfer, Check, Credit Card, GCash, Maya, Post-dated Check, and Other. Each payment is recorded with date, amount, and reference number.",
      },
      {
        question: "How do I send an invoice to a customer?",
        answer:
          "Click the 'Send' button on an invoice. The customer receives an email with a link to view the invoice details and payment instructions.",
      },
      {
        question: "How are overdue invoices handled?",
        answer:
          "Invoices past their due date are automatically flagged as overdue. You can see all overdue invoices filtered on the Invoices page for follow-up.",
      },
    ],
  },
  {
    id: "messages",
    title: "Messages",
    icon: "MessageSquare",
    items: [
      {
        question: "What messaging channels are available?",
        answer:
          "SMS (via phone number), Facebook Messenger (for Facebook leads), and Instagram DM (for Instagram inquiries). All conversations are threaded by contact.",
      },
      {
        question: "What are messaging windows?",
        answer:
          "Meta platforms (Facebook/Instagram) have rules: 0-24 hours after customer message - any message allowed; 24h-7 days - only human agent replies allowed; after 7 days - only transactional message tags allowed.",
      },
      {
        question: "How do I know which channel to use?",
        answer:
          "Check the contact's preferred message channel. If they came from Facebook, use Messenger. If from Instagram, use DM. For phone-based leads, use SMS.",
      },
    ],
  },
  {
    id: "tasks",
    title: "Tasks",
    icon: "CheckSquare",
    items: [
      {
        question: "How do task notifications work?",
        answer:
          "The system sends automatic notifications: 'Due Soon' (1 hour before due), 'Due Tomorrow' (at 7 AM for next day's tasks), and 'Overdue' (when task passes due date, then every 24 hours).",
      },
      {
        question: "What priority levels are available?",
        answer:
          "Low, Medium, and High priority. Use these to organize your workload and focus on urgent items first.",
      },
      {
        question: "Can I link tasks to contacts or opportunities?",
        answer:
          "Yes. Tasks can be linked to both contacts and opportunities, making it easy to track all related work for a specific project or customer.",
      },
    ],
  },
  {
    id: "receipts",
    title: "Receipts & Project Closure",
    icon: "Receipt",
    items: [
      {
        question: "How are receipts generated?",
        answer:
          "Receipts are automatically generated when a Project Manager moves an opportunity to 'Closed'. The system creates a PDF with project details, uploads it, and sends it to the customer via email and SMS.",
      },
      {
        question: "Why can only Project Managers close opportunities?",
        answer:
          "This ensures proper verification that the installation is actually complete before marking a project as done. It's a quality control measure that triggers final documentation.",
      },
      {
        question: "What information is included in receipts?",
        answer:
          "Receipt number (format: RCP-YYYYMM-XXXX), system specifications (type, size, battery capacity), total project cost, installation completion date, and a thank you message.",
      },
    ],
  },
  {
    id: "notifications-by-role",
    title: "Notifications by Role",
    icon: "Bell",
    items: [
      {
        question: "What notifications do Sales/Head Sales receive?",
        answer:
          "Lead assignments, appointment scheduled notifications, and any task-related alerts for tasks assigned to them.",
      },
      {
        question: "What notifications do System Consultants receive?",
        answer:
          "Opportunity assignments (when assigned to manage a project), appointment notifications, agreement signing updates, and task reminders.",
      },
      {
        question: "What notifications do Project Managers receive?",
        answer:
          "Requests to verify and close opportunities (when installation is complete), task reminders, and any PM-specific workflow notifications.",
      },
      {
        question: "What notifications do all roles receive?",
        answer:
          "Task due reminders (due soon, tomorrow, overdue), appointments assigned to them, and general system notifications relevant to their work.",
      },
    ],
  },
];

export const getFaqSectionById = (id: string): FaqSection | undefined => {
  return faqSections.find((section) => section.id === id);
};

export const searchFaq = (query: string): FaqItem[] => {
  const lowerQuery = query.toLowerCase();
  const results: FaqItem[] = [];

  faqSections.forEach((section) => {
    section.items.forEach((item) => {
      if (
        item.question.toLowerCase().includes(lowerQuery) ||
        item.answer.toLowerCase().includes(lowerQuery)
      ) {
        results.push(item);
      }
    });
  });

  return results;
};
