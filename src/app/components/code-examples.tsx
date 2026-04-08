import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Play, Square, Info, ImageIcon, ExternalLink } from "lucide-react";
import { CodeBlock } from "./code-block";

const BASE_URL = "http://api.brdc-ai.cs.icbc";

// ── Basic Chat ─────────────────────────────────────────────────────────────
const PYTHON = `from openai import OpenAI

client = OpenAI(
    base_url="${BASE_URL}",
    api_key="YOUR_API_KEY",
)

response = client.chat.completions.create(
    model="qwen3.5-35b",
    messages=[
        {"role": "system", "content": "你是一个有帮助的助手。"},
        {"role": "user",   "content": "请解释什么是大语言模型？"}
    ],
    temperature=0.7,
    max_tokens=1024,
)

print(response.choices[0].message.content)`;

const CURL = `curl -X POST ${BASE_URL}/v1/chat/completions \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "qwen3.5-35b",
    "messages": [
      {"role": "system", "content": "你是一个有帮助的助手。"},
      {"role": "user",   "content": "请解释什么是大语言模型？"}
    ],
    "temperature": 0.7,
    "max_tokens": 1024
  }'`;

const NODEJS = `import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: '${BASE_URL}',
  apiKey:  'YOUR_API_KEY',
});

const response = await client.chat.completions.create({
  model: 'qwen3.5-35b',
  messages: [
    { role: 'system', content: '你是一个有帮助的助手。' },
    { role: 'user',   content: '请解释什么是大语言模型？' },
  ],
  temperature: 0.7,
  max_tokens: 1024,
});

console.log(response.choices[0].message.content);`;

// ── Stream ─────────────────────────────────────────────────────────────────
const STREAM_PYTHON = `from openai import OpenAI

client = OpenAI(
    base_url="${BASE_URL}",
    api_key="YOUR_API_KEY",
)

stream = client.chat.completions.create(
    model="qwen3.5-35b",
    messages=[{"role": "user", "content": "用 100 字介绍深度学习"}],
    stream=True,
)

for chunk in stream:
    delta = chunk.choices[0].delta
    if delta.content:
        print(delta.content, end="", flush=True)`;

const STREAM_CURL = `curl -X POST ${BASE_URL}/v1/chat/completions \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -H "Accept: text/event-stream" \\
  -d '{
    "model": "qwen3.5-35b",
    "messages": [
      {"role": "user", "content": "用 100 字介绍深度学习"}
    ],
    "stream": true
  }'

# 每个数据块格式为 SSE：
# data: {"choices":[{"delta":{"content":"..."},...}]}
# data: [DONE]`;

const STREAM_NODEJS = `import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: '${BASE_URL}',
  apiKey:  'YOUR_API_KEY',
});

const stream = await client.chat.completions.create({
  model: 'qwen3.5-35b',
  messages: [{ role: 'user', content: '用 100 字介绍深度学习' }],
  stream: true,
});

for await (const chunk of stream) {
  const delta = chunk.choices[0]?.delta?.content;
  if (delta) process.stdout.write(delta);
}`;

// ── Image Input ────────────────────────────────────────────────────────────
const IMAGE_PYTHON = `import base64
from openai import OpenAI

client = OpenAI(
    base_url="${BASE_URL}",
    api_key="YOUR_API_KEY",
)

with open("image.png", "rb") as f:
    img_b64 = base64.b64encode(f.read()).decode()

response = client.chat.completions.create(
    model="qwen3.5-35b",
    messages=[
        {
            "role": "user",
            "content": [
                {"type": "text", "text": "请描述这张图片的内容"},
                {
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:image/png;base64,{img_b64}"
                    }
                }
            ]
        }
    ],
    max_tokens=1024,
)

print(response.choices[0].message.content)`;

const IMAGE_CURL = `# 先将图片编码为 base64
IMG_B64=$(base64 -i image.png | tr -d '\\n')

curl -X POST ${BASE_URL}/v1/chat/completions \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d "{
    \\"model\\": \\"qwen3.5-35b\\",
    \\"messages\\": [
      {
        \\"role\\": \\"user\\",
        \\"content\\": [
          {\\"type\\": \\"text\\", \\"text\\": \\"请描述这张图片的内容\\"},
          {
            \\"type\\": \\"image_url\\",
            \\"image_url\\": {
              \\"url\\": \\"data:image/png;base64,\${IMG_B64}\\"
            }
          }
        ]
      }
    ],
    \\"max_tokens\\": 1024
  }"`;

const IMAGE_NODEJS = `import fs from 'fs';
import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: '${BASE_URL}',
  apiKey:  'YOUR_API_KEY',
});

const imgB64 = fs.readFileSync('image.png').toString('base64');

const response = await client.chat.completions.create({
  model: 'qwen3.5-35b',
  messages: [
    {
      role: 'user',
      content: [
        { type: 'text', text: '请描述这张图片的内容' },
        {
          type: 'image_url',
          image_url: {
            url: \`data:image/png;base64,\${imgB64}\`,
          },
        },
      ],
    },
  ],
  max_tokens: 1024,
});

console.log(response.choices[0].message.content);`;

// ── Tool Call ──────────────────────────────────────────────────────────────
const TOOL_PYTHON = `from openai import OpenAI

client = OpenAI(
    base_url="${BASE_URL}",
    api_key="YOUR_API_KEY",
)

# 定义工具列表
tools = [
    {
        "type": "function",
        "function": {
            "name": "get_weather",
            "description": "获取指定城市的实时天气信息",
            "parameters": {
                "type": "object",
                "properties": {
                    "city": {
                        "type": "string",
                        "description": "城市名称，如：北京"
                    },
                    "unit": {
                        "type": "string",
                        "enum": ["celsius", "fahrenheit"],
                        "description": "温度单位"
                    }
                },
                "required": ["city"]
            }
        }
    }
]

response = client.chat.completions.create(
    model="qwen3.5-35b",
    messages=[{"role": "user", "content": "北京今天天气如何？"}],
    tools=tools,
    tool_choice="auto",
)

tool_call = response.choices[0].message.tool_calls[0]
print(f"函数名: {tool_call.function.name}")
print(f"参数:   {tool_call.function.arguments}")`;

const TOOL_CURL = `curl -X POST ${BASE_URL}/v1/chat/completions \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "qwen3.5-35b",
    "messages": [
      {"role": "user", "content": "北京今天天气如何？"}
    ],
    "tools": [
      {
        "type": "function",
        "function": {
          "name": "get_weather",
          "description": "获取指定城市的实时天气信息",
          "parameters": {
            "type": "object",
            "properties": {
              "city": {
                "type": "string",
                "description": "城市名称，如：北京"
              },
              "unit": {
                "type": "string",
                "enum": ["celsius", "fahrenheit"],
                "description": "温度单位"
              }
            },
            "required": ["city"]
          }
        }
      }
    ],
    "tool_choice": "auto"
  }'`;

const TOOL_NODEJS = `import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: '${BASE_URL}',
  apiKey:  'YOUR_API_KEY',
});

// 定义工具列表
const tools = [
  {
    type: 'function',
    function: {
      name: 'get_weather',
      description: '获取指定城市的实时天气信息',
      parameters: {
        type: 'object',
        properties: {
          city: {
            type: 'string',
            description: '城市名称，如：北京',
          },
          unit: {
            type: 'string',
            enum: ['celsius', 'fahrenheit'],
            description: '温度单位',
          },
        },
        required: ['city'],
      },
    },
  },
];

const response = await client.chat.completions.create({
  model: 'qwen3.5-35b',
  messages: [{ role: 'user', content: '北京今天天气如何？' }],
  tools,
  tool_choice: 'auto',
});

const toolCall = response.choices[0].message.tool_calls[0];
console.log('函数名:', toolCall.function.name);
console.log('参数:  ', toolCall.function.arguments);`;

// ── Per-tab lookup tables ──────────────────────────────────────────────────
const tabs = [
  { key: "python", label: "Python",  lang: "python"     },
  { key: "curl",   label: "cURL",    lang: "bash"       },
  { key: "nodejs", label: "Node.js", lang: "javascript" },
] as const;

type TabKey = "python" | "curl" | "nodejs";

const tabCode: Record<TabKey, string>     = { python: PYTHON,       curl: CURL,        nodejs: NODEJS        };
const tabFile: Record<TabKey, string>     = { python: "example.py", curl: "example.sh",nodejs: "example.mjs" };
const tabLang: Record<TabKey, "python" | "bash" | "javascript"> = {
  python: "python", curl: "bash", nodejs: "javascript",
};

const streamCode: Record<TabKey, string>  = { python: STREAM_PYTHON, curl: STREAM_CURL, nodejs: STREAM_NODEJS };
const streamFile: Record<TabKey, string>  = { python: "stream.py",   curl: "stream.sh", nodejs: "stream.mjs"  };

const imageCode: Record<TabKey, string>   = { python: IMAGE_PYTHON,  curl: IMAGE_CURL,  nodejs: IMAGE_NODEJS  };
const imageFile: Record<TabKey, string>   = { python: "vision.py",   curl: "vision.sh", nodejs: "vision.mjs"  };

const toolCode: Record<TabKey, string>    = { python: TOOL_PYTHON,   curl: TOOL_CURL,   nodejs: TOOL_NODEJS   };
const toolFile: Record<TabKey, string>    = { python: "tool_call.py",curl: "tool_call.sh",nodejs: "tool_call.mjs" };

// ── Stream demo text ───────────────────────────────────────────────────────
const streamFull = [
  "MoE（Mixture of Experts，混合专家）与 Dense（稠密）是大语言模型的两种核心架构范式。",
  "\n\n",
  "Dense 模型的特点是「全参数激活」：每一次前向传播，模型的全部参数都参与计算。",
  "优势在于输出一致性极高——相同输入在相同条件下几乎总能产生相同结果，",
  "这使其特别适合对可复现性要求严格的生产环境，如金融风控、合规审计等场景。",
  "但代价也很明显：参数规模直接决定了推理算力需求，72B 的 Dense 模型需要的 GPU 显存远超同等「激活参数」的 MoE 模型。",
  "\n\n",
  "MoE 模型则采用「条件计算」策略：模型虽然拥有庞大的总参数量（如 DeepSeek-V3 的 671B），",
  "但每次推理仅激活其中一小部分专家网络（如 37B），由门控网络（Router）根据输入动态选择最相关的专家组合。",
  "这种架构以较低的实际计算成本实现了远超同尺寸 Dense 模型的知识容量和综合能力，",
  "是当前训练超大规模模型的主流路径。",
  "\n\n",
  "简而言之：Dense 模型是「所有神经元一起干活」，追求的是确定性和稳定性；",
  "MoE 模型是「让最擅长的专家来处理」，追求的是效率和能力上限。",
  "在实际选型中，高并发、低延迟场景优先选小尺寸 Dense（如 qwen3.5-9b），",
  "而追求综合能力天花板的场景则适合 MoE 旗舰（如 qwen3.5-35b）。",
].join("");

// ── Component ──────────────────────────────────────────────────────────────
export function CodeExamples() {
  const [activeTab, setActiveTab] = useState<TabKey>("python");
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [rightHovered, setRightHovered] = useState(false);
  const [isLg, setIsLg] = useState(false);
  const idxRef   = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamBoxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const check = () => setIsLg(window.innerWidth >= 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Auto-scroll stream box as text arrives
  useEffect(() => {
    if (streamBoxRef.current) {
      streamBoxRef.current.scrollTop = streamBoxRef.current.scrollHeight;
    }
  }, [streamText]);

  const startStream = () => {
    if (streaming) { stopStream(); return; }
    setStreaming(true);
    setStreamText("");
    idxRef.current = 0;
    timerRef.current = setInterval(() => {
      if (idxRef.current >= streamFull.length) { stopStream(); return; }
      const n = Math.floor(Math.random() * 4) + 1;
      setStreamText((p) => p + streamFull.slice(idxRef.current, idxRef.current + n));
      idxRef.current += n;
    }, 22);
  };

  const stopStream = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setStreaming(false);
  };

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const monoFont = { fontFamily: "'JetBrains Mono', monospace" };
  const lang = tabLang[activeTab];

  // Column widths: right hover → right expands, left shrinks
  const leftBasis  = isLg ? (rightHovered ? "36%" : "59%") : "100%";
  const rightBasis = isLg ? (rightHovered ? "60%" : "37%") : "100%";

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <h1 className="text-[28px] sm:text-[34px] text-foreground">调用示例</h1>
        <p className="text-muted-foreground text-[14px] mt-1.5">全部接口兼容 OpenAI 格式，支持官方 SDK 直接接入</p>
      </motion.div>

      {/* Tip */}
      <motion.div
        initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05, duration: 0.3 }}
        className="bg-accent rounded-xl p-4 flex gap-3"
      >
        <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <p className="text-[13px] text-foreground/70 leading-relaxed">
          将 <code className="bg-white/60 px-1.5 py-0.5 rounded" style={monoFont}>base_url</code> 设为{" "}
          <code className="bg-white/60 px-1.5 py-0.5 rounded" style={monoFont}>{BASE_URL}</code>，
          将 <code className="bg-white/60 px-1.5 py-0.5 rounded ml-1" style={monoFont}>YOUR_API_KEY</code> 替换为申请到的 Key，即可使用 openai SDK 直接调用。
        </p>
      </motion.div>

      {/* ── Shared language tab switcher ── */}
      <motion.div
        initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08, duration: 0.3 }}
        className="flex items-center gap-1 bg-secondary/60 rounded-xl p-1 w-fit"
      >
        {tabs.map((t) => (
          <motion.button
            key={t.key}
            whileTap={{ scale: 0.97 }}
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-1.5 rounded-lg text-[13px] transition-all ${
              activeTab === t.key
                ? "bg-white text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            style={activeTab === t.key ? { fontWeight: 500 } : {}}
          >
            {t.label}
          </motion.button>
        ))}
      </motion.div>

      {/* ── Two-column layout with hover-expand ── */}
      <div className="flex flex-col lg:flex-row gap-5 items-start">

        {/* LEFT col */}
        <motion.div
          className="w-full lg:min-w-0 space-y-5"
          style={{ flexBasis: leftBasis }}
          animate={{ flexBasis: leftBasis }}
          transition={{ duration: 0.38, ease: [0.25, 0.1, 0.25, 1] }}
        >
          {/* Basic chat */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.3 }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab + "_basic"}
                initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
              >
                <CodeBlock code={tabCode[activeTab]} lang={lang} label={tabFile[activeTab]} />
              </motion.div>
            </AnimatePresence>
          </motion.div>

          {/* Tool Call */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.3 }}>
            <p className="text-[13px] text-foreground/70 mb-3 pl-0.5" style={{ fontWeight: 500 }}>
              工具调用 (Function Calling)
            </p>
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab + "_tool"}
                initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
              >
                <CodeBlock code={toolCode[activeTab]} lang={lang} label={toolFile[activeTab]} maxHeight={380} />
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </motion.div>

        {/* RIGHT col — hover to expand */}
        <motion.div
          className="w-full lg:min-w-0 space-y-5"
          style={{ flexBasis: rightBasis }}
          animate={{ flexBasis: rightBasis }}
          transition={{ duration: 0.38, ease: [0.25, 0.1, 0.25, 1] }}
          onMouseEnter={() => isLg && setRightHovered(true)}
          onMouseLeave={() => isLg && setRightHovered(false)}
        >
          {/* Multimodal tip banner */}
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.11, duration: 0.3 }}
            className="bg-amber-50 border border-amber-200/60 rounded-xl px-4 py-3.5 flex gap-3"
          >
            <ImageIcon className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-[13px] text-amber-800 leading-relaxed">
                <span style={{ fontWeight: 500 }}>多模态场景提示：</span> 测试环境提供 base64 / HTML / SVG ↔ 图片格式互转服务，可在下述网址通过前端处理，或参考提供的文档使用 API 批处理。
              </p>
              <a
                href="http://img-convert.cs.icbc"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 mt-1.5 text-[12px] text-amber-700 hover:text-amber-900 transition-colors"
                style={{ fontWeight: 500 }}
              >
                img-convert.cs.icbc — 前端转换 / API 文档 <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </motion.div>

          {/* Stream interactive demo */}
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14, duration: 0.3 }}
            className="bg-white rounded-2xl overflow-hidden shadow-sm"
          >
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/30">
              <span className="text-[14px]" style={{ fontWeight: 500 }}>流式输出演示</span>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={startStream}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[12px] transition-colors ${
                  streaming ? "bg-red-50 text-red-600 hover:bg-red-100" : "bg-primary/10 text-primary hover:bg-primary/15"
                }`}
              >
                {streaming ? <Square className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                {streaming ? "停止" : "开始演示"}
              </motion.button>
            </div>
            <div
              ref={streamBoxRef}
              className="p-5 bg-[#faf8f6] overflow-y-auto"
              style={{ minHeight: 160, maxHeight: 280 }}
            >
              {streamText ? (
                <div className="text-[13px] text-foreground/80 leading-relaxed whitespace-pre-wrap">
                  {streamText}
                  {streaming && (
                    <motion.span
                      animate={{ opacity: [1, 0] }}
                      transition={{ repeat: Infinity, duration: 0.55 }}
                      className="inline-block w-0.5 h-3.5 bg-primary ml-0.5 align-text-bottom"
                    />
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center h-[120px] text-[13px] text-muted-foreground/50">
                  点击「开始演示」查看流式输出效果
                </div>
              )}
            </div>
          </motion.div>

          {/* Stream code */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18, duration: 0.3 }}>
            <p className="text-[13px] text-foreground/70 mb-3 pl-0.5" style={{ fontWeight: 500 }}>流式输出代码</p>
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab + "_stream"}
                initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
              >
                <CodeBlock code={streamCode[activeTab]} lang={lang} label={streamFile[activeTab]} />
              </motion.div>
            </AnimatePresence>
          </motion.div>

          {/* Image input */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22, duration: 0.3 }}>
            <p className="text-[13px] text-foreground/70 mb-3 pl-0.5" style={{ fontWeight: 500 }}>图片输入示例</p>
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab + "_image"}
                initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
              >
                <CodeBlock code={imageCode[activeTab]} lang={lang} label={imageFile[activeTab]} maxHeight={320} />
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}