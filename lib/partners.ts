import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "./firebase";
import { SUPPORT_EMAIL } from "./appInfo";

/**
 * Culinary Services partners: local private chefs, meal prep companies and
 * caterers. Curated by the Gastro team in the Firebase console
 * (Firestore > partners); the app only reads them.
 *
 * Document fields:
 *   name        string   "Prept Meals"
 *   category    string   "private-chef" | "meal-prep" | "catering"
 *   tagline     string   one line about them
 *   area        string   "Carlsbad · delivers county-wide"
 *   imageUrl    string   cover photo (https)
 *   website     string?  https link to order or book
 *   instagram   string?  handle without @
 *   phone       string?  "(619) 555-0100"
 *   email       string?
 *   featured    boolean? shows first, with a badge
 *   active      boolean  only active partners are shown
 */
export type PartnerCategory = "private-chef" | "meal-prep" | "catering";

export type Partner = {
  id: string;
  name: string;
  category: PartnerCategory;
  tagline?: string;
  area?: string;
  imageUrl?: string;
  website?: string;
  instagram?: string;
  phone?: string;
  email?: string;
  featured?: boolean;
};

export const CATEGORIES: {
  key: PartnerCategory;
  title: string;
  subtitle: string;
  icon: string;
  image: string;
}[] = [
  {
    key: "private-chef",
    title: "Private Chefs",
    subtitle: "Dinner parties, tasting menus and date nights at home",
    icon: "cutlery",
    image: "https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?auto=format&fit=crop&w=1000&q=80",
  },
  {
    key: "meal-prep",
    title: "Meal Prep",
    subtitle: "Chef-made meals for the week, delivered",
    icon: "leaf",
    image: "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=1000&q=80",
  },
  {
    key: "catering",
    title: "Catering",
    subtitle: "Events, celebrations and office lunches",
    icon: "glass",
    image: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=1000&q=80",
  },
];

export function usePartners() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    return onSnapshot(
      query(collection(db, "partners"), where("active", "==", true)),
      (snap) => {
        const list = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as any) }) as Partner)
          .sort((a, b) => Number(!!b.featured) - Number(!!a.featured) || a.name.localeCompare(b.name));
        setPartners(list);
        setLoading(false);
      },
      () => setLoading(false)
    );
  }, []);
  return { partners, loading };
}

export const GET_LISTED_URL = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
  "Get listed on Gastro Culinary Services"
)}&body=${encodeURIComponent(
  "Business name:\nWhat you offer (private chef / meal prep / catering):\nArea you serve:\nWebsite or Instagram:\nPhone:\n\nAttach your logo and a couple of photos."
)}`;
