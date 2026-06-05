type JsonLd = Record<string, unknown>;

type SeoEntry = {
  title: string;
  description: string;
  siteName: string;
  siteUrl: string;
  ogImage: string;
  logoImage: string;
  jsonLd: JsonLd;
};

export const siteUrl = "https://watsonstoronto.com";
export const siteName = "Watson's";
export const siteDescription =
  "Great cocktails, great food, great music, and an amazing atmosphere in downtown Toronto.";
export const ogImage = `${siteUrl}/social-preview.png`;
export const logoImage = `${siteUrl}/brand/watsons-logo.svg`;

export const seoByPath: Record<string, SeoEntry> = {
  "/": {
    title: siteName,
    description: siteDescription,
    siteName,
    siteUrl,
    ogImage,
    logoImage,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "BarOrPub",
      name: "Watson's",
      description: siteDescription,
      url: siteUrl,
      image: ogImage,
      logo: logoImage,
      telephone: "+1-416-597-9792",
      priceRange: "$$",
      address: {
        "@type": "PostalAddress",
        streetAddress: "398 Richmond St W",
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
            "Saturday"
          ],
          opens: "17:00",
          closes: "02:00"
        },
        {
          "@type": "OpeningHoursSpecification",
          dayOfWeek: ["Sunday"],
          opens: "19:00",
          closes: "02:00"
        }
      ],
      servesCuisine: ["Cocktails", "Bar food"]
    }
  },
  "/menu": {
    title: siteName,
    description: siteDescription,
    siteName,
    siteUrl,
    ogImage,
    logoImage,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "Menu",
      name: "Watson's Toronto Menu",
      description: siteDescription,
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
