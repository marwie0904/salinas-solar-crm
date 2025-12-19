import { MutationCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";

/**
 * Activity action types
 */
export type ActivityAction =
  | "created"
  | "updated"
  | "deleted"
  | "restored"
  | "stage_changed"
  | "status_changed"
  | "assigned"
  | "payment_received"
  | "invoice_sent"
  | "message_sent"
  | "message_received";

/**
 * Entity types for activity logging
 */
export type EntityType =
  | "contact"
  | "opportunity"
  | "task"
  | "appointment"
  | "message"
  | "invoice"
  | "payment"
  | "product"
  | "document"
  | "user";

/**
 * Log an activity to the activity logs table
 */
export const logActivity = async (
  ctx: MutationCtx,
  entityType: EntityType,
  entityId: string,
  action: ActivityAction,
  changes?: Record<string, unknown>,
  performedBy?: Id<"users">
): Promise<Id<"activityLogs">> => {
  return await ctx.db.insert("activityLogs", {
    entityType,
    entityId,
    action,
    changes: changes ? JSON.stringify(changes) : undefined,
    performedBy,
    createdAt: Date.now(),
  });
};

/**
 * Create a change log object for updates
 */
export const createChangeLog = (
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  fieldsToTrack: string[]
): Record<string, { from: unknown; to: unknown }> | null => {
  const changes: Record<string, { from: unknown; to: unknown }> = {};

  for (const field of fieldsToTrack) {
    if (before[field] !== after[field]) {
      changes[field] = {
        from: before[field],
        to: after[field],
      };
    }
  }

  return Object.keys(changes).length > 0 ? changes : null;
};

/**
 * Log a creation activity
 */
export const logCreation = async (
  ctx: MutationCtx,
  entityType: EntityType,
  entityId: string,
  performedBy?: Id<"users">
): Promise<Id<"activityLogs">> => {
  return logActivity(ctx, entityType, entityId, "created", undefined, performedBy);
};

/**
 * Log an update activity with changes
 */
export const logUpdate = async (
  ctx: MutationCtx,
  entityType: EntityType,
  entityId: string,
  changes: Record<string, unknown>,
  performedBy?: Id<"users">
): Promise<Id<"activityLogs">> => {
  return logActivity(ctx, entityType, entityId, "updated", changes, performedBy);
};

/**
 * Log a deletion activity
 */
export const logDeletion = async (
  ctx: MutationCtx,
  entityType: EntityType,
  entityId: string,
  performedBy?: Id<"users">
): Promise<Id<"activityLogs">> => {
  return logActivity(ctx, entityType, entityId, "deleted", undefined, performedBy);
};

/**
 * Log a restoration activity
 */
export const logRestoration = async (
  ctx: MutationCtx,
  entityType: EntityType,
  entityId: string,
  performedBy?: Id<"users">
): Promise<Id<"activityLogs">> => {
  return logActivity(ctx, entityType, entityId, "restored", undefined, performedBy);
};

/**
 * Log a stage change activity (for opportunities)
 */
export const logStageChange = async (
  ctx: MutationCtx,
  entityId: string,
  fromStage: string,
  toStage: string,
  performedBy?: Id<"users">
): Promise<Id<"activityLogs">> => {
  return logActivity(
    ctx,
    "opportunity",
    entityId,
    "stage_changed",
    { from: fromStage, to: toStage },
    performedBy
  );
};

/**
 * Log a status change activity
 */
export const logStatusChange = async (
  ctx: MutationCtx,
  entityType: EntityType,
  entityId: string,
  fromStatus: string,
  toStatus: string,
  performedBy?: Id<"users">
): Promise<Id<"activityLogs">> => {
  return logActivity(
    ctx,
    entityType,
    entityId,
    "status_changed",
    { from: fromStatus, to: toStatus },
    performedBy
  );
};

/**
 * Log an assignment activity
 */
export const logAssignment = async (
  ctx: MutationCtx,
  entityType: EntityType,
  entityId: string,
  assignedToId: string,
  assignedToName: string,
  performedBy?: Id<"users">
): Promise<Id<"activityLogs">> => {
  return logActivity(
    ctx,
    entityType,
    entityId,
    "assigned",
    { assignedTo: assignedToId, assignedToName },
    performedBy
  );
};

/**
 * Log a payment received activity
 */
export const logPaymentReceived = async (
  ctx: MutationCtx,
  invoiceId: string,
  amount: number,
  paymentMethod: string,
  performedBy?: Id<"users">
): Promise<Id<"activityLogs">> => {
  return logActivity(
    ctx,
    "invoice",
    invoiceId,
    "payment_received",
    { amount, paymentMethod },
    performedBy
  );
};
