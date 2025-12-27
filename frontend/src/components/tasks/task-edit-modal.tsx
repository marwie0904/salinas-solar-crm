"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { User, Target } from "lucide-react";
import { Task } from "./task-table";
import { cn } from "@/lib/utils";

interface TaskEditModalProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  // Create mode props
  mode?: "edit" | "create";
  defaultContactId?: Id<"contacts">;
  defaultOpportunityId?: Id<"opportunities">;
  // Styling props
  showOverlay?: boolean;
  offsetForSidebar?: boolean; // Offset modal to center in content area (excluding sidebar)
}

interface FormData {
  title: string;
  description: string;
  dueDate: string;
  assignedTo: string;
  contactId: Id<"contacts"> | null;
  opportunityId: Id<"opportunities"> | null;
}

interface ContactOpportunityOption {
  id: string;
  contactId: Id<"contacts">;
  contactName: string;
  opportunityId: Id<"opportunities"> | null;
  opportunityName: string | null;
}

export function TaskEditModal({
  task,
  open,
  onOpenChange,
  onSuccess,
  mode = "edit",
  defaultContactId,
  defaultOpportunityId,
  showOverlay = false,
  offsetForSidebar = false,
}: TaskEditModalProps) {
  const isCreateMode = mode === "create";

  const [formData, setFormData] = useState<FormData>({
    title: "",
    description: "",
    dueDate: "",
    assignedTo: "",
    contactId: defaultContactId || null,
    opportunityId: defaultOpportunityId || null,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string>("");

  // Fetch data for dropdowns
  const users = useQuery(api.users.list, {});
  // Only fetch contacts/opportunities if not in create mode with defaults
  const contacts = useQuery(api.contacts.list, isCreateMode ? "skip" : {});
  const opportunities = useQuery(api.opportunities.list, isCreateMode ? "skip" : {});

  const updateTask = useMutation(api.tasks.update);
  const createTask = useMutation(api.tasks.create);

  // Initialize form when task changes or modal opens
  useEffect(() => {
    if (isCreateMode && open) {
      // Reset form for create mode
      setFormData({
        title: "",
        description: "",
        dueDate: "",
        assignedTo: "",
        contactId: defaultContactId || null,
        opportunityId: defaultOpportunityId || null,
      });
      setSelectedOption("");
    } else if (task) {
      setFormData({
        title: task.title,
        description: task.description || "",
        dueDate: task.dueDate
          ? new Date(task.dueDate).toISOString().split("T")[0]
          : "",
        assignedTo: task.assignedTo || "",
        contactId: task.contactId || null,
        opportunityId: task.opportunityId || null,
      });

      // Set selected option
      if (task.contactId && task.opportunityId) {
        setSelectedOption(`${task.contactId}|${task.opportunityId}`);
      } else if (task.contactId) {
        setSelectedOption(`${task.contactId}|none`);
      } else {
        setSelectedOption("none");
      }
    }
  }, [task, isCreateMode, open, defaultContactId, defaultOpportunityId]);

  // Build combined contact/opportunity options
  const contactOpportunityOptions: ContactOpportunityOption[] = [];

  if (contacts && opportunities) {
    const opportunitiesByContact = new Map<string, typeof opportunities>();

    opportunities.forEach((opp) => {
      const existing = opportunitiesByContact.get(opp.contactId) || [];
      opportunitiesByContact.set(opp.contactId, [...existing, opp]);
    });

    contacts.forEach((contact) => {
      const contactOpps = opportunitiesByContact.get(contact._id) || [];

      if (contactOpps.length > 0) {
        contactOpps.forEach((opp) => {
          contactOpportunityOptions.push({
            id: `${contact._id}|${opp._id}`,
            contactId: contact._id,
            contactName: contact.fullName || `${contact.firstName} ${contact.lastName}`,
            opportunityId: opp._id,
            opportunityName: opp.name,
          });
        });
      } else {
        contactOpportunityOptions.push({
          id: `${contact._id}|none`,
          contactId: contact._id,
          contactName: contact.fullName || `${contact.firstName} ${contact.lastName}`,
          opportunityId: null,
          opportunityName: null,
        });
      }
    });
  }

  const handleOptionChange = (value: string) => {
    setSelectedOption(value);

    if (value === "none") {
      setFormData((prev) => ({
        ...prev,
        contactId: null,
        opportunityId: null,
      }));
      return;
    }

    const option = contactOpportunityOptions.find((opt) => opt.id === value);
    if (option) {
      setFormData((prev) => ({
        ...prev,
        contactId: option.contactId,
        opportunityId: option.opportunityId,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      return;
    }

    if (!isCreateMode && !task) {
      return;
    }

    setIsSaving(true);
    try {
      if (isCreateMode) {
        await createTask({
          title: formData.title,
          description: formData.description || undefined,
          dueDate: formData.dueDate ? new Date(formData.dueDate).getTime() : undefined,
          assignedTo: formData.assignedTo ? (formData.assignedTo as Id<"users">) : undefined,
          contactId: formData.contactId || undefined,
          opportunityId: formData.opportunityId || undefined,
          status: "pending",
        });
      } else {
        await updateTask({
          id: task!._id,
          title: formData.title,
          description: formData.description || undefined,
          dueDate: formData.dueDate ? new Date(formData.dueDate).getTime() : undefined,
          assignedTo: formData.assignedTo ? (formData.assignedTo as Id<"users">) : undefined,
          contactId: formData.contactId || undefined,
          opportunityId: formData.opportunityId || undefined,
        });
      }

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error(`Failed to ${isCreateMode ? "create" : "update"} task:`, error);
    } finally {
      setIsSaving(false);
    }
  };

  const getDisplayValue = () => {
    if (!selectedOption || selectedOption === "none") {
      return null;
    }
    const option = contactOpportunityOptions.find((opt) => opt.id === selectedOption);
    if (!option) return null;
    return option;
  };

  const displayOption = getDisplayValue();

  // Only return null in edit mode when no task is provided
  if (!isCreateMode && !task) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "sm:max-w-[500px] bg-background border shadow-lg",
          offsetForSidebar && "left-[calc(50%+160px)]"
        )}
        hideOverlay={!showOverlay}
      >
        <DialogHeader>
          <DialogTitle>{isCreateMode ? "Add Task" : "Edit Task"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Task Title */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Task Title *</label>
            <Input
              placeholder="Enter task title"
              value={formData.title}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, title: e.target.value }))
              }
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <Textarea
              placeholder="Enter task description"
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, description: e.target.value }))
              }
              rows={3}
            />
          </div>

          {/* Due Date */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Due Date</label>
            <Input
              type="date"
              value={formData.dueDate}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, dueDate: e.target.value }))
              }
            />
          </div>

          {/* Assign To */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Assign To</label>
            <Select
              value={formData.assignedTo}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, assignedTo: value }))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select user" />
              </SelectTrigger>
              <SelectContent>
                {users?.map((user) => (
                  <SelectItem key={user._id} value={user._id}>
                    {user.firstName} {user.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Contact & Opportunity Combined - Only show in edit mode */}
          {!isCreateMode && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Contact & Opportunity (optional)</label>
              <Select
                value={selectedOption}
                onValueChange={handleOptionChange}
              >
                <SelectTrigger className="w-full">
                  {displayOption ? (
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span>{displayOption.contactName}</span>
                      {displayOption.opportunityName && (
                        <>
                          <span className="text-muted-foreground">|</span>
                          <Target className="h-4 w-4 text-muted-foreground" />
                          <span>{displayOption.opportunityName}</span>
                        </>
                      )}
                    </div>
                  ) : (
                    <SelectValue placeholder="Select contact & opportunity" />
                  )}
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    <span className="text-muted-foreground">None</span>
                  </SelectItem>
                  {contactOpportunityOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span>{option.contactName}</span>
                        {option.opportunityName && (
                          <>
                            <span className="text-muted-foreground">|</span>
                            <Target className="h-4 w-4 text-muted-foreground" />
                            <span>{option.opportunityName}</span>
                          </>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-[#ff5603] hover:bg-[#e64d00] cursor-pointer"
              disabled={isSaving || !formData.title.trim()}
            >
              {isSaving ? (isCreateMode ? "Creating..." : "Saving...") : (isCreateMode ? "Create Task" : "Save Changes")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
