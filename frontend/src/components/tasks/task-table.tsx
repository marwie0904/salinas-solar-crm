"use client";

import Link from "next/link";
import { TaskStatus } from "@/lib/types";
import { Id } from "../../../convex/_generated/dataModel";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { User, Target, MoreHorizontal, Pencil, Trash2 } from "lucide-react";

// Task type from Convex query (enriched with relations)
export interface Task {
  _id: Id<"tasks">;
  title: string;
  description?: string;
  status: TaskStatus;
  priority?: "low" | "medium" | "high";
  dueDate?: number;
  completedAt?: number;
  contactId?: Id<"contacts">;
  opportunityId?: Id<"opportunities">;
  assignedTo?: Id<"users">;
  isDeleted: boolean;
  createdBy?: Id<"users">;
  createdAt: number;
  updatedAt: number;
  isOverdue?: boolean;
  contact?: { _id: Id<"contacts">; fullName: string } | null;
  opportunity?: { _id: Id<"opportunities">; name: string } | null;
  assignedUser?: { _id: Id<"users">; fullName: string } | null;
}

interface TaskTableProps {
  tasks: Task[];
  onToggleComplete: (taskId: Id<"tasks">) => void;
  onStatusChange: (taskId: Id<"tasks">, status: TaskStatus) => void;
  onEdit: (task: Task) => void;
  onDelete: (taskId: Id<"tasks">) => void;
}

const statusConfig: Record<
  TaskStatus,
  { label: string; className: string }
> = {
  pending: {
    label: "Pending",
    className: "bg-gray-100 text-gray-700 hover:bg-gray-100",
  },
  doing: {
    label: "Doing",
    className: "bg-yellow-100 text-yellow-700 hover:bg-yellow-100",
  },
  completed: {
    label: "Completed",
    className: "bg-green-100 text-green-700 hover:bg-green-100",
  },
};

export function TaskTable({
  tasks,
  onToggleComplete,
  onStatusChange,
  onEdit,
  onDelete,
}: TaskTableProps) {
  return (
    <div className="rounded-lg border bg-white">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-[80px] text-center">Complete</TableHead>
            <TableHead className="min-w-[200px] pl-6">Task Title</TableHead>
            <TableHead className="min-w-[200px]">Description</TableHead>
            <TableHead className="max-w-[200px]">Associated</TableHead>
            <TableHead>Due Date</TableHead>
            <TableHead>Assigned</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                No tasks found. Click "Add Task" to create one.
              </TableCell>
            </TableRow>
          ) : (
            tasks.map((task) => {
              const isCompleted = task.status === "completed";
              return (
                <TableRow
                  key={task._id}
                  className={cn(
                    "transition-colors",
                    isCompleted && "bg-muted/30"
                  )}
                >
                  <TableCell className="text-center">
                    <Checkbox
                      checked={isCompleted}
                      onCheckedChange={() => onToggleComplete(task._id)}
                      className="border-gray-300"
                    />
                  </TableCell>
                  <TableCell className="pl-6">
                    <span
                      className={cn(
                        "font-medium",
                        isCompleted && "line-through text-muted-foreground"
                      )}
                    >
                      {task.title}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "text-sm text-muted-foreground",
                        isCompleted && "line-through"
                      )}
                    >
                      {task.description || "—"}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-[200px]">
                    {task.contact || task.opportunity ? (
                      <div className="flex items-center gap-2 text-sm truncate">
                        {task.contact && (
                          <Link
                            href={`/contacts/${task.contact._id}`}
                            className="flex items-center gap-1 min-w-0 hover:text-[#ff5603] transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <User className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                            <span className="truncate underline">{task.contact.fullName}</span>
                          </Link>
                        )}
                        {task.contact && task.opportunity && (
                          <span className="text-muted-foreground flex-shrink-0">|</span>
                        )}
                        {task.opportunity && (
                          <Link
                            href={`/pipeline?opportunityId=${task.opportunity._id}`}
                            className="flex items-center gap-1 min-w-0 hover:text-[#ff5603] transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Target className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                            <span className="truncate underline">{task.opportunity.name}</span>
                          </Link>
                        )}
                      </div>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    <span className={cn("text-sm", task.isOverdue && task.status !== "completed" && "text-red-600 font-medium")}>
                      {task.dueDate
                        ? new Date(task.dueDate).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })
                        : "—"}
                    </span>
                  </TableCell>
                  <TableCell>{task.assignedUser?.fullName || "—"}</TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={cn(
                        "cursor-pointer font-medium",
                        statusConfig[task.status].className
                      )}
                      onClick={() => {
                        const statuses: TaskStatus[] = ["pending", "doing", "completed"];
                        const currentIndex = statuses.indexOf(task.status);
                        const nextStatus = statuses[(currentIndex + 1) % statuses.length];
                        onStatusChange(task._id, nextStatus);
                      }}
                    >
                      {statusConfig[task.status].label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(task)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onDelete(task._id)}
                          className="text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
