"use client";

import { useState } from "react";
import { TaskStatus } from "@/lib/types";
import { placeholderTasks, MockTask } from "@/lib/data/tasks";
import { TaskTable } from "@/components/tasks/task-table";
import { TaskKanban } from "@/components/tasks/task-kanban";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutList, Kanban, Plus } from "lucide-react";

type ViewMode = "table" | "kanban";

export default function TasksPage() {
  const [tasks, setTasks] = useState<MockTask[]>(placeholderTasks);
  const [viewMode, setViewMode] = useState<ViewMode>("table");

  const handleToggleComplete = (taskId: string) => {
    setTasks((prev) =>
      prev.map((task) =>
        task._id === taskId
          ? {
              ...task,
              status: task.status === "completed" ? "pending" : "completed",
            }
          : task
      )
    );
  };

  const handleStatusChange = (taskId: string, status: TaskStatus) => {
    setTasks((prev) =>
      prev.map((task) =>
        task._id === taskId
          ? {
              ...task,
              status,
            }
          : task
      )
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Task List Management</h1>
          <p className="text-muted-foreground">
            Manage and track your tasks efficiently.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <Tabs
            value={viewMode}
            onValueChange={(v) => setViewMode(v as ViewMode)}
          >
            <TabsList className="bg-muted">
              <TabsTrigger value="table" className="gap-2">
                <LayoutList className="h-4 w-4" />
                <span className="hidden sm:inline">Table</span>
              </TabsTrigger>
              <TabsTrigger value="kanban" className="gap-2">
                <Kanban className="h-4 w-4" />
                <span className="hidden sm:inline">Kanban</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
          {/* Add Task Button */}
          <Button className="bg-[#ff5603] hover:bg-[#e64d00] gap-2">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add Task</span>
          </Button>
        </div>
      </div>

      {/* Task Views */}
      {viewMode === "table" ? (
        <TaskTable
          tasks={tasks}
          onToggleComplete={handleToggleComplete}
          onStatusChange={handleStatusChange}
        />
      ) : (
        <TaskKanban
          tasks={tasks}
          onToggleComplete={handleToggleComplete}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  );
}
