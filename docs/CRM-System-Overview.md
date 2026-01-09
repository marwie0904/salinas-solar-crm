# Salinas Solar CRM - System Overview

**Last Updated:** January 2026
**Purpose:** High-level overview of the CRM system for stakeholders and management

---

## What is This System?

The Salinas Solar CRM is a customer relationship management system built specifically for managing the complete solar installation sales process—from the moment a lead enters your system until the installation is complete and paid for.

**Key Benefits:**
- Centralized customer database accessible by all team members
- Visual sales pipeline to track deal progress
- Automated customer communications (SMS & email)
- Digital contracts with electronic signatures
- Invoice generation and payment tracking
- Integration with OpenSolar for system design data

---

## System Pages at a Glance

| Page | Purpose |
|------|---------|
| **Dashboard** | Overview of key metrics (new leads, appointments, tasks, messages) |
| **Pipeline** | Visual board showing all deals by stage (drag & drop) |
| **Contacts** | Customer/lead database with full profiles |
| **Opportunities** | Individual deals linked to contacts |
| **Messages** | SMS and social media conversations with customers |
| **Appointments** | Schedule and track discovery calls & site inspections |
| **Invoices** | Create, send, and track customer payments |
| **Agreements** | Digital contracts for customer signing |
| **Tasks** | Team to-do list with assignments and due dates |
| **Users** | Team member management |

---

## Core Workflows

### 1. Lead Management

#### How Leads Get Created

Leads (contacts) enter the system from multiple sources:

- **Facebook/Instagram** — From social media ads or direct messages
- **Google Ads** — From online advertising campaigns
- **Website** — Contact form submissions
- **Referrals** — Word of mouth from existing customers
- **Walk-ins** — Customers visiting the office
- **Cold Calls** — Outbound sales efforts

Each lead is stored with their contact information (name, phone, email, address) and tagged with their source for tracking where your customers come from.

#### What Happens Next

1. Lead is created in the system → appears in **Inbox** stage
2. Sales rep is assigned to the lead
3. Sales rep follows up (call, message, etc.)
4. If interested, an **Opportunity** (deal) is created
5. Opportunity moves through the pipeline stages

---

### 2. The Sales Pipeline

The pipeline is a visual board showing where each deal stands. Opportunities move through these stages:

| Stage | What It Means |
|-------|---------------|
| **Inbox** | New lead just added, needs first contact |
| **To Call** | Lead needs a follow-up phone call |
| **Did Not Answer** | Call attempted, no response yet |
| **Booked Call** | Discovery call is scheduled |
| **Did Not Book Call** | Customer declined scheduling a call |
| **For Ocular** | Ready for on-site inspection |
| **Follow Up** | Waiting on customer decision |
| **Contract Sent** | Agreement sent, awaiting signature |
| **Invoice Sent** | Invoice sent, awaiting payment |
| **For Installation** | Ready to schedule installation |
| **Closed** | Deal completed |

**How it works:** Team members drag and drop opportunities between stages as deals progress. The system tracks the movement and updates automatically when agreements or invoices are sent.

---

### 3. OpenSolar Integration

#### What is OpenSolar?

OpenSolar is a solar design platform that creates detailed system proposals—panel layouts, equipment specifications, energy production estimates, and pricing.

#### How the Connection Works

1. When a deal is ready for system design, the CRM creates a project in OpenSolar
2. The System Consultant designs the solar system in OpenSolar (panel placement, inverter selection, etc.)
3. The design data syncs back to the CRM automatically
4. This data is used to generate accurate agreements and invoices

#### What Data Syncs

- System size (kW)
- Battery capacity (kWh)
- Estimated annual energy production (kWh/year)
- Equipment list (panels, inverters, batteries)
- Total system price

This eliminates manual data entry and ensures agreements match the actual system design.

---

### 4. Agreement & Contract Signing

#### The Agreement Process

1. **Create Agreement** — User generates an agreement from an opportunity
2. **Auto-populate Data** — System pulls equipment details from OpenSolar
3. **Send to Customer** — Agreement is emailed with a secure signing link
4. **Customer Reviews** — Customer opens the link and reviews terms
5. **Digital Signature** — Customer signs directly on their phone/computer
6. **Confirmation** — Signed PDF is stored, opportunity moves to "Contract Sent"

#### What's Included in Agreements

- Customer information
- Project location
- Complete materials list (from OpenSolar)
- Pricing and payment terms
- Warranty information
- Project timeline/phases
- Digital signature capture

**Automatic Reminders:** If a customer doesn't sign within 3 days, the system automatically sends an SMS reminder.

---

### 5. Invoicing & Payments

#### Creating Invoices

Invoices are created from opportunities and can include:

- Products from your catalog (panels, inverters, labor, etc.)
- Custom line items
- Tax calculations
- Discounts

#### Payment Options Supported

- **Payment Types:** One-time, Installment, Down Payment, Progress Billing
- **Payment Methods:** Cash, Bank Transfer, Check, Credit Card, GCash, Maya

#### Invoice Workflow

1. **Create Invoice** — Select opportunity, add line items, set due date
2. **Send to Customer** — Invoice emailed with secure payment link
3. **Customer Views** — Customer can view invoice details online
4. **Record Payments** — Team records payments as received
5. **Track Status** — System shows: Pending → Partially Paid → Paid in Full

#### Automatic Features

- Invoice status updates automatically based on payments
- Overdue invoices are flagged
- SMS reminder sent if unpaid after 3 days
- Unique link allows customers to view without logging in

---

### 6. Automated SMS Messages

The system automatically sends SMS messages at key moments to keep customers informed and engaged.

#### Automatic SMS Triggers

| Trigger | Message Sent |
|---------|--------------|
| **Appointment Scheduled** | Confirmation with date, time, location, and consultant name |
| **Day of Appointment** | Reminder sent morning of scheduled appointment |
| **Agreement Sent** | Notifies customer to check their email for the contract |
| **Invoice Sent** | Notifies customer to check their email for the invoice |
| **Agreement Unsigned (3 days)** | Reminder to sign the agreement |
| **Invoice Unpaid (3 days)** | Reminder to complete payment |

#### Manual Messaging

Team members can also send individual messages to customers through:
- SMS (text message)
- Facebook Messenger
- Instagram Direct Messages

All conversations are stored in the CRM for team visibility.

---

### 7. Appointments

The system tracks two types of appointments:

| Type | Purpose |
|------|---------|
| **Discovery Call** | Initial phone/video consultation to discuss needs |
| **Field Inspection** | On-site visit to assess property for installation |

#### Appointment Features

- Assigned to specific team members
- Linked to contacts and opportunities
- Location tracking for field inspections
- Automatic SMS reminders to customers
- Dashboard shows today's appointments

---

### 8. Tasks & Team Management

#### Task System

Tasks help the team track work that needs to be done:

- **Status:** Pending → Doing → Completed
- **Priority:** Low, Medium, High
- **Due Dates:** With automatic reminders
- **Assignments:** Assigned to specific team members

#### Notifications

Team members receive automatic notifications for:
- New lead assignments
- Upcoming appointments
- Tasks due soon
- Overdue tasks
- Agreement signatures
- New messages from customers

---

## User Roles

| Role | Description |
|------|-------------|
| **Admin** | Full system access, can manage users and settings |
| **Sales** | Manages leads, opportunities, and customer communications |
| **System Consultant** | Handles consultations and coordinates with OpenSolar designs |
| **Project Manager** | Oversees installations and project coordination |
| **Technician** | Field work and installation activities |

---

## Key Metrics Tracked

The Dashboard provides visibility into:

**Pipeline Health**
- Total pipeline value by stage
- Number of opportunities per stage
- Conversion rates

**Revenue**
- Payments received by period
- Outstanding invoices
- Revenue trends

**Team Activity**
- Tasks completed vs pending
- Appointments scheduled
- Messages sent/received

**Lead Tracking**
- New leads this week/month
- Lead sources breakdown
- Deals closed this month

---

## Data Flow Summary

```
Lead Source → Contact Created → Opportunity Created →
OpenSolar Design → Agreement Sent → Agreement Signed →
Invoice Sent → Payment Received → Installation → Closed
```

Each step is tracked, automated where possible, and visible to the entire team.

---

## Summary

The Salinas Solar CRM streamlines the entire sales process by:

1. **Centralizing** all customer data in one place
2. **Visualizing** the sales pipeline for easy tracking
3. **Automating** customer communications (SMS & email)
4. **Integrating** with OpenSolar for accurate system data
5. **Digitizing** contracts with electronic signatures
6. **Tracking** invoices and payments
7. **Notifying** team members of important activities

This results in fewer missed follow-ups, faster deal progression, better customer experience, and complete visibility into sales performance.
