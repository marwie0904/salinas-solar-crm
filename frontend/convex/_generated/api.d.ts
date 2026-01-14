/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as activityLogs from "../activityLogs.js";
import type * as agreements from "../agreements.js";
import type * as analytics from "../analytics.js";
import type * as appointments from "../appointments.js";
import type * as auth from "../auth.js";
import type * as autoSms from "../autoSms.js";
import type * as contacts from "../contacts.js";
import type * as crons from "../crons.js";
import type * as documents from "../documents.js";
import type * as email from "../email.js";
import type * as invoiceLineItems from "../invoiceLineItems.js";
import type * as invoices from "../invoices.js";
import type * as lib_activityLogger from "../lib/activityLogger.js";
import type * as lib_helpers from "../lib/helpers.js";
import type * as lib_invoicePdfGenerator from "../lib/invoicePdfGenerator.js";
import type * as lib_receiptPdfGenerator from "../lib/receiptPdfGenerator.js";
import type * as lib_stageOrder from "../lib/stageOrder.js";
import type * as lib_validators from "../lib/validators.js";
import type * as messageQueue from "../messageQueue.js";
import type * as messages from "../messages.js";
import type * as meta from "../meta.js";
import type * as notifications from "../notifications.js";
import type * as openSolar from "../openSolar.js";
import type * as opportunities from "../opportunities.js";
import type * as payments from "../payments.js";
import type * as products from "../products.js";
import type * as receipts from "../receipts.js";
import type * as search from "../search.js";
import type * as semaphore from "../semaphore.js";
import type * as tasks from "../tasks.js";
import type * as teamNotifications from "../teamNotifications.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  activityLogs: typeof activityLogs;
  agreements: typeof agreements;
  analytics: typeof analytics;
  appointments: typeof appointments;
  auth: typeof auth;
  autoSms: typeof autoSms;
  contacts: typeof contacts;
  crons: typeof crons;
  documents: typeof documents;
  email: typeof email;
  invoiceLineItems: typeof invoiceLineItems;
  invoices: typeof invoices;
  "lib/activityLogger": typeof lib_activityLogger;
  "lib/helpers": typeof lib_helpers;
  "lib/invoicePdfGenerator": typeof lib_invoicePdfGenerator;
  "lib/receiptPdfGenerator": typeof lib_receiptPdfGenerator;
  "lib/stageOrder": typeof lib_stageOrder;
  "lib/validators": typeof lib_validators;
  messageQueue: typeof messageQueue;
  messages: typeof messages;
  meta: typeof meta;
  notifications: typeof notifications;
  openSolar: typeof openSolar;
  opportunities: typeof opportunities;
  payments: typeof payments;
  products: typeof products;
  receipts: typeof receipts;
  search: typeof search;
  semaphore: typeof semaphore;
  tasks: typeof tasks;
  teamNotifications: typeof teamNotifications;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
