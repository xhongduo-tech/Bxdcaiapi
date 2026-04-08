import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { ArrowUp, Box, Code2, Zap, ArrowRight } from "lucide-react";
import { type Model } from "./model-data";
import { useModels } from "./model-context";
import brdcLogo from "figma:asset/b4f5eede468480ea703457a9aa6437d3a2beade8.png";
import { ProviderIcon } from "./provider-logos";

// ── 专业知识库 ──────────────────────────────────────────────────────────────
interface ScenarioRule {
  keywords: string[];
  modelIds: string[];
  reason: string;
  tips?: string;
}

const scenarioRules: ScenarioRule[] = [
  // ── 知识库 / RAG / 检索增强生成
  {
    keywords: ["rag", "知识库", "检索增强", "向量检索", "企业知识", "内部文档", "文档问答", "知识管理", "问答系统", "语义搜索"],
    modelIds: ["bge-m3", "qwen3-embedding-8b", "bge-reranker", "qwen3-reranker-8b", "deepseek-v3", "qwen3.5-35b"],
    reason: "针对 RAG / 知识库场景，推荐以下模型组合：向量化阶段使用 bge-m3 或 qwen3-embedding-8b，精排阶段引入 bge-reranker 提升检索精度，生成阶段推荐 deepseek-v3 或 qwen3.5-35b 进行答案合成：",
    tips: "建议流程：文档切片 → Embedding → 向量数据库检索 → Reranker 精排 Top-K → LLM 生成",
  },
  // ── 代码 / 开发 / 编程
  {
    keywords: ["代码", "编程", "code", "开发", "编写", "debug", "调试", "程序", "python", "java", "sql", "函数", "接口", "单测", "重构"],
    modelIds: ["deepseek-v3", "qwen3.5-35b", "deepseek-r1-distill-32b"],
    reason: "针对代码生成与开发任务，推荐以下模型。deepseek-v3 在 HumanEval、SWE-Bench 等代码基准位居前列；qwen3.5-35b 原生支持代码推理，适合需要边思考边写代码的场景；deepseek-r1-distill-32b 配合 CoT 推理适合算法设计：",
    tips: "复杂逻辑可开启 temperature=0 + max_tokens=4096，提升代码确定性",
  },
  // ── 推理 / 数学 / 逻辑
  {
    keywords: ["推理", "逻辑", "数学", "证明", "思考", "reasoning", "复杂", "分析", "计算", "策略", "规划"],
    modelIds: ["deepseek-r1-distill-32b", "qwen3.5-35b"],
    reason: "对于深度推理与复杂分析任务，推荐以下模型。deepseek-r1-distill-32b 具备链式思维（Chain-of-Thought）能力，自动展开推导过程；qwen3.5-35b 支持 enable_thinking 参数实现受控推理：",
    tips: "传入 extra_body={\"enable_thinking\": true} 可激活 qwen3.5 的 Thinking 模式",
  },
  // ── 金融 / 风控 / 审计
  {
    keywords: ["金融", "财务", "风控", "审计", "合规", "监管", "报告", "资产", "贷款", "信用", "银行", "投资", "保险"],
    modelIds: ["deepseek-r1-distill-32b", "qwen3.5-35b", "qwen2-72b"],
    reason: "金融与风控场景对推理严谨性和中文理解要求高，推荐以下模型。deepseek-r1 的思维链推导可追溯决策过程，qwen3.5-35b 的长上下文（128K）可处理完整报告文档，qwen2-72b 在金融中文专有名词理解上表现稳定：",
    tips: "建议设置 temperature≤0.3 以增强答案一致性；长报告可先摘要再问答",
  },
  // ── 图像 / 视觉 / 多模态
  {
    keywords: ["图", "图像", "图片", "视觉", "多模态", "image", "visual", "ocr", "识别", "截图", "拍照", "扫描", "pdf"],
    modelIds: ["qwen3.5-35b", "gemma4-26b", "glm4.7-flash-30b", "qwen2.5-vl-7b"],
    reason: "对于图像理解与视觉任务，推荐以下模型。旗舰多模态模型（qwen3.5-35b / gemma4-26b / glm4.7-flash-30b）支持原生图文混合输入；qwen2.5-vl-7b 专为视觉语言场景优化，文档解析能力突出：",
    tips: "图片建议转 base64 后通过 image_url.url 字段传入；测试环境可用 http://img-convert.cs.icbc 进行格式转换",
  },
  // ── 翻译 / 多语言
  {
    keywords: ["翻译", "translate", "多语言", "英文", "英语", "日文", "语言", "国际化", "i18n", "外文"],
    modelIds: ["gemma4-26b", "qwen2-72b", "qwen3.5-35b"],
    reason: "针对翻译与多语言处理场景，推荐以下模型。gemma4-26b 多语言基准 FLORES-200 表现优异，覆盖 100+ 语言；qwen2-72b 中英文切换无缝衔接；qwen3.5-35b 可同时处理图文混合的多语言内容：",
    tips: "系统提示词指定目标语言格式，如：「请翻译为简体中文，保留专业术语」",
  },
  // ── 文案 / 写作 / 创作
  {
    keywords: ["写作", "文案", "创作", "写", "撰写", "生成", "内容", "文章", "报告", "总结", "摘要", "润色", "文字", "邮件"],
    modelIds: ["qwen3.5-35b", "qwen2-72b", "deepseek-v3"],
    reason: "对于中文写作与内容生成场景，推荐以下模型。qwen3.5-35b 中文创作流畅度高，支持长文档生成；qwen2-72b 大参数量保证语言丰富度；deepseek-v3 文风清晰简洁，适合技术文档与报告：",
    tips: "设置 temperature=0.7~0.9 可提升创作多样性；system 提示词中指定写作风格效果更佳",
  },
  // ── 客服 / 问答 / 对话
  {
    keywords: ["客服", "问答", "对话", "聊天", "问", "答", "助手", "bot", "机器人", "咨询", "服务"],
    modelIds: ["qwen3.5-9b", "deepseek-v3", "glm4.7-flash-30b"],
    reason: "针对智能客服与对话系统场景，推荐以下高速、低延迟模型。qwen3.5-9b 响应速度快、资源消耗低，适合高并发；deepseek-v3 兼顾质量与速度；glm4.7-flash-30b 单轮对话能力出色：",
    tips: "高并发场景建议 max_tokens≤512 控制延迟；搭配 RAG 可显著减少幻觉",
  },
  // ── 长文本 / 长上下文
  {
    keywords: ["长文", "长文本", "上下文", "长文档", "context", "token", "全文", "完整文档", "大文件"],
    modelIds: ["qwen3.5-35b", "qwen3.5-9b", "qwen2-72b", "gemma4-26b"],
    reason: "以下模型支持最大上下文窗口（128K token），适合处理完整合同、研报、代码库等长文档：",
    tips: "128K ≈ 约 20 万汉字；超长文档建议先做结构化切片再分批处理",
  },
  // ── 向量 / Embedding
  {
    keywords: ["嵌入", "向量", "embedding", "embed", "语义", "相似度", "相似", "聚类"],
    modelIds: ["bge-m3", "qwen3-embedding-8b", "qwen3-vl-embedding-2b"],
    reason: "向量嵌入场景推荐以下模型。bge-m3 支持多语言稠密/稀疏/多粒度三合一检索；qwen3-embedding-8b 支持 32K 长文本嵌入；qwen3-vl-embedding-2b 支持图文混合检索：",
    tips: "调用 /v1/embeddings 接口，输入文本，返回 float32 向量；建议归一化后存入向量库",
  },
  // ── 速度 / 高并发 / 低延迟
  {
    keywords: ["快", "速度", "延迟", "高并发", "实时", "低延迟", "tps", "吞吐"],
    modelIds: ["qwen3.5-9b", "glm4.7-flash-30b", "gemma3-27b"],
    reason: "以下模型推理速度最快，适合延迟敏感、高并发场景（典型 TTFT < 300ms）：",
    tips: "Flash 级模型适合流式输出（stream=True），用户体验更流畅",
  },
  // ── 数据分析 / 报表
  {
    keywords: ["数据", "分析", "报表", "统计", "excel", "表格", "数字", "指标", "dashboard"],
    modelIds: ["deepseek-r1-distill-32b", "qwen3.5-35b", "deepseek-v3"],
    reason: "数据分析与报表理解需要强逻辑推理与代码能力，推荐以下模型。deepseek-r1 可逐步推导分析结论；qwen3.5-35b 支持 Function Calling 调用计算工具；deepseek-v3 可生成并解释 Python/SQL：",
    tips: "配合 tools/Function Calling 接口可让模型自动调用数据查询函数",
  },
  // ── 工作流 / Agent / 自动化
  {
    keywords: ["agent", "自动化", "工作流", "workflow", "任务链", "多步骤", "规划", "执行", "调度", "流程"],
    modelIds: ["qwen3.5-35b", "deepseek-v3", "deepseek-r1-distill-32b"],
    reason: "针对 Agent 与自动化工作流场景，推荐以下支持 Function Calling 和工具调用的模型。qwen3.5-35b 在多步规划和工具编排上表现突出；deepseek-v3 代码生成能力强，适合代码型 Agent；deepseek-r1 适合需要自我反思和纠错的复杂决策链：",
    tips: "善用 tool_choice 参数控制工具调用策略；多步骤任务建议拆解后分轮调用",
  },
  // ── 信息提取 / 结构化输出
  {
    keywords: ["提取", "抽取", "结构化", "json", "格式化", "实体", "关键词", "分类", "标注", "解析"],
    modelIds: ["deepseek-v3", "qwen3.5-35b", "qwen3.5-9b"],
    reason: "信息提取与结构化输出场景要求模型严格遵循指令格式，推荐以下模型。deepseek-v3 和 qwen3.5-35b 均支持 JSON Mode（response_format: {type: 'json_object'}），可直接返回结构化数据；qwen3.5-9b 高速适合批量处理：",
    tips: "设置 response_format={\"type\": \"json_object\"} 强制输出合法 JSON；system 提示词中提供字段 Schema 示例",
  },
  // ── 安全 / 内容审核
  {
    keywords: ["安全", "审核", "违规", "风险", "内容审查", "敏感词", "合规检查", "有害内容"],
    modelIds: ["qwen3.5-35b", "deepseek-v3", "qwen2-72b"],
    reason: "内容安全与合规审核需要模型理解上下文语义和行业规范，推荐以下模型。qwen3.5-35b 在中文敏感信息理解上表现全面；deepseek-v3 推理逻辑清晰，适合给出带理由的审核结论；qwen2-72b 中文语义覆盖广：",
    tips: "建议通过 system prompt 注入审核规则；temperature=0 确保输出一致性",
  },
  // ── 教育 / 培训 / 知识讲解
  {
    keywords: ["教育", "培训", "学习", "讲解", "解释", "教学", "辅导", "答题", "解题", "练习"],
    modelIds: ["qwen3.5-35b", "deepseek-r1-distill-32b", "qwen2-72b"],
    reason: "教育与知识讲解场景要求模型表达清晰、逻辑严密，推荐以下模型。qwen3.5-35b 中文表达自然流畅；deepseek-r1 擅长分步骤解题，过程清晰；qwen2-72b 知识覆盖广，适合多学科问答：",
    tips: "让模型「一步一步思考」（step by step）可显著提升解题准确率",
  },
  // ── 默认 / 最强
  {
    keywords: ["最强", "最好", "推荐", "best", "综合", "通用", "全能"],
    modelIds: ["qwen3.5-35b", "deepseek-v3", "deepseek-r1-distill-32b", "gemma4-26b"],
    reason: "以下是当前平台综合能力排名最高的模型，覆盖对话、代码、推理、多模态全场景：",
    tips: "qwen3.5-35b 支持 thinking 模式；deepseek-r1 具备链式推理；gemma4 原生多模态",
  },
];

function recommendModels(query: string, models: Model[]): { text: string; tips?: string; recommended: Model[] } {
  const q = query.toLowerCase();

  for (const rule of scenarioRules) {
    if (rule.keywords.some((kw) => q.includes(kw))) {
      const recommended = rule.modelIds
        .map((id) => models.find((m) => m.id === id))
        .filter((m): m is Model => !!m && m.status !== "offline")
        .slice(0, 5);
      if (recommended.length > 0) {
        return { text: rule.reason, tips: rule.tips, recommended };
      }
    }
  }

  // Fallback: online chat models
  const fallback = models.filter((m) => m.status === "online" && m.category === "chat").slice(0, 4);
  return {
    text: "以下是推荐的在线模型。您可以输入更具体的场景，如「构建 RAG 知识库」「写 Python 代码」「处理财务报告」「翻译英文文档」等，获得专业推荐：",
    recommended: fallback,
  };
}

interface Message {
  id: number;
  role: "user" | "assistant";
  content: string;
  tips?: string;
  models?: Model[];
}

const ALL_QUICK_QUESTIONS = [
  "构建 RAG 知识库用哪些模型？",
  "写代码和调试推荐哪个？",
  "处理财务审计报告",
  "图像理解和文档解析",
  "Agent 自动化工作流怎么选？",
  "结构化 JSON 信息提取",
  "高并发低延迟推理场景",
  "教育问答与逐步解题",
];

export function HomePage() {
  const { models } = useModels();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [questionPage, setQuestionPage] = useState(0);
  const [questionFading, setQuestionFading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isTyping]);

  // Cycle through two sets of 4 questions every 5 seconds
  useEffect(() => {
    if (messages.length > 0) return;
    const timer = setInterval(() => {
      setQuestionFading(true);
      setTimeout(() => {
        setQuestionPage((p) => (p + 1) % 2);
        setQuestionFading(false);
      }, 280);
    }, 5000);
    return () => clearInterval(timer);
  }, [messages.length]);

  const visibleQuestions = ALL_QUICK_QUESTIONS.slice(questionPage * 4, questionPage * 4 + 4);

  const sendMessage = (text: string) => {
    if (!text.trim()) return;
    setMessages((prev) => [...prev, { id: Date.now(), role: "user", content: text }]);
    setInput("");
    setIsTyping(true);
    setTimeout(() => {
      const result = recommendModels(text, models);
      setMessages((prev) => [...prev, { id: Date.now() + 1, role: "assistant", content: result.text, tips: result.tips, models: result.recommended }]);
      setIsTyping(false);
    }, 500 + Math.random() * 500);
  };

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); sendMessage(input); };

  const hasMessages = messages.length > 0;

  return (
    <div className="flex flex-col" style={{ minHeight: "calc(100vh - 140px)" }}>
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className={`text-center transition-all ${hasMessages ? "pt-2 pb-5" : "flex-1 flex flex-col justify-center pb-6"}`}
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="flex items-center justify-center gap-3 mb-3"
        >
          <img src={brdcLogo} alt="BRDC.ai" className={`object-contain transition-all ${hasMessages ? "w-7 h-7" : "w-10 h-10"}`} />
          <h1 className={`text-foreground transition-all ${hasMessages ? "text-[22px]" : "text-[30px] sm:text-[38px]"}`}>
            你想用哪个模型？
          </h1>
        </motion.div>
        {!hasMessages && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15, duration: 0.4 }}
            className="text-muted-foreground text-[15px]"
          >
            描述你的需求，我来帮你找到最合适的大语言模型
          </motion.p>
        )}
      </motion.div>

      {/* Chat area — centered column */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="max-w-2xl mx-auto w-full flex flex-col gap-5"
      >
        {/* Messages — no max-height, scrolls with page */}
        {hasMessages && (
          <div ref={scrollRef} className="space-y-5">
            <AnimatePresence initial={false}>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {msg.role === "user" ? (
                    <div className="bg-foreground text-background px-5 py-3 rounded-[20px] rounded-br-md max-w-[80%] text-[14px]">
                      {msg.content}
                    </div>
                  ) : (
                    <div className="max-w-full w-full space-y-3">
                      <div className="bg-white px-5 py-4 rounded-[20px] rounded-bl-md shadow-sm text-[14px] text-foreground/80 leading-relaxed border border-border/20">
                        {msg.content}
                      </div>
                      {msg.tips && (
                        <div className="bg-[#f0ece7] px-4 py-3 rounded-xl text-[12px] text-foreground/55 leading-relaxed flex gap-2 items-start">
                          <span className="text-primary shrink-0 mt-px">💡</span>
                          <span>{msg.tips}</span>
                        </div>
                      )}
                      {msg.models && msg.models.length > 0 && (
                        <div className="grid gap-2 pl-0.5">
                          {msg.models.map((m, i) => (
                            <motion.div
                              key={m.id}
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: i * 0.06, duration: 0.28, ease: [0.25, 0.1, 0.25, 1] }}
                              className="bg-white rounded-xl px-4 py-3 flex items-center gap-3 shadow-sm hover:shadow-md transition-shadow group border border-border/15"
                            >
                              <ProviderIcon provider={m.provider} size="md" className="shrink-0" />
                              <div className="flex-1 min-w-0">
                                <div className="text-[14px] text-foreground truncate" style={{ fontWeight: 500 }}>{m.name}</div>
                                <div className="text-[12px] text-muted-foreground flex items-center flex-wrap gap-x-1.5 gap-y-0 mt-0.5">
                                  <span className="shrink-0">{m.provider}</span>
                                  <span className="opacity-30 shrink-0">·</span>
                                  <span className="shrink-0">{m.contextWindow}</span>
                                  <span className="opacity-30 shrink-0">·</span>
                                  <span className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${m.status === "online" ? "bg-green-400" : "bg-gray-300"}`} />
                                  <span className="shrink-0">{m.status === "online" ? "在线" : "离线"}</span>
                                </div>
                              </div>
                              <motion.button
                                whileTap={{ scale: 0.95 }}
                                onClick={() => navigate(`/apply?model=${encodeURIComponent(m.id)}`)}
                                className="shrink-0 flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-lg text-primary bg-primary/5 hover:bg-primary/12 transition-colors"
                                style={{ fontWeight: 500 }}
                              >
                                申请 <ArrowRight className="w-3 h-3" />
                              </motion.button>
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            <AnimatePresence>
              {isTyping && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex justify-start">
                  <div className="bg-white px-5 py-3 rounded-[20px] rounded-bl-md shadow-sm border border-border/15 flex items-center gap-1.5">
                    {[0, 1, 2].map((i) => (
                      <motion.div key={i} className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30"
                        animate={{ opacity: [0.3, 1, 0.3], scale: [0.85, 1.1, 0.85] }}
                        transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.15 }}
                      />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Quick questions — dynamic cycling, hidden once chat starts */}
        <AnimatePresence>
          {!hasMessages && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ delay: 0.2, duration: 0.35 }}
              className="grid grid-cols-2 gap-2"
            >
              {visibleQuestions.map((q, i) => (
                <motion.button
                  key={q}
                  animate={{ opacity: questionFading ? 0 : 1, y: questionFading ? 4 : 0 }}
                  transition={{ duration: 0.25, delay: questionFading ? 0 : i * 0.05 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => sendMessage(q)}
                  className="px-3.5 py-2.5 bg-white rounded-xl text-[13px] text-muted-foreground hover:text-foreground shadow-sm hover:shadow-md transition-shadow text-left leading-snug"
                >
                  {q}
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input bar */}
        <motion.form
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          onSubmit={handleSubmit}
        >
          <div className="relative bg-white rounded-2xl shadow-sm border border-border/30 hover:shadow-md hover:border-border/50 transition-all focus-within:shadow-md focus-within:border-primary/25">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="描述你的使用场景，例如：我需要一个写代码的模型..."
              className="w-full px-5 py-4 pr-14 bg-transparent text-[14px] focus:outline-none rounded-2xl placeholder:text-muted-foreground/40"
            />
            <button
              type="submit"
              disabled={!input.trim() || isTyping}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-xl bg-foreground text-background flex items-center justify-center disabled:opacity-20 disabled:cursor-not-allowed hover:opacity-80 transition-all"
            >
              <ArrowUp className="w-4 h-4" />
            </button>
          </div>
        </motion.form>
      </motion.div>

      {/* Quick Links — hidden once chat starts */}
      <AnimatePresence>
        {!hasMessages && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="grid sm:grid-cols-3 gap-4 max-w-5xl mx-auto w-full mt-10"
          >
            {[
              { to: "/models", icon: Box, label: "浏览模型清单", desc: "查看全部已接入模型与详细信息" },
              { to: "/apply", icon: Zap, label: "申请 API Key", desc: "填写信息、选择模型，快速获取权限" },
              { to: "/examples", icon: Code2, label: "查看调用示例", desc: "Python / cURL / Node.js 多语言代码" },
            ].map((c) => (
              <Link
                key={c.to}
                to={c.to}
                className="group block bg-white rounded-2xl p-6 hover:shadow-lg transition-shadow border border-border/15 hover:border-border/40"
              >
                <c.icon className="w-5 h-5 text-muted-foreground mb-3.5" />
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-[14px] text-foreground" style={{ fontWeight: 500 }}>{c.label}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                </div>
                <p className="text-[13px] text-muted-foreground leading-relaxed">{c.desc}</p>
              </Link>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.4 }}
        className="text-center py-8 mt-8"
      >
        <p className="text-[12px] text-muted-foreground/60">
          2026 大数据应用部 | brdc.ai 人工智能小组 提供服务
        </p>
      </motion.footer>
    </div>
  );
}