import {
  CalendarClock,
  ChevronDown,
  CheckCircle2,
  Clock3,
  DollarSign,
  FolderPlus,
  GripVertical,
  History,
  LayoutDashboard,
  LogOut,
  Mail,
  Palette,
  Plus,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  UserPlus,
  Users,
  Wine
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode
} from "react";
import {
  applySiteTheme,
  defaultSiteSettings,
  formatHourRange,
  type SiteHours,
  type SiteSettings,
  type SiteTheme
} from "./siteSettings";

const apiBaseUrl = (import.meta.env.VITE_PUBLIC_API_BASE_URL ?? "/api").replace(/\/$/, "");

type AdminRole = "owner" | "admin" | "manager" | "editor" | "viewer";

type AdminPermissions = {
  canManageMenu: boolean;
  canManageUsers: boolean;
  canViewAuditTrail: boolean;
};

type AdminUser = {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  accessLevel: number;
  isActive: boolean;
  permissions: AdminPermissions;
  expiresAt: string;
};

type AdminUserRecord = Omit<AdminUser, "expiresAt">;

type AdminCategory = {
  id: string;
  name: string;
  slug: string;
  description: string;
  sortOrder: number;
  isActive: boolean;
};

type AdminPricing = {
  label: string;
  amount: number;
  currency: string;
};

type AdminItem = {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  displayDescription: string;
  pricing: AdminPricing[];
  isAvailable: boolean;
  isFeatured: boolean;
  sortOrder: number;
};

type AdminMenuResponse = {
  restaurant: {
    name: string;
    slug: string;
  };
  menu: {
    title: string;
    slug: string;
  };
  categories: AdminCategory[];
  items: AdminItem[];
};

type AdminAuditChange = {
  field: string;
  before: unknown;
  after: unknown;
};

type AdminAuditLog = {
  id: string;
  actorEmail: string;
  actorName: string;
  actorRole: AdminRole;
  action: string;
  resourceType: string;
  resourceId: string;
  resourceName: string;
  changes: AdminAuditChange[];
  createdAt: string;
};

type AdminAuditResponse = {
  logs: AdminAuditLog[];
  hasMore: boolean;
  nextCursor: string;
};

type ItemDraft = {
  categoryId: string;
  name: string;
  description: string;
  displayDescription: string;
  pricing: AdminPricing[];
  isAvailable: boolean;
  isFeatured: boolean;
};

type CategoryDraft = {
  name: string;
  description: string;
  sortOrder: number;
  isActive: boolean;
};

type PanelId = "overview" | "menu" | "design" | "hours" | "users" | "audit";

const emptyPricing: AdminPricing = {
  label: "Regular",
  amount: 0,
  currency: "CAD"
};

const roleOptions: Array<{ value: AdminRole; label: string; accessLevel: number }> = [
  { value: "owner", label: "Owner", accessLevel: 100 },
  { value: "admin", label: "Admin", accessLevel: 90 },
  { value: "manager", label: "Manager", accessLevel: 70 },
  { value: "editor", label: "Editor", accessLevel: 50 },
  { value: "viewer", label: "Viewer", accessLevel: 10 }
];

const googleFontOptions = [
  "DM Sans",
  "DM Serif Display",
  "Inter",
  "Roboto",
  "Open Sans",
  "Lato",
  "Montserrat",
  "Poppins",
  "Source Sans 3",
  "Nunito Sans",
  "Raleway",
  "Merriweather",
  "Playfair Display",
  "Cormorant Garamond",
  "Libre Baskerville",
  "Lora",
  "Bodoni Moda",
  "Prata",
  "Cinzel",
  "Oswald",
  "Work Sans",
  "Manrope",
  "Space Grotesk",
  "Archivo",
  "Barlow",
  "Figtree",
  "Plus Jakarta Sans",
  "Noto Sans",
  "Noto Serif",
  "PT Sans",
  "PT Serif",
  "Crimson Text",
  "EB Garamond",
  "Fraunces",
  "Josefin Sans",
  "Quicksand",
  "Karla",
  "Rubik",
  "Mulish",
  "Cabin",
  "Alegreya",
  "Alegreya Sans",
  "Arvo",
  "Bitter",
  "Spectral",
  "Vollkorn",
  "Cardo",
  "Cormorant",
  "Newsreader",
  "system-ui",
  "Arial",
  "Helvetica",
  "Georgia",
  "Times New Roman",
  "serif"
];

const themeFields: Array<{ key: keyof SiteTheme; label: string }> = [
  { key: "dark", label: "Page background" },
  { key: "card", label: "Panel background" },
  { key: "cream", label: "Main text" },
  { key: "green", label: "Green" },
  { key: "gold", label: "Gold" },
  { key: "goldHover", label: "Gold hover" },
  { key: "copper", label: "Copper" },
  { key: "mist", label: "Muted text" }
];

export function AdminDashboard() {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  useEffect(() => {
    let isMounted = true;

    adminFetch<{ authenticated: boolean; user?: AdminUser }>("/admin/session", {
      method: "GET"
    })
      .then((result) => {
        if (isMounted && result.authenticated && result.user) {
          setUser(result.user);
        }
      })
      .catch(() => {
        if (isMounted) {
          setUser(null);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsCheckingSession(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  if (isCheckingSession) {
    return (
      <AdminFrame centered>
        <p className="text-sm font-bold uppercase tracking-[0.24em] text-watsons-mist">
          Checking Session
        </p>
      </AdminFrame>
    );
  }

  if (!user) {
    return (
      <AdminFrame centered>
        <OtpSignIn onSignedIn={setUser} />
      </AdminFrame>
    );
  }

  return (
    <AdminFrame>
      <AdminWorkspace user={user} onSignedOut={() => setUser(null)} />
    </AdminFrame>
  );
}

function OtpSignIn({ onSignedIn }: { onSignedIn: (user: AdminUser) => void }) {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [codeLifetimeSeconds, setCodeLifetimeSeconds] = useState(59);
  const [now, setNow] = useState(Date.now());
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const remainingSeconds = expiresAt
    ? Math.max(0, Math.ceil((expiresAt - now) / 1000))
    : 0;
  const hasCodeRequest = expiresAt !== null;
  const countdownProgress = hasCodeRequest
    ? Math.min(100, Math.max(0, (remainingSeconds / codeLifetimeSeconds) * 100))
    : 0;
  const isEmailLocked = isSubmitting || (hasCodeRequest && remainingSeconds > 0);

  useEffect(() => {
    if (!expiresAt) {
      return;
    }

    const timer = window.setInterval(() => setNow(Date.now()), 250);

    return () => window.clearInterval(timer);
  }, [expiresAt]);

  async function requestCode(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setError("");
    setStatus("");
    setIsSubmitting(true);

    try {
      const result = await adminFetch<{
        email: string;
        expiresAt: string;
        expiresInSeconds: number;
      }>("/admin/auth/request-otp", {
        method: "POST",
        body: JSON.stringify({ email })
      });

      setEmail(result.email);
      setOtp("");
      setCodeLifetimeSeconds(result.expiresInSeconds || 59);
      setExpiresAt(new Date(result.expiresAt).getTime());
      setNow(Date.now());
      setStatus("Code sent.");
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function verifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setStatus("");
    setIsSubmitting(true);

    try {
      const result = await adminFetch<{ authenticated: boolean; user: AdminUser }>(
        "/admin/auth/verify-otp",
        {
          method: "POST",
          body: JSON.stringify({ email, otp })
        }
      );

      onSignedIn(result.user);
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="w-full max-w-lg rounded-lg border border-watsons-gold/25 bg-watsons-card/95 p-5 shadow-2xl shadow-black/50 backdrop-blur sm:p-7">
      <div className="mb-7 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-watsons-gold text-watsons-dark">
          <ShieldCheck className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-watsons-mist">
            Secure Admin
          </p>
          <h1 className="font-serif text-3xl text-watsons-cream">
            Watson's
          </h1>
        </div>
      </div>
        <div className="grid grid-cols-2 gap-1 rounded-md border border-watsons-cream/10 bg-watsons-dark p-1 text-[10px] font-bold uppercase tracking-[0.18em]">
          <span className="rounded bg-watsons-gold px-3 py-2 text-center text-watsons-dark">
            Email
          </span>
          <span
            className={`rounded px-3 py-2 text-center ${
              hasCodeRequest
                ? "bg-watsons-gold px-3 py-2 text-watsons-dark"
                : "text-watsons-mist"
            }`}
          >
            Code
          </span>
        </div>
      </div>

      <p className="mb-5 text-sm leading-6 text-watsons-mist">
        Sign in with an approved admin email. A short-lived one-time code will
        be sent to your inbox.
      </p>

      <form onSubmit={requestCode} className="space-y-4">
        <label className="block">
          <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.24em] text-watsons-mist">
            Email
          </span>
          <span className="flex items-center gap-2 rounded-md border border-watsons-cream/10 bg-watsons-dark px-3 focus-within:border-watsons-gold/70">
            <Mail className="h-4 w-4 text-watsons-mist" aria-hidden="true" />
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              autoComplete="email"
              readOnly={isEmailLocked}
              aria-readonly={isEmailLocked}
              className={`h-12 min-w-0 flex-1 bg-transparent text-sm text-watsons-cream outline-none placeholder:text-watsons-mist/60 ${
                isEmailLocked ? "cursor-not-allowed opacity-70" : ""
              }`}
              placeholder="name@example.com"
              required
            />
          </span>
          {hasCodeRequest && remainingSeconds > 0 ? (
            <span className="mt-2 block text-xs text-watsons-mist">
              Email is locked until this code expires.
            </span>
          ) : null}
        </label>

        <button
          type="submit"
          disabled={isSubmitting || (hasCodeRequest && remainingSeconds > 0)}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-watsons-gold px-4 text-xs font-bold uppercase tracking-[0.2em] text-watsons-dark transition hover:bg-watsons-goldHover disabled:cursor-not-allowed disabled:opacity-45"
        >
          {hasCodeRequest && remainingSeconds > 0 ? (
            <>
              <Clock3 className="h-4 w-4" aria-hidden="true" />
              Resend in {remainingSeconds}s
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              {hasCodeRequest ? "Resend Code" : "Send Code"}
            </>
          )}
        </button>
      </form>

      {hasCodeRequest ? (
        <form onSubmit={verifyCode} className="mt-5 space-y-4">
          <div className="rounded-md border border-watsons-cream/10 bg-watsons-dark p-3">
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="min-w-0 truncate text-watsons-mist">
                Code sent to {email}
              </span>
              <span
                className={`shrink-0 rounded-full px-2 py-1 font-bold ${
                  remainingSeconds > 0
                    ? "bg-watsons-gold/15 text-watsons-gold"
                    : "bg-red-950/60 text-red-200"
                }`}
              >
                {remainingSeconds > 0
                  ? `Expires in ${remainingSeconds}s`
                  : "Code expired"}
              </span>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-watsons-cream/10">
              <span
                className="block h-full rounded-full bg-watsons-gold transition-all duration-300"
                style={{ width: `${countdownProgress}%` }}
              />
            </div>
          </div>

          <label className="block">
            <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.24em] text-watsons-mist">
              Code
            </span>
            <input
              value={otp}
              onChange={(event) =>
                setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))
              }
              inputMode="numeric"
              autoComplete="one-time-code"
              className="h-14 w-full rounded-md border border-watsons-cream/10 bg-watsons-dark px-4 text-center text-2xl font-bold tracking-[0.35em] text-watsons-cream outline-none transition focus:border-watsons-gold/70"
              placeholder="000000"
              required
            />
          </label>

          <button
            type="submit"
            disabled={isSubmitting || otp.length !== 6 || remainingSeconds === 0}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-md border border-watsons-gold/60 bg-watsons-gold/10 px-4 text-xs font-bold uppercase tracking-[0.2em] text-watsons-gold transition hover:bg-watsons-gold/20 disabled:cursor-not-allowed disabled:opacity-45"
          >
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            Sign In
          </button>
        </form>
      ) : null}

      <StatusMessage error={error} status={status} />
    </section>
  );
}

function AdminWorkspace({
  user,
  onSignedOut
}: {
  user: AdminUser;
  onSignedOut: () => void;
}) {
  const [activePanel, setActivePanel] = useState<PanelId>("overview");
  const [menuData, setMenuData] = useState<AdminMenuResponse | null>(null);
  const [settings, setSettings] = useState<SiteSettings>(defaultSiteSettings);
  const [usersData, setUsersData] = useState<AdminUserRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);
  const [auditNextCursor, setAuditNextCursor] = useState("");
  const [auditHasMore, setAuditHasMore] = useState(false);
  const [isAuditLoading, setIsAuditLoading] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedItemId, setSelectedItemId] = useState("");
  const [query, setQuery] = useState("");
  const [editorMode, setEditorMode] = useState<"edit" | "new">("new");
  const [itemDraft, setItemDraft] = useState<ItemDraft | null>(null);
  const [newItemDraft, setNewItemDraft] = useState<ItemDraft>(() =>
    createEmptyItemDraft("")
  );
  const [categoryDraft, setCategoryDraft] = useState<CategoryDraft | null>(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryDescription, setNewCategoryDescription] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void loadWorkspace();
  }, []);

  useEffect(() => {
    applySiteTheme(settings.theme);
  }, [settings.theme]);

  useEffect(() => {
    if (
      activePanel === "audit" &&
      user.permissions.canViewAuditTrail &&
      auditLogs.length === 0
    ) {
      void loadAuditLogs({ reset: true });
    }
  }, [activePanel, user.permissions.canViewAuditTrail]);

  useEffect(() => {
    if (!menuData || selectedCategoryId) {
      return;
    }

    const firstCategory = menuData.categories.find((category) => category.isActive);

    if (firstCategory) {
      setSelectedCategoryId(firstCategory.id);
      setNewItemDraft((draft) => ({ ...draft, categoryId: firstCategory.id }));
    }
  }, [menuData, selectedCategoryId]);

  const selectedItem = useMemo(
    () => menuData?.items.find((item) => item.id === selectedItemId) ?? null,
    [menuData?.items, selectedItemId]
  );

  useEffect(() => {
    setItemDraft(selectedItem ? createItemDraft(selectedItem) : null);
  }, [selectedItem]);

  const selectedCategory = menuData?.categories.find(
    (category) => category.id === selectedCategoryId
  );

  useEffect(() => {
    setCategoryDraft(selectedCategory ? createCategoryDraft(selectedCategory) : null);
  }, [selectedCategory]);

  const filteredItems = useMemo(() => {
    const search = query.trim().toLowerCase();

    return (menuData?.items ?? []).filter((item) => {
      const categoryMatches = selectedCategoryId
        ? search
          ? true
          : item.categoryId === selectedCategoryId
        : true;
      const searchMatches = search
        ? [item.name, item.description, item.displayDescription, formatPricing(item.pricing)]
            .join(" ")
            .toLowerCase()
            .includes(search)
        : true;

      return categoryMatches && searchMatches;
    });
  }, [menuData?.items, query, selectedCategoryId]);

  const activeDraft = editorMode === "edit" ? itemDraft : newItemDraft;
  const panelItems = getPanelItems(user);

  async function loadWorkspace() {
    setIsLoading(true);
    setError("");

    try {
      const menuResult = await adminFetch<AdminMenuResponse>("/admin/menu", {
        method: "GET"
      });
      setMenuData(menuResult);

      const [settingsResult, usersResult] = await Promise.allSettled([
        adminFetch<SiteSettings>("/admin/settings", { method: "GET" }),
        user.permissions.canManageUsers
          ? adminFetch<{ users: AdminUserRecord[] }>("/admin/users", { method: "GET" })
          : Promise.resolve({ users: [] })
      ]);

      if (settingsResult.status === "fulfilled") {
        setSettings(settingsResult.value);
      }

      if (usersResult.status === "fulfilled") {
        setUsersData(usersResult.value.users);
      }

      const optionalErrors = [settingsResult, usersResult].filter(
        (result) => result.status === "rejected"
      );

      if (optionalErrors.length) {
        setStatus("Menu loaded. Some dashboard settings need a refresh.");
      }
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    } finally {
      setIsLoading(false);
    }
  }

  async function signOut() {
    await adminFetch("/admin/auth/sign-out", { method: "POST" }).catch(() => null);
    onSignedOut();
  }

  async function loadAuditLogs({ reset = false } = {}) {
    if (!user.permissions.canViewAuditTrail) {
      return;
    }

    if (isAuditLoading || (!reset && !auditHasMore && auditLogs.length > 0)) {
      return;
    }

    const cursor = reset ? "" : auditNextCursor;
    const query = new URLSearchParams({ limit: "20" });

    if (cursor) {
      query.set("cursor", cursor);
    }

    setIsAuditLoading(true);

    const result = await adminFetch<AdminAuditResponse>(
      `/admin/audit-logs?${query.toString()}`,
      { method: "GET" }
    ).catch((caughtError) => {
      setError(getErrorMessage(caughtError));
      return null;
    });

    if (result) {
      setAuditLogs((current) =>
        reset ? result.logs : [...current, ...result.logs]
      );
      setAuditNextCursor(result.nextCursor);
      setAuditHasMore(result.hasMore);
    }

    setIsAuditLoading(false);
  }

  async function refreshAuditLogs() {
    if (activePanel !== "audit" && auditLogs.length === 0) {
      return;
    }

    await loadAuditLogs({ reset: true });
  }

  async function createCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await createCategoryFromValues(newCategoryName, newCategoryDescription);
  }

  async function createCategoryFromValues(name: string, description: string) {
    setIsSaving(true);
    setError("");
    setStatus("");

    try {
      const category = await adminFetch<AdminCategory>("/admin/categories", {
        method: "POST",
        body: JSON.stringify({
          name,
          description
        })
      });

      setMenuData((current) =>
        current
          ? { ...current, categories: [...current.categories, category] }
          : current
      );
      setSelectedCategoryId(category.id);
      setNewItemDraft((draft) => ({ ...draft, categoryId: category.id }));
      setNewCategoryName("");
      setNewCategoryDescription("");
      setStatus("Category added.");
      await refreshAuditLogs();
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    } finally {
      setIsSaving(false);
    }
  }

  async function saveCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedCategory || !categoryDraft) {
      return;
    }

    setIsSaving(true);
    setError("");
    setStatus("");

    try {
      const category = await adminFetch<AdminCategory>(
        `/admin/categories/${selectedCategory.id}`,
        {
          method: "PATCH",
          body: JSON.stringify(categoryDraft)
        }
      );

      setMenuData((current) =>
        current
          ? {
              ...current,
              categories: current.categories.map((existingCategory) =>
                existingCategory.id === category.id ? category : existingCategory
              )
            }
          : current
      );
      setStatus("Category saved.");
      await refreshAuditLogs();
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    } finally {
      setIsSaving(false);
    }
  }

  async function reorderCategories(
    draggedCategoryId: string,
    targetCategoryId: string
  ) {
    if (!menuData || draggedCategoryId === targetCategoryId) {
      return;
    }

    const fromIndex = menuData.categories.findIndex(
      (category) => category.id === draggedCategoryId
    );
    const toIndex = menuData.categories.findIndex(
      (category) => category.id === targetCategoryId
    );

    if (fromIndex === -1 || toIndex === -1) {
      return;
    }

    const previousCategories = menuData.categories;
    const reorderedCategories = [...menuData.categories];
    const [draggedCategory] = reorderedCategories.splice(fromIndex, 1);

    reorderedCategories.splice(toIndex, 0, draggedCategory);

    const sortedCategories = reorderedCategories.map((category, index) => ({
      ...category,
      sortOrder: index
    }));

    setIsSaving(true);
    setError("");
    setStatus("");
    setMenuData((current) =>
      current ? { ...current, categories: sortedCategories } : current
    );

    try {
      await Promise.all(
        sortedCategories
          .filter(
            (category) =>
              previousCategories.find((previous) => previous.id === category.id)
                ?.sortOrder !== category.sortOrder
          )
          .map((category) =>
            adminFetch<AdminCategory>(`/admin/categories/${category.id}`, {
              method: "PATCH",
              body: JSON.stringify({ sortOrder: category.sortOrder })
            })
          )
      );
      setStatus("Category order saved.");
      await refreshAuditLogs();
    } catch (caughtError) {
      setMenuData((current) =>
        current ? { ...current, categories: previousCategories } : current
      );
      setError(getErrorMessage(caughtError));
    } finally {
      setIsSaving(false);
    }
  }

  async function saveItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!activeDraft) {
      return;
    }

    setIsSaving(true);
    setError("");
    setStatus("");

    try {
      if (editorMode === "edit") {
        if (!selectedItem) {
          return;
        }

        const item = await adminFetch<AdminItem>(`/admin/items/${selectedItem.id}`, {
          method: "PATCH",
          body: JSON.stringify(activeDraft)
        });

        setMenuData((current) =>
          current
            ? {
                ...current,
                items: current.items.map((existingItem) =>
                  existingItem.id === item.id ? item : existingItem
                )
              }
            : current
        );
        setSelectedCategoryId(item.categoryId);
        setStatus("Item saved.");
        await refreshAuditLogs();
        return;
      }

      const item = await adminFetch<AdminItem>("/admin/items", {
        method: "POST",
        body: JSON.stringify(activeDraft)
      });

      setMenuData((current) =>
        current ? { ...current, items: [...current.items, item] } : current
      );
      setSelectedCategoryId(item.categoryId);
      setSelectedItemId(item.id);
      setEditorMode("edit");
      setNewItemDraft(createEmptyItemDraft(item.categoryId));
      setStatus("Item added.");
      await refreshAuditLogs();
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    } finally {
      setIsSaving(false);
    }
  }

  async function saveSettings(nextSettings = settings) {
    setIsSaving(true);
    setError("");
    setStatus("");

    try {
      const savedSettings = await adminFetch<SiteSettings>("/admin/settings", {
        method: "PATCH",
        body: JSON.stringify(nextSettings)
      });

      setSettings(savedSettings);
      setStatus("Settings saved.");
      await refreshAuditLogs();
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[272px_minmax(0,1fr)]">
      <aside className="border-b border-watsons-cream/10 bg-watsons-card/75 px-4 py-4 lg:sticky lg:top-0 lg:h-dvh lg:border-b-0 lg:border-r lg:px-5">
        <div className="flex items-start justify-between gap-4 lg:block">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-watsons-gold">
              Watson's Admin
            </p>
            <h1 className="mt-1 font-serif text-3xl leading-tight text-watsons-cream">
              Dashboard
            </h1>
            <p className="mt-1 break-all text-xs text-watsons-mist">{user.email}</p>
          </div>

          <button
            type="button"
            onClick={signOut}
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-md border border-watsons-cream/10 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-watsons-cream transition hover:border-watsons-gold/60 hover:text-watsons-gold lg:hidden"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Sign Out
          </button>
        </div>

        <nav className="admin-scroll mt-5 flex gap-2 overflow-x-auto pb-1 lg:grid lg:overflow-visible lg:pb-0">
          {panelItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActivePanel(item.id)}
              className={`flex min-w-max items-center gap-3 rounded-md border px-3 py-3 text-left text-sm font-bold transition lg:min-w-0 ${
                activePanel === item.id
                  ? "border-watsons-gold bg-watsons-gold text-watsons-dark"
                  : "border-watsons-cream/10 bg-watsons-dark/40 text-watsons-cream hover:border-watsons-gold/50"
              }`}
            >
              <item.icon className="h-4 w-4" aria-hidden="true" />
              {item.label}
            </button>
          ))}
        </nav>

        <button
          type="button"
          onClick={signOut}
          className="mt-6 hidden h-11 w-full items-center justify-center gap-2 rounded-md border border-watsons-cream/10 px-4 text-xs font-bold uppercase tracking-[0.18em] text-watsons-cream transition hover:border-watsons-gold/60 hover:text-watsons-gold lg:flex"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Sign Out
        </button>
      </aside>

      <main className="admin-scroll max-h-none overflow-y-auto px-4 py-5 sm:px-6 lg:h-dvh lg:px-8">
        <div className="mx-auto w-full max-w-[1680px]">
          <StatusMessage error={error} status={status} />

          {isLoading ? (
            <PanelShell eyebrow="Loading" title="Preparing Dashboard">
              <p className="text-sm text-watsons-mist">Loading menu and settings.</p>
            </PanelShell>
          ) : null}

          {!isLoading && activePanel === "overview" && menuData ? (
            <OverviewPanel
              menuData={menuData}
              settings={settings}
              userCount={usersData.length}
              onNavigate={setActivePanel}
              canManageUsers={user.permissions.canManageUsers}
            />
          ) : null}

          {!isLoading && activePanel === "menu" && menuData ? (
            <MenuPanel
              categories={menuData.categories}
              filteredItems={filteredItems}
              itemCountsByCategory={getCategoryCounts(menuData.items)}
              query={query}
              selectedCategory={selectedCategory}
              selectedCategoryId={selectedCategoryId}
              selectedItemId={selectedItemId}
              editorMode={editorMode}
              draft={activeDraft}
              isSaving={isSaving}
              newCategoryName={newCategoryName}
              newCategoryDescription={newCategoryDescription}
              categoryDraft={categoryDraft}
              onQueryChange={setQuery}
              onCategorySelect={(categoryId) => {
                setSelectedCategoryId(categoryId);
                setNewItemDraft((draft) => ({ ...draft, categoryId }));
              }}
              onItemSelect={(item) => {
                setSelectedItemId(item.id);
                setEditorMode("edit");
              }}
              onNewItem={() => {
                const categoryId = selectedCategoryId || menuData.categories[0]?.id || "";
                setNewItemDraft(createEmptyItemDraft(categoryId));
                setSelectedItemId("");
                setEditorMode("new");
              }}
              onCategorySubmit={createCategory}
              onCategorySave={saveCategory}
              onCategoryReorder={(draggedCategoryId, targetCategoryId) =>
                void reorderCategories(draggedCategoryId, targetCategoryId)
              }
              onNewCategoryNameChange={setNewCategoryName}
              onNewCategoryDescriptionChange={setNewCategoryDescription}
              onCategoryDraftChange={setCategoryDraft}
              onDraftChange={(draft) => {
                if (editorMode === "edit") {
                  setItemDraft(draft);
                } else {
                  setNewItemDraft(draft);
                }
              }}
              onItemSubmit={saveItem}
            />
          ) : null}

          {!isLoading && activePanel === "design" ? (
            <DesignPanel
              settings={settings}
              isSaving={isSaving}
              onSettingsChange={setSettings}
              onSave={() => void saveSettings()}
            />
          ) : null}

          {!isLoading && activePanel === "hours" ? (
            <HoursPanel
              hours={settings.hours}
              isSaving={isSaving}
              onHoursChange={(hours) => setSettings((current) => ({ ...current, hours }))}
              onSave={() => void saveSettings()}
            />
          ) : null}

          {!isLoading && activePanel === "users" && user.permissions.canManageUsers ? (
            <UsersPanel
              currentUser={user}
              users={usersData}
              isSaving={isSaving}
              onUsersChange={setUsersData}
              onSavingChange={setIsSaving}
              onStatus={setStatus}
              onError={setError}
              onAuditRefresh={() => void refreshAuditLogs()}
            />
          ) : null}

          {!isLoading && activePanel === "audit" && user.permissions.canViewAuditTrail ? (
            <AuditPanel
              logs={auditLogs}
              hasMore={auditHasMore}
              isLoading={isAuditLoading}
              onRefresh={() => void refreshAuditLogs()}
              onLoadMore={() => void loadAuditLogs()}
            />
          ) : null}
        </div>
      </main>
    </div>
  );
}

function OverviewPanel({
  menuData,
  settings,
  userCount,
  canManageUsers,
  onNavigate
}: {
  menuData: AdminMenuResponse;
  settings: SiteSettings;
  userCount: number;
  canManageUsers: boolean;
  onNavigate: (panel: PanelId) => void;
}) {
  const availableItems = menuData.items.filter((item) => item.isAvailable).length;

  return (
    <PanelShell eyebrow="Overview" title="Control Panel">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Categories" value={menuData.categories.length} />
        <StatCard label="Menu Items" value={menuData.items.length} />
        <StatCard label="Available" value={availableItems} />
        <StatCard label="Admins" value={canManageUsers ? userCount : "Restricted"} />
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-3">
        <ActionPanel
          icon={<Wine className="h-5 w-5" aria-hidden="true" />}
          title="Menu"
          body={`${menuData.menu.title} has ${menuData.items.length} items across ${menuData.categories.length} categories.`}
          action="Open Menu Editor"
          onClick={() => onNavigate("menu")}
        />
        <ActionPanel
          icon={<Palette className="h-5 w-5" aria-hidden="true" />}
          title="Design"
          body={`Current accent is ${settings.theme.gold}. Fonts are ${settings.theme.fontSans} and ${settings.theme.fontSerif}.`}
          action="Edit Brand Style"
          onClick={() => onNavigate("design")}
        />
        <ActionPanel
          icon={<CalendarClock className="h-5 w-5" aria-hidden="true" />}
          title="Hours"
          body={`Sunday is ${formatHourRange(settings.hours.find((hour) => hour.day === "Sunday") ?? settings.hours[0])}.`}
          action="Edit Hours"
          onClick={() => onNavigate("hours")}
        />
      </div>
    </PanelShell>
  );
}

function MenuPanel({
  categories,
  filteredItems,
  itemCountsByCategory,
  query,
  selectedCategory,
  selectedCategoryId,
  selectedItemId,
  editorMode,
  draft,
  isSaving,
  newCategoryName,
  newCategoryDescription,
  categoryDraft,
  onQueryChange,
  onCategorySelect,
  onItemSelect,
  onNewItem,
  onCategorySubmit,
  onCategorySave,
  onCategoryReorder,
  onNewCategoryNameChange,
  onNewCategoryDescriptionChange,
  onCategoryDraftChange,
  onDraftChange,
  onItemSubmit
}: {
  categories: AdminCategory[];
  filteredItems: AdminItem[];
  itemCountsByCategory: Map<string, number>;
  query: string;
  selectedCategory?: AdminCategory;
  selectedCategoryId: string;
  selectedItemId: string;
  editorMode: "edit" | "new";
  draft: ItemDraft | null;
  isSaving: boolean;
  newCategoryName: string;
  newCategoryDescription: string;
  categoryDraft: CategoryDraft | null;
  onQueryChange: (query: string) => void;
  onCategorySelect: (categoryId: string) => void;
  onItemSelect: (item: AdminItem) => void;
  onNewItem: () => void;
  onCategorySubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCategorySave: (event: FormEvent<HTMLFormElement>) => void;
  onCategoryReorder: (draggedCategoryId: string, targetCategoryId: string) => void;
  onNewCategoryNameChange: (name: string) => void;
  onNewCategoryDescriptionChange: (description: string) => void;
  onCategoryDraftChange: (draft: CategoryDraft) => void;
  onDraftChange: (draft: ItemDraft) => void;
  onItemSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const [draggingCategoryId, setDraggingCategoryId] = useState("");

  return (
    <div className="space-y-4">
      <PanelHeader
        eyebrow="Menu"
        title="Menu Manager"
        action={
          <button
            type="button"
            onClick={onNewItem}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-watsons-gold px-4 text-xs font-bold uppercase tracking-[0.16em] text-watsons-dark transition hover:bg-watsons-goldHover"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            New Item
          </button>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)_440px]">
        <section className="admin-scroll rounded-lg border border-watsons-gold/15 bg-watsons-card/70 p-4 xl:max-h-[calc(100dvh-8rem)] xl:overflow-y-auto">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-[0.24em] text-watsons-mist">
              Categories
            </h2>
            <span className="text-xs text-watsons-gold">{categories.length}</span>
          </div>

          <form onSubmit={onCategorySubmit} className="mb-4 rounded-md border border-watsons-cream/10 bg-watsons-dark/45 p-3">
            <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-watsons-gold">
              <FolderPlus className="h-4 w-4" aria-hidden="true" />
              Add Category
            </h3>
            <div className="space-y-3">
              <AdminInput
                label="Name"
                value={newCategoryName}
                onChange={onNewCategoryNameChange}
                required
              />
              <AdminInput
                label="Description"
                value={newCategoryDescription}
                onChange={onNewCategoryDescriptionChange}
              />
              <button
                type="submit"
                disabled={isSaving}
                className="flex h-10 w-full items-center justify-center gap-2 rounded-md bg-watsons-gold text-xs font-bold uppercase tracking-[0.16em] text-watsons-dark transition hover:bg-watsons-goldHover disabled:opacity-45"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                Add
              </button>
            </div>
          </form>

          {categoryDraft ? (
            <form
              onSubmit={onCategorySave}
              className="mb-4 rounded-md border border-watsons-gold/20 bg-watsons-dark/45 p-3"
            >
              <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-watsons-gold">
                Selected Category
              </h3>
              <div className="space-y-3">
                <AdminInput
                  label="Name"
                  value={categoryDraft.name}
                  onChange={(name) => onCategoryDraftChange({ ...categoryDraft, name })}
                  required
                />
                <AdminInput
                  label="Description"
                  value={categoryDraft.description}
                  onChange={(description) =>
                    onCategoryDraftChange({ ...categoryDraft, description })
                  }
                />
                <p className="rounded-md border border-watsons-cream/10 bg-watsons-dark px-3 py-3 text-xs leading-5 text-watsons-mist">
                  Drag categories below to change display order.
                </p>
                <label className="flex items-center gap-3 rounded-md border border-watsons-cream/10 bg-watsons-dark px-3 py-3 text-sm font-bold text-watsons-cream">
                  <input
                    type="checkbox"
                    checked={categoryDraft.isActive}
                    onChange={(event) =>
                      onCategoryDraftChange({
                        ...categoryDraft,
                        isActive: event.target.checked
                      })
                    }
                    className="h-4 w-4 accent-watsons-gold"
                  />
                  Visible on menu
                </label>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex h-10 w-full items-center justify-center gap-2 rounded-md border border-watsons-gold/45 text-xs font-bold uppercase tracking-[0.16em] text-watsons-gold transition hover:bg-watsons-gold hover:text-watsons-dark disabled:opacity-45"
                >
                  <Save className="h-4 w-4" aria-hidden="true" />
                  Save
                </button>
              </div>
            </form>
          ) : null}

          <div className="mb-2 flex items-center justify-between gap-3 text-[10px] font-bold uppercase tracking-[0.18em] text-watsons-mist">
            <span>Drag to reorder</span>
            <span>{isSaving ? "Saving..." : "Saved to menu"}</span>
          </div>

          <div className="grid gap-2">
            {categories.map((category) => (
              <div
                key={category.id}
                draggable={!isSaving}
                onDragStart={(event) => {
                  setDraggingCategoryId(category.id);
                  event.dataTransfer.effectAllowed = "move";
                  event.dataTransfer.setData("text/plain", category.id);
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  const draggedId =
                    event.dataTransfer.getData("text/plain") || draggingCategoryId;

                  setDraggingCategoryId("");
                  onCategoryReorder(draggedId, category.id);
                }}
                onDragEnd={() => setDraggingCategoryId("")}
                className={`group grid grid-cols-[32px_minmax(0,1fr)] items-center gap-2 rounded-md border px-2 py-3 text-left transition ${
                  selectedCategoryId === category.id
                    ? "border-watsons-gold bg-watsons-gold text-watsons-dark"
                    : draggingCategoryId === category.id
                      ? "border-watsons-gold/70 bg-watsons-gold/10 text-watsons-cream opacity-70"
                    : category.isActive
                      ? "border-watsons-cream/10 bg-watsons-dark/60 text-watsons-cream hover:border-watsons-gold/50"
                      : "border-watsons-cream/5 bg-watsons-dark/35 text-watsons-cream/55 hover:border-watsons-gold/30"
                }`}
              >
                <span
                  className={`flex h-8 w-8 cursor-grab items-center justify-center rounded border active:cursor-grabbing ${
                    selectedCategoryId === category.id
                      ? "border-watsons-dark/20 text-watsons-dark/70"
                      : "border-watsons-cream/10 text-watsons-mist group-hover:border-watsons-gold/40 group-hover:text-watsons-gold"
                  }`}
                  aria-hidden="true"
                >
                  <GripVertical className="h-4 w-4" />
                </span>
                <button
                  type="button"
                  onClick={() => onCategorySelect(category.id)}
                  className="min-w-0 text-left"
                >
                  <span className="flex items-center justify-between gap-3">
                    <span className="block truncate text-sm font-bold">
                      {category.name}
                    </span>
                    {!category.isActive ? (
                      <span
                        className={`shrink-0 text-[10px] font-bold uppercase tracking-[0.16em] ${
                          selectedCategoryId === category.id
                            ? "text-watsons-dark/70"
                            : "text-watsons-mist"
                        }`}
                      >
                        Hidden
                      </span>
                    ) : null}
                  </span>
                  <span
                    className={`mt-1 block text-[11px] ${
                      selectedCategoryId === category.id
                        ? "text-watsons-dark/70"
                        : "text-watsons-mist"
                    }`}
                  >
                    {itemCountsByCategory.get(category.id) ?? 0} items
                  </span>
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="admin-scroll rounded-lg border border-watsons-gold/15 bg-watsons-card/70 p-4 xl:max-h-[calc(100dvh-8rem)] xl:overflow-y-auto">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-watsons-gold">
                Items
              </p>
              <h2 className="font-serif text-3xl text-watsons-cream">
                {query.trim() ? "Search Results" : selectedCategory?.name ?? "All Items"}
              </h2>
              <p className="mt-1 text-xs text-watsons-mist">
                {query.trim()
                  ? `${filteredItems.length} matching items across the full menu.`
                  : "Select an item to edit its price, label, description, or availability."}
              </p>
            </div>
            <label className="flex h-11 items-center gap-2 rounded-md border border-watsons-cream/10 bg-watsons-dark px-3 focus-within:border-watsons-gold/70 lg:min-w-72">
              <Search className="h-4 w-4 text-watsons-mist" aria-hidden="true" />
              <input
                value={query}
                onChange={(event) => onQueryChange(event.target.value)}
                className="min-w-0 flex-1 bg-transparent text-sm text-watsons-cream outline-none placeholder:text-watsons-mist/60"
                placeholder="Search items"
              />
            </label>
          </div>

          <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
            {filteredItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onItemSelect(item)}
                className={`rounded-md border p-4 text-left transition ${
                  selectedItemId === item.id
                    ? "border-watsons-gold bg-watsons-gold/10"
                    : "border-watsons-cream/10 bg-watsons-dark/55 hover:border-watsons-gold/50"
                }`}
              >
                <span className="flex items-start justify-between gap-3">
                  <span>
                    <span className="block font-serif text-xl text-watsons-cream">
                      {item.name}
                    </span>
                    <span className="mt-1 block text-[11px] font-bold uppercase tracking-[0.18em] text-watsons-mist">
                      {item.description || "Back Bar"}
                    </span>
                  </span>
                  <span className="shrink-0 text-sm font-bold text-watsons-gold">
                    {formatPricing(item.pricing)}
                  </span>
                </span>
                <span className="mt-3 block text-sm leading-6 text-watsons-cream/78">
                  {item.displayDescription ||
                    "A back-bar pour worth asking the bartender about."}
                </span>
              </button>
            ))}
          </div>
        </section>

        <ItemEditor
          categories={categories}
          draft={draft}
          disabled={isSaving}
          mode={editorMode}
          onDraftChange={onDraftChange}
          onSubmit={onItemSubmit}
        />
      </div>
    </div>
  );
}

function ItemEditor({
  categories,
  draft,
  disabled,
  mode,
  onDraftChange,
  onSubmit
}: {
  categories: AdminCategory[];
  draft: ItemDraft | null;
  disabled: boolean;
  mode: "edit" | "new";
  onDraftChange: (draft: ItemDraft) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  if (!draft) {
    return (
      <section className="rounded-lg border border-watsons-gold/15 bg-watsons-card/70 p-5">
        <h2 className="text-xs font-bold uppercase tracking-[0.24em] text-watsons-mist">
          Edit Item
        </h2>
        <p className="mt-4 text-sm text-watsons-mist">Select an item.</p>
      </section>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="admin-scroll rounded-lg border border-watsons-gold/15 bg-watsons-card/70 p-4 xl:max-h-[calc(100dvh-8rem)] xl:overflow-y-auto"
    >
      <div className="mb-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-watsons-gold">
          {mode === "edit" ? "Edit Item" : "Add Item"}
        </p>
        <h2 className="font-serif text-3xl text-watsons-cream">
          {mode === "edit" ? draft.name || "Selected Item" : "New Pour"}
        </h2>
      </div>

      <div className="space-y-3">
        <label className="block">
          <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.22em] text-watsons-mist">
            Category
          </span>
          <select
            value={draft.categoryId}
            onChange={(event) =>
              onDraftChange({ ...draft, categoryId: event.target.value })
            }
            className="h-11 w-full rounded-md border border-watsons-cream/10 bg-watsons-dark px-3 text-sm font-bold text-watsons-cream outline-none transition focus:border-watsons-gold/70"
            required
          >
            {categories
              .filter((category) => category.isActive)
              .map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
          </select>
        </label>

        <AdminInput
          label="Name"
          value={draft.name}
          onChange={(name) => onDraftChange({ ...draft, name })}
          required
        />

        <AdminInput
          label="Menu Label"
          value={draft.description}
          onChange={(description) => onDraftChange({ ...draft, description })}
          placeholder="Speyside, Back Bar, Glass..."
        />

        <label className="block">
          <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.22em] text-watsons-mist">
            Item Description
          </span>
          <textarea
            value={draft.displayDescription}
            onChange={(event) =>
              onDraftChange({
                ...draft,
                displayDescription: event.target.value
              })
            }
            rows={5}
            className="w-full resize-none rounded-md border border-watsons-cream/10 bg-watsons-dark px-3 py-3 text-sm leading-6 text-watsons-cream outline-none transition placeholder:text-watsons-mist/60 focus:border-watsons-gold/70"
            placeholder="A back-bar pour worth asking the bartender about."
          />
        </label>

        <div className="space-y-2">
          <span className="block text-[10px] font-bold uppercase tracking-[0.22em] text-watsons-mist">
            Price
          </span>
          {draft.pricing.map((price, index) => (
            <div key={`${price.label}-${index}`} className="grid grid-cols-[1fr_120px] gap-2">
              <input
                value={price.label}
                onChange={(event) =>
                  onDraftChange({
                    ...draft,
                    pricing: updatePrice(draft.pricing, index, {
                      label: event.target.value
                    })
                  })
                }
                className="h-11 min-w-0 rounded-md border border-watsons-cream/10 bg-watsons-dark px-3 text-sm text-watsons-cream outline-none transition focus:border-watsons-gold/70"
                placeholder="Regular"
              />
              <label className="flex h-11 items-center rounded-md border border-watsons-cream/10 bg-watsons-dark px-2 focus-within:border-watsons-gold/70">
                <DollarSign className="h-4 w-4 text-watsons-gold" aria-hidden="true" />
                <input
                  value={Number.isFinite(price.amount) ? String(price.amount) : ""}
                  onChange={(event) =>
                    onDraftChange({
                      ...draft,
                      pricing: updatePrice(draft.pricing, index, {
                        amount: Number(event.target.value)
                      })
                    })
                  }
                  type="number"
                  min="0"
                  step="0.01"
                  className="min-w-0 flex-1 bg-transparent text-sm text-watsons-cream outline-none"
                  required
                />
              </label>
            </div>
          ))}
        </div>

        <label className="flex items-center gap-3 rounded-md border border-watsons-cream/10 bg-watsons-dark px-3 py-3 text-sm font-bold text-watsons-cream">
          <input
            type="checkbox"
            checked={draft.isAvailable}
            onChange={(event) =>
              onDraftChange({ ...draft, isAvailable: event.target.checked })
            }
            className="h-4 w-4 accent-watsons-gold"
          />
          Available on public menu
        </label>

        <button
          type="submit"
          disabled={disabled}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-watsons-gold text-xs font-bold uppercase tracking-[0.18em] text-watsons-dark transition hover:bg-watsons-goldHover disabled:opacity-45"
        >
          <Save className="h-4 w-4" aria-hidden="true" />
          {mode === "edit" ? "Save Item" : "Add Item"}
        </button>
      </div>
    </form>
  );
}

function DesignPanel({
  settings,
  isSaving,
  onSettingsChange,
  onSave
}: {
  settings: SiteSettings;
  isSaving: boolean;
  onSettingsChange: (settings: SiteSettings) => void;
  onSave: () => void;
}) {
  return (
    <PanelShell eyebrow="Design" title="Brand Settings">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <section className="rounded-lg border border-watsons-gold/15 bg-watsons-card/70 p-4">
          <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.24em] text-watsons-mist">
            Colors
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {themeFields.map((field) => (
              <label
                key={field.key}
                className="rounded-md border border-watsons-cream/10 bg-watsons-dark/45 p-3"
              >
                <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.18em] text-watsons-mist">
                  {field.label}
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={settings.theme[field.key] as string}
                    onChange={(event) =>
                      onSettingsChange({
                        ...settings,
                        theme: {
                          ...settings.theme,
                          [field.key]: event.target.value
                        }
                      })
                    }
                    className="h-10 w-12 rounded border border-watsons-cream/10 bg-transparent"
                  />
                  <input
                    value={settings.theme[field.key] as string}
                    onChange={(event) =>
                      onSettingsChange({
                        ...settings,
                        theme: {
                          ...settings.theme,
                          [field.key]: event.target.value
                        }
                      })
                    }
                    className="h-10 min-w-0 flex-1 rounded-md border border-watsons-cream/10 bg-watsons-dark px-3 text-sm text-watsons-cream outline-none"
                  />
                </div>
              </label>
            ))}
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <FontSelect
              label="Sans Font"
              value={settings.theme.fontSans}
              options={googleFontOptions}
              onChange={(fontSans) =>
                onSettingsChange({
                  ...settings,
                  theme: { ...settings.theme, fontSans }
                })
              }
            />
            <FontSelect
              label="Serif Font"
              value={settings.theme.fontSerif}
              options={googleFontOptions}
              onChange={(fontSerif) =>
                onSettingsChange({
                  ...settings,
                  theme: { ...settings.theme, fontSerif }
                })
              }
            />
          </div>

          <button
            type="button"
            disabled={isSaving}
            onClick={onSave}
            className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-md bg-watsons-gold px-4 text-xs font-bold uppercase tracking-[0.18em] text-watsons-dark transition hover:bg-watsons-goldHover disabled:opacity-45 sm:w-auto"
          >
            <Save className="h-4 w-4" aria-hidden="true" />
            Save Design
          </button>
        </section>

        <section className="rounded-lg border border-watsons-gold/15 bg-watsons-card/70 p-4">
          <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.24em] text-watsons-mist">
            Preview
          </h2>
          <div className="rounded-lg border border-watsons-gold/25 bg-watsons-dark p-5">
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-watsons-gold">
              Watson's
            </p>
            <h3 className="mt-2 font-serif text-4xl text-watsons-cream">
              Choose the mood.
            </h3>
            <p className="mt-3 text-sm leading-6 text-watsons-mist">
              Menu cards, page backgrounds, buttons, and typography use this palette.
            </p>
            <button
              type="button"
              className="mt-5 h-11 rounded-md bg-watsons-gold px-5 text-xs font-bold uppercase tracking-[0.18em] text-watsons-dark"
            >
              Button Preview
            </button>
          </div>
        </section>
      </div>
    </PanelShell>
  );
}

function HoursPanel({
  hours,
  isSaving,
  onHoursChange,
  onSave
}: {
  hours: SiteHours[];
  isSaving: boolean;
  onHoursChange: (hours: SiteHours[]) => void;
  onSave: () => void;
}) {
  return (
    <PanelShell eyebrow="Hours" title="Business Hours">
      <div className="rounded-lg border border-watsons-gold/15 bg-watsons-card/70 p-4">
        <div className="grid gap-3">
          {hours.map((hour, index) => (
            <div
              key={hour.day}
              className="grid gap-3 rounded-md border border-watsons-cream/10 bg-watsons-dark/45 p-3 md:grid-cols-[1fr_140px_140px_120px_1.2fr]"
            >
              <div>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-watsons-mist">
                  Day
                </span>
                <p className="mt-2 font-bold text-watsons-cream">{hour.day}</p>
              </div>
              <AdminInput
                label="Open"
                value={hour.open}
                onChange={(open) =>
                  onHoursChange(updateHours(hours, index, { open }))
                }
              />
              <AdminInput
                label="Close"
                value={hour.close}
                onChange={(close) =>
                  onHoursChange(updateHours(hours, index, { close }))
                }
              />
              <label className="mt-auto flex h-11 items-center gap-3 rounded-md border border-watsons-cream/10 bg-watsons-dark px-3 text-sm font-bold text-watsons-cream">
                <input
                  type="checkbox"
                  checked={hour.isClosed}
                  onChange={(event) =>
                    onHoursChange(
                      updateHours(hours, index, { isClosed: event.target.checked })
                    )
                  }
                  className="h-4 w-4 accent-watsons-gold"
                />
                Closed
              </label>
              <div className="flex items-end text-sm text-watsons-mist">
                Public display: {formatHourRange(hour)}
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          disabled={isSaving}
          onClick={onSave}
          className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-md bg-watsons-gold px-4 text-xs font-bold uppercase tracking-[0.18em] text-watsons-dark transition hover:bg-watsons-goldHover disabled:opacity-45 sm:w-auto"
        >
          <Save className="h-4 w-4" aria-hidden="true" />
          Save Hours
        </button>
      </div>
    </PanelShell>
  );
}

function AuditPanel({
  logs,
  hasMore,
  isLoading,
  onRefresh,
  onLoadMore
}: {
  logs: AdminAuditLog[];
  hasMore: boolean;
  isLoading: boolean;
  onRefresh: () => void;
  onLoadMore: () => void;
}) {
  return (
    <PanelShell
      eyebrow="Audit"
      title="Audit Trail"
      action={
        <button
          type="button"
          onClick={onRefresh}
          disabled={isLoading}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-watsons-gold/45 px-4 text-xs font-bold uppercase tracking-[0.16em] text-watsons-gold transition hover:bg-watsons-gold hover:text-watsons-dark"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Refresh
        </button>
      }
    >
      <div className="grid gap-3">
        {logs.length ? (
          logs.map((log) => (
            <article
              key={log.id}
              className="rounded-lg border border-watsons-gold/15 bg-watsons-card/70 p-4"
            >
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-watsons-gold">
                    {formatAuditAction(log.action)} {log.resourceType}
                  </p>
                  <h2 className="mt-1 font-serif text-2xl text-watsons-cream">
                    {log.resourceName || log.resourceId || "Record"}
                  </h2>
                  <p className="mt-2 text-sm text-watsons-mist">
                    {log.actorName || log.actorEmail} ({log.actorRole}) -{" "}
                    {formatAuditDate(log.createdAt)}
                  </p>
                </div>
                <span className="w-fit rounded-full border border-watsons-cream/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-watsons-mist">
                  {log.actorEmail}
                </span>
              </div>

              <div className="mt-4 grid gap-2">
                {log.changes.length ? (
                  log.changes.map((change) => (
                    <div
                      key={`${log.id}-${change.field}`}
                      className="grid gap-2 rounded-md border border-watsons-cream/10 bg-watsons-dark/45 p-3 lg:grid-cols-[180px_1fr_1fr]"
                    >
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-watsons-mist">
                          Field
                        </p>
                        <p className="mt-1 break-words text-sm font-bold text-watsons-cream">
                          {change.field}
                        </p>
                      </div>
                      <AuditValue label="Before" value={change.before} />
                      <AuditValue label="After" value={change.after} />
                    </div>
                  ))
                ) : (
                  <p className="rounded-md border border-watsons-cream/10 bg-watsons-dark/45 p-3 text-sm text-watsons-mist">
                    No field values changed.
                  </p>
                )}
              </div>
            </article>
          ))
        ) : isLoading ? (
          <div className="rounded-lg border border-watsons-gold/15 bg-watsons-card/70 p-5">
            <p className="text-sm text-watsons-mist">Loading audit entries.</p>
          </div>
        ) : (
          <div className="rounded-lg border border-watsons-gold/15 bg-watsons-card/70 p-5">
            <p className="text-sm text-watsons-mist">No audit entries yet.</p>
          </div>
        )}

        {logs.length ? (
          <div className="flex justify-center pt-2">
            {hasMore ? (
              <button
                type="button"
                onClick={onLoadMore}
                disabled={isLoading}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-watsons-gold/45 px-5 text-xs font-bold uppercase tracking-[0.16em] text-watsons-gold transition hover:bg-watsons-gold hover:text-watsons-dark disabled:opacity-45"
              >
                <RefreshCw
                  className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
                  aria-hidden="true"
                />
                {isLoading ? "Loading" : "Load More"}
              </button>
            ) : (
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-watsons-mist">
                End of audit trail
              </p>
            )}
          </div>
        ) : null}
      </div>
    </PanelShell>
  );
}

function AuditValue({ label, value }: { label: string; value: unknown }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-watsons-mist">
        {label}
      </p>
      <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-watsons-cream">
        {formatAuditValue(value)}
      </p>
    </div>
  );
}

function UsersPanel({
  currentUser,
  users,
  isSaving,
  onUsersChange,
  onSavingChange,
  onStatus,
  onError,
  onAuditRefresh
}: {
  currentUser: AdminUser;
  users: AdminUserRecord[];
  isSaving: boolean;
  onUsersChange: (users: AdminUserRecord[]) => void;
  onSavingChange: (isSaving: boolean) => void;
  onStatus: (status: string) => void;
  onError: (error: string) => void;
  onAuditRefresh: () => void;
}) {
  const [newUser, setNewUser] = useState({
    email: "",
    name: "",
    role: "editor" as AdminRole,
    accessLevel: 50
  });

  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSavingChange(true);
    onError("");
    onStatus("");

    try {
      const createdUser = await adminFetch<AdminUserRecord>("/admin/users", {
        method: "POST",
        body: JSON.stringify({
          ...newUser,
          isActive: true
        })
      });

      onUsersChange([createdUser, ...users]);
      setNewUser({ email: "", name: "", role: "editor", accessLevel: 50 });
      onStatus("User added.");
      onAuditRefresh();
    } catch (caughtError) {
      onError(getErrorMessage(caughtError));
    } finally {
      onSavingChange(false);
    }
  }

  async function saveUser(user: AdminUserRecord) {
    onSavingChange(true);
    onError("");
    onStatus("");

    try {
      const updatedUser = await adminFetch<AdminUserRecord>(`/admin/users/${user.id}`, {
        method: "PATCH",
        body: JSON.stringify(user)
      });

      onUsersChange(
        users.map((existingUser) =>
          existingUser.id === updatedUser.id ? updatedUser : existingUser
        )
      );
      onStatus("User saved.");
      onAuditRefresh();
    } catch (caughtError) {
      onError(getErrorMessage(caughtError));
    } finally {
      onSavingChange(false);
    }
  }

  async function deleteUser(user: AdminUserRecord) {
    if (!window.confirm(`Remove admin access for ${user.email}?`)) {
      return;
    }

    onSavingChange(true);
    onError("");
    onStatus("");

    try {
      const updatedUser = await adminFetch<AdminUserRecord>(`/admin/users/${user.id}`, {
        method: "DELETE"
      });

      onUsersChange(
        users.map((existingUser) =>
          existingUser.id === updatedUser.id ? updatedUser : existingUser
        )
      );
      onStatus("User disabled.");
      onAuditRefresh();
    } catch (caughtError) {
      onError(getErrorMessage(caughtError));
    } finally {
      onSavingChange(false);
    }
  }

  function updateUserDraft(userId: string, patch: Partial<AdminUserRecord>) {
    onUsersChange(
      users.map((user) =>
        user.id === userId
          ? {
              ...user,
              ...patch
            }
          : user
      )
    );
  }

  return (
    <PanelShell eyebrow="Access" title="Admin Users">
      <form
        onSubmit={createUser}
        className="grid gap-3 rounded-lg border border-watsons-gold/15 bg-watsons-card/70 p-4 lg:grid-cols-[1.2fr_1fr_180px_130px]"
      >
        <AdminInput
          label="Email"
          value={newUser.email}
          onChange={(email) => setNewUser((draft) => ({ ...draft, email }))}
          required
        />
        <AdminInput
          label="Name"
          value={newUser.name}
          onChange={(name) => setNewUser((draft) => ({ ...draft, name }))}
        />
        <RoleSelect
          value={newUser.role}
          onChange={(role) =>
            setNewUser((draft) => ({
              ...draft,
              role,
              accessLevel: getRoleAccessLevel(role)
            }))
          }
        />
        <button
          type="submit"
          disabled={isSaving}
          className="mt-auto flex h-11 items-center justify-center gap-2 rounded-md bg-watsons-gold px-3 text-xs font-bold uppercase tracking-[0.16em] text-watsons-dark transition hover:bg-watsons-goldHover disabled:opacity-45"
        >
          <UserPlus className="h-4 w-4" aria-hidden="true" />
          Add
        </button>
      </form>

      <div className="mt-4 grid gap-3">
        {users.map((user) => (
          <div
            key={user.id}
            className={`grid gap-3 rounded-lg border p-4 lg:grid-cols-[1.2fr_1fr_180px_130px_132px] ${
              user.isActive
                ? "border-watsons-cream/10 bg-watsons-card/70"
                : "border-watsons-cream/5 bg-watsons-card/35 opacity-60"
            }`}
          >
            <AdminInput
              label="Email"
              value={user.email}
              onChange={(email) => updateUserDraft(user.id, { email })}
              required
            />
            <AdminInput
              label="Name"
              value={user.name}
              onChange={(name) => updateUserDraft(user.id, { name })}
            />
            <RoleSelect
              value={user.role}
              onChange={(role) =>
                updateUserDraft(user.id, {
                  role,
                  accessLevel: getRoleAccessLevel(role)
                })
              }
            />
            <label className="mt-auto flex h-11 items-center gap-3 rounded-md border border-watsons-cream/10 bg-watsons-dark px-3 text-sm font-bold text-watsons-cream">
              <input
                type="checkbox"
                checked={user.isActive}
                onChange={(event) =>
                  updateUserDraft(user.id, { isActive: event.target.checked })
                }
                className="h-4 w-4 accent-watsons-gold"
              />
              Active
            </label>
            <div className="grid grid-cols-2 gap-2 lg:mt-auto">
              <button
                type="button"
                onClick={() => void saveUser(user)}
                disabled={isSaving}
                className="flex h-11 items-center justify-center gap-2 rounded-md bg-watsons-gold px-3 text-xs font-bold uppercase tracking-[0.14em] text-watsons-dark transition hover:bg-watsons-goldHover disabled:opacity-45"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => void deleteUser(user)}
                disabled={isSaving || user.id === currentUser.id}
                className="flex h-11 items-center justify-center rounded-md border border-red-300/30 px-3 text-xs font-bold uppercase tracking-[0.14em] text-red-100 transition hover:bg-red-950/30 disabled:opacity-35"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </PanelShell>
  );
}

function PanelShell({
  eyebrow,
  title,
  action,
  children
}: {
  eyebrow: string;
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section>
      <PanelHeader eyebrow={eyebrow} title={title} action={action} />
      <div className="mt-4">{children}</div>
    </section>
  );
}

function PanelHeader({
  eyebrow,
  title,
  action
}: {
  eyebrow: string;
  title: string;
  action?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-3 rounded-lg border border-watsons-gold/15 bg-watsons-card/75 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-watsons-gold">
          {eyebrow}
        </p>
        <h1 className="mt-1 font-serif text-3xl text-watsons-cream sm:text-4xl">
          {title}
        </h1>
      </div>
      {action}
    </header>
  );
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-watsons-gold/15 bg-watsons-card/70 p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-watsons-mist">
        {label}
      </p>
      <p className="mt-3 font-serif text-4xl text-watsons-cream">{value}</p>
    </div>
  );
}

function ActionPanel({
  icon,
  title,
  body,
  action,
  onClick
}: {
  icon: ReactNode;
  title: string;
  body: string;
  action: string;
  onClick: () => void;
}) {
  return (
    <div className="rounded-lg border border-watsons-gold/15 bg-watsons-card/70 p-4">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-watsons-gold text-watsons-dark">
        {icon}
      </div>
      <h2 className="font-serif text-2xl text-watsons-cream">{title}</h2>
      <p className="mt-2 min-h-16 text-sm leading-6 text-watsons-mist">{body}</p>
      <button
        type="button"
        onClick={onClick}
        className="mt-4 h-10 rounded-md border border-watsons-gold/40 px-4 text-xs font-bold uppercase tracking-[0.16em] text-watsons-gold transition hover:bg-watsons-gold hover:text-watsons-dark"
      >
        {action}
      </button>
    </div>
  );
}

function AdminInput({
  label,
  value,
  onChange,
  placeholder,
  required
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.22em] text-watsons-mist">
        {label}
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-md border border-watsons-cream/10 bg-watsons-dark px-3 text-sm text-watsons-cream outline-none transition placeholder:text-watsons-mist/60 focus:border-watsons-gold/70"
        placeholder={placeholder}
        required={required}
      />
    </label>
  );
}

function FontSelect({
  label,
  value,
  options,
  onChange
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const search = query.trim().toLowerCase();
  const filteredOptions = (search
    ? options.filter((option) => option.toLowerCase().includes(search))
    : options
  ).slice(0, 36);
  const customFont = query.trim();
  const hasExactMatch = options.some(
    (option) => option.toLowerCase() === customFont.toLowerCase()
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (
        containerRef.current &&
        event.target instanceof Node &&
        !containerRef.current.contains(event.target)
      ) {
        setIsOpen(false);
        setQuery("");
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);

    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative">
      <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.22em] text-watsons-mist">
        {label}
      </span>
      <div className="relative">
        <input
          value={value}
          onClick={() => {
            setQuery("");
            setIsOpen(true);
          }}
          onFocus={(event) => {
            event.currentTarget.select();
            setQuery("");
            setIsOpen(true);
          }}
          onChange={(event) => {
            const nextValue = event.target.value;

            onChange(nextValue);
            setQuery(nextValue);
            setIsOpen(true);
          }}
          className="h-11 w-full rounded-md border border-watsons-cream/10 bg-watsons-dark px-3 pr-10 text-sm font-bold text-watsons-cream outline-none transition focus:border-watsons-gold/70"
          placeholder="Search or type any Google Font"
        />
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            setQuery("");
            setIsOpen((current) => !current);
          }}
          className="absolute right-1 top-1 inline-flex h-9 w-9 items-center justify-center rounded text-watsons-mist transition hover:bg-watsons-gold/10 hover:text-watsons-gold"
          aria-label={`Open ${label} options`}
        >
          <ChevronDown
            className={`h-4 w-4 transition ${isOpen ? "rotate-180" : ""}`}
            aria-hidden="true"
          />
        </button>
      </div>

      {isOpen ? (
        <div className="admin-scroll absolute left-0 right-0 top-[calc(100%+6px)] z-30 max-h-72 overflow-y-auto rounded-md border border-watsons-gold/35 bg-watsons-card p-1 shadow-2xl">
          <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-watsons-mist">
            {search ? "Matching fonts" : "Popular Google fonts"}
          </p>

          {customFont && !hasExactMatch ? (
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                onChange(customFont);
                setIsOpen(false);
                setQuery("");
              }}
              className="mb-1 flex w-full items-center justify-between rounded px-3 py-2 text-left text-sm font-bold text-watsons-gold transition hover:bg-watsons-gold hover:text-watsons-dark"
            >
              Use "{customFont}"
            </button>
          ) : null}

          {filteredOptions.length ? (
            filteredOptions.map((option) => (
              <button
                key={option}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onChange(option);
                  setIsOpen(false);
                  setQuery("");
                }}
                className={`flex w-full items-center justify-between rounded px-3 py-2 text-left text-sm font-bold transition ${
                  option === value
                    ? "bg-watsons-gold text-watsons-dark"
                    : "text-watsons-cream hover:bg-watsons-gold/15 hover:text-watsons-gold"
                }`}
                style={{ fontFamily: `"${option}", sans-serif` }}
              >
                {option}
              </button>
            ))
          ) : (
            <p className="px-3 py-2 text-sm text-watsons-mist">
              Type a Google Font family name.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}

function RoleSelect({
  value,
  onChange
}: {
  value: AdminRole;
  onChange: (value: AdminRole) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.22em] text-watsons-mist">
        Role
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as AdminRole)}
        className="h-11 w-full rounded-md border border-watsons-cream/10 bg-watsons-dark px-3 text-sm font-bold text-watsons-cream outline-none transition focus:border-watsons-gold/70"
      >
        {roleOptions.map((role) => (
          <option key={role.value} value={role.value}>
            {role.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function AdminFrame({
  children,
  centered
}: {
  children: ReactNode;
  centered?: boolean;
}) {
  return (
    <div className="min-h-dvh bg-watsons-dark text-watsons-cream selection:bg-watsons-gold selection:text-watsons-dark">
      <main
        className={`relative z-10 min-h-dvh ${
          centered ? "flex items-center justify-center px-4 py-8" : ""
        }`}
      >
        {children}
      </main>
    </div>
  );
}

function StatusMessage({
  error,
  status
}: {
  error: string;
  status: string;
}) {
  if (!error && !status) {
    return null;
  }

  return (
    <p
      role="status"
      className={`mb-4 rounded-md border px-4 py-3 text-sm ${
        error
          ? "border-red-400/30 bg-red-950/30 text-red-100"
          : "border-watsons-gold/25 bg-watsons-gold/10 text-watsons-gold"
      }`}
    >
      {error || status}
    </p>
  );
}

function getPanelItems(user: AdminUser) {
  return [
    { id: "overview" as const, label: "Overview", icon: LayoutDashboard },
    { id: "menu" as const, label: "Menu", icon: Wine },
    { id: "design" as const, label: "Design", icon: Palette },
    { id: "hours" as const, label: "Hours", icon: CalendarClock },
    ...(user.permissions.canManageUsers
      ? [{ id: "users" as const, label: "Users", icon: Users }]
      : []),
    ...(user.permissions.canViewAuditTrail
      ? [{ id: "audit" as const, label: "Audit", icon: History }]
      : [])
  ];
}

function createEmptyItemDraft(categoryId: string): ItemDraft {
  return {
    categoryId,
    name: "",
    description: "",
    displayDescription: "",
    pricing: [{ ...emptyPricing }],
    isAvailable: true,
    isFeatured: false
  };
}

function createItemDraft(item: AdminItem): ItemDraft {
  return {
    categoryId: item.categoryId,
    name: item.name,
    description: item.description,
    displayDescription: item.displayDescription,
    pricing: item.pricing.length ? item.pricing : [{ ...emptyPricing }],
    isAvailable: item.isAvailable,
    isFeatured: item.isFeatured
  };
}

function createCategoryDraft(category: AdminCategory): CategoryDraft {
  return {
    name: category.name,
    description: category.description,
    sortOrder: category.sortOrder,
    isActive: category.isActive
  };
}

function updatePrice(
  pricing: AdminPricing[],
  index: number,
  patch: Partial<AdminPricing>
) {
  return pricing.map((price, currentIndex) =>
    currentIndex === index ? { ...price, ...patch } : price
  );
}

function updateHours(hours: SiteHours[], index: number, patch: Partial<SiteHours>) {
  return hours.map((hour, currentIndex) =>
    currentIndex === index ? { ...hour, ...patch } : hour
  );
}

function getCategoryCounts(items: AdminItem[]) {
  return items.reduce((counts, item) => {
    counts.set(item.categoryId, (counts.get(item.categoryId) ?? 0) + 1);

    return counts;
  }, new Map<string, number>());
}

function getRoleAccessLevel(role: AdminRole) {
  return roleOptions.find((option) => option.value === role)?.accessLevel ?? 50;
}

function formatPricing(pricing: AdminPricing[]) {
  if (!pricing.length) {
    return "$0";
  }

  return pricing
    .map((price) => `$${formatAmount(price.amount)}`)
    .join(" / ");
}

function formatAmount(amount: number) {
  return Number.isInteger(amount) ? amount.toString() : amount.toFixed(2);
}

function formatAuditAction(action: string) {
  return action.charAt(0).toUpperCase() + action.slice(1);
}

function formatAuditDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function formatAuditValue(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return "Empty";
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (typeof value === "number" || typeof value === "string") {
    return String(value);
  }

  return JSON.stringify(value, null, 2);
}

async function adminFetch<T = unknown>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const headers = new Headers(init.headers);

  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const requestInit = {
    ...init,
    headers,
    credentials: "include"
  } satisfies RequestInit;
  const primaryUrl = `${apiBaseUrl}${path}`;
  let response = await fetch(primaryUrl, requestInit);
  let payload = await readApiPayload(response);

  if (
    !response.ok &&
    response.status === 404 &&
    payload?.message === "API route not found." &&
    path.startsWith("/admin/")
  ) {
    const fallbackUrl = `/api${path}`;

    if (fallbackUrl !== primaryUrl) {
      response = await fetch(fallbackUrl, requestInit);
      payload = await readApiPayload(response);
    }
  }

  if (!response.ok) {
    throw new Error(payload?.message ?? "Request failed.");
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return payload as T;
}

async function readApiPayload(response: Response) {
  if (response.status === 204) {
    return null;
  }

  return response.json().catch(() => null) as Promise<{ message?: string } | null>;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong.";
}
