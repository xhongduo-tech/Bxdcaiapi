import { motion, AnimatePresence } from "motion/react";
import { X, ArrowUpCircle, ArrowDownCircle, Wrench, Info, Bell } from "lucide-react";
import { Link } from "react-router";
import { useModels } from "./model-context";

const typeConfig = {
  online: { icon: ArrowUpCircle, dot: "bg-green-400", bg: "bg-green-50", text: "text-green-600", label: "上线" },
  offline: { icon: ArrowDownCircle, dot: "bg-red-400", bg: "bg-red-50", text: "text-red-500", label: "下线" },
  maintenance: { icon: Wrench, dot: "bg-amber-400", bg: "bg-amber-50", text: "text-amber-600", label: "维护" },
  info: { icon: Info, dot: "bg-blue-400", bg: "bg-blue-50", text: "text-blue-500", label: "公告" },
};

export function NotificationPopup({
  show,
  onDismiss,
}: {
  show: boolean;
  onDismiss: () => void;
}) {
  const { notifications } = useModels();
  const newNotifications = notifications.filter((n) => n.isNew);

  if (newNotifications.length === 0) return null;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-50 flex items-end sm:items-center justify-center p-4"
          onClick={onDismiss}
        >
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl sm:rounded-3xl w-full max-w-md shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Bell className="w-4.5 h-4.5 text-primary" />
                </div>
                <div>
                  <h3 className="text-[16px] text-foreground" style={{ fontWeight: 500 }}>
                    最新动态
                  </h3>
                  <p className="text-[12px] text-muted-foreground">
                    {newNotifications.length} 条新通知
                  </p>
                </div>
              </div>
              <button
                onClick={onDismiss}
                className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
              >
                <X className="w-4.5 h-4.5 text-muted-foreground" />
              </button>
            </div>

            {/* Notifications */}
            <div className="px-4 pb-2 max-h-[320px] overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
              {newNotifications.map((n, i) => {
                const c = typeConfig[n.type];
                const Icon = c.icon;
                return (
                  <motion.div
                    key={n.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + i * 0.08 }}
                    className="flex gap-3 px-3 py-3.5 rounded-xl hover:bg-secondary/50 transition-colors"
                  >
                    <div className={`w-2 h-2 rounded-full ${c.dot} shrink-0 mt-2`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[14px] text-foreground" style={{ fontWeight: 500 }}>
                          {n.title}
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${c.bg} ${c.text}`}>
                          {c.label}
                        </span>
                      </div>
                      <p className="text-[13px] text-muted-foreground mt-0.5 leading-relaxed">
                        {n.description}
                      </p>
                      <span className="text-[11px] text-muted-foreground/50 mt-1 block">{n.date}</span>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-border/30 flex items-center justify-between">
              <Link
                to="/notifications"
                onClick={onDismiss}
                className="text-[13px] text-primary hover:underline"
              >
                查看全部通知
              </Link>
              <button
                onClick={onDismiss}
                className="px-4 py-2 bg-secondary rounded-lg text-[13px] text-foreground hover:bg-secondary/80 transition-colors"
              >
                知道了
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}