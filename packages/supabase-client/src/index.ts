// Client
export { createSupabaseClient, createSupabaseAdmin } from './client';
export type { SupabaseClient } from './client';

// Queries - Patients
export {
  getPatient,
  getPatientsByGuardian,
  createPatient,
  updatePatient,
} from './queries/patients';

// Queries - Visits
export {
  getVisitsByNurseDate,
  getVisitsByPatient,
  getVisitDetail,
  updateVisitStatus,
  createVisitRecord,
} from './queries/visits';

// Queries - Organizations
export {
  getOrganization,
  searchOrganizations,
  getOrgPatients,
  getOrgStaff,
} from './queries/organizations';

// Queries - Matching
export {
  createMatchingRequest,
  getMatchingResults,
  selectOrganization,
  getServiceRequests,
  respondToRequest,
} from './queries/matching';

// Queries - Notifications
export {
  getNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
} from './queries/notifications';

// Queries - Alerts (Red Flags)
export {
  getRedFlagAlerts,
  acknowledgeRedFlagAlert,
  resolveRedFlagAlert,
} from './queries/alerts';

// Queries - Profiles
export {
  getProfile,
  updateProfile,
} from './queries/profiles';

// Queries - Records
export {
  getLatestVitalsByPatients,
  getServicePlanCareItems,
  getNurseMonthlyVisits,
  getPatientsByNurse,
} from './queries/records';

// Queries - Messages
export {
  getMessages,
  sendMessage,
  markMessagesAsRead,
} from './queries/messages';

// Queries - Reviews
export {
  getReviewsByOrg,
  createReview,
  getReviewsByGuardian,
} from './queries/reviews';

// Queries - Service Plans
export {
  getServicePlan,
  getServicePlansByPatient,
  createServicePlan,
  updateServicePlan,
  consentServicePlan,
} from './queries/service-plans';

// Queries - AI Reports
export {
  getAIReport,
  getAIReportsByPatient,
  getAIReportsByOrg,
  addDoctorOpinion,
  sendReportToGuardian,
} from './queries/ai-reports';

// Queries - Subscriptions & Payments
export {
  getSubscription,
  updateSubscription,
  getPaymentHistory,
} from './queries/subscriptions';

// Queries - Push Tokens
export {
  upsertPushToken,
  deactivatePushToken,
  getActivePushTokens,
} from './queries/push-tokens';
