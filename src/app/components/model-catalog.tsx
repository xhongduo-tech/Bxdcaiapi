import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Search, ArrowRight, X, Info, PowerOff, ChevronDown } from "lucide-react";
import { categoryLabels, tagColors, badgeStyle, type Model } from "./model-data";
import { useModels } from "./model-context";
import { useNavigate } from "react-router";
import { ProviderIcon } from "./provider-logos";

const categoryOrder: Model["category"][] = ["flagship", "chat", "vision", "embedding", "reranker"];

const categoryEmoji: Record<Model["category"], string> = {
  flagship: "✦",
  chat: "Aa",
  vision: "◎",
  embedding: "⊕",
  reranker: "⇅",
};

export function ModelCatalog() {
  const { models } = useModels();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<Model["category"] | "all">("all");
  const [tooltipModel, setTooltipModel] = useState<Model | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const navigate = useNavigate();
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Search-only filtered (for "全部" count — independent of category)
  const searchFiltered = models.filter((m) =>
    !search ||
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.provider.toLowerCase().includes(search.toLowerCase()) ||
    m.id.toLowerCase().includes(search.toLowerCase()) ||
    (m.tags || []).some((t) => t.includes(search))
  );

  // Online + exclusive models for main grid (exclusive stays in its category)
  const onlineFiltered = searchFiltered.filter((m) => m.status === "online" || m.status === "maintenance" || m.status === "exclusive");
  const offlineModels = searchFiltered.filter((m) => m.status === "offline");

  // Full filter (search + category) — online only
  const filtered = onlineFiltered.filter(
    (m) => activeCategory === "all" || m.category === activeCategory
  );

  const grouped = categoryOrder
    .map((cat) => ({ category: cat, models: filtered.filter((m) => m.category === cat) }))
    .filter((g) => g.models.length > 0);

  const onlineCount = models.filter((m) => m.status === "online").length;
  const [offlineExpanded, setOfflineExpanded] = useState(true);

  const handleApply = (modelId: string) => {
    navigate(`/apply?model=${encodeURIComponent(modelId)}`);
  };

  // Tooltip show/hide
  const showTooltip = useCallback((m: Model, e: React.MouseEvent) => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    const target = e.currentTarget as HTMLElement;
    hoverTimerRef.current = setTimeout(() => {
      const rect = target.getBoundingClientRect();
      const viewportW = window.innerWidth;
      const viewportH = window.innerHeight;
      const tooltipW = 320;

      // Prefer right side; if no room, use left
      let x: number;
      if (rect.right + tooltipW + 16 < viewportW) {
        x = rect.right + 10;
      } else if (rect.left - tooltipW - 16 > 0) {
        x = rect.left - tooltipW - 10;
      } else {
        x = Math.max(16, (viewportW - tooltipW) / 2);
      }

      // Vertically centered on the card, clamped to viewport
      let y = rect.top + rect.height / 2 - 80;
      y = Math.max(16, Math.min(y, viewportH - 240));

      setTooltipPos({ x, y });
      setTooltipModel(m);
    }, 350);
  }, []);

  const hideTooltip = useCallback(() => {
    if (hoverTimerRef.current) { clearTimeout(hoverTimerRef.current); hoverTimerRef.current = null; }
    setTooltipModel(null);
  }, []);

  // Category counts (search-filtered online, not category-filtered)
  const catCounts: Record<string, number> = {};
  for (const cat of categoryOrder) {
    catCounts[cat] = onlineFiltered.filter((m) => m.category === cat).length;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-[28px] sm:text-[32px] text-foreground" style={{ fontWeight: 600, letterSpacing: "-0.02em" }}>
            模型清单
          </h1>
          <p className="text-muted-foreground text-[13.5px] mt-1">
            共 <span className="text-foreground" style={{ fontWeight: 500 }}>{models.length}</span> 个模型，
            <span className="text-green-600" style={{ fontWeight: 500 }}>{onlineCount}</span> 个在线可用
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
          <input
            type="text"
            placeholder="搜索模型名称、提供商..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-white text-[13.5px] focus:outline-none focus:ring-2 focus:ring-primary/15 border border-border/30 shadow-sm transition-all placeholder:text-muted-foreground/40"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-md hover:bg-secondary transition-colors">
              <X className="w-3.5 h-3.5 text-muted-foreground/50" />
            </button>
          )}
        </div>
      </motion.div>

      {/* Category filter tabs */}
      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.06, duration: 0.3 }}
        className="flex flex-wrap gap-1.5"
      >
        <button
          onClick={() => setActiveCategory("all")}
          className={`px-3.5 py-1.5 rounded-lg text-[12.5px] transition-all ${
            activeCategory === "all"
              ? "bg-foreground text-background shadow-sm"
              : "bg-white text-muted-foreground hover:text-foreground hover:bg-white/80 border border-border/20"
          }`}
          style={{ fontWeight: activeCategory === "all" ? 500 : 400 }}
        >
          全部 <span className="opacity-60 ml-0.5">{searchFiltered.length}</span>
        </button>
        {categoryOrder.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3.5 py-1.5 rounded-lg text-[12.5px] transition-all ${
              activeCategory === cat
                ? "bg-foreground text-background shadow-sm"
                : "bg-white text-muted-foreground hover:text-foreground hover:bg-white/80 border border-border/20"
            }`}
            style={{ fontWeight: activeCategory === cat ? 500 : 400 }}
          >
            <span className="mr-1 opacity-60 text-[11px]">{categoryEmoji[cat]}</span>
            {categoryLabels[cat]}
            {catCounts[cat] > 0 && <span className="opacity-50 ml-1">{catCounts[cat]}</span>}
          </button>
        ))}
      </motion.div>

      {/* Model groups */}
      <div className="space-y-8">
        {grouped.map((group, gi) => (
          <motion.section
            key={group.category}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 + gi * 0.05, duration: 0.3 }}
          >
            {activeCategory === "all" && (
              <div className="flex items-center gap-3 mb-3.5">
                <span className="text-[13px] text-muted-foreground/70" style={{ fontWeight: 500 }}>
                  {categoryLabels[group.category]}
                </span>
                <div className="flex-1 h-px bg-border/30" />
                <span className="text-[11px] text-muted-foreground/40">{group.models.length} 个模型</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 items-stretch">
              {group.models.map((m, i) => {
                const isExclusive = m.status === "exclusive";
                const isUnavailable = m.status !== "online" && !isExclusive;
                const unavailableReason =
                  m.offlineReason ||
                  (m.status === "maintenance" ? "维护中，不开放申请" : "该模型已下线");

                return (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.06 + gi * 0.04 + i * 0.03, duration: 0.28, ease: [0.25, 0.1, 0.25, 1] }}
                    onMouseEnter={(e) => m.description && showTooltip(m, e)}
                    onMouseLeave={hideTooltip}
                    className={`relative rounded-2xl transition-all duration-200 border group flex flex-col ${
                      isExclusive
                        ? "bg-white/80 border-amber-200/40 shadow-sm cursor-default"
                        : isUnavailable
                        ? "opacity-50 cursor-not-allowed bg-white/60 border-border/10"
                        : "bg-white shadow-sm border-border/10 hover:shadow-md hover:border-border/20"
                    }`}
                  >
                    {/* Exclusive ribbon indicator */}
                    {isExclusive && (
                      <div className="absolute top-0 right-4 bg-amber-500 text-white text-[9px] px-2 py-0.5 rounded-b-md" style={{ fontWeight: 600, letterSpacing: "0.04em" }}>
                        独占
                      </div>
                    )}
                    <div className="px-4.5 py-4 flex flex-col flex-1">
                      {/* Top row: logo + name + badge */}
                      <div className="flex items-start gap-3">
                        <div className="shrink-0 mt-0.5">
                          <ProviderIcon provider={m.provider} size="md" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[14.5px] text-foreground truncate" style={{ fontWeight: 600 }}>
                              {m.name}
                            </span>
                            <span
                              className={`w-[6px] h-[6px] rounded-full shrink-0 ${
                                m.status === "online" ? "bg-green-400" :
                                m.status === "exclusive" ? "bg-amber-400" :
                                m.status === "maintenance" ? "bg-amber-400" : "bg-gray-300"
                              }`}
                            />
                            {m.badge && (
                              <span
                                className={`text-[10px] px-1.5 py-px rounded-full shrink-0 ${badgeStyle[m.badge]}`}
                                style={{ fontWeight: 500 }}
                              >
                                {m.badge}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5 text-[11.5px] text-muted-foreground/55">
                            <span>{m.provider}</span>
                            {m.contextWindow && m.contextWindow !== "-" && (
                              <>
                                <span className="opacity-50">·</span>
                                <span>{m.contextWindow}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Short description — fixed 2-line height for alignment */}
                      <p className="text-[12.5px] text-muted-foreground mt-2.5 leading-[1.6] line-clamp-2 min-h-[40px]">
                        {m.shortDescription || m.description}
                      </p>

                      {/* Unavailable / exclusive reason */}
                      {(isUnavailable || isExclusive) && (
                        <div className={`flex items-center gap-1.5 mt-2 text-[11px] ${isExclusive ? "text-amber-600/60" : "text-muted-foreground/50"}`}>
                          <Info className="w-3 h-3 shrink-0" />
                          <span>{isExclusive ? (m.offlineReason || "独占部署中，暂不开放申请") : unavailableReason}</span>
                        </div>
                      )}

                      {/* Bottom: tags + apply — pushed to bottom by flex-1 above */}
                      <div className="flex items-center justify-between mt-auto pt-3">
                        <div className="flex flex-wrap gap-1 flex-1 min-w-0">
                          {m.tags && m.tags.slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className={`text-[10px] px-1.5 py-0.5 rounded-md ${tagColors[tag] || "bg-gray-50 text-gray-500"}`}
                            >
                              {tag}
                            </span>
                          ))}
                          {m.tags && m.tags.length > 3 && (
                            <span className="text-[10px] px-1 py-0.5 text-muted-foreground/40">
                              +{m.tags.length - 3}
                            </span>
                          )}
                        </div>

                        {m.status === "online" && (
                          <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleApply(m.id)}
                            className="flex items-center gap-1 text-[11.5px] px-2.5 py-1 rounded-lg text-primary hover:bg-primary/8 transition-all shrink-0 opacity-0 group-hover:opacity-100"
                            style={{ fontWeight: 500 }}
                          >
                            申请使用 <ArrowRight className="w-3 h-3" />
                          </motion.button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.section>
        ))}
      </div>

      {filtered.length === 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-24">
          <div className="text-muted-foreground/30 text-[40px] mb-3">∅</div>
          <p className="text-muted-foreground text-[14px]">没有找到匹配的模型</p>
          {search && (
            <button
              onClick={() => { setSearch(""); setActiveCategory("all"); }}
              className="mt-3 text-[13px] text-primary hover:underline"
            >
              清除搜索条件
            </button>
          )}
        </motion.div>
      )}

      {/* Offline models section — always at bottom, independent of category filter */}
      {offlineModels.length > 0 && activeCategory === "all" && (
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.3 }}
        >
          {/* Collapsible header */}
          <button
            onClick={() => setOfflineExpanded((v) => !v)}
            className="flex items-center gap-3 mb-3.5 w-full group/hdr"
          >
            <div className="flex items-center gap-2">
              <PowerOff className="w-3.5 h-3.5 text-muted-foreground/40" />
              <span className="text-[13px] text-muted-foreground/60" style={{ fontWeight: 500 }}>
                已下线
              </span>
              <span className="text-[11px] text-muted-foreground/35 tabular-nums">{offlineModels.length}</span>
            </div>
            <div className="flex-1 h-px bg-border/20" />
            <ChevronDown
              className={`w-3.5 h-3.5 text-muted-foreground/30 transition-transform duration-200 ${offlineExpanded ? "" : "-rotate-90"}`}
            />
          </button>

          <AnimatePresence initial={false}>
            {offlineExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 items-stretch">
                  {offlineModels.map((m, i) => (
                    <motion.div
                      key={m.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04, duration: 0.25 }}
                      onMouseEnter={(e) => m.description && showTooltip(m, e)}
                      onMouseLeave={hideTooltip}
                      className="relative rounded-2xl border border-border/8 bg-white/40 flex flex-col group"
                    >
                      <div className="px-4.5 py-4 flex flex-col flex-1 opacity-55">
                        <div className="flex items-start gap-3">
                          <div className="shrink-0 mt-0.5 grayscale">
                            <ProviderIcon provider={m.provider} size="md" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[14.5px] text-foreground truncate" style={{ fontWeight: 600 }}>
                                {m.name}
                              </span>
                              <span className="w-[6px] h-[6px] rounded-full shrink-0 bg-gray-300" />
                              <span className="text-[10px] px-1.5 py-px rounded-full bg-gray-100 text-gray-400 shrink-0" style={{ fontWeight: 500 }}>
                                已下线
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5 text-[11.5px] text-muted-foreground/45">
                              <span>{m.provider}</span>
                              {m.contextWindow && m.contextWindow !== "-" && (
                                <>
                                  <span className="opacity-50">·</span>
                                  <span>{m.contextWindow}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <p className="text-[12.5px] text-muted-foreground mt-2.5 leading-[1.6] line-clamp-2 min-h-[40px]">
                          {m.shortDescription || m.description}
                        </p>

                        <div className="flex items-center gap-1.5 mt-2 text-[11px] text-muted-foreground/40">
                          <Info className="w-3 h-3 shrink-0" />
                          <span>{m.offlineReason || "该模型已下线，暂不接受新申请"}</span>
                        </div>

                        <div className="flex flex-wrap gap-1 mt-auto pt-3">
                          {m.tags && m.tags.slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="text-[10px] px-1.5 py-0.5 rounded-md bg-gray-50 text-gray-400"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.section>
      )}

      {/* Floating side tooltip — appears beside hovered card */}
      <AnimatePresence>
        {tooltipModel && (
          <motion.div
            key={tooltipModel.id}
            initial={{ opacity: 0, x: -6, scale: 0.98 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -4, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.25, 0.1, 0.25, 1] }}
            style={{
              position: "fixed",
              left: tooltipPos.x,
              top: tooltipPos.y,
              width: 320,
              zIndex: 100,
            }}
            className="pointer-events-none"
          >
            <div className="bg-foreground/90 backdrop-blur-xl rounded-xl px-4 py-3.5 shadow-2xl shadow-black/20 space-y-2.5">
              {/* Header */}
              <div className="flex items-center gap-2.5">
                <ProviderIcon provider={tooltipModel.provider} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[13.5px] text-white" style={{ fontWeight: 600 }}>
                      {tooltipModel.name}
                    </span>
                    <span className={`w-1.5 h-1.5 rounded-full ${tooltipModel.status === "online" ? "bg-green-400" : "bg-gray-400"}`} />
                  </div>
                  <span className="text-[11px] text-white/45">
                    {tooltipModel.provider}
                    {tooltipModel.contextWindow && tooltipModel.contextWindow !== "-" ? ` · ${tooltipModel.contextWindow}` : ""}
                  </span>
                </div>
              </div>

              {/* Divider */}
              <div className="h-px bg-white/10" />

              {/* Full description */}
              <p className="text-[12px] text-white/75 leading-[1.75]">
                {tooltipModel.description}
              </p>

              {/* Tags */}
              {tooltipModel.tags && tooltipModel.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {tooltipModel.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/10 text-white/60"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}