import { collection, doc, serverTimestamp, writeBatch } from "firebase/firestore";
import { db } from "./firebase";

export type ListType = "grocery" | "prep";

export type GroceryItem = {
  id: string;
  name: string;
  quantity?: string;
  checked: boolean;
  list: ListType;
  aisle?: string;
  recipeId?: string | null;
  recipeTitle?: string | null;
  createdAt?: any;
};

export const AISLES = [
  "Produce",
  "Meat & Seafood",
  "Dairy & Eggs",
  "Bakery",
  "Pantry",
  "Spices & Seasonings",
  "Frozen",
  "Beverages",
  "Other",
] as const;

const AISLE_KEYWORDS: [string, string[]][] = [
  ["Spices & Seasonings", ["salt", "pepper", "cumin", "paprika", "oregano", "thyme", "rosemary", "cinnamon", "nutmeg", "chili powder", "garlic powder", "onion powder", "bay lea", "spice", "seasoning", "vanilla", "turmeric", "coriander", "cayenne", "curry"]],
  ["Meat & Seafood", ["chicken", "beef", "pork", "steak", "bacon", "sausage", "lamb", "turkey", "ham", "guanciale", "pancetta", "prosciutto", "carne", "fish", "salmon", "tuna", "shrimp", "prawn", "cod", "crab", "lobster", "scallop", "mince", "ground "]],
  ["Dairy & Eggs", ["milk", "cream", "butter", "cheese", "yogurt", "yoghurt", "egg", "parmesan", "pecorino", "mozzarella", "cheddar", "ricotta", "feta", "crème", "creme"]],
  ["Bakery", ["bread", "bun", "tortilla", "bagel", "pita", "baguette", "croissant", "roll"]],
  ["Frozen", ["frozen", "ice cream", "peas (frozen)"]],
  ["Beverages", ["wine", "beer", "juice", "soda", "coffee", "tea", "water", "stock", "broth"]],
  ["Produce", ["onion", "garlic", "tomato", "potato", "carrot", "celery", "lettuce", "spinach", "kale", "pepper", "chili", "chile", "jalapeño", "jalapeno", "lemon", "lime", "orange", "apple", "banana", "berr", "avocado", "cilantro", "parsley", "basil", "mint", "ginger", "mushroom", "zucchini", "cucumber", "cabbage", "broccoli", "cauliflower", "scallion", "shallot", "leek", "corn", "bean sprout", "herb", "fruit", "vegetable"]],
  ["Pantry", ["flour", "sugar", "rice", "pasta", "spaghetti", "noodle", "oil", "vinegar", "sauce", "honey", "syrup", "bean", "lentil", "chickpea", "can ", "canned", "oat", "cereal", "nut", "almond", "peanut", "baking", "yeast", "cocoa", "chocolate", "soy", "mustard", "ketchup", "mayo", "breadcrumb", "stock cube"]],
];

/** Best-guess store aisle for an ingredient name. */
export function guessAisle(name: string): string {
  const n = ` ${name.toLowerCase()} `;
  for (const [aisle, words] of AISLE_KEYWORDS) {
    if (words.some((w) => n.includes(w))) return aisle;
  }
  return "Other";
}

/** Adds several items in one batch (e.g. all ingredients of a recipe). */
export async function addItemsToList(
  uid: string,
  names: string[],
  opts: { list?: ListType; recipeId?: string | null; recipeTitle?: string | null } = {}
) {
  const clean = names.map((n) => n.trim()).filter(Boolean).slice(0, 100);
  if (clean.length === 0) return 0;
  const batch = writeBatch(db);
  clean.forEach((name) => {
    const ref = doc(collection(db, "groceryItems"));
    batch.set(ref, {
      name: name.slice(0, 200),
      quantity: "",
      checked: false,
      list: opts.list ?? "grocery",
      aisle: guessAisle(name),
      recipeId: opts.recipeId ?? null,
      recipeTitle: opts.recipeTitle ?? null,
      createdBy: uid,
      createdAt: serverTimestamp(),
    });
  });
  await batch.commit();
  return clean.length;
}

/** Plain-text version of a list for sharing. */
export function listToText(title: string, items: GroceryItem[]) {
  const open = items.filter((i) => !i.checked);
  const lines = open.map((i) => `☐ ${i.quantity ? `${i.quantity} ` : ""}${i.name}`);
  return `${title}\n\n${lines.join("\n")}${open.length === 0 ? "All done!" : ""}`;
}
