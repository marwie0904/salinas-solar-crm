export interface TourStep {
  id: string;
  title: string;
  content: string;
  target?: string; // CSS selector for element to highlight
  placement?: "top" | "bottom" | "left" | "right" | "center";
  route?: string; // Route to navigate to for this step
}

export const tourSteps: TourStep[] = [
  // ============================================
  // WELCOME & DASHBOARD
  // ============================================
  {
    id: "welcome",
    title: "Welcome to Salinas Solar CRM",
    content:
      "This tour will help you understand how to use the system effectively. You'll learn about managing leads through the pipeline, automations that run at each stage, and key features for closing deals.",
    placement: "center",
    route: "/dashboard",
  },
  {
    id: "dashboard-overview",
    title: "Dashboard Overview",
    content:
      "Your dashboard shows real-time metrics: new leads this week, today's appointments, and recent notifications. The chart tracks your monthly lead acquisition trends.",
    target: '[data-tour="dashboard-stats"]',
    placement: "bottom",
    route: "/dashboard",
  },
  {
    id: "notifications",
    title: "Notifications",
    content:
      "You receive notifications based on your role: lead assignments, scheduled appointments, task reminders (1 hour before, tomorrow at 7 AM, when overdue), and agreement updates. Unread notifications show an orange indicator.",
    target: '[data-tour="notifications"]',
    placement: "left",
    route: "/dashboard",
  },

  // ============================================
  // PIPELINE - DETAILED WALKTHROUGH
  // ============================================
  {
    id: "pipeline-intro",
    title: "Pipeline Overview",
    content:
      "The pipeline is where you manage all opportunities. Drag cards between stages to move them through your sales process. Each stage has specific automations that trigger automatically. Let's walk through each stage.",
    target: '[data-tour="pipeline-board"]',
    placement: "bottom",
    route: "/pipeline",
  },
  {
    id: "stage-inbox",
    title: "Stage 1: Inbox (Manual)",
    content:
      "New leads land here when they enter the system (from website, Facebook, Instagram, etc.). This is your queue for initial review and qualification. No automations run yet - review the lead and move them to 'To Call' when ready to contact.",
    target: '[data-tour="stage-inbox"]',
    placement: "right",
    route: "/pipeline",
  },
  {
    id: "stage-to-call",
    title: "Stage 2: To Call (Manual)",
    content:
      "Leads awaiting their first contact. Make your initial call to discuss their solar needs. After calling, move to: 'Booked Call' (if scheduled), 'Did Not Answer' (if no answer), or 'Did Not Book Call' (if they're not ready yet).",
    target: '[data-tour="stage-to_call"]',
    placement: "right",
    route: "/pipeline",
  },
  {
    id: "stage-did-not-answer",
    title: "Stage 3: Did Not Answer (Manual)",
    content:
      "Leads you couldn't reach. This is your retry queue. Keep attempting to contact them and move to appropriate stage when you connect. Consider moving to 'Did Not Book Call' if multiple attempts fail.",
    target: '[data-tour="stage-did_not_answer"]',
    placement: "right",
    route: "/pipeline",
  },
  {
    id: "stage-booked-call",
    title: "Stage 4: Booked Call (Automated)",
    content:
      "TRIGGER: Opportunity automatically moves here when a 'Discovery Call' appointment is scheduled.\n\nAUTOMATIONS:\n• Instant SMS confirmation with date, time, and consultant name\n• SMS reminder at 7:00 AM on appointment day",
    target: '[data-tour="stage-booked_call"]',
    placement: "right",
    route: "/pipeline",
  },
  {
    id: "stage-did-not-book",
    title: "Stage 5: Did Not Book Call (Automated)",
    content:
      "Leads not ready to schedule yet.\n\nAUTOMATIONS:\n• Follow-up SMS every Monday at 9:00 AM\n• Follow-up SMS every Thursday at 9:00 AM\n• Messages rotate through 25 templates to stay fresh",
    target: '[data-tour="stage-did_not_book_call"]',
    placement: "right",
    route: "/pipeline",
  },
  {
    id: "stage-for-ocular",
    title: "Stage 6: For Ocular (Automated)",
    content:
      "TRIGGER: Opportunity automatically moves here when a 'Field Inspection' appointment is scheduled.\n\nAUTOMATIONS:\n• Instant SMS confirmation with inspection details\n• SMS reminder at 7:00 AM on inspection day\n\nAfter the visit, manually move to 'Follow Up'.",
    target: '[data-tour="stage-for_ocular"]',
    placement: "right",
    route: "/pipeline",
  },
  {
    id: "stage-follow-up",
    title: "Stage 7: Follow Up (Automated)",
    content:
      "Customer is considering your proposal.\n\nAUTOMATIONS:\n• Follow-up SMS every Monday at 9:00 AM\n• Follow-up SMS every Thursday at 9:00 AM\n• Messages rotate through 25 templates\n\nGenerate an agreement when ready to proceed.",
    target: '[data-tour="stage-follow_up"]',
    placement: "right",
    route: "/pipeline",
  },
  {
    id: "stage-contract-sent",
    title: "Stage 8: Contract Sent (Automated)",
    content:
      "TRIGGER: Opportunity automatically moves here when an agreement is generated and sent.\n\nAUTOMATIONS:\n• Email with signing link (valid 30 days)\n• SMS notification about the agreement\n• Reminder SMS after 3 days if unsigned",
    target: '[data-tour="stage-contract_sent"]',
    placement: "left",
    route: "/pipeline",
  },
  {
    id: "stage-for-installation",
    title: "Stage 9: For Installation (Automated)",
    content:
      "TRIGGER: Opportunity automatically moves here when customer signs the agreement.\n\nAUTOMATIONS:\n• SMS notification about installation scheduling\n\nCoordinate with installation team. When complete, request PM to close the project.",
    target: '[data-tour="stage-for_installation"]',
    placement: "left",
    route: "/pipeline",
  },
  {
    id: "stage-closed",
    title: "Stage 10: Closed (Automated, PM Only)",
    content:
      "TRIGGER: Only Project Managers can manually move opportunities here.\n\nAUTOMATIONS:\n• PDF receipt auto-generated with project details\n• Receipt uploaded to storage\n• Email sent to customer with PDF attachment\n• SMS confirmation to customer",
    target: '[data-tour="stage-closed"]',
    placement: "left",
    route: "/pipeline",
  },

  // ============================================
  // OTHER PAGES
  // ============================================
  {
    id: "contacts",
    title: "Contacts",
    content:
      "Your customer database. Contacts come from various sources: Website, Facebook, Instagram, Google Ads, Referrals, Walk-ins, or Cold Calls. Each contact can have multiple opportunities. Click a contact to view their history and linked opportunities.",
    target: '[data-tour="contacts-list"]',
    placement: "bottom",
    route: "/contacts",
  },
  {
    id: "appointments",
    title: "Appointments",
    content:
      "Manage all scheduled meetings. Two types: Discovery Calls (initial consultations) and Field Inspections (site visits). Create appointments from opportunities for automatic linking. Remember: SMS confirmation on booking, reminder at 7 AM on the day.",
    target: '[data-tour="appointments-list"]',
    placement: "bottom",
    route: "/appointments",
  },
  {
    id: "agreements",
    title: "Agreements",
    content:
      "Generate digital contracts. Include system specs (Hybrid/Grid-Tied, kW size, battery), materials, payment schedule, and warranty terms. You can pre-fill from OpenSolar projects. Signing link expires in 30 days. 3-day reminder SMS if unsigned.",
    target: '[data-tour="agreements-form"]',
    placement: "bottom",
    route: "/agreements",
  },
  {
    id: "invoices",
    title: "Invoices",
    content:
      "Track payments for projects. Support One-time, Installment, Downpayment, and Progress Billing. Accept Cash, Bank Transfer, GCash, Maya, and Check. Send invoice links for customer payment. System tracks partial payments and flags overdue invoices.",
    target: '[data-tour="invoices-list"]',
    placement: "bottom",
    route: "/invoices",
  },
  {
    id: "messages",
    title: "Messages",
    content:
      "Multi-channel communication: SMS, Facebook Messenger, Instagram DM. All conversations are threaded by contact. Note: Meta platforms have messaging windows (24hr standard, 7-day for human replies). SMS has no restrictions.",
    target: '[data-tour="messages-list"]',
    placement: "bottom",
    route: "/messages",
  },
  {
    id: "tasks",
    title: "Tasks",
    content:
      "Project task management with priorities (Low/Medium/High) and due dates. Link tasks to contacts or opportunities. Automated notifications: 1 hour before due, tomorrow at 7 AM, and when overdue (repeats every 24 hours until completed).",
    target: '[data-tour="tasks-list"]',
    placement: "bottom",
    route: "/tasks",
  },

  // ============================================
  // COMPLETION
  // ============================================
  {
    id: "complete",
    title: "You're Ready!",
    content:
      "You now understand the CRM workflow: leads flow through the pipeline with automations at each stage, appointments trigger SMS reminders, agreements have signing links with follow-ups, and PM closure generates receipts. Click 'Help & FAQ' in the sidebar anytime for reference.",
    placement: "center",
    route: "/dashboard",
  },
];

export const getTourStepById = (id: string): TourStep | undefined => {
  return tourSteps.find((step) => step.id === id);
};
