"use client";

import Link from "next/link";
import { TaskStatus } from "@/lib/types";
import { Id } from "../../../convex/_generated/dataModel";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Calendar, User, Target, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Task } from "./task-table";

interface TaskKanbanProps {
  tasks: Task[];
  onToggleComplete: (taskId: Id<"tasks">) => void;
  onStatusChange: (taskId: Id<"tasks">, status: TaskStatus) => void;
  onEdit: (task: Task) => void;
  onDelete: (taskId: Id<"tasks">) => void;
}

const columns: { status: TaskStatus; label: string; color: string }[] = [
  { status: "pending", label: "Pending", color: "bg-gray-500" },
  { status: "doing", label: "Doing", color: "bg-yellow-500" },
  { status: "completed", label: "Completed", color: "bg-green-500" },
];

export function TaskKanban({
  tasks,
  onToggleComplete,
  onStatusChange,
  onEdit,
  onDelete,
}: TaskKanbanProps) {
  const getTasksByStatus = (status: TaskStatus) =>
    tasks.filter((task) => task.status === status);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {columns.map((column) => (
        <div key={column.status} className="flex flex-col">
          {/* Column Header */}
          <div className="flex items-center gap-2 mb-4">
            <div className={cn("w-3 h-3 rounded-full", column.color)} />
            <h3 className="font-semibold text-lg">{column.label}</h3>
            <Badge variant="secondary" className="ml-auto">
              {getTasksByStatus(column.status).length}
            </Badge>
          </div>

          {/* Column Content */}
          <div className="flex-1 space-y-3 min-h-[200px] p-3 bg-muted/30 rounded-lg">
            {getTasksByStatus(column.status).map((task) => {
              const isCompleted = task.status === "completed";
              return (
                <Card
                  key={task._id}
                  className={cn(
                    "transition-all hover:shadow-md",
                    isCompleted && "opacity-60"
                  )}
                >
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={isCompleted}
                        onCheckedChange={() => onToggleComplete(task._id)}
                        className="mt-0.5 border-gray-300"
                      />
                      <div className="flex-1 min-w-0">
                        <h4
                          className={cn(
                            "font-medium text-sm leading-tight",
                            isCompleted && "line-through text-muted-foreground"
                          )}
                        >
                          {task.title}
                        </h4>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6 -mt-1 -mr-1">
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
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 pl-11">
                    {task.description && (
                      <p
                        className={cn(
                          "text-xs text-muted-foreground mb-3 line-clamp-2",
                          isCompleted && "line-through"
                        )}
                      >
                        {task.description}
                      </p>
                    )}
                    <div className="space-y-1.5 text-xs text-muted-foreground">
                      {(task.contact || task.opportunity) && (
                        <div className="flex items-center gap-2">
                          {task.contact && (
                            <Link
                              href={`/contacts/${task.contact._id}`}
                              className="flex items-center gap-1 hover:text-[#ff5603] transition-colors"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <User className="h-3 w-3" />
                              <span className="underline">{task.contact.fullName}</span>
                            </Link>
                          )}
                          {task.contact && task.opportunity && (
                            <span>|</span>
                          )}
                          {task.opportunity && (
                            <Link
                              href={`/pipeline?opportunityId=${task.opportunity._id}`}
                              className="flex items-center gap-1 hover:text-[#ff5603] transition-colors"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Target className="h-3 w-3" />
                              <span className="underline">{task.opportunity.name}</span>
                            </Link>
                          )}
                        </div>
                      )}
                      {task.dueDate && (
                        <div className={cn(
                          "flex items-center gap-2",
                          task.isOverdue && task.status !== "completed" && "text-red-600"
                        )}>
                          <Calendar className="h-3 w-3" />
                          <span>
                            {new Date(task.dueDate).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        </div>
                      )}
                      {task.assignedUser && (
                        <div className="flex items-center gap-2">
                          <User className="h-3 w-3" />
                          <span>{task.assignedUser.fullName}</span>
                        </div>
                      )}
                    </div>
                    {/* Quick status change buttons */}
                    <div className="flex gap-1 mt-3 pt-3 border-t">
                      {columns.map((col) => (
                        <button
                          key={col.status}
                          onClick={() => onStatusChange(task._id, col.status)}
                          className={cn(
                            "flex-1 py-1 text-xs rounded transition-colors",
                            task.status === col.status
                              ? cn(col.color, "text-white")
                              : "bg-muted hover:bg-muted/80 text-muted-foreground"
                          )}
                        >
                          {col.label}
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {getTasksByStatus(column.status).length === 0 && (
              <div className="flex items-center justify-center h-24 text-sm text-muted-foreground">
                No tasks
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
