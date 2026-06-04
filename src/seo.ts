type JsonLd = Record<string, unknown>;

type SeoEntry = {
  title: string;
  description: string;
  siteName: string;
  siteUrl: string;
  ogImage: string;
  jsonLd: JsonLd;
};

const siteUrl = "https://watsons.local";
const ogImage = "/og/watsons-richmond.jpg";

export const seoByPath: Record<string, SeoEntry> = {
  "/": {
    title: "Watson's | Toronto's Friendly Local Cocktail Bar",
    description:
      "Watson's is a friendly local cocktail bar at 388 Richmond St W in Toronto, built by industry, for industry, and found by everyone else.",
    siteName: "Watson's",
    siteUrl,
    ogImage,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "BarOrPub",
      name: "Watson's",
      slogan: "Built by industry, for industry, found by everyone else.",
      description:
        "A friendly local cocktail bar serving drinks and food in downtown Toronto.",
      url: siteUrl,
      image: ogImage,
      telephone: "+1-416-000-0000",
      priceRange: "$$",
      address: {
        "@type": "PostalAddress",
        streetAddress: "388 Richmond St W",
        addressLocality: "Toronto",
        addressRegion: "ON",
        postalCode: "M5V 3P1",
        addressCountry: "CA"
      },
      geo: {
        "@type": "GeoCoordinates",
        latitude: 43.6476,
        longitude: -79.3932
      },
      openingHoursSpecification: [
        {
          "@type": "OpeningHoursSpecification",
          dayOfWeek: [
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
            "Sunday"
          ],
          opens: "17:00",
          closes: "02:00"
        }
      ],
      servesCuisine: ["Cocktails", "Bar food"]
    }
  },
  "/menu": {
    title: "Watson's Menu | Cocktails, Food, and Spirits in Toronto",
    description:
      "Browse Watson's Toronto menu, including single malt scotch, whiskey, tequila, rum, gin, mezcal, cocktails, and bar food.",
    siteName: "Watson's",
    siteUrl,
    ogImage,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "Menu",
      name: "Watson's Toronto Menu",
      description:
        "A searchable Watson's menu featuring cocktails, food, and a deep spirits catalog.",
      url: `${siteUrl}/menu`,
      hasMenuSection: [
        {
          "@type": "MenuSection",
          name: "Single Malt Scotch"
        },
        {
          "@type": "MenuSection",
          name: "Whiskey"
        },
        {
          "@type": "MenuSection",
          name: "Agave"
        },
        {
          "@type": "MenuSection",
          name: "Cocktails"
        },
        {
          "@type": "MenuSection",
          name: "Food"
        }
      ]
    }
  }
};
