export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: string;
  image: string;
  available: boolean;
  featured: boolean;
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
export type PremiumTemplate = "default" | "camellia" | "sample" | "freshy";
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
}

export interface Subscription {
  status: CompanyStatus;
  subscriptionEnd: string;
  daysRemaining: number | null;
}

/** What the owner's dashboard loads. */
export interface DashboardData extends RestaurantContent {
  slug: string;
  plan: Plan;
  subscription: Subscription | null;
}

export interface Company {
  id: string;
  companyName: string;
  managerName: string;
  phone: string;
  email: string;
  location: string;
  certificateNumber: string;
  certificateUrl: string;
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
  createdAt: string;
  updatedAt: string;
}

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };
