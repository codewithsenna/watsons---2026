import { Mail, MapPin, X, Instagram, Phone } from "lucide-react";
import { useState } from "react";
import { AdminDashboard } from "./AdminDashboard";
import { MenuPage } from "./MenuPage";

const backgroundImage = "/hero-bg.jpg";
const instagramUrl = "https://www.instagram.com/watsonstoronto/?hl=en";
const reservationsUrl =
  "https://www.opentable.ca/booking/restref/availability?rid=1213447&restref=1213447&lang=en-CA";

export function App() {
  const [isContactOpen, setIsContactOpen] = useState(false);
  const pathname = window.location.pathname;

  if (pathname.startsWith("/menu")) {
    return <MenuPage />;
  }

  if (pathname.startsWith("/admin")) {
    return <AdminDashboard />;
  }

  return (
    <div className="relative min-h-dvh overflow-hidden bg-watsons-dark text-watsons-cream selection:bg-watsons-gold selection:text-watsons-dark">
      <AmbientBackground />

      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-7xl flex-col px-6 py-8 sm:px-8 lg:px-12">
        <Header />

        <main className="flex flex-1 flex-col items-center justify-center pb-14 pt-10 text-center sm:pb-10">
          <section className="w-full animate-rise space-y-4 sm:space-y-6">
            <p className="text-xs font-bold uppercase tracking-[0.36em] text-watsons-mist">
              Toronto's Friendly Local Bar
            </p>
            <h1 className="mx-auto max-w-4xl font-serif text-4xl leading-[0.95] text-watsons-cream drop-shadow-2xl sm:text-6xl lg:text-7xl">
              Built by industry,
              <br />
              for industry,
              <br />
              <span className="italic text-watsons-gold">
                found by everyone else.
              </span>
            </h1>
          </section>

          <nav
            aria-label="Primary"
            className="mt-5 grid w-full max-w-2xl grid-cols-1 gap-2 sm:mt-12 sm:grid-cols-3 sm:gap-4"
          >
            <PortalLink href="/menu" label="Menu" detail="Drinks" />
            <PortalLink
              href={reservationsUrl}
              label="Reservations"
              detail="Book a Table"
              featured
              external
            />
            <button
              type="button"
              onClick={() => setIsContactOpen(true)}
              className="group mx-auto flex min-h-[42px] w-[78%] flex-col items-center justify-center rounded-lg border border-watsons-cream/10 bg-watsons-card/50 px-3 py-1 text-center backdrop-blur-md transition duration-300 hover:border-watsons-gold/60 hover:bg-watsons-card/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-watsons-gold sm:min-h-20 sm:w-full sm:px-4 sm:py-4"
            >
              <span className="block text-[8px] font-bold uppercase tracking-[0.12em] text-watsons-cream transition group-hover:text-watsons-gold sm:text-sm sm:tracking-[0.24em]">
                Contact
              </span>
              <span className="mt-0.5 block text-[8px] font-medium text-watsons-cream/55 sm:mt-1 sm:text-xs">
                Location & Hours
              </span>
            </button>
          </nav>
        </main>

        <Footer />
      </div>

      <ContactModal isOpen={isContactOpen} onClose={() => setIsContactOpen(false)} />
    </div>
  );
}

function AmbientBackground() {
  return (
    <div className="absolute inset-0 z-0 overflow-hidden bg-watsons-dark">
      <img
        src={backgroundImage}
        alt="A warmly lit cocktail bar interior"
        className="h-full w-full animate-subtle-zoom object-cover opacity-50"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-watsons-dark/95 via-watsons-dark/40 to-watsons-dark/95" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(200,155,66,0.16),transparent_42%)] mix-blend-screen" />
      <div className="absolute inset-0 bg-watsons-green/15 mix-blend-overlay" />
    </div>
  );
}

function Header() {
  return (
    <header className="flex shrink-0 items-center justify-center sm:justify-between">
      <a
        href="/"
        className="font-serif text-3xl uppercase tracking-[0.28em] text-watsons-cream"
        aria-label="Watson's home"
      >
        Watson's
      </a>
      <a
        href={instagramUrl}
        target="_blank"
        rel="noreferrer"
        className="hidden rounded-full p-2 text-watsons-cream/65 transition hover:text-watsons-gold focus:outline-none focus-visible:ring-2 focus-visible:ring-watsons-gold sm:inline-flex"
        aria-label="Watson's on Instagram"
      >
        <Instagram className="h-6 w-6" aria-hidden="true" />
      </a>
    </header>
  );
}

type PortalLinkProps = {
  href: string;
  label: string;
  detail: string;
  icon?: React.ReactNode;
  featured?: boolean;
  external?: boolean;
};

function PortalLink({ href, label, detail, icon, featured, external }: PortalLinkProps) {
  const className = featured
    ? "group mx-auto flex min-h-[42px] w-[78%] flex-col items-center justify-center rounded-lg border border-watsons-gold bg-watsons-gold/95 px-3 py-1 text-center shadow-glow transition duration-300 hover:bg-watsons-goldHover focus:outline-none focus-visible:ring-2 focus-visible:ring-watsons-cream sm:min-h-20 sm:w-full sm:px-4 sm:py-4"
    : "group mx-auto flex min-h-[42px] w-[78%] flex-col items-center justify-center rounded-lg border border-watsons-cream/10 bg-watsons-card/50 px-3 py-1 text-center backdrop-blur-md transition duration-300 hover:border-watsons-gold/60 hover:bg-watsons-card/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-watsons-gold sm:min-h-20 sm:w-full sm:px-4 sm:py-4";

  return (
    <a
      href={href}
      className={className}
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer" : undefined}
    >
      <span className="flex items-center justify-center gap-2">
        {icon ? (
          <span className={featured ? "text-watsons-dark" : "text-watsons-gold"}>
            {icon}
          </span>
        ) : null}

        <span
          className={
            featured
              ? "text-[8px] font-bold uppercase tracking-[0.12em] text-watsons-dark sm:text-sm sm:tracking-[0.24em]"
              : "text-[8px] font-bold uppercase tracking-[0.12em] text-watsons-cream transition group-hover:text-watsons-gold sm:text-sm sm:tracking-[0.24em]"
          }
        >
          {label}
        </span>
      </span>

      <span
        className={
          featured
            ? "mt-0.5 block text-[8px] font-medium text-watsons-dark/75 sm:mt-1 sm:text-xs"
            : "mt-0.5 block text-[8px] font-medium text-watsons-cream/55 sm:mt-1 sm:text-xs"
        }
      >
        {detail}
      </span>
    </a>
  );
}

function Footer() {
  return (
    <footer className="flex shrink-0 flex-col items-center justify-between gap-2 pb-2 text-sm text-watsons-cream/50 sm:flex-row sm:pb-0">
      <p>
        <a
          href="https://www.google.com/maps/dir//398+Richmond+St+W,+Toronto,+ON+M5V+3P1/@43.6436709,-79.3883802,16z/data=!4m7!4m6!1m1!4e2!1m2!1m1!1s0x882b34db08c95555:0x1e502465748c499b!3e0?gl=ca"
          target="_blank"
          rel="noopener noreferrer"
        >
          398 Richmond St W
        </a>
      </p>
      <p>Open Daily</p>
    </footer>
  );
}

type ContactModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

function ContactModal({ isOpen, onClose }: ContactModalProps) {
  return (
    <div
      className={`absolute inset-0 z-50 flex items-center justify-center bg-watsons-dark/80 px-4 backdrop-blur-xl transition duration-500 ${isOpen
        ? "translate-y-0 opacity-100"
        : "pointer-events-none translate-y-5 opacity-0"
        }`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="contact-title"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-xl border border-watsons-gold/25 bg-watsons-card p-8 text-center shadow-2xl sm:p-12"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-watsons-dark text-watsons-cream transition hover:bg-black hover:text-watsons-gold focus:outline-none focus-visible:ring-2 focus-visible:ring-watsons-gold"
          aria-label="Close contact details"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>

        <h2 id="contact-title" className="font-serif text-4xl text-watsons-gold">
          Find Us
        </h2>
        <p className="mt-2 font-medium text-watsons-cream/70">
          Walk-ins always welcome.
        </p>

        <div className="mt-8 space-y-6 text-watsons-cream">
          <InfoBlock heading="Address">
            398 Richmond St W
            <br />
            Toronto, ON M5V 3P1
          </InfoBlock>
          <Divider />
          <InfoBlock heading="Hours">
            Monday - Saturday
            <br />
            5:00 PM - 2:00 AM
            <br />
            Sunday
            <br />
            7:00 PM - 2:00 AM
          </InfoBlock>
          <Divider />
          <div>
            <h3 className="mb-3 text-xs uppercase tracking-[0.24em] text-watsons-cream/45">
              Get in touch
            </h3>
            <div className="flex justify-center gap-5">
              <IconLink href={instagramUrl} label="Instagram">
                <Instagram className="h-6 w-6" />
              </IconLink>
              <IconLink href="mailto:info@watsonstoronto.com" label="Email">
                <Mail className="h-6 w-6" />
              </IconLink>
              <IconLink href="tel:+14165979792" label="Phone">
                <Phone className="h-6 w-6" />
              </IconLink>
            </div>
          </div>
        </div>
        <div className="mt-8 overflow-hidden whitespace-nowrap border-y border-watsons-gold/25 py-1.5">
          <div className="flex w-max animate-marquee gap-6">
            <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-watsons-gold sm:text-xs sm:tracking-[0.2em]">
              BUCK A SHUCK - HALF PRICE WINE BOTTLE - BUY 1 GET 1 FREE
            </span>
            <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-watsons-gold sm:text-xs sm:tracking-[0.2em]">
              BUCK A SHUCK - HALF PRICE WINE BOTTLE - BUY 1 GET 1 FREE
            </span>
            <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-watsons-gold sm:text-xs sm:tracking-[0.2em]">
              BUCK A SHUCK - HALF PRICE WINE BOTTLE - BUY 1 GET 1 FREE
            </span>
          </div>
        </div>
        <a
          href="https://maps.google.com/?q=398+Richmond+St+W,+Toronto"
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-watsons-green bg-watsons-green px-5 py-4 text-sm font-bold uppercase tracking-[0.24em] text-watsons-cream transition hover:border-watsons-gold hover:bg-watsons-gold hover:text-watsons-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-watsons-gold"
        >
          <MapPin className="h-5 w-5" aria-hidden="true" />
          Get Directions
        </a>
      </div>
    </div>
  );
}

type InfoBlockProps = {
  heading: string;
  children: React.ReactNode;
};

function InfoBlock({ heading, children }: InfoBlockProps) {
  return (
    <div>
      <h3 className="mb-1 text-xs uppercase tracking-[0.24em] text-watsons-cream/45">
        {heading}
      </h3>
      <p className="text-lg leading-relaxed">{children}</p>
    </div>
  );
}

function Divider() {
  return <hr className="mx-auto w-1/2 border-watsons-cream/10" />;
}

type IconLinkProps = {
  href: string;
  label: string;
  children: React.ReactNode;
};

function IconLink({ href, label, children }: IconLinkProps) {
  return (
    <a
      href={href}
      target={href.startsWith("http") ? "_blank" : undefined}
      rel={href.startsWith("http") ? "noreferrer" : undefined}
      className="text-watsons-cream transition hover:text-watsons-gold focus:outline-none focus-visible:ring-2 focus-visible:ring-watsons-gold"
      aria-label={label}
    >
      {children}
    </a>
  );
}
