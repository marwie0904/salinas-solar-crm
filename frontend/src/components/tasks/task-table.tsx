"use client";

import { TaskStatus } from "@/lib/types";
import { MockTask } from "@/lib/data/tasks";
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
import { cn } from "@/lib/utils";

interface TaskTableProps {
  tasks: MockTask[];
  onToggleComplete: (taskId: string) => void;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
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
}: TaskTableProps) {
  return (
    <div className="rounded-lg border bg-white">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-[50px]"></TableHead>
            <TableHead className="min-w-[200px]">Task Title</TableHead>
            <TableHead className="min-w-[250px]">Description</TableHead>
            <TableHead>Associated</TableHead>
            <TableHead>Due Date</TableHead>
            <TableHead>Assigned</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map((task) => {
            const isCompleted = task.status === "completed";
            return (
            <TableRow
              key={task._id}
              className={cn(
                "transition-colors",
                isCompleted && "bg-muted/30"
              )}
            >
              <TableCell>
                <Checkbox
                  checked={isCompleted}
                  onCheckedChange={() => onToggleComplete(task._id)}
                  className="border-gray-300"
                />
              </TableCell>
              <TableCell>
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
              <TableCell>{task.contactName || task.opportunityName || "—"}</TableCell>
              <TableCell>
                <span className="text-sm">
                  {task.dueDate
                    ? new Date(task.dueDate).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "—"}
                </span>
              </TableCell>
              <TableCell>{task.assignedUserName || "—"}</TableCell>
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
            </TableRow>
          )})}
        </TableBody>
      </Table>
    </div>
  );
}
