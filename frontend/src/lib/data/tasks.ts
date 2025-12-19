import { TaskStatus } from "@/lib/types";

// Local mock interface (will be replaced with Convex data)
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

export const placeholderTasks: MockTask[] = [
  {
    _id: "1",
    title: "Follow up with Juan Santos",
    description: "Call to discuss solar panel installation quote",
    contactName: "Juan Santos",
    dueDate: Date.parse("2024-12-20"),
    assignedUserName: "Maria Garcia",
    status: "pending",
  },
  {
    _id: "2",
    title: "Site inspection at Rodriguez residence",
    description: "Assess roof condition and optimal panel placement",
    contactName: "Pedro Rodriguez",
    dueDate: Date.parse("2024-12-21"),
    assignedUserName: "Carlos Reyes",
    status: "doing",
  },
  {
    _id: "3",
    title: "Prepare proposal for Dela Cruz family",
    description: "5kW system proposal with financing options",
    contactName: "Ana Dela Cruz",
    dueDate: Date.parse("2024-12-19"),
    assignedUserName: "Maria Garcia",
    status: "completed",
  },
  {
    _id: "4",
    title: "Schedule installation team",
    description: "Coordinate with installation crew for Mendoza project",
    opportunityName: "Mendoza Warehouse Project",
    dueDate: Date.parse("2024-12-22"),
    assignedUserName: "Carlos Reyes",
    status: "pending",
  },
  {
    _id: "5",
    title: "Send contract to customer",
    description: "Email signed contract and payment schedule",
    contactName: "Teresa Villanueva",
    dueDate: Date.parse("2024-12-20"),
    assignedUserName: "Maria Garcia",
    status: "doing",
  },
  {
    _id: "6",
    title: "Order solar panels from supplier",
    description: "Order 20 panels for upcoming installations",
    dueDate: Date.parse("2024-12-18"),
    assignedUserName: "Carlos Reyes",
    status: "completed",
  },
  {
    _id: "7",
    title: "Call back missed inquiry",
    description: "Customer called while office was closed",
    contactName: "Mark Tan",
    dueDate: Date.parse("2024-12-19"),
    assignedUserName: "Maria Garcia",
    status: "pending",
  },
  {
    _id: "8",
    title: "Update CRM with new lead info",
    description: "Add details from trade show contacts",
    dueDate: Date.parse("2024-12-21"),
    assignedUserName: "Carlos Reyes",
    status: "doing",
  },
];
