import type { RestaurantContent } from "./types";

/** Shown while designing without a business, or for a business that hasn't added content yet. */
export const SAMPLE_CONTENT: RestaurantContent = {
  name: "Sample Kitchen",
  description: "Modern African flavours in the heart of Kigali",
  about: "We cook with fresh ingredients from local farmers, grilled over charcoal and served with a smile. Come as guests, leave as family.",
  logo: "/images/logo.jpg",
  coverImage: "/images/hero.png",
  phone: "0788000000",
  whatsapp: "0788000000",
  website: "",
  location: "KN 4 Ave, Kigali",
  social: { instagram: "scandish", facebook: "", tiktok: "" },
  theme: { primaryColor: "#f08c6c", secondaryColor: "#111827", backgroundColor: "#ffffff" },
  offers: [
    { text: "Free Wi-Fi", icon: "wifi" },
    { text: "Delivery in Kigali", icon: "truck" },
    { text: "Live music on Fridays", icon: "music" },
  ],
  menu: [
    {
      category: "Grill",
      items: [
        { id: "1", name: "Beef brochettes", description: "Charcoal-grilled, with fried plantain", price: "6,000 RWF", image: "/images/goat.jpg", available: true, featured: true },
        { id: "2", name: "Sticky chicken wings", description: "Honey-chilli glaze, twelve pieces", price: "15,000 RWF", image: "/images/food2.jpg", available: true, featured: false },
        { id: "3", name: "Wood-fired pizza", description: "Tomato, mozzarella, spicy sausage", price: "2,500 RWF", image: "/images/fries.jpg", available: true, featured: false },
      ],
    },
    {
      category: "Fresh & light",
      items: [
        { id: "4", name: "Market salad", description: "Seasonal vegetables from local farms", price: "2,000 RWF", image: "/images/juice.jpg", available: true, featured: false },
        { id: "5", name: "Tomato soup", description: "Slow-cooked, fresh basil", price: "1,000 RWF", image: "/images/soda.jpg", available: false, featured: false },
      ],
    },
  ],
  gallery: ["/images/food2.jpg", "/images/fries.jpg", "/images/juice.jpg", "/images/goat.jpg", "/images/soda.jpg"],
};
