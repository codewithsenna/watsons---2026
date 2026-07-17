import {
  CheckCircle2,
  Clock3,
  DollarSign,
  FolderPlus,
  LogOut,
  Mail,
  Plus,
  RefreshCw,
  Save,
  Search,
  ShieldCheck
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode
} from "react";

const apiBaseUrl = (import.meta.env.VITE_PUBLIC_API_BASE_URL ?? "/api").replace(/\/$/, "");

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

type AdminRole = "owner" | "manager" | "editor" | "viewer";

type AdminPermissions = {
  canManageMenu: boolean;
  canManageUsers: boolean;
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

type ItemDraft = {
  categoryId: string;
  name: string;
  description: string;
  displayDescription: string;
  pricing: AdminPricing[];
  isAvailable: boolean;
  isFeatured: boolean;
};

const emptyPricing: AdminPricing = {
  label: "Regular",
  amount: 0,
  currency: "CAD"
};

const roleOptions: Array<{ value: AdminRole; label: string; accessLevel: number }> = [
  { value: "owner", label: "Owner", accessLevel: 100 },
  { value: "manager", label: "Manager", accessLevel: 70 },
  { value: "editor", label: "Editor", accessLevel: 50 },
  { value: "viewer", label: "Viewer", accessLevel: 10 }
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
      <AdminFrame>
        <div className="flex min-h-[60dvh] items-center justify-center text-sm font-bold uppercase tracking-[0.24em] text-watsons-mist">
          Checking Session
        </div>
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
      <MenuAdmin user={user} onSignedOut={() => setUser(null)} />
    </AdminFrame>
  );
}

function OtpSignIn({ onSignedIn }: { onSignedIn: (user: AdminUser) => void }) {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const remainingSeconds = expiresAt
    ? Math.max(0, Math.ceil((expiresAt - now) / 1000))
    : 0;
  const hasCodeRequest = expiresAt !== null;

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
    <section className="w-full max-w-md rounded-lg border border-watsons-gold/25 bg-watsons-card/90 p-6 shadow-2xl shadow-black/40 backdrop-blur">
      <div className="mb-7 flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-watsons-gold text-watsons-dark">
          <ShieldCheck className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-watsons-mist">
            Admin
          </p>
          <h1 className="font-serif text-3xl text-watsons-cream">
            Watson's
          </h1>
        </div>
      </div>

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
              className="h-12 min-w-0 flex-1 bg-transparent text-sm text-watsons-cream outline-none placeholder:text-watsons-mist/60"
              placeholder="name@example.com"
              required
            />
          </span>
        </label>

        <button
          type="submit"
          disabled={isSubmitting || (hasCodeRequest && remainingSeconds > 0)}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-watsons-gold px-4 text-xs font-bold uppercase tracking-[0.2em] text-watsons-dark transition hover:bg-watsons-goldHover disabled:cursor-not-allowed disabled:opacity-45"
        >
          {hasCodeRequest && remainingSeconds > 0 ? (
            <>
              <Clock3 className="h-4 w-4" aria-hidden="true" />
              {remainingSeconds}s
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

function MenuAdmin({
  user,
  onSignedOut
}: {
  user: AdminUser;
  onSignedOut: () => void;
}) {
  const [data, setData] = useState<AdminMenuResponse | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedItemId, setSelectedItemId] = useState("");
  const [query, setQuery] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryDescription, setNewCategoryDescription] = useState("");
  const [newItemDraft, setNewItemDraft] = useState<ItemDraft>(() =>
    createEmptyItemDraft("")
  );
  const [itemDraft, setItemDraft] = useState<ItemDraft | null>(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadMenu();
  }, []);

  useEffect(() => {
    if (!data || selectedCategoryId) {
      return;
    }

    const firstCategory = data.categories.find((category) => category.isActive);

    if (firstCategory) {
      setSelectedCategoryId(firstCategory.id);
      setNewItemDraft((draft) => ({ ...draft, categoryId: firstCategory.id }));
    }
  }, [data, selectedCategoryId]);

  const selectedItem = useMemo(
    () => data?.items.find((item) => item.id === selectedItemId) ?? null,
    [data?.items, selectedItemId]
  );

  useEffect(() => {
    setItemDraft(selectedItem ? createItemDraft(selectedItem) : null);
  }, [selectedItem]);

  const filteredItems = useMemo(() => {
    const search = query.trim().toLowerCase();

    return (data?.items ?? []).filter((item) => {
      const categoryMatch = selectedCategoryId
        ? item.categoryId === selectedCategoryId
        : true;
      const searchMatch = search
        ? [
            item.name,
            item.description,
            item.displayDescription,
            formatPricing(item.pricing)
          ]
            .join(" ")
            .toLowerCase()
            .includes(search)
        : true;

      return categoryMatch && searchMatch;
    });
  }, [data?.items, query, selectedCategoryId]);

  async function loadMenu() {
    setError("");

    try {
      const result = await adminFetch<AdminMenuResponse>("/admin/menu", {
        method: "GET"
      });

      setData(result);
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    }
  }

  async function signOut() {
    await adminFetch("/admin/auth/sign-out", { method: "POST" }).catch(() => null);
    onSignedOut();
  }

  async function createCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError("");
    setStatus("");

    try {
      const category = await adminFetch<AdminCategory>("/admin/categories", {
        method: "POST",
        body: JSON.stringify({
          name: newCategoryName,
          description: newCategoryDescription
        })
      });

      setData((current) =>
        current
          ? { ...current, categories: [...current.categories, category] }
          : current
      );
      setSelectedCategoryId(category.id);
      setNewItemDraft((draft) => ({ ...draft, categoryId: category.id }));
      setNewCategoryName("");
      setNewCategoryDescription("");
      setStatus("Category added.");
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    } finally {
      setIsSaving(false);
    }
  }

  async function createItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError("");
    setStatus("");

    try {
      const item = await adminFetch<AdminItem>("/admin/items", {
        method: "POST",
        body: JSON.stringify(newItemDraft)
      });

      setData((current) =>
        current ? { ...current, items: [...current.items, item] } : current
      );
      setSelectedCategoryId(item.categoryId);
      setSelectedItemId(item.id);
      setNewItemDraft(createEmptyItemDraft(item.categoryId));
      setStatus("Item added.");
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    } finally {
      setIsSaving(false);
    }
  }

  async function saveSelectedItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedItem || !itemDraft) {
      return;
    }

    setIsSaving(true);
    setError("");
    setStatus("");

    try {
      const item = await adminFetch<AdminItem>(`/admin/items/${selectedItem.id}`, {
        method: "PATCH",
        body: JSON.stringify(itemDraft)
      });

      setData((current) =>
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
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    } finally {
      setIsSaving(false);
    }
  }

  if (!data) {
    return (
      <div className="flex min-h-[60dvh] items-center justify-center text-sm font-bold uppercase tracking-[0.24em] text-watsons-mist">
        Loading Menu
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 rounded-lg border border-watsons-gold/15 bg-watsons-card/75 p-4 shadow-2xl shadow-black/30 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-watsons-gold">
            Watson's Admin
          </p>
          <h1 className="mt-1 font-serif text-3xl text-watsons-cream sm:text-4xl">
            {data.menu.title}
          </h1>
          <p className="mt-1 text-xs text-watsons-mist">{user.email}</p>
        </div>

        <button
          type="button"
          onClick={signOut}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-watsons-cream/10 px-4 text-xs font-bold uppercase tracking-[0.18em] text-watsons-cream transition hover:border-watsons-gold/60 hover:text-watsons-gold"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Sign Out
        </button>
      </header>

      <StatusMessage error={error} status={status} />

      <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)_380px]">
        <aside className="rounded-lg border border-watsons-gold/15 bg-watsons-card/70 p-4 lg:max-h-[calc(100dvh-2.5rem)] lg:overflow-y-auto">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-[0.28em] text-watsons-mist">
              Categories
            </h2>
            <span className="text-xs text-watsons-gold">
              {data.categories.length}
            </span>
          </div>

          <div className="grid gap-2">
            {data.categories.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => {
                  setSelectedCategoryId(category.id);
                  setNewItemDraft((draft) => ({
                    ...draft,
                    categoryId: category.id
                  }));
                }}
                className={`rounded-md border px-3 py-3 text-left transition ${
                  selectedCategoryId === category.id
                    ? "border-watsons-gold bg-watsons-gold text-watsons-dark"
                    : "border-watsons-cream/10 bg-watsons-dark/60 text-watsons-cream hover:border-watsons-gold/50"
                }`}
              >
                <span className="block text-sm font-bold">{category.name}</span>
                <span
                  className={`mt-1 block text-[11px] ${
                    selectedCategoryId === category.id
                      ? "text-watsons-dark/70"
                      : "text-watsons-mist"
                  }`}
                >
                  {countItemsByCategory(data.items, category.id)} items
                </span>
              </button>
            ))}
          </div>

          <form onSubmit={createCategory} className="mt-5 space-y-3 border-t border-watsons-cream/10 pt-5">
            <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] text-watsons-gold">
              <FolderPlus className="h-4 w-4" aria-hidden="true" />
              Add Category
            </h3>
            <AdminInput
              label="Name"
              value={newCategoryName}
              onChange={setNewCategoryName}
              required
            />
            <AdminInput
              label="Description"
              value={newCategoryDescription}
              onChange={setNewCategoryDescription}
            />
            <button
              type="submit"
              disabled={isSaving}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-md bg-watsons-gold text-xs font-bold uppercase tracking-[0.18em] text-watsons-dark transition hover:bg-watsons-goldHover disabled:opacity-45"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add
            </button>
          </form>
        </aside>

        <section className="rounded-lg border border-watsons-gold/15 bg-watsons-card/70 p-4 lg:max-h-[calc(100dvh-2.5rem)] lg:overflow-y-auto">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-watsons-gold">
                Items
              </p>
              <h2 className="font-serif text-3xl text-watsons-cream">
                {getCategoryName(data.categories, selectedCategoryId) || "All"}
              </h2>
            </div>
            <label className="flex h-11 items-center gap-2 rounded-md border border-watsons-cream/10 bg-watsons-dark px-3 focus-within:border-watsons-gold/70 sm:min-w-64">
              <Search className="h-4 w-4 text-watsons-mist" aria-hidden="true" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="min-w-0 flex-1 bg-transparent text-sm text-watsons-cream outline-none placeholder:text-watsons-mist/60"
                placeholder="Search items"
              />
            </label>
          </div>

          <div className="grid gap-3">
            {filteredItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedItemId(item.id)}
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
                  {item.displayDescription || "A back-bar pour worth asking the bartender about."}
                </span>
              </button>
            ))}
          </div>
        </section>

        <aside className="space-y-5 lg:max-h-[calc(100dvh-2.5rem)] lg:overflow-y-auto">
          <ItemEditor
            categories={data.categories}
            draft={itemDraft}
            disabled={isSaving}
            title="Edit Item"
            submitLabel="Save Item"
            onDraftChange={setItemDraft}
            onSubmit={saveSelectedItem}
          />

          <ItemEditor
            categories={data.categories}
            draft={newItemDraft}
            disabled={isSaving}
            title="Add Item"
            submitLabel="Add Item"
            onDraftChange={setNewItemDraft}
            onSubmit={createItem}
          />
        </aside>
      </div>

      {user.permissions.canManageUsers ? <UserAdminPanel currentUser={user} /> : null}
    </div>
  );
}

function UserAdminPanel({ currentUser }: { currentUser: AdminUser }) {
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [newUser, setNewUser] = useState({
    email: "",
    name: "",
    role: "editor" as AdminRole,
    accessLevel: 50
  });
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    setError("");

    try {
      const result = await adminFetch<{ users: AdminUserRecord[] }>("/admin/users", {
        method: "GET"
      });

      setUsers(result.users);
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    }
  }

  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError("");
    setStatus("");

    try {
      const createdUser = await adminFetch<AdminUserRecord>("/admin/users", {
        method: "POST",
        body: JSON.stringify({
          ...newUser,
          isActive: true
        })
      });

      setUsers((current) => [createdUser, ...current]);
      setNewUser({ email: "", name: "", role: "editor", accessLevel: 50 });
      setStatus("User added.");
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    } finally {
      setIsSaving(false);
    }
  }

  async function saveUser(user: AdminUserRecord) {
    setIsSaving(true);
    setError("");
    setStatus("");

    try {
      const updatedUser = await adminFetch<AdminUserRecord>(`/admin/users/${user.id}`, {
        method: "PATCH",
        body: JSON.stringify(user)
      });

      setUsers((current) =>
        current.map((existingUser) =>
          existingUser.id === updatedUser.id ? updatedUser : existingUser
        )
      );
      setStatus("User saved.");
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteUser(user: AdminUserRecord) {
    if (!window.confirm(`Remove admin access for ${user.email}?`)) {
      return;
    }

    setIsSaving(true);
    setError("");
    setStatus("");

    try {
      const updatedUser = await adminFetch<AdminUserRecord>(`/admin/users/${user.id}`, {
        method: "DELETE"
      });

      setUsers((current) =>
        current.map((existingUser) =>
          existingUser.id === updatedUser.id ? updatedUser : existingUser
        )
      );
      setStatus("User disabled.");
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="rounded-lg border border-watsons-gold/15 bg-watsons-card/70 p-4 sm:p-5">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-watsons-gold">
            Access
          </p>
          <h2 className="font-serif text-3xl text-watsons-cream">
            Admin Users
          </h2>
        </div>
        <span className="text-xs text-watsons-mist">
          Signed in as {currentUser.email}
        </span>
      </div>

      <StatusMessage error={error} status={status} />

      <form
        onSubmit={createUser}
        className="mt-4 grid gap-3 rounded-md border border-watsons-cream/10 bg-watsons-dark/45 p-3 lg:grid-cols-[1.2fr_1fr_160px_120px_120px]"
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
        <AccessInput
          value={newUser.accessLevel}
          onChange={(accessLevel) =>
            setNewUser((draft) => ({ ...draft, accessLevel }))
          }
        />
        <button
          type="submit"
          disabled={isSaving}
          className="mt-auto flex h-11 items-center justify-center gap-2 rounded-md bg-watsons-gold px-3 text-xs font-bold uppercase tracking-[0.16em] text-watsons-dark transition hover:bg-watsons-goldHover disabled:opacity-45"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add
        </button>
      </form>

      <div className="mt-4 grid gap-3">
        {users.map((user) => (
          <div
            key={user.id}
            className={`grid gap-3 rounded-md border p-3 lg:grid-cols-[1.2fr_1fr_160px_120px_120px_120px] ${
              user.isActive
                ? "border-watsons-cream/10 bg-watsons-dark/45"
                : "border-watsons-cream/5 bg-watsons-dark/20 opacity-60"
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
            <AccessInput
              value={user.accessLevel}
              onChange={(accessLevel) => updateUserDraft(user.id, { accessLevel })}
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
                onClick={() => saveUser(user)}
                disabled={isSaving}
                className="flex h-11 items-center justify-center gap-2 rounded-md bg-watsons-gold px-3 text-xs font-bold uppercase tracking-[0.14em] text-watsons-dark transition hover:bg-watsons-goldHover disabled:opacity-45"
              >
                <Save className="h-4 w-4" aria-hidden="true" />
                Save
              </button>
              <button
                type="button"
                onClick={() => deleteUser(user)}
                disabled={isSaving || user.id === currentUser.id}
                className="flex h-11 items-center justify-center rounded-md border border-red-300/30 px-3 text-xs font-bold uppercase tracking-[0.14em] text-red-100 transition hover:bg-red-950/30 disabled:opacity-35"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );

  function updateUserDraft(userId: string, patch: Partial<AdminUserRecord>) {
    setUsers((current) =>
      current.map((user) =>
        user.id === userId
          ? {
              ...user,
              ...patch
            }
          : user
      )
    );
  }
}

function ItemEditor({
  categories,
  draft,
  disabled,
  title,
  submitLabel,
  onDraftChange,
  onSubmit
}: {
  categories: AdminCategory[];
  draft: ItemDraft | null;
  disabled: boolean;
  title: string;
  submitLabel: string;
  onDraftChange: (draft: ItemDraft) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  if (!draft) {
    return (
      <section className="rounded-lg border border-watsons-gold/15 bg-watsons-card/70 p-4">
        <h2 className="text-xs font-bold uppercase tracking-[0.28em] text-watsons-mist">
          {title}
        </h2>
        <p className="mt-4 text-sm text-watsons-mist">Select an item.</p>
      </section>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-lg border border-watsons-gold/15 bg-watsons-card/70 p-4"
    >
      <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.28em] text-watsons-mist">
        {title}
      </h2>

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
            rows={4}
            className="w-full resize-none rounded-md border border-watsons-cream/10 bg-watsons-dark px-3 py-3 text-sm leading-6 text-watsons-cream outline-none transition placeholder:text-watsons-mist/60 focus:border-watsons-gold/70"
            placeholder="A back-bar pour worth asking the bartender about."
          />
        </label>

        <div className="space-y-2">
          <span className="block text-[10px] font-bold uppercase tracking-[0.22em] text-watsons-mist">
            Prices
          </span>
          {draft.pricing.map((price, index) => (
            <div key={`${price.label}-${index}`} className="grid grid-cols-[1fr_96px] gap-2">
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
          Available
        </label>

        <button
          type="submit"
          disabled={disabled}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-watsons-gold text-xs font-bold uppercase tracking-[0.18em] text-watsons-dark transition hover:bg-watsons-goldHover disabled:opacity-45"
        >
          <Save className="h-4 w-4" aria-hidden="true" />
          {submitLabel}
        </button>
      </div>
    </form>
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

function AccessInput({
  value,
  onChange
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.22em] text-watsons-mist">
        Access
      </span>
      <input
        value={String(value)}
        onChange={(event) => onChange(Number(event.target.value))}
        type="number"
        min="0"
        max="100"
        step="1"
        className="h-11 w-full rounded-md border border-watsons-cream/10 bg-watsons-dark px-3 text-sm text-watsons-cream outline-none transition focus:border-watsons-gold/70"
      />
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
      <div className="absolute inset-0 -z-0 bg-[linear-gradient(135deg,rgba(20,58,47,0.34),transparent_42%)]" />
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
      className={`rounded-md border px-4 py-3 text-sm ${
        error
          ? "border-red-400/30 bg-red-950/30 text-red-100"
          : "border-watsons-gold/25 bg-watsons-gold/10 text-watsons-gold"
      }`}
    >
      {error || status}
    </p>
  );
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

function updatePrice(
  pricing: AdminPricing[],
  index: number,
  patch: Partial<AdminPricing>
) {
  return pricing.map((price, currentIndex) =>
    currentIndex === index ? { ...price, ...patch } : price
  );
}

function getRoleAccessLevel(role: AdminRole) {
  return roleOptions.find((option) => option.value === role)?.accessLevel ?? 50;
}

function countItemsByCategory(items: AdminItem[], categoryId: string) {
  return items.filter((item) => item.categoryId === categoryId).length;
}

function getCategoryName(categories: AdminCategory[], categoryId: string) {
  return categories.find((category) => category.id === categoryId)?.name ?? "";
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

async function adminFetch<T = unknown>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const headers = new Headers(init.headers);

  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers,
    credentials: "include"
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.message ?? "Request failed.");
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong.";
}
