import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  CheckCircle2, Loader2, ArrowLeft, ArrowRight, Copy, Check,
  Eye, EyeOff, Search, KeyRound, FileText, ChevronRight, AlertCircle, RotateCcw,
} from "lucide-react";
import { categoryLabels, type Model } from "./model-data";
import { useModels } from "./model-context";
import { toast } from "sonner";
import { useSearchParams, useNavigate } from "react-router";
import { ProviderIcon } from "./provider-logos";

type PageMode = null | "apply" | "lookup";

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

function generateApiKey(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let key = "brdc-sk-";
  for (let i = 0; i < 32; i++) key += chars[Math.floor(Math.random() * chars.length)];
  return key;
}

interface ApiRecord {
  id: string;
  name: string;
  authId: string;
  projectName: string;
  projectDesc: string;
  department: string;
  models: string[];
  apiKey: string;
  grantedAt: string;
  revoked?: boolean;
}

function getRecords(): ApiRecord[] {
  try { return JSON.parse(localStorage.getItem("brdc_api_records") || "[]"); } catch { return []; }
}

function saveRecords(records: ApiRecord[]) {
  localStorage.setItem("brdc_api_records", JSON.stringify(records));
}

function addRecord(record: ApiRecord) {
  const records = getRecords();
  records.push(record);
  saveRecords(records);
}

// ── ModeSelector ─────────────────────────────────────────────────────────────
function ModeSelector({ onSelect }: { onSelect: (m: "apply" | "lookup") => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, duration: 0.3 }}
      className="grid sm:grid-cols-2 gap-4 max-w-2xl mx-auto"
    >
      {[
        {
          key: "apply" as const,
          icon: FileText,
          title: "申请新 API Key",
          desc: "填写需求信息并选择模型，提交后自动审批，即时获取 Key",
          color: "text-primary",
          bg: "hover:border-primary/30 hover:bg-accent/60",
        },
        {
          key: "lookup" as const,
          icon: KeyRound,
          title: "查阅已申请记录",
          desc: "输入统一认证号，查看已获批的 API Key 与授权模型列表",
          color: "text-blue-500",
          bg: "hover:border-blue-300/40 hover:bg-blue-50/40",
        },
      ].map((opt) => {
        const Icon = opt.icon;
        return (
          <motion.button
            key={opt.key}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect(opt.key)}
            className={`group text-left bg-white rounded-2xl p-6 shadow-sm border border-border/20 transition-all ${opt.bg}`}
          >
            <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
              <Icon className={`w-5 h-5 ${opt.color}`} />
            </div>
            <h3 className="text-[15px] text-foreground mb-1.5" style={{ fontWeight: 600 }}>{opt.title}</h3>
            <p className="text-[13px] text-muted-foreground leading-relaxed">{opt.desc}</p>
            <div className={`flex items-center gap-1 mt-3 text-[12px] ${opt.color}`} style={{ fontWeight: 500 }}>
              进入 <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </motion.button>
        );
      })}
    </motion.div>
  );
}

// ── LookupPanel ───────────────────────────────────────────────────────────────
function LookupPanel({ onBack }: { onBack: () => void }) {
  const navigate = useNavigate();
  const { models } = useModels();
  const [authId, setAuthId] = useState("");
  const [searched, setSearched] = useState(false);
  const [records, setRecords] = useState<ApiRecord[]>([]);
  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleSearch = () => {
    if (!authId.trim()) { toast.error("请输入统一认证号"); return; }
    const all = getRecords();
    const found = all.filter((r) => r.authId === authId.trim());
    setRecords(found);
    setSearched(true);
  };

  const toggleVisible = (id: string) =>
    setVisibleKeys((v) => ({ ...v, [id]: !v[id] }));

  const copyKey = (key: string, id: string) => {
    copyToClipboard(key);
    setCopiedId(id);
    toast.success("API Key 已复制");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleReapply = (rec: ApiRecord) => {
    // Store prefill data in localStorage, then navigate to apply
    localStorage.setItem("brdc_prefill_record", JSON.stringify(rec));
    navigate("/apply?mode=apply");
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.25 }}
      className="max-w-xl mx-auto space-y-5"
    >
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> 返回
      </button>

      <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
        <h2 className="text-[17px] text-foreground" style={{ fontWeight: 600 }}>查阅已申请记录</h2>
        <p className="text-[13px] text-muted-foreground">输入您的统一认证号以查询已授权的 API Key</p>
        <div className="flex gap-3">
          <input
            value={authId}
            onChange={(e) => setAuthId(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="请输入统一认证号"
            className="flex-1 px-4 py-3 rounded-xl bg-background text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/15 border border-border/40 transition-all"
          />
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleSearch}
            className="flex items-center gap-2 px-5 py-3 bg-primary text-white rounded-xl text-[13px] hover:opacity-90 transition-opacity"
          >
            <Search className="w-4 h-4" /> 查询
          </motion.button>
        </div>
      </div>

      <AnimatePresence>
        {searched && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            {records.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-[14px]">
                未找到认证号 <span className="font-mono text-foreground">{authId}</span> 的申请记录
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-[13px] text-muted-foreground pl-1">共找到 {records.length} 条记录</p>
                {records.map((rec, i) => {
                  const isRevoked = !!rec.revoked;
                  return (
                    <motion.div
                      key={rec.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.06 }}
                      className={`bg-white rounded-2xl p-5 shadow-sm border space-y-3 transition-all ${
                        isRevoked ? "border-red-100 opacity-70" : "border-border/15"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-[15px] text-foreground" style={{ fontWeight: 500 }}>{rec.projectName}</p>
                          {rec.projectDesc && (
                            <p className="text-[12px] text-muted-foreground mt-0.5 leading-relaxed">{rec.projectDesc}</p>
                          )}
                          <p className="text-[11px] text-muted-foreground/60 mt-1">{rec.department} · 授权于 {rec.grantedAt}</p>
                        </div>
                        {isRevoked ? (
                          <span className="text-[11px] bg-red-50 text-red-600 px-2.5 py-1 rounded-full shrink-0 flex items-center gap-1" style={{ fontWeight: 500 }}>
                            <AlertCircle className="w-3 h-3" /> 已失效
                          </span>
                        ) : (
                          <span className="text-[11px] bg-green-50 text-green-700 px-2.5 py-1 rounded-full shrink-0" style={{ fontWeight: 500 }}>
                            有效
                          </span>
                        )}
                      </div>

                      {/* API Key — hidden/shown, grayed if revoked */}
                      <div className={`rounded-xl px-4 py-3 flex items-center gap-2 ${isRevoked ? "bg-gray-50" : "bg-secondary/50"}`}>
                        <code
                          className={`flex-1 text-[12px] break-all ${isRevoked ? "text-muted-foreground/50" : "text-foreground/90"}`}
                          style={{ fontFamily: "'JetBrains Mono', monospace" }}
                        >
                          {visibleKeys[rec.id]
                            ? rec.apiKey
                            : rec.apiKey.slice(0, 8) + "•".repeat(24)}
                        </code>
                        <button
                          onClick={() => toggleVisible(rec.id)}
                          className="p-1.5 text-muted-foreground hover:text-foreground transition-colors shrink-0"
                        >
                          {visibleKeys[rec.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        {!isRevoked && (
                          <button
                            onClick={() => copyKey(rec.apiKey, rec.id)}
                            className="p-1.5 text-muted-foreground hover:text-foreground transition-colors shrink-0"
                          >
                            {copiedId === rec.id ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                          </button>
                        )}
                      </div>

                      {/* Models */}
                      <div>
                        <p className="text-[11px] text-muted-foreground mb-1.5">已授权模型</p>
                        <div className="flex flex-wrap gap-1.5">
                          {rec.models.map((id) => (
                            <span key={id} className={`text-[11px] px-2.5 py-0.5 rounded-lg ${isRevoked ? "bg-gray-100 text-gray-400" : "bg-accent"}`}>{id}</span>
                          ))}
                        </div>
                      </div>

                      {!isRevoked && (
                        <p className="text-[11px] text-muted-foreground/50">
                          Base URL: <code style={{ fontFamily: "'JetBrains Mono', monospace" }}>http://api.brdc-ai.cs.icbc</code>
                        </p>
                      )}

                      {/* Re-apply button for revoked records */}
                      {isRevoked && (
                        <div className="border-t border-red-50 pt-3">
                          <p className="text-[12px] text-muted-foreground mb-2">此申请已被管理员撤销，您可在原有基础上修改后重新申请。</p>
                          <motion.button
                            whileTap={{ scale: 0.97 }}
                            onClick={() => handleReapply(rec)}
                            className="flex items-center gap-1.5 px-4 py-2 bg-foreground/10 hover:bg-foreground/15 text-foreground rounded-xl text-[13px] transition-colors"
                          >
                            <RotateCcw className="w-3.5 h-3.5" /> 修改并重新申请
                          </motion.button>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── ApplyForm ─────────────────────────────────────────────────────────────────
function ApplyForm({ onBack }: { onBack: () => void }) {
  const { models } = useModels();
  const [searchParams] = useSearchParams();
  const preselectedModel = searchParams.get("model");

  // Check for prefill data from revoked record re-apply
  const prefillRaw = localStorage.getItem("brdc_prefill_record");
  const prefill: ApiRecord | null = (() => {
    if (!prefillRaw) return null;
    try { return JSON.parse(prefillRaw); } catch { return null; }
  })();

  const [form, setForm] = useState({
    name: prefill?.name ?? "",
    authId: prefill?.authId ?? "",
    projectName: prefill?.projectName ?? "",
    projectDesc: prefill?.projectDesc ?? "",
    department: prefill?.department ?? "",
    startDate: "",
    estimatedTokens: "100K",
    selectedModels: prefill?.models ?? ([] as string[]),
  });
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newApiKey, setNewApiKey] = useState("");
  const [keyVisible, setKeyVisible] = useState(false);
  const [keyCopied, setKeyCopied] = useState(false);

  // Clear prefill after mounting
  useEffect(() => {
    localStorage.removeItem("brdc_prefill_record");
  }, []);

  useEffect(() => {
    if (preselectedModel && models.find((m) => m.id === preselectedModel)) {
      setForm((f) => ({
        ...f,
        selectedModels: f.selectedModels.includes(preselectedModel)
          ? f.selectedModels
          : [...f.selectedModels, preselectedModel],
      }));
    }
  }, [preselectedModel, models]);

  const toggleModel = (id: string) =>
    setForm((f) => ({
      ...f,
      selectedModels: f.selectedModels.includes(id)
        ? f.selectedModels.filter((m) => m !== id)
        : [...f.selectedModels, id],
    }));

  const handleSubmit = () => {
    setLoading(true);
    setTimeout(() => {
      const apiKey = generateApiKey();
      const record: ApiRecord = {
        id: Date.now().toString(),
        name: form.name,
        authId: form.authId,
        projectName: form.projectName,
        projectDesc: form.projectDesc,
        department: form.department,
        models: form.selectedModels,
        apiKey,
        grantedAt: new Date().toISOString().slice(0, 10),
      };
      addRecord(record);
      setNewApiKey(apiKey);
      setLoading(false);
      setSubmitted(true);
    }, 1200);
  };

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col items-center justify-center py-12 text-center max-w-lg mx-auto"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", delay: 0.1, stiffness: 220, damping: 14 }}
          className="w-16 h-16 rounded-2xl bg-green-50 flex items-center justify-center mb-5"
        >
          <CheckCircle2 className="w-9 h-9 text-green-500" />
        </motion.div>
        <h2 className="text-[22px] text-foreground" style={{ fontWeight: 600 }}>申请已自动审核通过</h2>
        <p className="text-muted-foreground mt-1.5 text-[14px]">API Key 已生成，请妥善保管</p>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="w-full mt-6 bg-white rounded-2xl p-5 shadow-sm border border-border/20 text-left"
        >
          <p className="text-[12px] text-muted-foreground mb-2">您的 API Key</p>
          <div className="flex items-center gap-2 bg-secondary/60 rounded-xl px-4 py-3 mb-4">
            <code className="flex-1 text-[12px] break-all" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {keyVisible ? newApiKey : newApiKey.slice(0, 8) + "•".repeat(24)}
            </code>
            <button onClick={() => setKeyVisible(!keyVisible)} className="p-1.5 text-muted-foreground hover:text-foreground transition-colors shrink-0">
              {keyVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
            <button
              onClick={() => { copyToClipboard(newApiKey); setKeyCopied(true); toast.success("已复制"); setTimeout(() => setKeyCopied(false), 2000); }}
              className="p-1.5 text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              {keyCopied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-[12px] text-muted-foreground mb-2">已授权模型</p>
          <div className="flex flex-wrap gap-1.5">
            {form.selectedModels.map((id) => (
              <span key={id} className="bg-accent text-accent-foreground px-2.5 py-1 rounded-lg text-[12px]">{id}</span>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground/50 mt-3">
            Base URL: <code style={{ fontFamily: "'JetBrains Mono', monospace" }}>http://api.brdc-ai.cs.icbc</code>
          </p>
        </motion.div>

        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45 }}
          whileTap={{ scale: 0.97 }}
          onClick={onBack}
          className="mt-5 px-6 py-2.5 bg-foreground text-background rounded-xl text-[13px] hover:opacity-80 transition-opacity"
        >
          返回首页
        </motion.button>
      </motion.div>
    );
  }

  const inputClass = "w-full px-4 py-3 rounded-xl bg-background text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/15 border border-border/40 transition-all";
  const steps = ["基本信息", "选择模型", "确认"];
  const categoryOrder: Model["category"][] = ["flagship", "chat", "vision", "embedding", "reranker"];
  const onlineModels = models.filter((m) => m.status === "online");
  const groupedModels = categoryOrder
    .map((cat) => ({ category: cat, models: onlineModels.filter((m) => m.category === cat) }))
    .filter((g) => g.models.length > 0);

  return (
    <div className="max-w-xl mx-auto space-y-5">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> 返回
      </button>

      {prefill && (
        <div className="bg-amber-50 border border-amber-200/50 rounded-xl px-4 py-3 flex items-center gap-2 text-[13px] text-amber-700">
          <RotateCcw className="w-3.5 h-3.5 shrink-0" />
          已从已失效申请「{prefill.projectName}」预填充，请修改后重新提交。
        </div>
      )}

      {/* Steps */}
      <div className="flex items-center justify-center gap-3">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-3">
            <button onClick={() => i < step && setStep(i)} className="flex items-center gap-2">
              <motion.div
                animate={{ backgroundColor: i <= step ? "#2A2019" : "#ece5de", color: i <= step ? "#f5f0eb" : "#8b7e74" }}
                transition={{ duration: 0.3 }}
                className="w-7 h-7 rounded-full flex items-center justify-center text-[12px]"
                style={{ fontWeight: 500 }}
              >
                {i < step ? "✓" : i + 1}
              </motion.div>
              <span className={`text-[13px] hidden sm:inline transition-colors ${i <= step ? "text-foreground" : "text-muted-foreground"}`}>{s}</span>
            </button>
            {i < steps.length - 1 && <motion.div animate={{ backgroundColor: i < step ? "#2A2019" : "#e0d8cf" }} className="w-10 h-px" />}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* ── Step 0 ── */}
        {step === 0 && (
          <motion.div key="s0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }} className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[12px] text-muted-foreground block mb-1.5">申请人姓名 *</label>
                <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={inputClass} placeholder="您的姓名" />
              </div>
              <div>
                <label className="text-[12px] text-muted-foreground block mb-1.5">统一认证号 *</label>
                <input value={form.authId} onChange={(e) => setForm((f) => ({ ...f, authId: e.target.value }))} className={inputClass} placeholder="请输入统一认证号" />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[12px] text-muted-foreground block mb-1.5">需求名称 *</label>
                <input value={form.projectName} onChange={(e) => setForm((f) => ({ ...f, projectName: e.target.value }))} className={inputClass} placeholder="如：智能客服系统" />
              </div>
              <div>
                <label className="text-[12px] text-muted-foreground block mb-1.5">需求负责部门 *</label>
                <input value={form.department} onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))} className={inputClass} placeholder="大数据应用部" />
              </div>
            </div>
            <div>
              <label className="text-[12px] text-muted-foreground block mb-1.5">需求描述 *</label>
              <textarea value={form.projectDesc} onChange={(e) => setForm((f) => ({ ...f, projectDesc: e.target.value }))} rows={3} className={inputClass + " resize-none"} placeholder="简要描述使用场景与目标..." />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[12px] text-muted-foreground block mb-1.5">需求开展时间</label>
                <input type="date" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} className={inputClass} />
              </div>
              <div>
                <label className="text-[12px] text-muted-foreground block mb-1.5">预计 Token 用量（周）</label>
                <div className="flex gap-2 flex-wrap">
                  {["100K", "500K", "1M", "5M", "10M+"].map((q) => (
                    <motion.button key={q} type="button" whileTap={{ scale: 0.95 }} onClick={() => setForm((f) => ({ ...f, estimatedTokens: q }))}
                      className={`px-3 py-1.5 rounded-lg text-[12px] transition-all ${form.estimatedTokens === q ? "bg-foreground text-background" : "bg-background text-muted-foreground border border-border/40 hover:text-foreground"}`}>
                      {q}<span className="text-[10px] opacity-50 ml-0.5">/周</span>
                    </motion.button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end pt-1">
              <motion.button whileTap={{ scale: 0.97 }} onClick={() => {
                if (!form.name || !form.authId || !form.projectName || !form.department || !form.projectDesc) { toast.error("请填写所有必填字段"); return; }
                setStep(1);
              }} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl text-[13px] hover:opacity-90 transition-opacity">
                下一步 <ArrowRight className="w-3.5 h-3.5" />
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* ── Step 1 ── */}
        {step === 1 && (
          <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }} className="bg-white rounded-2xl p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between">
              <p className="text-[13px] text-muted-foreground">选择需要使用的模型（支持多选）</p>
              {form.selectedModels.length > 0 && <span className="text-[12px] text-primary" style={{ fontWeight: 500 }}>已选 {form.selectedModels.length} 个</span>}
            </div>
            <div className="space-y-5">
              {groupedModels.map((group, gi) => (
                <div key={group.category}>
                  <p className="text-[11px] text-muted-foreground/60 mb-2 pl-0.5" style={{ fontWeight: 600, letterSpacing: "0.04em" }}>{categoryLabels[group.category]}</p>
                  <div className="space-y-1.5">
                    {group.models.map((m, i) => {
                      const sel = form.selectedModels.includes(m.id);
                      return (
                        <motion.button key={m.id} type="button" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: gi * 0.04 + i * 0.03 }} whileTap={{ scale: 0.99 }} onClick={() => toggleModel(m.id)}
                          className={`w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-[14px] ${sel ? "bg-accent border border-primary/20" : "bg-background border border-transparent hover:border-border/40"}`}>
                          <motion.div animate={{ backgroundColor: sel ? "#2A2019" : "rgba(0,0,0,0)", borderColor: sel ? "#2A2019" : "#d4ccc3" }}
                            className="w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0">
                            <AnimatePresence>{sel && <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="text-white text-[11px]">✓</motion.span>}</AnimatePresence>
                          </motion.div>
                          <ProviderIcon provider={m.provider} size="sm" />
                          <div className="flex-1 min-w-0">
                            <span style={{ fontWeight: 500 }}>{m.name}</span>
                            <span className="text-muted-foreground ml-2 text-[12px]">{m.provider} · {m.contextWindow}</span>
                          </div>
                          {m.badge && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ${m.badge === "推荐" ? "bg-primary/10 text-primary" : "bg-amber-100 text-amber-700"}`} style={{ fontWeight: 500 }}>{m.badge}</span>
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between pt-1">
              <motion.button whileTap={{ scale: 0.97 }} onClick={() => setStep(0)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                <ArrowLeft className="w-3.5 h-3.5" /> 上一步
              </motion.button>
              <motion.button whileTap={{ scale: 0.97 }} onClick={() => { if (form.selectedModels.length === 0) { toast.error("请至少选择一个模型"); return; } setStep(2); }}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl text-[13px] hover:opacity-90 transition-opacity">
                下一步 <ArrowRight className="w-3.5 h-3.5" />
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* ── Step 2 ── */}
        {step === 2 && (
          <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }} className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-[15px]" style={{ fontWeight: 500 }}>确认信息</h3>
            <div className="space-y-0">
              {[
                { label: "申请人", value: form.name },
                { label: "统一认证号", value: form.authId },
                { label: "需求名称", value: form.projectName },
                { label: "负责部门", value: form.department },
                { label: "需求描述", value: form.projectDesc },
                ...(form.startDate ? [{ label: "开展时间", value: form.startDate }] : []),
                { label: "预计 Token", value: `${form.estimatedTokens} / 周` },
              ].map((item) => (
                <div key={item.label} className="flex justify-between text-[14px] py-2.5 border-b border-border/20">
                  <span className="text-muted-foreground shrink-0">{item.label}</span>
                  <span className="text-right ml-4 break-all">{item.value}</span>
                </div>
              ))}
              <div className="pt-3">
                <span className="text-[13px] text-muted-foreground block mb-2">已选模型（{form.selectedModels.length}）</span>
                <div className="flex flex-wrap gap-2">
                  {form.selectedModels.map((id) => {
                    const m = onlineModels.find((x) => x.id === id);
                    return (
                      <span key={id} className="flex items-center gap-1.5 bg-accent text-accent-foreground px-2.5 py-1.5 rounded-lg text-[12px]">
                        {m && <ProviderIcon provider={m.provider} size="xs" />}
                        {id}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="bg-green-50 rounded-xl px-4 py-3 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
              <p className="text-[12px] text-green-700 leading-relaxed">提交后将自动审核通过，即时生成 API Key，无需等待人工审批。</p>
            </div>
            <div className="flex justify-between pt-2">
              <motion.button whileTap={{ scale: 0.97 }} onClick={() => setStep(1)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                <ArrowLeft className="w-3.5 h-3.5" /> 上一步
              </motion.button>
              <motion.button whileTap={{ scale: 0.97 }} onClick={handleSubmit} disabled={loading}
                className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-xl text-[13px] hover:opacity-90 transition-opacity disabled:opacity-60">
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {loading ? "审核中..." : "确认提交"}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── ApplyPage (root) ──────────────────────────────────────────────────────────
export function ApplyPage() {
  const [searchParams] = useSearchParams();
  // Support navigating directly to apply mode (e.g. from re-apply button)
  const initialMode: PageMode = searchParams.get("mode") === "apply" ? "apply" : null;
  const [mode, setMode] = useState<PageMode>(initialMode);

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <h1 className="text-[28px] sm:text-[34px] text-foreground">API 权限申请</h1>
        <p className="text-muted-foreground text-[14px] mt-1.5">
          {mode === null ? "请选择操作类型" : mode === "apply" ? "填写需求信息并选择模型，提交后自动审批" : "输入统一认证号查询已获批的 Key"}
        </p>
      </motion.div>

      <AnimatePresence mode="wait">
        {mode === null && (
          <motion.div key="selector" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <ModeSelector onSelect={setMode} />
          </motion.div>
        )}
        {mode === "apply" && (
          <motion.div key="apply" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <ApplyForm onBack={() => setMode(null)} />
          </motion.div>
        )}
        {mode === "lookup" && (
          <motion.div key="lookup" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <LookupPanel onBack={() => setMode(null)} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}