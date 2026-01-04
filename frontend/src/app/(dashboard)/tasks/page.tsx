"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { TaskStatus } from "@/lib/types";
import { TaskTable, Task } from "@/components/tasks/task-table";
import { TaskKanban } from "@/components/tasks/task-kanban";
import { TaskCreateModal } from "@/components/tasks/task-create-modal";
import { TaskEditModal } from "@/components/tasks/task-edit-modal";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutList, Kanban, Plus } from "lucide-react";

type ViewMode = "table" | "kanban";

export default function TasksPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Fetch tasks from database
  const tasks = useQuery(api.tasks.list);

  // Mutations for status changes and delete
  const toggleComplete = useMutation(api.tasks.toggleComplete);
  const updateStatus = useMutation(api.tasks.updateStatus);
  const removeTask = useMutation(api.tasks.remove);

  const handleToggleComplete = async (taskId: Id<"tasks">) => {
    try {
      await toggleComplete({ id: taskId });
    } catch (error) {
      console.error("Failed to toggle task completion:", error);
    }
  };

  const handleStatusChange = async (taskId: Id<"tasks">, status: TaskStatus) => {
    try {
      await updateStatus({ id: taskId, status });
    } catch (error) {
      console.error("Failed to update task status:", error);
    }
  };

  const handleEdit = (task: Task) => {
    setSelectedTask(task);
    setIsEditModalOpen(true);
  };

  const handleDelete = async (taskId: Id<"tasks">) => {
    if (confirm("Are you sure you want to delete this task?")) {
      try {
        await removeTask({ id: taskId });
      } catch (error) {
        console.error("Failed to delete task:", error);
      }
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground">Task List Management</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Manage and track your tasks efficiently.
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          {/* View Toggle */}
          <Tabs
            value={viewMode}
            onValueChange={(v) => setViewMode(v as ViewMode)}
          >
            <TabsList className="bg-muted h-10">
              <TabsTrigger value="table" className="gap-2 h-8 touch-target">
                <LayoutList className="h-4 w-4" />
                <span className="hidden sm:inline">Table</span>
              </TabsTrigger>
              <TabsTrigger value="kanban" className="gap-2 h-8 touch-target">
                <Kanban className="h-4 w-4" />
                <span className="hidden sm:inline">Kanban</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
          {/* Add Task Button */}
          <Button
            className="bg-[#ff5603] hover:bg-[#e64d00] gap-2 cursor-pointer h-10 touch-target"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add Task</span>
          </Button>
        </div>
      </div>

      {/* Task Views */}
      {viewMode === "table" ? (
        <TaskTable
          tasks={tasks ?? []}
          onToggleComplete={handleToggleComplete}
          onStatusChange={handleStatusChange}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      ) : (
        <TaskKanban
          tasks={tasks ?? []}
          onToggleComplete={handleToggleComplete}
          onStatusChange={handleStatusChange}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      {/* Create Task Modal */}
      <TaskCreateModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
      />

      {/* Edit Task Modal */}
      <TaskEditModal
        task={selectedTask}
        open={isEditModalOpen}
        onOpenChange={(open) => {
          setIsEditModalOpen(open);
          if (!open) setSelectedTask(null);
        }}
      />
    </div>
  );
}
