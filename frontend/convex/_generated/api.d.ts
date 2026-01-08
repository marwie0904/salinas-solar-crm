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
import type * as contacts from "../contacts.js";
import type * as documents from "../documents.js";
import type * as email from "../email.js";
import type * as invoiceLineItems from "../invoiceLineItems.js";
import type * as invoices from "../invoices.js";
import type * as lib_activityLogger from "../lib/activityLogger.js";
import type * as lib_helpers from "../lib/helpers.js";
import type * as lib_validators from "../lib/validators.js";
import type * as messages from "../messages.js";
import type * as meta from "../meta.js";
import type * as openSolar from "../openSolar.js";
import type * as opportunities from "../opportunities.js";
import type * as payments from "../payments.js";
import type * as products from "../products.js";
import type * as semaphore from "../semaphore.js";
import type * as tasks from "../tasks.js";
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
  contacts: typeof contacts;
  documents: typeof documents;
  email: typeof email;
  invoiceLineItems: typeof invoiceLineItems;
  invoices: typeof invoices;
  "lib/activityLogger": typeof lib_activityLogger;
  "lib/helpers": typeof lib_helpers;
  "lib/validators": typeof lib_validators;
  messages: typeof messages;
  meta: typeof meta;
  openSolar: typeof openSolar;
  opportunities: typeof opportunities;
  payments: typeof payments;
  products: typeof products;
  semaphore: typeof semaphore;
  tasks: typeof tasks;
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
