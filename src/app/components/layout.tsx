import { Outlet, NavLink, useLocation } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { Menu, X } from "lucide-react";
import { useState, useEffect } from "react";
import { NotificationPopup } from "./notification-popup";
import { ModelProvider } from "./model-context";
import { useModels } from "./model-context";
import brdcLogo from "figma:asset/b4f5eede468480ea703457a9aa6437d3a2beade8.png";

const navItems = [
  { to: "/", label: "首页" },
  { to: "/models", label: "模型" },
  { to: "/apply", label: "申请" },
  { to: "/examples", label: "示例" },
  { to: "/notifications", label: "通知", showDot: true },
  { to: "/admin", label: "管理" },
];

// Inner layout that can access ModelContext
function LayoutInner() {
  const location = useLocation();
  const { notifications } = useModels();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [seenIds, setSeenIds] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("brdc_seen_notifs") || "[]"); } catch { return []; }
  });

  // Mark notifications as seen when on /notifications page
  useEffect(() => {
    if (location.pathname === "/notifications") {
      const newIds = notifications.filter((n) => n.isNew).map((n) => n.id);
      if (newIds.length > 0) {
        const merged = [...new Set([...seenIds, ...newIds])];
        setSeenIds(merged);
        localStorage.setItem("brdc_seen_notifs", JSON.stringify(merged));
      }
    }
  }, [location.pathname, notifications]);

  // Show popup on first visit
  useEffect(() => {
    const dismissed = sessionStorage.getItem("notif-dismissed");
    if (!dismissed) {
      const timer = setTimeout(() => setShowNotifications(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const dismissNotifications = () => {
    setShowNotifications(false);
    sessionStorage.setItem("notif-dismissed", "true");
  };

  // Red dot: any isNew notification not yet seen
  const hasUnread = notifications.some((n) => n.isNew && !seenIds.includes(n.id));

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/40">
        <div className="max-w-5xl mx-auto px-5 sm:px-8">
          <div className="flex items-center justify-between h-14">
            <NavLink to="/" className="flex items-center gap-2.5 shrink-0 group">
              <img src={brdcLogo} alt="BRDC.ai" className="w-7 h-7 object-contain" />
              <span className="text-[15px] text-foreground tracking-tight" style={{ fontWeight: 600 }}>
                BRDC.ai API
              </span>
            </NavLink>

            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/"}
                  className={({ isActive }) =>
                    `relative px-3.5 py-1.5 rounded-lg text-[13px] transition-all duration-200 ${
                      isActive
                        ? "text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span className="relative">
                        {item.label}
                        {item.showDot && hasUnread && (
                          <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute -top-1 -right-2 w-2 h-2 rounded-full bg-red-500"
                          />
                        )}
                      </span>
                      {isActive && (
                        <motion.div
                          layoutId="nav-active"
                          className="absolute inset-0 rounded-lg bg-secondary/80 -z-10"
                          transition={{ type: "spring", stiffness: 380, damping: 32 }}
                        />
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </nav>

            <button
              className="md:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="md:hidden border-t border-border/40 bg-background/95 backdrop-blur-xl overflow-hidden"
            >
              <div className="px-5 py-3 space-y-0.5">
                {navItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === "/"}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-2 px-4 py-2.5 rounded-lg text-[14px] transition-colors ${
                        isActive ? "text-foreground bg-secondary" : "text-muted-foreground"
                      }`
                    }
                  >
                    {item.label}
                    {item.showDot && hasUnread && (
                      <span className="w-2 h-2 rounded-full bg-red-500 ml-1" />
                    )}
                  </NavLink>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <AnimatePresence mode="wait">
        <motion.main
          key={location.pathname}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
          className="max-w-5xl mx-auto px-5 sm:px-8 py-8 sm:py-10"
        >
          <Outlet />
        </motion.main>
      </AnimatePresence>

      <NotificationPopup show={showNotifications} onDismiss={dismissNotifications} />
    </div>
  );
}

export function Layout() {
  return (
    <ModelProvider>
      <LayoutInner />
    </ModelProvider>
  );
}
