export type MenuCategory = {
  id: string;
  label: string;
  eyebrow: string;
  description: string;
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

export const menuCategories: MenuCategory[] = [
  {
    id: "single-malt-scotch",
    label: "Single Malt Scotch",
    eyebrow: "Whisky",
    description:
      "A deep back-bar list organized by region, age, cask, and mood."
  },
  {
    id: "american-whiskey",
    label: "American Whiskey",
    eyebrow: "Whiskey",
    description: "Bourbon, rye, and American bottles for neat pours or late rounds."
  },
  {
    id: "canadian-whiskey",
    label: "Canadian Whiskey",
    eyebrow: "Whiskey",
    description: "Local and Canadian classics, from easy-drinking to collector pours."
  },
  {
    id: "irish-whiskey",
    label: "Irish Whiskey",
    eyebrow: "Whiskey",
    description: "Bright, rounded Irish pours for casual sipping."
  },
  {
    id: "japanese-whiskey",
    label: "Japanese Whiskey",
    eyebrow: "Whisky",
    description: "Balanced Japanese whiskies with a focus on precision and texture."
  },
  {
    id: "tequila",
    label: "Tequila",
    eyebrow: "Agave",
    description: "Blanco, reposado, anejo, and special agave bottles."
  },
  {
    id: "rum",
    label: "Rum",
    eyebrow: "Sugarcane",
    description: "Dark, aged, and tropical bottles from the rum shelf."
  },
  {
    id: "cognac",
    label: "Cognac",
    eyebrow: "Brandy",
    description: "Cognac and brandy pours with a rich after-hours lean."
  },
  {
    id: "vodka",
    label: "Vodka",
    eyebrow: "Vodka",
    description: "Clean spirits built for martinis, mixes, and chilled pours."
  },
  {
    id: "gin",
    label: "Gin",
    eyebrow: "Gin",
    description: "Botanical bottles, from London dry to modern aromatics."
  },
  {
    id: "mezcal",
    label: "Mezcal",
    eyebrow: "Agave",
    description: "Smoky, mineral, and expressive mezcal selections."
  }
];

export const regionFilters = [
  "Highland",
  "Lowland",
  "Speyside",
  "Campbeltown",
  "Islay",
  "Isle of Skye"
];

export const menuItems: MenuItem[] = [
  {
    id: "aberfeldy-16",
    categoryId: "single-malt-scotch",
    name: "Aberfeldy 16",
    region: "Highland",
    price: "$17.95"
  },
  {
    id: "aberlour-12",
    categoryId: "single-malt-scotch",
    name: "Aberlour 12",
    region: "Speyside",
    price: "$10"
  },
  {
    id: "ardbeg-10",
    categoryId: "single-malt-scotch",
    name: "Ardbeg 10yr",
    region: "Islay",
    price: "$12.25"
  },
  {
    id: "ardbeg-ardcore",
    categoryId: "single-malt-scotch",
    name: "Ardbeg Ardcore",
    region: "Islay",
    price: "$23.50",
    featured: true
  },
  {
    id: "ardbeg-corryvreckan",
    categoryId: "single-malt-scotch",
    name: "Ardbeg Corryvreckan",
    region: "Islay",
    price: "$20.50"
  },
  {
    id: "ardbeg-uigeadail",
    categoryId: "single-malt-scotch",
    name: "Ardbeg Uigeadail",
    region: "Islay",
    price: "$18.95"
  },
  {
    id: "ardmore-legacy",
    categoryId: "single-malt-scotch",
    name: "Ardmore Legacy",
    region: "Highland",
    price: "$11.50"
  },
  {
    id: "arran",
    categoryId: "single-malt-scotch",
    name: "Arran",
    price: "$9.50"
  },
  {
    id: "balvenie-12",
    categoryId: "single-malt-scotch",
    name: "Balvenie 12",
    region: "Speyside",
    price: "$13.75"
  },
  {
    id: "balvenie-14",
    categoryId: "single-malt-scotch",
    name: "Balvenie 14",
    region: "Speyside",
    note: "Sweet toast",
    price: "$14.75"
  },
  {
    id: "bowmore-18",
    categoryId: "single-malt-scotch",
    name: "Bowmore 18",
    region: "Islay",
    price: "$29"
  },
  {
    id: "bunnahabhain-12",
    categoryId: "single-malt-scotch",
    name: "Bunnahabhain 12",
    region: "Islay",
    price: "$13"
  },
  {
    id: "caol-ila-12",
    categoryId: "single-malt-scotch",
    name: "Caol Ila 12",
    region: "Islay",
    price: "$12"
  },
  {
    id: "dalmore-15",
    categoryId: "single-malt-scotch",
    name: "Dalmore 15",
    region: "Highland",
    price: "$16.50"
  },
  {
    id: "dalmore-cigar-malt",
    categoryId: "single-malt-scotch",
    name: "Dalmore Cigar Malt",
    region: "Highland",
    price: "$22"
  },
  {
    id: "dalwhinnie-15",
    categoryId: "single-malt-scotch",
    name: "Dalwhinnie 15",
    region: "Highland",
    price: "$18.75"
  },
  {
    id: "glenfarclas-15",
    categoryId: "single-malt-scotch",
    name: "Glenfarclas 15",
    region: "Highland",
    price: "$16"
  },
  {
    id: "glenfiddich-18",
    categoryId: "single-malt-scotch",
    name: "Glenfiddich 18",
    region: "Speyside",
    price: "$19.50"
  },
  {
    id: "glenlivet-18",
    categoryId: "single-malt-scotch",
    name: "Glenlivet 18",
    region: "Speyside",
    price: "$22.95"
  },
  {
    id: "glenmorangie-signet",
    categoryId: "single-malt-scotch",
    name: "Glenmorangie Signet",
    region: "Highland",
    price: "$35.95",
    featured: true
  },
  {
    id: "highland-park-18",
    categoryId: "single-malt-scotch",
    name: "Highland Park 18",
    region: "Highland",
    price: "$22"
  },
  {
    id: "lagavulin-12",
    categoryId: "single-malt-scotch",
    name: "Lagavulin 12yr",
    region: "Islay",
    price: "$29.50"
  },
  {
    id: "laphroaig-lore",
    categoryId: "single-malt-scotch",
    name: "Laphroaig Lore",
    region: "Islay",
    note: "Limited edition",
    price: "$28.25"
  },
  {
    id: "macallan-12-sherry",
    categoryId: "single-malt-scotch",
    name: "Macallan 12",
    region: "Speyside",
    note: "Sherry cask",
    price: "$17.95"
  },
  {
    id: "macallan-18",
    categoryId: "single-malt-scotch",
    name: "Macallan 18",
    region: "Speyside",
    note: "Double cask",
    price: "$69.95"
  },
  {
    id: "monkey-shoulder",
    categoryId: "single-malt-scotch",
    name: "Monkey Shoulder",
    region: "Speyside",
    price: "$10.75"
  },
  {
    id: "oban-14",
    categoryId: "single-malt-scotch",
    name: "Oban 14",
    region: "Highland",
    price: "$17.95"
  },
  {
    id: "octomore-13-2",
    categoryId: "single-malt-scotch",
    name: "Octomore 13.2",
    region: "Islay",
    price: "$44"
  },
  {
    id: "talisker-10",
    categoryId: "single-malt-scotch",
    name: "Talisker 10",
    region: "Isle of Skye",
    price: "$12.75"
  },
  {
    id: "talisker-storm",
    categoryId: "single-malt-scotch",
    name: "Talisker Storm",
    region: "Isle of Skye",
    price: "$13.50"
  }
];
