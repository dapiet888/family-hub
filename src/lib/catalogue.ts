import type { LucideIcon } from "lucide-react";
import {
  Apple,
  Banana,
  Bean,
  Beef,
  Candy,
  Carrot,
  Citrus,
  Coffee,
  Cookie,
  CookingPot,
  Croissant,
  CupSoda,
  Drumstick,
  Egg,
  Fish,
  GlassWater,
  Grape,
  Ham,
  IceCreamBowl,
  LeafyGreen,
  Milk,
  Nut,
  Package,
  Pizza,
  Popcorn,
  Salad,
  Sandwich,
  Shirt,
  SoapDispenserDroplet,
  Soup,
  Sparkles,
  SprayCan,
  Toilet,
  Wheat,
} from "lucide-react";

export type CatalogueItem = {
  name: string;
  group: string;
  icon: LucideIcon;
};

export const SHOPPING_CATALOGUE: CatalogueItem[] = [
  { group: "Dairy", name: "Milk", icon: Milk },
  { group: "Dairy", name: "Oat milk", icon: Milk },
  { group: "Dairy", name: "Butter", icon: Milk },
  { group: "Dairy", name: "Cheese", icon: Milk },
  { group: "Dairy", name: "Yoghurt", icon: IceCreamBowl },
  { group: "Dairy", name: "Eggs", icon: Egg },
  { group: "Dairy", name: "Cream", icon: Milk },
  { group: "Bakery", name: "Bread", icon: Wheat },
  { group: "Bakery", name: "Rolls", icon: Croissant },
  { group: "Bakery", name: "Wraps", icon: Sandwich },
  { group: "Bakery", name: "Bagels", icon: Croissant },
  { group: "Produce", name: "Bananas", icon: Banana },
  { group: "Produce", name: "Apples", icon: Apple },
  { group: "Produce", name: "Oranges", icon: Citrus },
  { group: "Produce", name: "Grapes", icon: Grape },
  { group: "Produce", name: "Lemons", icon: Citrus },
  { group: "Produce", name: "Carrots", icon: Carrot },
  { group: "Produce", name: "Potatoes", icon: Carrot },
  { group: "Produce", name: "Onions", icon: CookingPot },
  { group: "Produce", name: "Garlic", icon: CookingPot },
  { group: "Produce", name: "Tomatoes", icon: Apple },
  { group: "Produce", name: "Salad", icon: Salad },
  { group: "Produce", name: "Cucumber", icon: LeafyGreen },
  { group: "Produce", name: "Peppers", icon: LeafyGreen },
  { group: "Produce", name: "Broccoli", icon: LeafyGreen },
  { group: "Produce", name: "Avocado", icon: LeafyGreen },
  { group: "Meat & fish", name: "Chicken", icon: Drumstick },
  { group: "Meat & fish", name: "Mince", icon: Beef },
  { group: "Meat & fish", name: "Ham", icon: Ham },
  { group: "Meat & fish", name: "Bacon", icon: Beef },
  { group: "Meat & fish", name: "Sausages", icon: Beef },
  { group: "Meat & fish", name: "Fish", icon: Fish },
  { group: "Fridge", name: "Hummus", icon: Soup },
  { group: "Fridge", name: "Cheese slices", icon: Sandwich },
  { group: "Frozen", name: "Frozen peas", icon: LeafyGreen },
  { group: "Frozen", name: "Chips", icon: CookingPot },
  { group: "Frozen", name: "Pizza", icon: Pizza },
  { group: "Frozen", name: "Ice cream", icon: IceCreamBowl },
  { group: "Cupboard", name: "Pasta", icon: Wheat },
  { group: "Cupboard", name: "Rice", icon: Wheat },
  { group: "Cupboard", name: "Cereal", icon: Wheat },
  { group: "Cupboard", name: "Porridge", icon: Wheat },
  { group: "Cupboard", name: "Tea", icon: Coffee },
  { group: "Cupboard", name: "Coffee", icon: Coffee },
  { group: "Cupboard", name: "Beans", icon: Bean },
  { group: "Cupboard", name: "Tinned tomatoes", icon: CookingPot },
  { group: "Cupboard", name: "Soup", icon: Soup },
  { group: "Cupboard", name: "Biscuits", icon: Cookie },
  { group: "Cupboard", name: "Crisps", icon: Popcorn },
  { group: "Cupboard", name: "Flour", icon: Wheat },
  { group: "Cupboard", name: "Sugar", icon: Cookie },
  { group: "Cupboard", name: "Olive oil", icon: GlassWater },
  { group: "Cupboard", name: "Stock cubes", icon: Soup },
  { group: "Cupboard", name: "Jam", icon: Cookie },
  { group: "Cupboard", name: "Honey", icon: Cookie },
  { group: "Drinks", name: "Orange juice", icon: CupSoda },
  { group: "Drinks", name: "Squash", icon: CupSoda },
  { group: "Drinks", name: "Sparkling water", icon: GlassWater },
  { group: "Kids", name: "School snacks", icon: Candy },
  { group: "Kids", name: "Peanut butter", icon: Nut },
  { group: "Kids", name: "Raisins", icon: Grape },
  { group: "Household", name: "Washing-up liquid", icon: SoapDispenserDroplet },
  { group: "Household", name: "Dishwasher tablets", icon: Sparkles },
  { group: "Household", name: "Laundry tablets", icon: Sparkles },
  { group: "Household", name: "Toilet roll", icon: Toilet },
  { group: "Household", name: "Kitchen roll", icon: Toilet },
  { group: "Household", name: "Bin bags", icon: Package },
  { group: "Household", name: "Cling film", icon: Package },
  { group: "Household", name: "Foil", icon: Package },
  { group: "Household", name: "Sponges", icon: SprayCan },
  { group: "Household", name: "Shampoo", icon: SprayCan },
  { group: "Household", name: "Toothpaste", icon: Sparkles },
  { group: "Household", name: "Soap", icon: SoapDispenserDroplet },
  { group: "Household", name: "Washing powder", icon: Shirt },
];

export const USUAL_NAMES = [
  "Milk",
  "Bread",
  "Eggs",
  "Butter",
  "Bananas",
  "Cheese",
  "Chicken",
  "Pasta",
  "Toilet roll",
  "Washing-up liquid",
] as const;

export function catalogueIcon(name: string): LucideIcon {
  return (
    SHOPPING_CATALOGUE.find((item) => item.name.toLowerCase() === name.toLowerCase())
      ?.icon ?? Package
  );
}

export const REMINDER_OPTIONS = [
  { label: "No reminder", minutes: null },
  { label: "At the time", minutes: 0 },
  { label: "5 min before", minutes: 5 },
  { label: "15 min before", minutes: 15 },
  { label: "30 min before", minutes: 30 },
  { label: "1 hour before", minutes: 60 },
  { label: "2 hours before", minutes: 120 },
  { label: "1 day before", minutes: 1440 },
] as const;

export function reminderLabel(minutes: number | null | undefined) {
  return (
    REMINDER_OPTIONS.find((option) => option.minutes === (minutes ?? null))
      ?.label ?? null
  );
}
