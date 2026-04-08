import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Plus, Trash2, Power, PowerOff, X, Loader2, Search, Lock,
  Database, Users, Bell, ChevronRight, Edit2, Check,
} from "lucide-react";
import { type Model, categoryLabels, statusLabels, type NotificationItem } from "./model-data";
import { useModels } from "./model-context";
import { toast } from "sonner";
import { ProviderIcon } from "./provider-logos";

const ADMIN_PASSWORD = "990115";

// Clipboard helper with execCommand fallback
function copyToClipboard(text: string) {
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
  } else {
    fallbackCopy(text);
  }
}

function fallbackCopy(text: string) {
  const el = document.createElement("textarea");
  el.value = text;
  el.style.cssText = "position:fixed;left:-9999px;top:-9999px;opacity:0";
  document.body.appendChild(el);
  el.focus();
  el.select();
  try { document.execCommand("copy"); } catch { /* silent */ }
  document.body.removeChild(el);
}

type Tab = "models" | "users" | "notifications";

interface ApiRecord {
  id?: string;
  name: string;
  authId: string;
  projectName: string;
  projectDesc?: string;
  department: string;
  models: string[];
  apiKey: string;
  grantedAt: string;
  revoked?: boolean;
}

// ── Models Tab ─────────────────────────────────────────────────────────────
function ModelsTab() {
  const { models: adminModels, setModels: setAdminModels } = useModels();
  const [showAdd, setShowAdd] = useState(false);
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState("");
  const [importFormat, setImportFormat] = useState<"openai" | "custom">("openai");
  const [customHeaders, setCustomHeaders] = useState<{ key: string; val: string }[]>([{ key: "", val: "" }]);
  const [newModel, setNewModel] = useState({
    id: "", name: "", provider: "", description: "", contextWindow: "",
    category: "chat" as Model["category"],
    baseUrl: "", apiKey: "", modelApiName: "",
  });

  // ── Edit state ──
  const [editingModel, setEditingModel] = useState<Model | null>(null);
  const [editForm, setEditForm] = useState({
    name: "", provider: "", description: "", contextWindow: "",
    category: "chat" as Model["category"],
    baseUrl: "", apiKey: "", modelApiName: "",
    badge: "" as string,
    tags: "",
  });
  const [editImportFormat, setEditImportFormat] = useState<"openai" | "custom">("openai");
  const [editCustomHeaders, setEditCustomHeaders] = useState<{ key: string; val: string }[]>([{ key: "", val: "" }]);
  const [saving, setSaving] = useState(false);

  const openEdit = (m: Model) => {
    setEditingModel(m);
    setEditForm({
      name: m.name,
      provider: m.provider,
      description: m.description,
      contextWindow: m.contextWindow,
      category: m.category,
      baseUrl: m.baseUrl || "",
      apiKey: m.apiKey || "",
      modelApiName: m.modelApiName || "",
      badge: m.badge || "",
      tags: (m.tags || []).join("、"),
    });
    setEditImportFormat(m.importFormat || "openai");
    setEditCustomHeaders(
      m.customHeaders
        ? Object.entries(m.customHeaders).map(([key, val]) => ({ key, val }))
        : [{ key: "", val: "" }]
    );
  };

  const handleEditSave = () => {
    if (!editingModel) return;
    setSaving(true);
    setTimeout(() => {
      setAdminModels((ms) =>
        ms.map((m) =>
          m.id === editingModel.id
            ? {
                ...m,
                name: editForm.name,
                provider: editForm.provider,
                description: editForm.description,
                contextWindow: editForm.contextWindow,
                category: editForm.category,
                baseUrl: editForm.baseUrl || undefined,
                apiKey: editForm.apiKey || undefined,
                modelApiName: editForm.modelApiName || undefined,
                badge: (editForm.badge as Model["badge"]) || undefined,
                tags: editForm.tags ? editForm.tags.split(/[，、,]+/).map((t) => t.trim()).filter(Boolean) : m.tags,
                importFormat: editImportFormat,
                customHeaders:
                  editImportFormat === "custom" && editCustomHeaders.some((h) => h.key && h.val)
                    ? Object.fromEntries(editCustomHeaders.filter((h) => h.key && h.val).map((h) => [h.key, h.val]))
                    : undefined,
              }
            : m
        )
      );
      setSaving(false);
      setEditingModel(null);
      toast.success(`${editForm.name} 已更新`);
    }, 600);
  };

  const filtered = adminModels.filter(
    (m) => m.name.toLowerCase().includes(search.toLowerCase()) || m.provider.toLowerCase().includes(search.toLowerCase())
  );

  const toggleStatus = (id: string) => {
    const model = adminModels.find((m) => m.id === id);
    const goingOffline = model?.status === "online";
    setAdminModels((ms) => ms.map((m) => (m.id === id ? { ...m, status: m.status === "online" ? "offline" : "online" } : m)));
    if (goingOffline) {
      toast.warning(`${model?.name} 已下线`, {
        description: "建议前往「通知管理」发布下线公告，以便相关用户及时知悉并调整集成。",
        duration: 8000,
        action: {
          label: "去发布通知",
          onClick: () => {
            // Signal to switch to notifications tab — can't directly call setActiveTab here,
            // so we store a flag and the admin page picks it up
            (window as any).__brdc_switchTab = "notifications";
            window.dispatchEvent(new CustomEvent("brdc-switch-tab", { detail: "notifications" }));
          },
        },
      });
    } else {
      toast.success(`${model?.name} 已重新上线`);
    }
  };

  const deleteModel = (id: string) => {
    const model = adminModels.find((m) => m.id === id);
    setAdminModels((ms) => ms.filter((m) => m.id !== id));
    toast.success(`${model?.name} 已删除`);
  };

  const handleAdd = () => {
    if (!newModel.id || !newModel.name || !newModel.provider) { toast.error("请填写必填字段"); return; }
    setAdding(true);
    setTimeout(() => {
      setAdminModels((ms) => [
        {
          ...newModel,
          shortDescription: newModel.description,
          pricing: "", status: "online", speed: "fast", addedAt: new Date().toISOString().split("T")[0],
          importFormat,
          baseUrl: newModel.baseUrl || undefined,
          apiKey: newModel.apiKey || undefined,
          modelApiName: newModel.modelApiName || undefined,
          customHeaders: (importFormat === "custom" && customHeaders.some((h) => h.key && h.val))
            ? Object.fromEntries(customHeaders.map((h) => [h.key, h.val]))
            : undefined,
        },
        ...ms,
      ]);
      setNewModel({ id: "", name: "", provider: "", description: "", contextWindow: "", category: "chat", baseUrl: "", apiKey: "", modelApiName: "" });
      setCustomHeaders([{ key: "", val: "" }]);
      setImportFormat("openai");
      setShowAdd(false);
      setAdding(false);
      toast.success("新模型已添加");
    }, 800);
  };

  const inputClass = "w-full px-4 py-3 rounded-xl bg-[#f5f0eb] text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/15 border border-border/40 transition-all";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-muted-foreground">共 {adminModels.length} 个模型</p>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-[13px] hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" /> 引入新模型
        </motion.button>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-[16px] h-[16px] text-muted-foreground/50" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜索模型..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/15 border border-border/30 shadow-sm"
        />
      </div>

      {/* Add Modal */}
      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-50 flex items-center justify-center p-4"
            onClick={() => setShowAdd(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 16 }}
              transition={{ duration: 0.22 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl w-full max-w-lg p-7 space-y-5 shadow-xl overflow-y-auto"
              style={{ maxHeight: "90vh" }}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-[18px] text-foreground" style={{ fontWeight: 600 }}>引入新模型</h2>
                <motion.button whileTap={{ scale: 0.9 }} onClick={() => setShowAdd(false)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
                  <X className="w-5 h-5 text-muted-foreground" />
                </motion.button>
              </div>
              <div className="space-y-3">
                {/* Basic fields */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[12px] text-muted-foreground block mb-1.5">模型 ID *</label>
                    <input value={newModel.id} onChange={(e) => setNewModel((n) => ({ ...n, id: e.target.value }))} className={inputClass} placeholder="my-model-v1" />
                  </div>
                  <div>
                    <label className="text-[12px] text-muted-foreground block mb-1.5">显示名称 *</label>
                    <input value={newModel.name} onChange={(e) => setNewModel((n) => ({ ...n, name: e.target.value }))} className={inputClass} placeholder="MyModel V1" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[12px] text-muted-foreground block mb-1.5">提供商 *</label>
                    <input value={newModel.provider} onChange={(e) => setNewModel((n) => ({ ...n, provider: e.target.value }))} className={inputClass} placeholder="通义千问" />
                  </div>
                  <div>
                    <label className="text-[12px] text-muted-foreground block mb-1.5">类别</label>
                    <select value={newModel.category} onChange={(e) => setNewModel((n) => ({ ...n, category: e.target.value as Model["category"] }))} className={inputClass}>
                      {Object.entries(categoryLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[12px] text-muted-foreground block mb-1.5">上下文窗口</label>
                    <input value={newModel.contextWindow} onChange={(e) => setNewModel((n) => ({ ...n, contextWindow: e.target.value }))} className={inputClass} placeholder="128K" />
                  </div>
                  <div>
                    <label className="text-[12px] text-muted-foreground block mb-1.5">API 模型名称</label>
                    <input value={newModel.modelApiName} onChange={(e) => setNewModel((n) => ({ ...n, modelApiName: e.target.value }))} className={inputClass} placeholder="同 ID 可留空" />
                  </div>
                </div>
                <div>
                  <label className="text-[12px] text-muted-foreground block mb-1.5">描述</label>
                  <textarea value={newModel.description} onChange={(e) => setNewModel((n) => ({ ...n, description: e.target.value }))} rows={2} className={inputClass + " resize-none"} placeholder="模型简介..." />
                </div>

                {/* Divider */}
                <div className="border-t border-border/30 pt-3">
                  <label className="text-[12px] text-muted-foreground block mb-2">接入格式</label>
                  <div className="flex gap-2 mb-3">
                    {[{ k: "openai" as const, label: "标准 OpenAI" }, { k: "custom" as const, label: "自定义接入" }].map(({ k, label }) => (
                      <motion.button key={k} type="button" whileTap={{ scale: 0.97 }} onClick={() => setImportFormat(k)}
                        className={`flex-1 py-2 rounded-xl text-[13px] transition-all border ${importFormat === k ? "bg-foreground text-background border-foreground" : "bg-background text-muted-foreground border-border/40 hover:text-foreground"}`}>
                        {label}
                      </motion.button>
                    ))}
                  </div>

                  {/* OpenAI / Custom shared fields */}
                  <div className="space-y-3">
                    <div>
                      <label className="text-[12px] text-muted-foreground block mb-1.5">Base URL</label>
                      <input value={newModel.baseUrl} onChange={(e) => setNewModel((n) => ({ ...n, baseUrl: e.target.value }))} className={inputClass} placeholder="https://api.example.com/v1" />
                    </div>
                    <div>
                      <label className="text-[12px] text-muted-foreground block mb-1.5">API Key</label>
                      <input type="password" value={newModel.apiKey} onChange={(e) => setNewModel((n) => ({ ...n, apiKey: e.target.value }))} className={inputClass} placeholder="sk-..." />
                    </div>
                    {importFormat === "custom" && (
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-[12px] text-muted-foreground">自定义请求头（可选）</label>
                          <motion.button
                            type="button"
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setCustomHeaders((h) => [...h, { key: "", val: "" }])}
                            className="flex items-center gap-1 text-[11px] text-primary hover:opacity-80 transition-opacity"
                          >
                            <Plus className="w-3 h-3" /> 添加
                          </motion.button>
                        </div>
                        <div className="space-y-2">
                          {customHeaders.map((h, hi) => (
                            <div key={hi} className="flex gap-2 items-center">
                              <input
                                value={h.key}
                                onChange={(e) => setCustomHeaders((hs) => hs.map((x, i) => i === hi ? { ...x, key: e.target.value } : x))}
                                className={inputClass + " flex-1"}
                                placeholder="Header 名称"
                              />
                              <input
                                value={h.val}
                                onChange={(e) => setCustomHeaders((hs) => hs.map((x, i) => i === hi ? { ...x, val: e.target.value } : x))}
                                className={inputClass + " flex-1"}
                                placeholder="Header 值"
                              />
                              {customHeaders.length > 1 && (
                                <motion.button
                                  type="button"
                                  whileTap={{ scale: 0.9 }}
                                  onClick={() => setCustomHeaders((hs) => hs.filter((_, i) => i !== hi))}
                                  className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </motion.button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-1">
                <motion.button whileTap={{ scale: 0.97 }} onClick={() => setShowAdd(false)} className="px-5 py-2.5 rounded-xl text-[13px] text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">取消</motion.button>
                <motion.button whileTap={{ scale: 0.97 }} onClick={handleAdd} disabled={adding} className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-xl text-[13px] disabled:opacity-60">
                  {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {adding ? "添加中..." : "确认添加"}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Edit Modal ── */}
      <AnimatePresence>
        {editingModel && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-50 flex items-center justify-center p-4"
            onClick={() => setEditingModel(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 16 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 16 }} transition={{ duration: 0.22 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl w-full max-w-lg p-7 space-y-5 shadow-xl overflow-y-auto"
              style={{ maxHeight: "90vh" }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-[18px] text-foreground" style={{ fontWeight: 600 }}>编辑模型</h2>
                  <p className="text-[12px] text-muted-foreground mt-0.5">ID: <code style={{ fontFamily: "'JetBrains Mono', monospace" }}>{editingModel.id}</code></p>
                </div>
                <motion.button whileTap={{ scale: 0.9 }} onClick={() => setEditingModel(null)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
                  <X className="w-5 h-5 text-muted-foreground" />
                </motion.button>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[12px] text-muted-foreground block mb-1.5">显示名称</label>
                    <input value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} className={inputClass} />
                  </div>
                  <div>
                    <label className="text-[12px] text-muted-foreground block mb-1.5">提供商</label>
                    <input value={editForm.provider} onChange={(e) => setEditForm((f) => ({ ...f, provider: e.target.value }))} className={inputClass} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[12px] text-muted-foreground block mb-1.5">类别</label>
                    <select value={editForm.category} onChange={(e) => setEditForm((f) => ({ ...f, category: e.target.value as Model["category"] }))} className={inputClass}>
                      {Object.entries(categoryLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[12px] text-muted-foreground block mb-1.5">上下文窗口</label>
                    <input value={editForm.contextWindow} onChange={(e) => setEditForm((f) => ({ ...f, contextWindow: e.target.value }))} className={inputClass} placeholder="128K" />
                  </div>
                </div>
                <div>
                  <label className="text-[12px] text-muted-foreground block mb-1.5">描述</label>
                  <textarea value={editForm.description} onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))} rows={2} className={inputClass + " resize-none"} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[12px] text-muted-foreground block mb-1.5">标签（逗号/顿号分隔）</label>
                    <input value={editForm.tags} onChange={(e) => setEditForm((f) => ({ ...f, tags: e.target.value }))} className={inputClass} placeholder="代码、推理、中文" />
                  </div>
                  <div>
                    <label className="text-[12px] text-muted-foreground block mb-1.5">徽章</label>
                    <select value={editForm.badge} onChange={(e) => setEditForm((f) => ({ ...f, badge: e.target.value }))} className={inputClass}>
                      <option value="">无</option>
                      <option value="推荐">推荐</option>
                      <option value="热门">热门</option>
                      <option value="新上线">新上线</option>
                      <option value="蒸馏">蒸馏</option>
                      <option value="大参数">大参数</option>
                    </select>
                  </div>
                </div>

                <div className="border-t border-border/30 pt-3">
                  <label className="text-[12px] text-muted-foreground block mb-2">接入配置</label>
                  <div className="flex gap-2 mb-3">
                    {[{ k: "openai" as const, label: "标准 OpenAI" }, { k: "custom" as const, label: "自定义接入" }].map(({ k, label }) => (
                      <motion.button key={k} type="button" whileTap={{ scale: 0.97 }} onClick={() => setEditImportFormat(k)}
                        className={`flex-1 py-2 rounded-xl text-[13px] transition-all border ${editImportFormat === k ? "bg-foreground text-background border-foreground" : "bg-background text-muted-foreground border-border/40 hover:text-foreground"}`}>
                        {label}
                      </motion.button>
                    ))}
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="text-[12px] text-muted-foreground block mb-1.5">Base URL</label>
                      <input value={editForm.baseUrl} onChange={(e) => setEditForm((f) => ({ ...f, baseUrl: e.target.value }))} className={inputClass} placeholder="留空则使用平台默认" />
                    </div>
                    <div>
                      <label className="text-[12px] text-muted-foreground block mb-1.5">API Key</label>
                      <input type="password" value={editForm.apiKey} onChange={(e) => setEditForm((f) => ({ ...f, apiKey: e.target.value }))} className={inputClass} placeholder="留空则不变" />
                    </div>
                    <div>
                      <label className="text-[12px] text-muted-foreground block mb-1.5">API 模型名称（调用时实际传入的 model 字段）</label>
                      <input value={editForm.modelApiName} onChange={(e) => setEditForm((f) => ({ ...f, modelApiName: e.target.value }))} className={inputClass} placeholder="留空则同 ID" />
                    </div>
                    {editImportFormat === "custom" && (
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-[12px] text-muted-foreground">自定义请求头</label>
                          <motion.button type="button" whileTap={{ scale: 0.95 }} onClick={() => setEditCustomHeaders((h) => [...h, { key: "", val: "" }])} className="flex items-center gap-1 text-[11px] text-primary hover:opacity-80 transition-opacity">
                            <Plus className="w-3 h-3" /> 添加
                          </motion.button>
                        </div>
                        <div className="space-y-2">
                          {editCustomHeaders.map((h, hi) => (
                            <div key={hi} className="flex gap-2 items-center">
                              <input value={h.key} onChange={(e) => setEditCustomHeaders((hs) => hs.map((x, i) => i === hi ? { ...x, key: e.target.value } : x))} className={inputClass + " flex-1"} placeholder="Header 名称" />
                              <input value={h.val} onChange={(e) => setEditCustomHeaders((hs) => hs.map((x, i) => i === hi ? { ...x, val: e.target.value } : x))} className={inputClass + " flex-1"} placeholder="Header 值" />
                              {editCustomHeaders.length > 1 && (
                                <motion.button type="button" whileTap={{ scale: 0.9 }} onClick={() => setEditCustomHeaders((hs) => hs.filter((_, i) => i !== hi))} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors shrink-0">
                                  <X className="w-3.5 h-3.5" />
                                </motion.button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-1">
                <motion.button whileTap={{ scale: 0.97 }} onClick={() => setEditingModel(null)} className="px-5 py-2.5 rounded-xl text-[13px] text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">取消</motion.button>
                <motion.button whileTap={{ scale: 0.97 }} onClick={handleEditSave} disabled={saving} className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-xl text-[13px] disabled:opacity-60">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  {saving ? "保存中..." : "保存更改"}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-2">
        <AnimatePresence>
          {filtered.map((m, i) => (
            <motion.div
              key={m.id}
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, x: -20, height: 0, marginBottom: 0 }}
              transition={{ delay: i * 0.015, duration: 0.25 }}
              className="bg-white rounded-xl px-5 py-3.5 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-3">
                <ProviderIcon provider={m.provider} size="md" className="shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[14px] text-foreground" style={{ fontWeight: 500 }}>{m.name}</span>
                    <span className="text-[12px] text-muted-foreground">{m.provider}</span>
                    <span className="text-[11px] bg-secondary px-2 py-0.5 rounded">{categoryLabels[m.category]}</span>
                    {m.contextWindow && m.contextWindow !== "-" && (
                      <span className="text-[11px] bg-secondary px-2 py-0.5 rounded">{m.contextWindow}</span>
                    )}
                    {m.badge && (
                      <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full" style={{ fontWeight: 500 }}>{m.badge}</span>
                    )}
                  </div>
                  <p className="text-[12px] text-muted-foreground mt-0.5 truncate">{m.description}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className={`text-[11px] px-2.5 py-0.5 rounded-md mr-1 ${
                    m.status === "online" ? "bg-green-50 text-green-700" : m.status === "maintenance" ? "bg-amber-50 text-amber-700" : "bg-gray-100 text-gray-500"
                  }`}>
                    {statusLabels[m.status]}
                  </span>
                  <motion.button whileTap={{ scale: 0.9 }} onClick={() => openEdit(m)}
                    className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors" title="编辑">
                    <Edit2 className="w-4 h-4" />
                  </motion.button>
                  <motion.button whileTap={{ scale: 0.9 }} onClick={() => toggleStatus(m.id)}
                    className={`p-2 rounded-lg transition-colors ${m.status === "online" ? "text-amber-500 hover:bg-amber-50" : "text-green-500 hover:bg-green-50"}`}
                    title={m.status === "online" ? "下线" : "上线"}>
                    {m.status === "online" ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                  </motion.button>
                  <motion.button whileTap={{ scale: 0.9 }} onClick={() => deleteModel(m.id)} className="p-2 rounded-lg text-red-400 hover:bg-red-50 transition-colors" title="删除">
                    <Trash2 className="w-4 h-4" />
                  </motion.button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── Users Tab ─────────────────────────────────────────────────────────────
function UsersTab() {
  const [records, setRecords] = useState<ApiRecord[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    try {
      setRecords(JSON.parse(localStorage.getItem("brdc_api_records") || "[]"));
    } catch { setRecords([]); }
  }, []);

  const revoke = (idx: number) => {
    const all: ApiRecord[] = (() => {
      try { return JSON.parse(localStorage.getItem("brdc_api_records") || "[]"); } catch { return []; }
    })();
    // Find the record by matching apiKey (safe unique identifier)
    const target = filtered[idx];
    const updated = all.map((r) =>
      r.apiKey === target.apiKey ? { ...r, revoked: true } : r
    );
    localStorage.setItem("brdc_api_records", JSON.stringify(updated));
    setRecords(updated);
    toast.success("已撤销 — 用户查询时将显示为已失效，可重新申请");
  };

  const filtered = records.filter((r) =>
    r.name.includes(search) || r.authId.includes(search) || r.projectName.includes(search) || r.department.includes(search)
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-muted-foreground">共 {records.length} 个授权用户</p>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => { try { setRecords(JSON.parse(localStorage.getItem("brdc_api_records") || "[]")); } catch { setRecords([]); } toast.success("已刷新"); }}
          className="text-[13px] px-3 py-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        >
          刷新
        </motion.button>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-[16px] h-[16px] text-muted-foreground/50" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜索姓名、认证号、需求名称..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/15 border border-border/30 shadow-sm"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground/60 text-[14px]">
          {records.length === 0 ? "暂无授权用户记录" : "无匹配结果"}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((rec, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="bg-white rounded-xl px-5 py-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-[14px] text-foreground" style={{ fontWeight: 500 }}>{rec.name}</span>
                    <span className="text-[12px] text-muted-foreground bg-secondary px-2 py-0.5 rounded">{rec.authId}</span>
                    <span className="text-[12px] text-muted-foreground">{rec.department}</span>
                  </div>
                  <p className="text-[13px] text-foreground/80 mb-2">{rec.projectName}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    {rec.models.map((id) => (
                      <span key={id} className="text-[11px] bg-accent text-accent-foreground px-2 py-0.5 rounded">{id}</span>
                    ))}
                  </div>
                  <p className="text-[11px] text-muted-foreground/60 mt-2">
                    授权于 {rec.grantedAt} · Key: <code className="font-mono" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{rec.apiKey.slice(0, 16)}...</code>
                  </p>
                </div>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => revoke(records.indexOf(rec))}
                  className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg text-[12px] text-red-500 hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" /> 撤销
                </motion.button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Notifications Tab ─────────────────────────────────────────────────────
const notifTypeOptions = [
  { value: "online", label: "上线", dot: "bg-green-400" },
  { value: "offline", label: "下线", dot: "bg-red-400" },
  { value: "maintenance", label: "维护", dot: "bg-amber-400" },
  { value: "info", label: "公告", dot: "bg-blue-400" },
] as const;

function NotificationsTab() {
  const { notifications, setNotifications } = useModels();
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", description: "", type: "info" as NotificationItem["type"], date: new Date().toISOString().slice(0, 10), isNew: true });

  const deleteNotif = (id: string) => {
    setNotifications((ns) => ns.filter((n) => n.id !== id));
    toast.success("通知已删除");
  };

  const toggleNew = (id: string) => {
    setNotifications((ns) => ns.map((n) => (n.id === id ? { ...n, isNew: !n.isNew } : n)));
  };

  const saveEdit = (id: string) => {
    setNotifications((ns) => ns.map((n) => (n.id === id ? { ...n, ...form } : n)));
    setEditId(null);
    toast.success("通知已更新");
  };

  const addNotif = () => {
    if (!form.title) { toast.error("请填写标题"); return; }
    setNotifications((ns) => [
      { ...form, id: Date.now().toString() },
      ...ns,
    ]);
    setForm({ title: "", description: "", type: "info", date: new Date().toISOString().slice(0, 10), isNew: true });
    setShowAdd(false);
    toast.success("通知已添加");
  };

  const inputClass = "w-full px-3 py-2.5 rounded-xl bg-[#f5f0eb] text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/15 border border-border/30 transition-all";
  const typeColor: Record<NotificationItem["type"], string> = {
    online: "bg-green-50 text-green-700",
    offline: "bg-red-50 text-red-600",
    maintenance: "bg-amber-50 text-amber-700",
    info: "bg-blue-50 text-blue-600",
  };
  const typeLabel: Record<NotificationItem["type"], string> = { online: "上线", offline: "下线", maintenance: "维护", info: "公告" };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-muted-foreground">共 {notifications.length} 条通知</p>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => { setShowAdd(true); setEditId(null); }}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-[13px] hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" /> 新增通知
        </motion.button>
      </div>

      {/* Add/Edit form */}
      <AnimatePresence>
        {(showAdd || editId) && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22 }}
            className="bg-white rounded-2xl p-5 shadow-sm border border-border/20 space-y-3"
          >
            <h3 className="text-[14px]" style={{ fontWeight: 500 }}>{editId ? "编辑通知" : "新增通知"}</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-muted-foreground block mb-1">标题 *</label>
                <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className={inputClass} placeholder="通知标题" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-muted-foreground block mb-1">类型</label>
                  <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as NotificationItem["type"] }))} className={inputClass}>
                    {notifTypeOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-muted-foreground block mb-1">日期</label>
                  <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} className={inputClass} />
                </div>
              </div>
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground block mb-1">描述</label>
              <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2} className={inputClass + " resize-none"} placeholder="通知详情..." />
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <motion.div
                  animate={{ backgroundColor: form.isNew ? "#2A2019" : "rgba(0,0,0,0)", borderColor: form.isNew ? "#2A2019" : "#d4ccc3" }}
                  className="w-4 h-4 rounded border-2 flex items-center justify-center shrink-0"
                  onClick={() => setForm((f) => ({ ...f, isNew: !f.isNew }))}
                >
                  {form.isNew && <Check className="w-2.5 h-2.5 text-white" />}
                </motion.div>
                <span className="text-[12px] text-muted-foreground">标记为新通知</span>
              </label>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <motion.button whileTap={{ scale: 0.97 }} onClick={() => { setShowAdd(false); setEditId(null); }} className="px-4 py-2 rounded-xl text-[13px] text-muted-foreground hover:bg-secondary transition-colors">取消</motion.button>
              <motion.button whileTap={{ scale: 0.97 }} onClick={editId ? () => saveEdit(editId) : addNotif} className="px-5 py-2 bg-primary text-white rounded-xl text-[13px] hover:opacity-90 transition-opacity">
                {editId ? "保存" : "发布"}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-2">
        {notifications.map((n, i) => (
          <motion.div
            key={n.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            className="bg-white rounded-xl px-5 py-3.5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  <span className={`text-[11px] px-2 py-0.5 rounded-md ${typeColor[n.type]}`}>{typeLabel[n.type]}</span>
                  <span className="text-[14px] text-foreground" style={{ fontWeight: 500 }}>{n.title}</span>
                  {n.isNew && <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full" style={{ fontWeight: 500 }}>New</span>}
                </div>
                <p className="text-[12px] text-muted-foreground truncate">{n.description}</p>
                <p className="text-[11px] text-muted-foreground/50 mt-1">{n.date}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => { setEditId(n.id); setShowAdd(false); setForm({ title: n.title, description: n.description, type: n.type, date: n.date, isNew: !!n.isNew }); }}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                  title="编辑"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => toggleNew(n.id)}
                  className={`p-1.5 rounded-lg transition-colors text-[10px] ${n.isNew ? "text-primary hover:bg-primary/10" : "text-muted-foreground hover:bg-secondary"}`}
                  title={n.isNew ? "取消标记为新" : "标记为新"}
                >
                  <Bell className="w-3.5 h-3.5" />
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => deleteNotif(n.id)}
                  className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 transition-colors"
                  title="删除"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </motion.button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ── Main AdminPage ─────────────────────────────────────────────────────────
export function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("models");

  // Listen for tab-switch events dispatched by toast actions
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as Tab;
      if (detail) setActiveTab(detail);
    };
    window.addEventListener("brdc-switch-tab", handler);
    return () => window.removeEventListener("brdc-switch-tab", handler);
  }, []);

  const tabs: { key: Tab; label: string; icon: typeof Database }[] = [
    { key: "models", label: "模型管理", icon: Database },
    { key: "users", label: "用户管理", icon: Users },
    { key: "notifications", label: "通知管理", icon: Bell },
  ];

  if (!authed) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="max-w-sm mx-auto pt-20"
      >
        <div className="bg-white rounded-2xl p-8 shadow-sm text-center space-y-5">
          <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center mx-auto">
            <Lock className="w-5 h-5 text-muted-foreground" />
          </div>
          <div>
            <h2 className="text-[20px] text-foreground" style={{ fontWeight: 600 }}>管理员验证</h2>
            <p className="text-[13px] text-muted-foreground mt-1">请输入管理员密码以访问后台</p>
          </div>
          <form onSubmit={(e) => {
            e.preventDefault();
            if (password === ADMIN_PASSWORD) { setAuthed(true); } else { toast.error("密码错误"); setPassword(""); }
          }}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码"
              className="w-full px-4 py-3 rounded-xl bg-background text-[14px] text-center focus:outline-none focus:ring-2 focus:ring-primary/15 border border-border/40 mb-4"
              autoFocus
            />
            <motion.button whileTap={{ scale: 0.97 }} type="submit" className="w-full py-2.5 bg-primary text-white rounded-xl text-[14px] hover:opacity-90 transition-opacity">
              进入后台
            </motion.button>
          </form>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <h1 className="text-[28px] sm:text-[34px] text-foreground">管理后台</h1>
        <p className="text-muted-foreground text-[14px] mt-1">BRDC.ai API 平台数据管理</p>
      </motion.div>

      {/* Tab navigation */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08, duration: 0.3 }}
        className="flex gap-1 bg-secondary/60 p-1 rounded-xl w-fit"
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <motion.button
              key={tab.key}
              whileTap={{ scale: 0.97 }}
              onClick={() => setActiveTab(tab.key)}
              className={`relative flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] transition-colors ${
                activeTab === tab.key ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
              style={{ fontWeight: activeTab === tab.key ? 500 : 400 }}
            >
              {activeTab === tab.key && (
                <motion.div
                  layoutId="admin-tab-bg"
                  className="absolute inset-0 bg-white rounded-lg shadow-sm"
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                />
              )}
              <Icon className="w-3.5 h-3.5 relative z-10" />
              <span className="relative z-10">{tab.label}</span>
            </motion.button>
          );
        })}
      </motion.div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === "models" && <ModelsTab />}
          {activeTab === "users" && <UsersTab />}
          {activeTab === "notifications" && <NotificationsTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}