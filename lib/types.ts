export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: string;
  image: string;
  available: boolean;
  featured: boolean;
  /** Hidden from the public menu (kept in the dashboard); switched with the Hide / Unhide button. */
  hidden?: boolean;
}

export interface MenuCategory {
  category: string;
  items: MenuItem[];
}

export interface Offer {
  text: string;
  icon: string;
}

export interface Theme {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
}

export interface Social {
  instagram: string;
  facebook: string;
  tiktok: string;
}

export type Plan = "standard" | "premium";
export type PremiumTemplate = "default" | "camellia" | "sample" | "freshy" | "studio";
export type CompanyStatus = "active" | "inactive";

/** Fields a restaurant owner is allowed to edit from the dashboard. */
export interface RestaurantContent {
  name: string;
  description: string;
  about: string;
  logo: string;
  coverImage: string;
  phone: string;
  whatsapp: string;
  website: string;
  location: string;
  social: Social;
  theme: Theme;
  menu: MenuCategory[];
  gallery: string[];
  offers: Offer[];
}

/** Everything the public page needs — no owner email, no company internals. */
export interface PublicRestaurant extends RestaurantContent {
  slug: string;
  plan: Plan;
  premiumEnabled: boolean;
  premiumTemplate: PremiumTemplate;
  /** Published Design Studio design, when premiumTemplate is "studio". */
  design: import("./design").DesignConfig | null;
  /** Premium subdomain ("kiza" → kiza.scandish.online); "" when the page lives at /r/<slug>. */
  subdomain: string;
  /** Premium table ordering is switched on: guests can send orders from the menu. */
  ordering: boolean;
}

export interface Subscription {
  status: CompanyStatus;
  subscriptionEnd: string;
  daysRemaining: number | null;
  /** Set while a support-created business is in its setup period (live until then). */
  trialEndsAt: string;
}

/** What the owner's dashboard loads. */
export interface DashboardData extends RestaurantContent {
  slug: string;
  plan: Plan;
  subscription: Subscription | null;
  /** Account was created by a support member with a temporary password. */
  mustChangePassword: boolean;
  /** Premium subdomain, "" if none — the public address and QR code use it. */
  subdomain: string;
  /** Premium plan whose custom page ScanDish is still building, and its latest delivery date ("" if not recorded). */
  premiumPending: boolean;
  premiumDueAt: string;
  /** The restaurant is accepting table orders (Premium only). */
  ordersOpen: boolean;
  /** Security Center state for this device (filled by the dashboard action). */
  security?: SecurityState;
}

/** Security Center state for the device using the dashboard (Premium). */
export interface SecurityState {
  premium: boolean;
  /** A Secure Dashboard PIN exists. */
  pinSet: boolean;
  /** Epoch ms until which this device is unlocked (0 = locked, or no PIN). */
  unlockedUntil: number;
  sessionId: string;
  device: string;
}

export interface DeviceSession {
  id: string;
  device: string;
  deviceType: "mobile" | "tablet" | "desktop";
  createdAt: string;
  lastActiveAt: string;
  current: boolean;
}

export interface SecurityLogEntry {
  id: string;
  action: string;
  detail: string;
  device: string;
  email: string;
  createdAt: string;
}

export interface Company {
  id: string;
  companyName: string;
  managerName: string;
  phone: string;
  email: string;
  location: string;
  /** Business registration (RDB) number. */
  certificateNumber: string;
  certificateUrl: string;
  /** A certificate document is on file (private upload or older direct link). */
  hasCertificate: boolean;
  businessType: string;
  subscriptionStart: string;
  subscriptionEnd: string;
  notes: string;
  status: CompanyStatus;
  ownerUid: string;
  inviteCode: string;
  inviteUsed: boolean;
  slug: string;
  plan: Plan;
  premiumEnabled: boolean;
  premiumTemplate: PremiumTemplate;
  /** Premium plan whose custom page isn't switched on yet, and its latest delivery date ("" if not recorded). */
  premiumPending: boolean;
  premiumDueAt: string;
  premiumOverdue: boolean;
  /** Premium subdomain ("" = none). */
  subdomain: string;
  /** Logo appears in the homepage customer row (default true). */
  showOnHomepage: boolean;
  /** Support member who onboarded this business ("" = created by MasterAdmin). */
  createdByAgentName: string;
  setupFee: number;
  agentEarning: number;
  /** Setup period end for support-created businesses without a confirmed subscription. */
  trialEndsAt: string;
  trialActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/* ---------- Support team ---------- */

export type AgentStatus = "invited" | "active" | "suspended" | "deactivated";

export interface SupportAgent {
  id: string;
  name: string;
  email: string;
  phone: string;
  notes: string;
  status: AgentStatus;
  /** Why the member was suspended/deactivated — shown to them in their portal. */
  statusReason: string;
  /** ISO date a suspension ends automatically; "" = until lifted by MasterAdmin. */
  suspendedUntil: string;
  inviteCode: string;
  inviteUsed: boolean;
  uid: string;
  agreementVersion: string;
  agreementAcceptedAt: string;
  createdAt: string;
  businesses: number;
  liveBusinesses: number;
  setupEarnings: number;
}

/**
 * setup_period: live during the free setup days; awaiting_activation: setup days over,
 * subscription not confirmed (offline); live / offline: normal subscription states.
 */
export type OnboardingState = "setup_period" | "awaiting_activation" | "live" | "offline";

/** A business as its support member sees it. */
export interface AgentBusiness {
  id: string;
  companyName: string;
  managerName: string;
  email: string;
  phone: string;
  location: string;
  plan: Plan;
  slug: string;
  state: OnboardingState;
  registrationNumber: string;
  hasCertificate: boolean;
  /** Premium page still being built by ScanDish, and its due date ("" if none recorded). */
  premiumPending: boolean;
  premiumDueAt: string;
  managerHasLoggedIn: boolean;
  passwordChanged: boolean;
  /** Setup fee charged to the business and the member's share of it, fixed when the business was created. */
  setupFee: number;
  agentEarning: number;
  trialEndsAt: string;
  createdAt: string;
}

export interface SupportPortal {
  agent: SupportAgent;
  businesses: AgentBusiness[];
  pricing: import("./settings").Pricing;
}

export type ActivityCategory = "auth" | "restaurant" | "admin" | "security" | "support";

export type ActivityType =
  | "auth.login"
  | "auth.login_failed"
  | "auth.admin_login"
  | "auth.signup"
  | "auth.signup_failed"
  | "restaurant.saved"
  | "restaurant.upload"
  | "admin.company_created"
  | "admin.status_changed"
  | "admin.renewed"
  | "admin.premium_changed"
  | "admin.company_deleted"
  | "admin.support_created"
  | "admin.support_suspended"
  | "admin.support_deactivated"
  | "admin.support_reactivated"
  | "support.signup"
  | "support.login"
  | "support.business_created"
  | "support.password_reissued"
  | "restaurant.password_set"
  | "restaurant.orders_toggled"
  | "contract.generated"
  | "document.viewed"
  | "admin.settings_changed"
  | "admin.design_changed"
  | "admin.subdomain_changed"
  | "security.unauthorized";

export interface ActivityEvent {
  id: string;
  type: ActivityType;
  category: ActivityCategory;
  message: string;
  actorEmail: string;
  targetKind: string;
  targetName: string;
  meta: Record<string, string | number | boolean>;
  ip: string;
  device: string;
  createdAt: string;
}

/** A login account as the admin sees it (from Firebase Auth + Firestore). */
export interface AccountSummary {
  uid: string;
  email: string;
  role: "admin" | "support" | "restaurant" | "unknown";
  restaurantName: string;
  slug: string;
  emailVerified: boolean;
  disabled: boolean;
  createdAt: string;
  lastSignInAt: string;
  lastActiveAt: string;
}

export interface DailyViews {
  date: string; // YYYY-MM-DD, Kigali time
  views: number;
  unique: number;
}

export interface Analytics {
  days: DailyViews[]; // oldest → newest, last 30 days, zero-filled
  today: number;
  last7: number;
  prev7: number;
  last30: number;
  unique7: number;
  sources: { qr: number; direct: number; link: number }; // last 30 days
  devices: { mobile: number; tablet: number; desktop: number }; // last 30 days
  hours: number[]; // 24 buckets, last 30 days, Kigali time
  allTime: number;
}

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  /** code "locked": ask for the Secure Dashboard PIN and retry; "signed_out": this device was signed out. */
  | { ok: false; error: string; code?: "locked" | "signed_out" };
