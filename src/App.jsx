import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  Clock3,
  Copy,
  Download,
  Eye,
  EyeOff,
  FileCode2,
  Gauge,
  History,
  KeyRound,
  Layers3,
  LoaderCircle,
  Menu,
  Plus,
  RotateCw,
  Settings2,
  ShieldCheck,
  Sparkles,
  TerminalSquare,
  Trash2,
  WandSparkles,
  X,
  Zap,
} from "lucide-react";
import {
  EXAMPLE_IDEAS,
  PROVIDER_PRESETS,
  TASK_PRESETS,
  TOOL_PRESETS,
} from "./data/providers.js";
import {
  compileLocally,
  getPromptForTab,
  mergeAiResult,
} from "./lib/compiler.js";

const STORAGE_KEYS = {
  providerConfigs: "yangou.provider.configs.v1",
  providerId: "yangou.provider.id.v1",
  history: "yangou.history.v1",
};

const TASK_NAMES = {
  new: "从零构建",
  modify: "现有项目调整",
  bug: "缺陷修复",
  feature: "功能扩展",
  redesign: "界面重构",
};

const TAB_OPTIONS = [
  { id: "prompt", label: "执行版", icon: TerminalSquare },
  { id: "staged", label: "分步版", icon: Layers3 },
  { id: "concise", label: "精简版", icon: Zap },
  { id: "spec", label: "需求规格", icon: FileCode2 },
  { id: "checklist", label: "验收清单", icon: CheckCircle2 },
];

function readStorage(key, fallback) {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
}

function makeDefaultConfigs() {
  return Object.fromEntries(
    PROVIDER_PRESETS.map((provider) => [
      provider.id,
      {
        providerId: provider.id,
        kind: provider.kind,
        baseUrl: provider.baseUrl || "",
        model: provider.model || "",
        apiKey: provider.apiKey || "",
      },
    ]),
  );
}

function formatDate(value) {
  const date = new Date(value);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) {
    return `今天 ${date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}`;
  }
  return date.toLocaleDateString("zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getRiskIcon(level) {
  if (level === "high") return CircleAlert;
  if (level === "low") return CheckCircle2;
  return Gauge;
}

function BrandMark({ compact = false }) {
  return (
    <span className={`brand-mark ${compact ? "is-compact" : ""}`} aria-hidden="true">
      <span />
      <span />
      <span />
    </span>
  );
}

function ScoreRing({ score, size = "large", label = "需求完整度" }) {
  const safeScore = Math.max(0, Math.min(100, Math.round(score || 0)));
  return (
    <div
      className={`score-ring score-ring-${size}`}
      style={{ "--score-angle": `${safeScore * 3.6}deg` }}
      aria-label={`${label} ${safeScore} 分`}
    >
      <div className="score-ring-inner">
        <strong>{safeScore}</strong>
        <span>/ 100</span>
      </div>
    </div>
  );
}

function DimensionBars({ dimensions, compact = false }) {
  return (
    <div className={`dimension-list ${compact ? "is-compact" : ""}`}>
      {dimensions.map((dimension) => (
        <div className="dimension-row" key={dimension.key || dimension.label}>
          <div className="dimension-label">
            <span>{dimension.label}</span>
            <b>{Math.round(dimension.value)}</b>
          </div>
          <div className="dimension-track">
            <span style={{ width: `${Math.max(4, Math.min(100, dimension.value))}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyInspector() {
  return (
    <aside className="inspector-card inspector-empty">
      <div className="inspector-topline">
        <span className="section-kicker">INSTRUCTION HEALTH</span>
        <span className="live-dot">实时</span>
      </div>
      <div className="empty-radar" aria-hidden="true">
        <span className="radar-orbit orbit-one" />
        <span className="radar-orbit orbit-two" />
        <span className="radar-orbit orbit-three" />
        <WandSparkles size={28} strokeWidth={1.6} />
      </div>
      <h3>好指令，从补齐上下文开始。</h3>
      <p>输入想法后，这里会实时检查目标、交互、技术边界和验收标准。</p>
      <div className="inspector-promises">
        <span><Check size={14} /> 发现隐含需求</span>
        <span><Check size={14} /> 生成关键追问</span>
        <span><Check size={14} /> 排除模糊表述</span>
      </div>
    </aside>
  );
}

function LiveInspector({ preview }) {
  if (!preview) return <EmptyInspector />;
  return (
    <aside className="inspector-card">
      <div className="inspector-topline">
        <span className="section-kicker">INSTRUCTION HEALTH</span>
        <span className="live-dot">实时</span>
      </div>
      <div className="live-score">
        <ScoreRing score={preview.score} />
        <div>
          <span className="score-caption">需求完整度</span>
          <strong>
            {preview.score >= 78 ? "可以开始执行" : preview.score >= 60 ? "接近可用" : "还缺少关键线索"}
          </strong>
          <p>随输入与补充实时更新</p>
        </div>
      </div>
      <DimensionBars dimensions={preview.dimensions} />
      <div className="gap-block">
        <div className="gap-title">
          <span>建议补齐</span>
          <b>{preview.questions.length}</b>
        </div>
        {preview.questions.length ? (
          preview.questions.map((item) => (
            <div className="gap-row" key={item.id}>
              <span>{String(preview.questions.indexOf(item) + 1).padStart(2, "0")}</span>
              <p>{item.question}</p>
            </div>
          ))
        ) : (
          <div className="gap-complete">
            <CheckCircle2 size={17} />
            关键信息已经齐备
          </div>
        )}
      </div>
      <p className="privacy-note">
        <ShieldCheck size={14} />
        本地模式不会上传你的需求
      </p>
    </aside>
  );
}

function Composer({
  idea,
  setIdea,
  taskType,
  setTaskType,
  targetTool,
  setTargetTool,
  preview,
  provider,
  onCompile,
  isCompiling,
  onOpenSettings,
}) {
  const textareaRef = useRef(null);
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  return (
    <section className="composer-card">
      <div className="composer-heading">
        <div>
          <span className="section-kicker">01 / DEFINE THE INTENT</span>
          <h2>你想做出什么？</h2>
          <p>直接用日常语言描述，不需要懂提示词或技术术语。</p>
        </div>
        <div className="character-count">{idea.trim().length} 字</div>
      </div>

      <div className="task-tabs" role="tablist" aria-label="任务类型">
        {TASK_PRESETS.map((task) => (
          <button
            type="button"
            role="tab"
            aria-selected={taskType === task.id}
            className={taskType === task.id ? "is-active" : ""}
            key={task.id}
            onClick={() => setTaskType(task.id)}
          >
            {task.name}
          </button>
        ))}
      </div>

      <div className="idea-field">
        <textarea
          ref={textareaRef}
          value={idea}
          onChange={(event) => setIdea(event.target.value)}
          placeholder="例如：我想做一个记录每天喝水的小程序，界面清爽一点，喝完可以打卡，最好每天能提醒我……"
          rows={7}
          maxLength={3000}
          onKeyDown={(event) => {
            if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
              onCompile();
            }
          }}
        />
        {!idea && (
          <div className="idea-prompt-decoration" aria-hidden="true">
            <span>想法</span>
            <ArrowRight size={20} />
            <span>可执行指令</span>
          </div>
        )}
      </div>

      <div className="example-row">
        <span>试试：</span>
        {EXAMPLE_IDEAS.map((example, index) => (
          <button type="button" key={example} onClick={() => setIdea(example)}>
            {["日常打卡", "后台功能", "修复页面"][index]}
          </button>
        ))}
      </div>

      <div className="composer-controls">
        <label className="select-control">
          <Bot size={16} />
          <span>交给</span>
          <select value={targetTool} onChange={(event) => setTargetTool(event.target.value)}>
            {TOOL_PRESETS.map((tool) => (
              <option value={tool.id} key={tool.id}>{tool.name}</option>
            ))}
          </select>
          <ChevronDown size={14} />
        </label>

        <button
          type="button"
          className="provider-control"
          onClick={onOpenSettings}
          title="配置模型接口"
        >
          <span className={`provider-status-dot ${provider.kind === "local" ? "is-local" : ""}`} />
          {provider.kind === "local" ? "本地编译" : provider.model || "配置模型"}
          <Settings2 size={14} />
        </button>

        <button
          type="button"
          className="compile-button"
          onClick={onCompile}
          disabled={isCompiling}
        >
          {isCompiling ? (
            <>
              <LoaderCircle size={18} className="spin" />
              正在编译
            </>
          ) : (
            <>
              <Sparkles size={18} />
              编译提示词
              <ArrowRight size={18} />
            </>
          )}
        </button>
      </div>
      <div className="composer-footnote">
        <span><span className="inline-dot" /> {preview?.questions.length || 0} 个建议追问</span>
        <span>⌘ / Ctrl + Enter 快速编译</span>
      </div>
    </section>
  );
}

function IntroView({
  idea,
  setIdea,
  taskType,
  setTaskType,
  targetTool,
  setTargetTool,
  preview,
  provider,
  onCompile,
  isCompiling,
  onOpenSettings,
}) {
  return (
    <main className="intro-main">
      <section className="intro-heading">
        <div>
          <span className="eyebrow"><span /> VIBE CODING, WITHOUT GUESSWORK</span>
          <h1>
            把模糊想法，
            <br />
            变成<span>能落地的开发指令。</span>
          </h1>
        </div>
        <p>
          不只是润色一句话。言构会拆出目标、上下文、边界与验收标准，
          <br className="desktop-only" />
          让 AI 编程工具少猜一点，多做对一点。
        </p>
      </section>

      <div className="composer-layout">
        <Composer
          idea={idea}
          setIdea={setIdea}
          taskType={taskType}
          setTaskType={setTaskType}
          targetTool={targetTool}
          setTargetTool={setTargetTool}
          preview={preview}
          provider={provider}
          onCompile={onCompile}
          isCompiling={isCompiling}
          onOpenSettings={onOpenSettings}
        />
        <LiveInspector preview={preview} />
      </div>

      <div className="process-strip">
        <div><span>01</span><strong>理解意图</strong><p>识别产品与真实目标</p></div>
        <ArrowRight size={18} />
        <div><span>02</span><strong>发现缺口</strong><p>只问真正影响实现的</p></div>
        <ArrowRight size={18} />
        <div><span>03</span><strong>结构化编译</strong><p>输出完整开发任务</p></div>
        <ArrowRight size={18} />
        <div><span>04</span><strong>持续验收</strong><p>附带清单与风险提醒</p></div>
      </div>
    </main>
  );
}

function RiskList({ risks }) {
  if (!risks?.length) return null;
  return (
    <div className="risk-list">
      {risks.map((risk, index) => {
        const Icon = getRiskIcon(risk.level);
        return (
          <div className={`risk-item risk-${risk.level}`} key={`${risk.text}-${index}`}>
            <Icon size={16} />
            <p>{risk.text}</p>
          </div>
        );
      })}
    </div>
  );
}

function ResultInspector({
  result,
  answers,
  setAnswers,
  onRecompile,
  isCompiling,
  provider,
  onOpenSettings,
}) {
  const [answersOpen, setAnswersOpen] = useState(true);
  const questions = result.questions || [];
  const changedAnswers = Object.values(answers).some(Boolean);

  return (
    <aside className="result-inspector">
      <div className="result-score-card">
        <div className="inspector-topline">
          <span className="section-kicker">EXECUTION READINESS</span>
          <span className={`result-mode-badge ${result.mode === "ai" ? "is-ai" : ""}`}>
            {result.mode === "ai" ? <Sparkles size={12} /> : <ShieldCheck size={12} />}
            {result.mode === "ai" ? "AI 增强" : "本地编译"}
          </span>
        </div>
        <div className="result-score-row">
          <ScoreRing score={result.score} size="medium" />
          <div>
            <strong>{result.score >= 80 ? "可以开始执行" : "建议补充后执行"}</strong>
            <p>{result.summary}</p>
          </div>
        </div>
        <DimensionBars dimensions={result.dimensions} compact />
      </div>

      <div className="result-side-card">
        <button
          type="button"
          className="side-card-toggle"
          onClick={() => setAnswersOpen((value) => !value)}
          aria-expanded={answersOpen}
        >
          <span><WandSparkles size={16} /> 关键追问</span>
          <span className="question-count">{questions.length}</span>
          <ChevronDown size={16} className={answersOpen ? "is-open" : ""} />
        </button>
        {answersOpen && (
          <div className="question-list">
            {questions.length ? (
              <>
                <p className="side-card-help">回答后重新编译，提示词会吸收这些上下文。</p>
                {questions.map((item, index) => (
                  <div className="question-card" key={item.id || index}>
                    <label htmlFor={`question-${item.id || index}`}>
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      {item.question}
                    </label>
                    <p>{item.reason}</p>
                    {!!item.options?.length && (
                      <div className="question-options">
                        {item.options.map((option) => (
                          <button
                            type="button"
                            className={answers[item.id] === option ? "is-selected" : ""}
                            key={option}
                            onClick={() =>
                              setAnswers((current) => ({ ...current, [item.id]: option }))
                            }
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    )}
                    <input
                      id={`question-${item.id || index}`}
                      value={answers[item.id] || ""}
                      onChange={(event) =>
                        setAnswers((current) => ({
                          ...current,
                          [item.id]: event.target.value,
                        }))
                      }
                      placeholder="也可以输入更具体的答案…"
                    />
                  </div>
                ))}
                <button
                  type="button"
                  className="recompile-button"
                  onClick={onRecompile}
                  disabled={isCompiling}
                >
                  {isCompiling ? <LoaderCircle size={16} className="spin" /> : <RotateCw size={16} />}
                  {changedAnswers ? "应用补充并重新编译" : "带补充信息重新编译"}
                </button>
              </>
            ) : (
              <div className="all-clear">
                <CheckCircle2 size={22} />
                <strong>关键信息已齐备</strong>
                <p>现在可以直接把提示词交给编程智能体。</p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="result-side-card">
        <div className="side-card-title">
          <span><CircleAlert size={16} /> 风险与注意</span>
        </div>
        <RiskList risks={result.risks} />
      </div>

      {provider.kind === "local" && (
        <button type="button" className="upgrade-model-card" onClick={onOpenSettings}>
          <span className="upgrade-icon"><Sparkles size={17} /></span>
          <span>
            <strong>接入模型，理解得更深</strong>
            <p>支持 12 种接口与本地模型</p>
          </span>
          <ArrowRight size={17} />
        </button>
      )}
    </aside>
  );
}

function ResultView({
  result,
  idea,
  answers,
  setAnswers,
  onRecompile,
  onBack,
  onCopy,
  onDownload,
  isCompiling,
  provider,
  onOpenSettings,
}) {
  const [activeTab, setActiveTab] = useState("prompt");
  const [wrapped, setWrapped] = useState(false);
  const currentText = getPromptForTab(result, activeTab);

  return (
    <main className="result-main">
      <div className="result-topbar">
        <button type="button" className="back-button" onClick={onBack}>
          <ArrowLeft size={16} />
          修改需求
        </button>
        <div className="result-title-block">
          <span className="section-kicker">COMPILED BRIEF</span>
          <div>
            <h1>{result.title}</h1>
            <span>{TASK_NAMES[result.requirement?.taskType] || "开发任务"}</span>
          </div>
        </div>
        <div className="result-actions">
          <button type="button" className="secondary-action" onClick={() => setWrapped((value) => !value)}>
            <Menu size={16} />
            {wrapped ? "不换行" : "自动换行"}
          </button>
          <button type="button" className="secondary-action" onClick={() => onDownload(currentText, activeTab)}>
            <Download size={16} />
            导出
          </button>
          <button type="button" className="primary-action" onClick={() => onCopy(currentText)}>
            <Copy size={16} />
            复制提示词
          </button>
        </div>
      </div>

      <div className="result-layout">
        <section className="prompt-panel">
          <div className="prompt-panel-head">
            <div className="prompt-tabs" role="tablist" aria-label="输出格式">
              {TAB_OPTIONS.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === tab.id}
                    className={activeTab === tab.id ? "is-active" : ""}
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    <Icon size={15} />
                    {tab.label}
                  </button>
                );
              })}
            </div>
            <div className="prompt-meta">
              <span><span className="inline-dot" /> {currentText.split(/\s+/).length} tokens 约</span>
              <span>Markdown</span>
            </div>
          </div>

          {result.mode === "local" && provider.kind !== "local" && (
            <div className="ai-fallback-note">
              <Sparkles size={16} />
              <span>当前展示本地编译结果，模型增强可继续在右侧补充后重试。</span>
            </div>
          )}

          <div className={`prompt-document ${wrapped ? "is-wrapped" : ""}`}>
            <div className="prompt-gutter" aria-hidden="true">
              {currentText.split("\n").map((_, index) => (
                <span key={index}>{String(index + 1).padStart(2, "0")}</span>
              ))}
            </div>
            <pre>{currentText}</pre>
          </div>

          <div className="prompt-footer">
            <div>
              <ShieldCheck size={16} />
              <span>
                编译来源：{result.mode === "ai" ? `${result.provider || "AI"} / ${result.model || "模型"}` : "本地规则引擎"}
              </span>
            </div>
            <span>原始需求：{idea.slice(0, 42)}{idea.length > 42 ? "…" : ""}</span>
          </div>
        </section>

        <ResultInspector
          result={result}
          answers={answers}
          setAnswers={setAnswers}
          onRecompile={onRecompile}
          isCompiling={isCompiling}
          provider={provider}
          onOpenSettings={onOpenSettings}
        />
      </div>
    </main>
  );
}

function SettingsDrawer({
  open,
  onClose,
  providerId,
  setProviderId,
  providerState,
  setProviderConfig,
  provider,
  onTest,
  testing,
  testResult,
  setTestResult,
}) {
  const [showKey, setShowKey] = useState(false);
  const [saveKey, setSaveKey] = useState(false);
  const activeProvider = PROVIDER_PRESETS.find((item) => item.id === providerId) || PROVIDER_PRESETS[0];

  useEffect(() => {
    if (!open) {
      setShowKey(false);
      setTestResult(null);
    }
  }, [open, setTestResult]);

  if (!open) return null;
  return (
    <div className="drawer-layer" role="presentation">
      <button type="button" className="drawer-backdrop" aria-label="关闭设置" onClick={onClose} />
      <aside className="settings-drawer" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <div className="drawer-head">
          <div>
            <span className="section-kicker">MODEL ROUTER</span>
            <h2 id="settings-title">模型设置</h2>
          </div>
          <button type="button" className="icon-button" aria-label="关闭" onClick={onClose}>
            <X size={19} />
          </button>
        </div>

        <div className="drawer-scroll">
          <div className="privacy-banner">
            <ShieldCheck size={18} />
            <p>
              请求由本机服务转发。密钥默认只在当前会话生效；关闭“记住密钥”后刷新页面即清除。
            </p>
          </div>

          <div className="settings-section">
            <div className="settings-label">
              <span>选择模型接口</span>
              <small>12 个预设</small>
            </div>
            <div className="provider-grid">
              {PROVIDER_PRESETS.map((item) => (
                <button
                  type="button"
                  className={`provider-card provider-accent-${item.accent} ${
                    providerId === item.id ? "is-selected" : ""
                  }`}
                  key={item.id}
                  onClick={() => setProviderId(item.id)}
                >
                  <span className="provider-card-top">
                    <span className="provider-logo">{item.shortName.slice(0, 2).toUpperCase()}</span>
                    {providerId === item.id && <Check size={15} />}
                  </span>
                  <strong>{item.name}</strong>
                  <small>{item.description}</small>
                </button>
              ))}
            </div>
          </div>

          {providerId === "local" ? (
            <div className="local-provider-info">
              <span className="local-provider-icon"><ShieldCheck size={22} /></span>
              <div>
                <strong>本地编译器已启用</strong>
                <p>不需要 API Key。需求解析、结构化提示词、评分和验收清单都在浏览器内完成。</p>
              </div>
            </div>
          ) : (
            <div className="provider-form">
              <div className="settings-section">
                <div className="settings-label">
                  <span>{activeProvider.name} 配置</span>
                  <small>{activeProvider.localOnly ? "本地服务" : "API 代理"}</small>
                </div>
                <label className="form-field">
                  <span>接口地址</span>
                  <input
                    value={providerState.baseUrl}
                    onChange={(event) => setProviderConfig("baseUrl", event.target.value)}
                    placeholder="https://api.example.com/v1"
                    spellCheck="false"
                  />
                </label>
                <label className="form-field">
                  <span>模型名称</span>
                  <input
                    value={providerState.model}
                    onChange={(event) => setProviderConfig("model", event.target.value)}
                    placeholder="输入服务商提供的模型 ID"
                    spellCheck="false"
                  />
                </label>
                <label className="form-field">
                  <span>API Key</span>
                  <div className="key-input">
                    <KeyRound size={16} />
                    <input
                      type={showKey ? "text" : "password"}
                      value={providerState.apiKey}
                      onChange={(event) => setProviderConfig("apiKey", event.target.value)}
                      placeholder={activeProvider.localOnly ? "本地服务通常可留空" : "输入 API Key"}
                      autoComplete="off"
                      spellCheck="false"
                    />
                    <button type="button" aria-label={showKey ? "隐藏密钥" : "显示密钥"} onClick={() => setShowKey(!showKey)}>
                      {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </label>
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={saveKey}
                    onChange={(event) => setSaveKey(event.target.checked)}
                  />
                  <span>
                    <strong>在浏览器中记住密钥</strong>
                    <small>仅适合个人设备，不建议公共电脑使用</small>
                  </span>
                </label>
              </div>

              <div className="protocol-note">
                <Layers3 size={17} />
                <span>
                  当前协议：<b>{providerState.kind}</b>
                  {providerState.kind === "openai-chat" && " · 兼容 /chat/completions"}
                </span>
              </div>

              <button
                type="button"
                className="test-button"
                onClick={() => onTest(saveKey)}
                disabled={testing}
              >
                {testing ? <LoaderCircle size={16} className="spin" /> : <Zap size={16} />}
                {testing ? "正在连接…" : "测试模型连接"}
              </button>
              {testResult && (
                <div className={`test-result ${testResult.ok ? "is-success" : "is-error"}`}>
                  {testResult.ok ? <CheckCircle2 size={16} /> : <CircleAlert size={16} />}
                  <span>{testResult.message}</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="drawer-footer">
          <div>
            <span className={`provider-status-dot ${provider.kind === "local" ? "is-local" : ""}`} />
            <span>
              当前：<strong>{provider.kind === "local" ? "本地编译器" : activeProvider.name}</strong>
            </span>
          </div>
          <button type="button" className="primary-action" onClick={onClose}>
            完成
          </button>
        </div>
      </aside>
    </div>
  );
}

function HistoryDrawer({ open, onClose, history, onRestore, onDelete, onClear }) {
  if (!open) return null;
  return (
    <div className="drawer-layer" role="presentation">
      <button type="button" className="drawer-backdrop" aria-label="关闭历史" onClick={onClose} />
      <aside className="history-drawer" role="dialog" aria-modal="true" aria-labelledby="history-title">
        <div className="drawer-head">
          <div>
            <span className="section-kicker">LOCAL ARCHIVE</span>
            <h2 id="history-title">编译历史</h2>
          </div>
          <button type="button" className="icon-button" aria-label="关闭" onClick={onClose}>
            <X size={19} />
          </button>
        </div>
        <div className="history-summary">
          <Clock3 size={18} />
          <span>{history.length} 条记录，仅保存在当前设备</span>
        </div>
        <div className="history-list">
          {history.length ? (
            history.map((item) => (
              <div className="history-item" key={item.id}>
                <button type="button" className="history-main" onClick={() => onRestore(item)}>
                  <span className="history-score">{item.result.score}</span>
                  <span className="history-copy">
                    <strong>{item.result.title}</strong>
                    <small>{item.result.summary}</small>
                    <em>{formatDate(item.createdAt)}</em>
                  </span>
                  <ArrowRight size={17} />
                </button>
                <button
                  type="button"
                  className="history-delete"
                  aria-label="删除记录"
                  onClick={() => onDelete(item.id)}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))
          ) : (
            <div className="history-empty">
              <History size={30} strokeWidth={1.4} />
              <strong>还没有编译记录</strong>
              <p>完成第一次需求编译后，会出现在这里。</p>
            </div>
          )}
        </div>
        {history.length > 0 && (
          <div className="drawer-footer">
            <button type="button" className="text-danger-button" onClick={onClear}>
              <Trash2 size={15} /> 清空历史
            </button>
            <button type="button" className="secondary-action" onClick={onClose}>关闭</button>
          </div>
        )}
      </aside>
    </div>
  );
}

function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div className={`toast toast-${toast.type || "info"}`} role="status">
      {toast.type === "error" ? <CircleAlert size={17} /> : <CheckCircle2 size={17} />}
      <span>{toast.message}</span>
    </div>
  );
}

export default function App() {
  const [idea, setIdea] = useState("");
  const [taskType, setTaskType] = useState("auto");
  const [targetTool, setTargetTool] = useState("codex");
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [isCompiling, setIsCompiling] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [providerId, setProviderIdState] = useState(
    () => localStorage.getItem(STORAGE_KEYS.providerId) || "local",
  );
  const [providerConfigs, setProviderConfigs] = useState(() => ({
    ...makeDefaultConfigs(),
    ...readStorage(STORAGE_KEYS.providerConfigs, {}),
  }));
  const [history, setHistory] = useState(() => readStorage(STORAGE_KEYS.history, []));

  const provider = useMemo(
    () => ({
      ...providerConfigs[providerId],
      providerId,
    }),
    [providerConfigs, providerId],
  );

  const providerPreset =
    PROVIDER_PRESETS.find((item) => item.id === providerId) || PROVIDER_PRESETS[0];

  const preview = useMemo(() => {
    if (!idea.trim()) return null;
    return compileLocally({ idea, taskType, targetTool, answers });
  }, [idea, taskType, targetTool, answers]);

  useEffect(() => {
    if (!toast) return undefined;
    const timeout = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.providerId, providerId);
    localStorage.setItem(
      STORAGE_KEYS.providerConfigs,
      JSON.stringify(
        Object.fromEntries(
          Object.entries(providerConfigs).map(([id, config]) => [
            id,
            { ...config, apiKey: config.persistApiKey ? config.apiKey : "" },
          ]),
        ),
      ),
    );
  }, [providerConfigs, providerId]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(history));
  }, [history]);

  function chooseProvider(id) {
    setProviderIdState(id);
    setTestResult(null);
  }

  function setProviderConfig(key, value) {
    setProviderConfigs((current) => ({
      ...current,
      [providerId]: {
        ...current[providerId],
        [key]: value,
      },
    }));
    setTestResult(null);
  }

  function addToHistory(compiledResult, sourceIdea, settings) {
    const entry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      idea: sourceIdea,
      taskType: settings.taskType,
      targetTool: settings.targetTool,
      answers: settings.answers,
      result: compiledResult,
      createdAt: new Date().toISOString(),
    };
    setHistory((current) => [entry, ...current.filter((item) => item.idea !== sourceIdea)].slice(0, 15));
  }

  async function handleCompile(customAnswers = answers) {
    if (!idea.trim()) {
      setToast({ type: "error", message: "先用一句话描述你想做的东西。" });
      return;
    }

    const localResult = compileLocally({ idea, taskType, targetTool, answers: customAnswers });
    setResult(localResult);
    window.scrollTo({ top: 0, behavior: "smooth" });

    if (provider.kind === "local") {
      addToHistory(localResult, idea, { taskType, targetTool, answers: customAnswers });
      return;
    }

    setIsCompiling(true);
    setToast({ type: "info", message: "本地版本已就绪，正在调用模型深度编译…" });
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idea,
          taskType,
          targetTool,
          answers: customAnswers,
          localDraft: {
            title: localResult.title,
            summary: localResult.summary,
            score: localResult.score,
            prompt: localResult.prompt,
            stagedPrompt: localResult.stagedPrompt,
            checklist: localResult.checklist,
            questions: localResult.questions,
            risks: localResult.risks,
          },
          provider,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "模型编译失败");
      const enhanced = mergeAiResult(localResult, data.result);
      enhanced.provider = providerPreset.name;
      enhanced.model = data.model;
      setResult(enhanced);
      addToHistory(enhanced, idea, { taskType, targetTool, answers: customAnswers });
      setToast({ type: "success", message: `已用 ${providerPreset.name} 完成深度编译。` });
    } catch (error) {
      addToHistory(localResult, idea, { taskType, targetTool, answers: customAnswers });
      setToast({
        type: "error",
        message: `模型连接失败，已保留本地结果：${error.message}`,
      });
    } finally {
      setIsCompiling(false);
    }
  }

  async function testConnection(persistApiKey) {
    setTesting(true);
    setTestResult(null);
    setProviderConfigs((current) => ({
      ...current,
      [providerId]: {
        ...current[providerId],
        persistApiKey,
      },
    }));
    try {
      const response = await fetch("/api/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "连接失败");
      setTestResult({
        ok: true,
        message: `连接成功 · ${data.model} · ${data.latency} ms`,
      });
    } catch (error) {
      setTestResult({ ok: false, message: error.message });
    } finally {
      setTesting(false);
    }
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      setToast({ type: "success", message: "提示词已复制，可以粘贴到编程工具了。" });
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
      setToast({ type: "success", message: "提示词已复制。" });
    }
  }

  function downloadText(text, tab) {
    const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `yangou-${tab}-${new Date().toISOString().slice(0, 10)}.md`;
    link.click();
    URL.revokeObjectURL(url);
    setToast({ type: "success", message: "Markdown 文件已导出。" });
  }

  function resetToIdea() {
    setResult(null);
    setAnswers({});
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function restoreHistory(item) {
    setIdea(item.idea);
    setTaskType(item.taskType || "auto");
    setTargetTool(item.targetTool || "codex");
    setAnswers(item.answers || {});
    setResult(item.result);
    setHistoryOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function deleteHistory(id) {
    setHistory((current) => current.filter((item) => item.id !== id));
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <button
          type="button"
          className="brand-button"
          onClick={() => {
            setResult(null);
          }}
          aria-label="返回言构首页"
        >
          <BrandMark />
          <span className="brand-name">言构</span>
          <span className="brand-divider" />
          <span className="brand-sub">VIBE PROMPT COMPILER</span>
        </button>

        <div className="header-actions">
          <button type="button" className="header-model-pill" onClick={() => setSettingsOpen(true)}>
            <span className={`provider-status-dot ${provider.kind === "local" ? "is-local" : ""}`} />
            <span>{provider.kind === "local" ? "本地编译器" : providerPreset.name}</span>
            <ChevronDown size={13} />
          </button>
          <button type="button" className="header-icon-button" onClick={() => setHistoryOpen(true)}>
            <History size={17} />
            <span>历史</span>
            {history.length > 0 && <b>{history.length}</b>}
          </button>
          <button type="button" className="header-icon-button" onClick={() => setSettingsOpen(true)}>
            <Settings2 size={17} />
            <span>模型</span>
          </button>
          <button
            type="button"
            className="new-button"
            onClick={() => {
              setResult(null);
              setIdea("");
              setAnswers({});
            }}
          >
            <Plus size={16} />
            新建
          </button>
        </div>
      </header>

      {result ? (
        <ResultView
          result={result}
          idea={idea}
          answers={answers}
          setAnswers={setAnswers}
          onRecompile={() => handleCompile(answers)}
          onBack={resetToIdea}
          onCopy={copyText}
          onDownload={downloadText}
          isCompiling={isCompiling}
          provider={provider}
          onOpenSettings={() => setSettingsOpen(true)}
        />
      ) : (
        <IntroView
          idea={idea}
          setIdea={setIdea}
          taskType={taskType}
          setTaskType={setTaskType}
          targetTool={targetTool}
          setTargetTool={setTargetTool}
          preview={preview}
          provider={provider}
          onCompile={() => handleCompile(answers)}
          isCompiling={isCompiling}
          onOpenSettings={() => setSettingsOpen(true)}
        />
      )}

      <footer className="site-footer">
        <span>言构 / YANGOU</span>
        <span>把意图说清楚，比把代码写快更重要。</span>
        <span>LOCAL-FIRST · MODEL-AGNOSTIC</span>
      </footer>

      <SettingsDrawer
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        providerId={providerId}
        setProviderId={chooseProvider}
        providerState={provider}
        setProviderConfig={setProviderConfig}
        provider={provider}
        onTest={testConnection}
        testing={testing}
        testResult={testResult}
        setTestResult={setTestResult}
      />
      <HistoryDrawer
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        history={history}
        onRestore={restoreHistory}
        onDelete={deleteHistory}
        onClear={() => setHistory([])}
      />
      <Toast toast={toast} />
    </div>
  );
}
