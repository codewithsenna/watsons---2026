export type MenuCategory = {
  id: string;
  label: string;
  eyebrow?: string;
  description?: string;
};

export type MenuItem = {
  id: string;
  categoryId: string;
  name: string;
  price: string;
  region?: string;
  note?: string;
  featured?: boolean;
};

export type MenuApiResponse = {
  categories: MenuCategory[];
  items: MenuItem[];
};
