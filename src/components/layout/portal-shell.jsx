"use client";
import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Award,
  BarChart3,
  Bell,
  BookOpen,
  Building2,
  Calendar,
  CheckCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Clock,
  FileText,
  GraduationCap,
  Home,
  Layers,
  LogOut,
  Megaphone,
  Menu,
  QrCode,
  Search,
  Settings,
  User,
  Users,
  X,
} from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { bindTopLayerDialog, closeTopLayer } from "@/lib/top-layer";
import { cn, formatDateTimeID } from "@/lib/utils";
import { getNavGroupsForUser } from "./nav-config";

function NavIcon({ name, className }) {
  const icons = {
    home: <Home className={className} aria-hidden="true" />,
    book: <BookOpen className={className} aria-hidden="true" />,
    calendar: <Calendar className={className} aria-hidden="true" />,
    qr: <QrCode className={className} aria-hidden="true" />,
    award: <Award className={className} aria-hidden="true" />,
    file: <FileText className={className} aria-hidden="true" />,
    megaphone: <Megaphone className={className} aria-hidden="true" />,
    user: <User className={className} aria-hidden="true" />,
    users: <Users className={className} aria-hidden="true" />,
    building: <Building2 className={className} aria-hidden="true" />,
    layers: <Layers className={className} aria-hidden="true" />,
    clock: <Clock className={className} aria-hidden="true" />,
    clipboard: <ClipboardCheck className={className} aria-hidden="true" />,
    chart: <BarChart3 className={className} aria-hidden="true" />,
    settings: <Settings className={className} aria-hidden="true" />,
  };
  return <>{icons[name]}</>;
}

const ROLE_LABELS = {
  ADMIN: "Admin Akademik",
  LECTURER: "Dosen",
  STUDENT: "Mahasiswa",
};

export function PortalShell({ user, children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = React.useState(false);
  const [loggingOut, setLoggingOut] = React.useState(false);

  // Route-scoped overlay state: automatically closes overlays on navigation without effects
  const [activeOverlay, setActiveOverlay] = React.useState({
    type: null,
    pathname: "",
  });
  const mobileOpen =
    activeOverlay.type === "drawer" && activeOverlay.pathname === pathname;
  const searchOpen =
    activeOverlay.type === "search" && activeOverlay.pathname === pathname;
  const notifOpen =
    activeOverlay.type === "notif" && activeOverlay.pathname === pathname;
  const profileOpen =
    activeOverlay.type === "profile" && activeOverlay.pathname === pathname;

  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedIndex, setSelectedIndex] = React.useState(0);

  const [notifData, setNotifData] = React.useState({
    items: [],
    loading: false,
    error: null,
    overrideUnread: null,
    propAtOverride: null,
  });

  const unreadCount =
    notifData.propAtOverride === user.unreadNotifications &&
    notifData.overrideUnread !== null
      ? notifData.overrideUnread
      : user.unreadNotifications;

  const drawerRef = React.useRef(null);
  const searchDialogRef = React.useRef(null);
  const searchInputRef = React.useRef(null);
  const notifRef = React.useRef(null);
  const profileRef = React.useRef(null);

  const openOverlay = React.useCallback(
    (type) => {
      setActiveOverlay({ type, pathname });
    },
    [pathname]
  );

  const closeOverlay = React.useCallback(() => {
    setActiveOverlay({ type: null, pathname: "" });
  }, []);

  const navGroups = React.useMemo(() => getNavGroupsForUser(user), [user]);
  const allNavItems = React.useMemo(
    () =>
      navGroups.flatMap((group) =>
        group.items.map((item) => ({
          ...item,
          groupTitle: group.title ?? "Utama",
        }))
      ),
    [navGroups]
  );

  const filteredNavItems = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return allNavItems;
    return allNavItems.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.groupTitle.toLowerCase().includes(q)
    );
  }, [allNavItems, searchQuery]);

  // Keyboard shortcut Ctrl+K / Cmd+K for quick menu jump & Escape for popovers
  React.useEffect(() => {
    function handleGlobalKeyDown(event) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchQuery("");
        setSelectedIndex(0);
        openOverlay("search");
      } else if (event.key === "Escape") {
        setActiveOverlay((prev) =>
          prev.type === "notif" || prev.type === "profile"
            ? { type: null, pathname: "" }
            : prev
        );
      }
    }
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [openOverlay]);

  // Outside click handler for header popovers
  React.useEffect(() => {
    function handleOutsideClick(event) {
      if (notifOpen && notifRef.current && !notifRef.current.contains(event.target)) {
        closeOverlay();
      }
      if (
        profileOpen &&
        profileRef.current &&
        !profileRef.current.contains(event.target)
      ) {
        closeOverlay();
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [notifOpen, profileOpen, closeOverlay]);

  // Sync native <dialog> for mobile drawer
  React.useEffect(() => {
    const drawer = drawerRef.current;
    if (!drawer) return;

    if (mobileOpen) {
      drawer.removeAttribute("data-closing");
      if (!drawer.open) drawer.showModal();
    } else if (drawer.open) {
      void closeTopLayer(drawer);
    }
  }, [mobileOpen]);

  React.useEffect(() => {
    const drawer = drawerRef.current;
    if (!drawer) return;
    return bindTopLayerDialog(drawer, closeOverlay);
  }, [closeOverlay]);

  // Sync native <dialog> for quick navigation palette
  React.useEffect(() => {
    const dialog = searchDialogRef.current;
    if (!dialog) return;

    if (searchOpen) {
      dialog.removeAttribute("data-closing");
      if (!dialog.open) dialog.showModal();
      requestAnimationFrame(() => searchInputRef.current?.focus());
    } else if (dialog.open) {
      void closeTopLayer(dialog);
    }
  }, [searchOpen]);

  React.useEffect(() => {
    const dialog = searchDialogRef.current;
    if (!dialog) return;
    return bindTopLayerDialog(dialog, closeOverlay);
  }, [closeOverlay]);

  async function loadNotifications() {
    setNotifData((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await apiFetch("/api/notifications");
      setNotifData((prev) => ({
        ...prev,
        items: data.items ?? [],
        loading: false,
        overrideUnread:
          typeof data.unreadCount === "number"
            ? data.unreadCount
            : prev.overrideUnread,
        propAtOverride: user.unreadNotifications,
      }));
    } catch (err) {
      setNotifData((prev) => ({
        ...prev,
        loading: false,
        error: err.message || "Gagal memuat notifikasi.",
      }));
    }
  }

  function toggleNotifications() {
    if (notifOpen) {
      closeOverlay();
      return;
    }
    openOverlay("notif");
    void loadNotifications();
  }

  async function handleMarkRead(notificationId) {
    try {
      await apiFetch("/api/notifications", {
        method: "PATCH",
        body: JSON.stringify({ notificationId }),
      });
      setNotifData((prev) => {
        const nextItems = notificationId
          ? prev.items.map((item) =>
              item.id === notificationId ? { ...item, is_read: true } : item
            )
          : prev.items.map((item) => ({ ...item, is_read: true }));
        const nextUnread = notificationId ? Math.max(0, unreadCount - 1) : 0;
        return {
          ...prev,
          items: nextItems,
          overrideUnread: nextUnread,
          propAtOverride: user.unreadNotifications,
        };
      });
      router.refresh();
    } catch {
      // Non-blocking inside preview popover; full page reports explicit error
    }
  }

  function handleSearchKeyDown(event) {
    if (filteredNavItems.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSelectedIndex((i) => (i + 1) % filteredNavItems.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setSelectedIndex(
        (i) => (i - 1 + filteredNavItems.length) % filteredNavItems.length
      );
    } else if (event.key === "Enter") {
      event.preventDefault();
      const target = filteredNavItems[selectedIndex];
      if (target) {
        closeOverlay();
        router.push(target.href);
      }
    }
  }

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

  function isActive(href) {
    if (href === "/student" || href === "/lecturer" || href === "/admin") {
      return pathname === href;
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  const sidebarContent = (isMobile = false) => (
    <div className="flex h-full flex-col bg-white">
      <div className="flex h-16 items-center justify-between border-b border-[#E2E8F0] px-4">
        <Link href="/" className="group flex items-center gap-2.5 overflow-hidden">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#2457A6] text-white transition-transform duration-150 motion-safe:group-hover:scale-105">
            <GraduationCap className="h-5 w-5" aria-hidden="true" />
          </div>
          {(!collapsed || isMobile) && (
            <div className="min-w-0">
              <p className="truncate text-sm font-bold tracking-tight text-[#172033]">
                Kampusync
              </p>
              <p className="truncate text-[11px] text-[#64748B]">
                {ROLE_LABELS[user.role]}
              </p>
            </div>
          )}
        </Link>
        {isMobile ? (
          <button
            type="button"
            onClick={closeOverlay}
            aria-label="Tutup navigasi"
            className="rounded-lg p-1.5 text-[#64748B] transition-colors hover:bg-[#F1F5F9] hover:text-[#172033]"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            aria-expanded={!collapsed}
            aria-label={collapsed ? "Perluas sidebar" : "Ciutkan sidebar"}
            className="hidden rounded-lg p-1.5 text-[#64748B] transition-colors hover:bg-[#F1F5F9] hover:text-[#172033] lg:inline-flex"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            ) : (
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        )}
      </div>

      <nav aria-label="Navigasi Utama" className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {navGroups.map((group, idx) => (
          <div key={group.title ?? `group-${idx}`}>
            {group.title && (!collapsed || isMobile) ? (
              <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                {group.title}
              </p>
            ) : null}
            <ul className="space-y-1">
              {group.items.map((item) => {
                const active = isActive(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={closeOverlay}
                      title={collapsed && !isMobile ? item.label : undefined}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150",
                        active
                          ? "bg-[#EFF6FF] font-semibold text-[#2457A6]"
                          : "text-[#475569] hover:bg-[#F6F8FB] hover:text-[#172033]",
                        collapsed && !isMobile && "justify-center px-2"
                      )}
                    >
                      {active ? (
                        <span
                          aria-hidden="true"
                          className="absolute bottom-1.5 left-0 top-1.5 w-[3px] rounded-r-full bg-[#2457A6]"
                        />
                      ) : null}
                      <NavIcon
                        name={item.icon}
                        className={cn(
                          "h-4 w-4 shrink-0 transition-transform duration-150 motion-safe:group-hover:scale-105",
                          active ? "text-[#2457A6]" : "text-[#64748B]"
                        )}
                      />
                      {(!collapsed || isMobile) && (
                        <span className="truncate">{item.label}</span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-[#E2E8F0] p-3">
        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className={cn(
            "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-[#C53030] transition-colors hover:bg-[#FEF2F2] disabled:opacity-50",
            collapsed && !isMobile && "justify-center px-2"
          )}
        >
          <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
          {(!collapsed || isMobile) && (
            <span>{loggingOut ? "Keluar..." : "Keluar"}</span>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[#F6F8FB]">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "no-print hidden shrink-0 border-r border-[#E2E8F0] bg-white transition-[width] duration-200 ease-out lg:block",
          collapsed ? "w-[72px]" : "w-64"
        )}
      >
        <div className="sticky top-0 h-screen">{sidebarContent(false)}</div>
      </aside>

      {/* Mobile navigation drawer using native top-layer <dialog> */}
      <dialog
        ref={drawerRef}
        closedby="any"
        aria-label="Menu navigasi"
        className="kampus-drawer no-print border-r border-[#E2E8F0] bg-white shadow-xl lg:hidden"
      >
        {sidebarContent(true)}
      </dialog>

      {/* Quick navigation search dialog (Ctrl+K) */}
      <dialog
        ref={searchDialogRef}
        closedby="any"
        aria-label="Pencarian cepat menu"
        className="kampus-dialog no-print w-full max-w-md rounded-xl border border-[#E2E8F0] bg-white shadow-xl"
      >
        <div className="flex items-center gap-2 border-b border-[#E2E8F0] px-4 py-3 focus-within:border-[#2457A6]">
          <Search className="h-4 w-4 shrink-0 text-[#64748B]" aria-hidden="true" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleSearchKeyDown}
            placeholder="Cari menu atau layanan akademik..."
            aria-label="Cari menu atau layanan akademik"
            className="w-full rounded bg-transparent px-1 py-0.5 text-sm text-[#172033] placeholder:text-[#64748B] focus:outline-none"
          />
          <button
            type="button"
            onClick={closeOverlay}
            aria-label="Tutup pencarian"
            className="rounded p-1 text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#172033]"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="max-h-72 overflow-y-auto p-2">
          {filteredNavItems.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-[#64748B]">
              Menu tidak ditemukan untuk &ldquo;{searchQuery}&rdquo;.
            </p>
          ) : (
            <ul className="space-y-0.5">
              {filteredNavItems.map((item, idx) => {
                const isSelected = idx === selectedIndex;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={closeOverlay}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={cn(
                        "flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors",
                        isSelected
                          ? "bg-[#EFF6FF] text-[#2457A6]"
                          : "text-[#172033] hover:bg-[#F6F8FB]"
                      )}
                    >
                      <span className="flex items-center gap-2.5">
                        <NavIcon
                          name={item.icon}
                          className={cn(
                            "h-4 w-4",
                            isSelected ? "text-[#2457A6]" : "text-[#64748B]"
                          )}
                        />
                        <span className="font-medium">{item.label}</span>
                      </span>
                      <span className="text-[11px] text-[#64748B]">
                        {item.groupTitle}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </dialog>

      {/* Main area */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-[#E2E8F0] bg-white px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => openOverlay("drawer")}
              aria-expanded={mobileOpen}
              aria-label="Buka menu navigasi"
              className="rounded-lg p-2 text-[#475569] transition-colors hover:bg-[#F1F5F9] lg:hidden"
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>
            <div className="hidden sm:block">
              <p className="text-xs font-medium text-[#64748B]">
                Portal Akademik Terintegrasi
              </p>
              <p className="text-sm font-semibold text-[#172033]">
                {ROLE_LABELS[user.role]}
                {user.student ? ` • ${user.student.nim}` : ""}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Quick menu search trigger */}
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setSelectedIndex(0);
                openOverlay("search");
              }}
              aria-label="Cari menu cepat (Ctrl+K)"
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-2.5 text-xs text-[#64748B] transition-colors hover:border-[#CBD5E1] hover:bg-white hover:text-[#172033] sm:h-9"
            >
              <Search className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="hidden md:inline">Cari menu...</span>
              <kbd className="hidden rounded border border-[#E2E8F0] bg-white px-1.5 py-0.5 text-[10px] font-medium text-[#64748B] md:inline">
                Ctrl+K
              </kbd>
            </button>

            {/* Notifications popover */}
            <div ref={notifRef} className="relative">
              <button
                type="button"
                onClick={toggleNotifications}
                aria-expanded={notifOpen}
                aria-haspopup="true"
                aria-label="Notifikasi"
                className={cn(
                  "relative inline-flex h-10 w-10 items-center justify-center rounded-lg border bg-white text-[#475569] transition-colors hover:bg-[#F6F8FB] sm:h-9 sm:w-9",
                  notifOpen ? "border-[#2457A6] text-[#2457A6]" : "border-[#E2E8F0]"
                )}
              >
                <Bell className="h-4 w-4" aria-hidden="true" />
                {unreadCount > 0 ? (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#C53030] px-1 text-[10px] font-bold text-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                ) : null}
              </button>

              {notifOpen ? (
                <div
                  role="region"
                  aria-label="Pratinjau Notifikasi"
                  className="kampus-popover absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-[#E2E8F0] bg-white shadow-lg"
                >
                  <div className="flex items-center justify-between border-b border-[#E2E8F0] px-4 py-3">
                    <span className="text-sm font-semibold text-[#172033]">
                      Notifikasi
                    </span>
                    {unreadCount > 0 ? (
                      <button
                        type="button"
                        onClick={() => handleMarkRead()}
                        className="inline-flex items-center gap-1 text-xs font-medium text-[#2457A6] hover:underline"
                      >
                        <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
                        Tandai semua
                      </button>
                    ) : null}
                  </div>

                  <div className="max-h-72 divide-y divide-[#E2E8F0] overflow-y-auto">
                    {notifData.loading ? (
                      <div className="space-y-2 p-4" aria-busy="true">
                        <p className="text-xs text-[#64748B]">Memuat notifikasi...</p>
                        <div className="h-3.5 w-2/3 rounded bg-[#F1F5F9]" />
                        <div className="h-3 w-full rounded bg-[#F1F5F9]" />
                      </div>
                    ) : notifData.error ? (
                      <div className="p-4 text-center text-xs text-[#C53030]">
                        <p>{notifData.error}</p>
                        <button
                          type="button"
                          onClick={loadNotifications}
                          className="mt-2 font-medium text-[#2457A6] hover:underline"
                        >
                          Coba lagi
                        </button>
                      </div>
                    ) : notifData.items.length === 0 ? (
                      <p className="p-5 text-center text-xs text-[#64748B]">
                        Belum ada notifikasi baru.
                      </p>
                    ) : (
                      notifData.items.map((n) => (
                        <div
                          key={n.id}
                          className={cn(
                            "px-4 py-3 transition-colors hover:bg-[#F8FAFC]",
                            !n.is_read && "bg-[#F8FAFF]"
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-xs font-semibold text-[#172033]">
                              {n.title}
                            </p>
                            {!n.is_read ? (
                              <span
                                aria-label="Belum dibaca"
                                className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#2457A6]"
                              />
                            ) : null}
                          </div>
                          <p className="mt-0.5 line-clamp-2 text-xs text-[#475569]">
                            {n.message}
                          </p>
                          <div className="mt-1.5 flex items-center justify-between text-[11px] text-[#64748B]">
                            <span>{formatDateTimeID(n.created_at)}</span>
                            {n.target_url ? (
                              <Link
                                href={n.target_url}
                                onClick={() => {
                                  if (!n.is_read) void handleMarkRead(n.id);
                                  closeOverlay();
                                }}
                                className="font-medium text-[#2457A6] hover:underline"
                              >
                                Buka
                              </Link>
                            ) : null}
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="border-t border-[#E2E8F0] px-4 py-2.5 text-center">
                    <Link
                      href="/notifications"
                      onClick={closeOverlay}
                      className="text-xs font-semibold text-[#2457A6] hover:underline"
                    >
                      Lihat semua notifikasi
                    </Link>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Profile menu popover */}
            <div ref={profileRef} className="relative">
              <button
                type="button"
                onClick={() =>
                  profileOpen ? closeOverlay() : openOverlay("profile")
                }
                aria-expanded={profileOpen}
                aria-haspopup="true"
                className={cn(
                  "flex items-center gap-2.5 rounded-lg border bg-white px-2.5 py-1.5 transition-colors hover:bg-[#F6F8FB]",
                  profileOpen ? "border-[#2457A6]" : "border-[#E2E8F0]"
                )}
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#2457A6] text-xs font-semibold text-white">
                  {user.fullName.charAt(0).toUpperCase()}
                </div>
                <div className="hidden text-left sm:block">
                  <p className="max-w-[160px] truncate text-xs font-semibold text-[#172033]">
                    {user.fullName}
                  </p>
                  <p className="max-w-[160px] truncate text-[11px] text-[#64748B]">
                    {user.email}
                  </p>
                </div>
                <ChevronDown
                  className={cn(
                    "hidden h-3.5 w-3.5 text-[#64748B] transition-transform duration-150 sm:block",
                    profileOpen && "rotate-180"
                  )}
                  aria-hidden="true"
                />
              </button>

              {profileOpen ? (
                <div
                  role="menu"
                  aria-label="Menu Profil"
                  className="kampus-popover absolute right-0 mt-2 w-60 rounded-xl border border-[#E2E8F0] bg-white p-1.5 shadow-lg"
                >
                  <div className="border-b border-[#E2E8F0] px-3 py-2.5">
                    <p className="truncate text-sm font-semibold text-[#172033]">
                      {user.fullName}
                    </p>
                    <p className="truncate text-xs text-[#64748B]">{user.email}</p>
                    <p className="mt-1 text-[11px] font-medium text-[#2457A6]">
                      {ROLE_LABELS[user.role]}
                      {user.student ? ` • ${user.student.nim}` : ""}
                    </p>
                  </div>
                  <div className="py-1">
                    <Link
                      href="/profile"
                      role="menuitem"
                      onClick={closeOverlay}
                      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-[#172033] transition-colors hover:bg-[#F6F8FB]"
                    >
                      <User className="h-4 w-4 text-[#64748B]" aria-hidden="true" />
                      Profil Saya
                    </Link>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={handleLogout}
                      disabled={loggingOut}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-[#C53030] transition-colors hover:bg-[#FEF2F2] disabled:opacity-50"
                    >
                      <LogOut className="h-4 w-4" aria-hidden="true" />
                      {loggingOut ? "Keluar..." : "Keluar dari Portal"}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 py-6 sm:px-6">
          <div key={pathname} className="portal-page-enter">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
