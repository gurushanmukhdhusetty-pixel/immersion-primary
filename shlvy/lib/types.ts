export type ProductColor = {name: string; hex: string; image?: string}; // image = optional photo of the case in this colour

export type Product = {
  id: string;
  name: string;
  slug: string;
  category: string;
  theme: string;
  image: string;
  price: string;
  visible: boolean;
  colors?: ProductColor[]; // colour options the customer can pick
  order: number;
  createdAt?: string;
};

export const ORDER_STATUSES = ['New', 'Contacted', 'Confirmed', 'Paid', 'Shipped', 'Delivered', 'Cancelled'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export type OrderEvent = { at: string; text: string };

export type Order = {
  id: string;
  requestType: 'purchase' | 'custom';
  selectedDesign: string | null;
  selectedColor?: string | null;
  name: string;
  email: string;
  model: string;
  notes: string;
  style: string;
  palette: string;
  interests: string[];
  referenceUrl: string | null;
  referenceName: string | null;
  createdAt: string;
  updatedAt: string;
  // Admin-only fields
  status: OrderStatus;
  price: string;
  tracking: string;
  adminNotes: string;
  history: OrderEvent[];
};

export const BASE_CATEGORIES = ['Unisex', 'Soft & playful', 'Dark & bold'];
