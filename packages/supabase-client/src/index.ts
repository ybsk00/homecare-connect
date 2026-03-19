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
