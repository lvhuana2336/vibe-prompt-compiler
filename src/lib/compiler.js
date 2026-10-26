const TOOL_LABELS = {
  codex: "Codex",
  "claude-code": "Claude Code",
  cursor: "Cursor",
  lovable: "Lovable / Bolt",
};

const PROJECT_LABELS = {
  miniapp: "微信小程序",
  mobile: "移动应用",
  web: "Web 应用",
  dashboard: "管理后台 / 数据看板",
  landing: "网站 / Landing Page",
  service: "后端服务 / API",
  game: "游戏",
  extension: "浏览器插件",
  unknown: "待确认的产品形态",
};

const FEATURE_RULES = [
  { label: "账号注册与登录", pattern: /登录|注册|账号|账户|auth|oauth/i },
  { label: "数据记录与编辑", pattern: /记录|新增|编辑|删除|增删改查|crud|录入/i },
  { label: "筛选、搜索与排序", pattern: /筛选|搜索|查找|排序|过滤|filter|search/i },
  { label: "数据看板与可视化", pattern: /看板|图表|统计|趋势|数据可视化|dashboard|chart/i },
  { label: "提醒与通知", pattern: /提醒|通知|推送|闹钟|notify|notification|remind/i },
  { label: "支付与订单", pattern: /支付|订单|购买|结算|订阅|pay|checkout|order/i },
  { label: "社交互动", pattern: /评论|点赞|关注|分享|评论|community|social/i },
  { label: "消息与聊天", pattern: /聊天|消息|会话|即时通讯|chat|message/i },
  { label: "文件上传与管理", pattern: /上传|附件|图片|文件|upload|attachment/i },
  { label: "数据导出", pattern: /导出|下载报表|excel|csv|export/i },
  { label: "AI 能力", pattern: /ai|人工智能|大模型|生成式|智能生成|llm/i },
  { label: "离线或弱网支持", pattern: /离线|弱网|缓存|offline|pwa/i },
];

const TECH_RULES = [
  { label: "React", pattern: /\breact\b/i },
  { label: "Vue", pattern: /\bvue\b/i },
  { label: "Next.js", pattern: /next\.?js/i },
  { label: "小程序原生", pattern: /原生小程序|小程序原生/i },
  { label: "uni-app", pattern: /uni-app|uniapp/i },
  { label: "Taro", pattern: /\btaro\b/i },
  { label: "Flutter", pattern: /flutter/i },
  { label: "React Native", pattern: /react native|react-native/i },
  { label: "Node.js", pattern: /node\.?js|express|nestjs/i },
  { label: "Python", pattern: /python|fastapi|django|flask/i },
  { label: "TypeScript", pattern: /typescript|\bts\b/i },
  { label: "Tailwind CSS", pattern: /tailwind/i },
];

const STYLE_RULES = [
  { label: "极简、克制", pattern: /极简|简洁|干净|克制|minimal/i },
  { label: "专业、可信", pattern: /专业|企业|可信|商务|professional/i },
  { label: "清新、自然", pattern: /清新|自然|治愈|清爽|森系/i },
  { label: "高级、精致", pattern: /高级|精致|质感|premium|luxury/i },
  { label: "活泼、有趣", pattern: /活泼|有趣|可爱|卡通|年轻/i },
  { label: "深色、科技感", pattern: /深色|暗黑|科技感|赛博/i },
];

const TASK_PATTERNS = {
  bug: /修复|报错|异常|崩溃|不工作|打不开|错位|挤压|白屏|bug|error/i,
  redesign: /重构界面|重新设计|改版|美化|视觉升级|ui 重构|redesign/i,
  feature: /增加|新增|添加|支持|扩展|加一个|加个/i,
  modify: /现有|已有|已有项目|修改|调整|优化一下|改进/i,
  new: /做一个|开发一个|搭建|创建|实现一个|从零|新项目|帮我做/i,
};

const TARGET_GUIDANCE = {
  codex: [
    "先检查仓库结构、现有技术栈和未提交改动，再制定最小改动方案。",
    "直接完成实现，不要只给示例代码；对关键逻辑补充必要测试。",
    "最后运行构建或测试，并如实报告未验证项和环境限制。",
  ],
  "claude-code": [
    "先定位相关入口、组件、数据层和现有约定，避免重复实现。",
    "按仓库风格完成代码，控制修改范围，不重构无关模块。",
    "用可运行的结果和明确的验收证据结束任务。",
  ],
  cursor: [
    "先引用准备修改的文件与关键函数，再说明方案。",
    "保持现有设计系统与代码风格，提交可直接合入的完整改动。",
    "指出需要我在编辑器中确认的视觉或交互细节。",
  ],
  lovable: [
    "优先交付可完整操作、视觉完成度高的产品界面。",
    "使用真实且一致的中文示例数据，避免占位空壳页面。",
    "明确处理适配、空状态、加载、错误和边界反馈。",
  ],
};

function uniq(items) {
  return [...new Set(items.filter(Boolean))];
}

function detectLabels(text, rules) {
  return rules.filter((rule) => rule.pattern.test(text)).map((rule) => rule.label);
}

function detectTask(text, selected) {
  if (selected && selected !== "auto") return selected;
  for (const type of ["bug", "redesign", "feature", "modify", "new"]) {
    if (TASK_PATTERNS[type].test(text)) return type;
  }
  return "new";
}

function detectProject(text) {
  if (/小程序|微信小游戏/.test(text)) return "miniapp";
  if (/管理后台|后台管理|控制台|看板|后台|dashboard/i.test(text)) return "dashboard";
  if (/app\b|应用|安卓|ios|手机端/i.test(text)) return "mobile";
  if (/官网|落地页|landing|品牌站/i.test(text)) return "landing";
  if (/接口|后端|服务端|api\b/i.test(text)) return "service";
  if (/游戏|game/i.test(text)) return "game";
  if (/插件|extension/i.test(text)) return "extension";
  if (/网站|web|网页|前端|页面/i.test(text)) return "web";
  return "unknown";
}

function detectAudience(text) {
  if (/给学生|面向学生|学生用/.test(text)) return "学生";
  if (/老人|老年人/.test(text)) return "老年用户";
  if (/团队成员|公司内部|员工|同事/.test(text)) return "团队或企业内部用户";
  if (/商家|店主|客户管理/.test(text)) return "商家或经营者";
  if (/个人|自己用|私人/.test(text)) return "个人用户";
  return "";
}

function detectStyle(text) {
  return detectLabels(text, STYLE_RULES);
}

function compactIdea(text) {
  return text.replace(/\s+/g, " ").replace(/[。！？!?]+$/g, "").trim();
}

function mergeAnswer(answers, id) {
  return String(answers?.[id] || "").trim();
}

function question(id, title, reason, options = []) {
  return { id, question: title, reason, options };
}

function buildQuestions(requirement, answers) {
  const candidates = [];

  if (!requirement.audience && !mergeAnswer(answers, "audience")) {
    candidates.push(
      question(
        "audience",
        "主要给谁使用？",
        "目标用户会直接决定信息密度、操作路径和视觉风格。",
        ["只有我自己", "团队内部", "普通消费者", "商家或企业"],
      ),
    );
  }

  if (requirement.projectType === "unknown" && !mergeAnswer(answers, "platform")) {
    candidates.push(
      question(
        "platform",
        "最终运行在哪个平台？",
        "Web、移动端和小程序在布局、导航与能力接入上差异很大。",
        ["桌面 Web", "手机 Web", "微信小程序", "iOS / Android"],
      ),
    );
  }

  if (!requirement.techStack.length && !mergeAnswer(answers, "stack")) {
    candidates.push(
      question(
        "stack",
        "技术栈有要求吗？",
        "明确技术栈能减少 AI 自行选型导致的返工。",
        ["没有，请选择最稳妥方案", "React / Next.js", "Vue", "Python 后端"],
      ),
    );
  }

  if (!mergeAnswer(answers, "data") && !/本地|云端|数据库|无需保存|不存储/.test(requirement.idea)) {
    candidates.push(
      question(
        "data",
        "核心数据要存在哪里？",
        "存储方式会影响登录、同步、数据库和部署方案。",
        ["仅当前设备", "云端同步", "暂时用演示数据", "还不确定"],
      ),
    );
  }

  if (!requirement.style.length && !mergeAnswer(answers, "style") && requirement.taskType !== "bug") {
    candidates.push(
      question(
        "style",
        "希望界面呈现什么气质？",
        "具体的视觉方向比“好看一点”更容易稳定复现。",
        ["极简专业", "清新自然", "高级精致", "活泼有趣"],
      ),
    );
  }

  if (requirement.taskType === "bug" && !mergeAnswer(answers, "repro")) {
    candidates.push(
      question(
        "repro",
        "问题在什么条件下出现？",
        "可复现路径、报错信息和目标代码位置是最重要的排障上下文。",
        ["稳定复现", "偶发出现", "只在移动端", "暂时不知道"],
      ),
    );
  }

  if (
    ["modify", "bug", "feature", "redesign"].includes(requirement.taskType) &&
    !mergeAnswer(answers, "repo")
  ) {
    candidates.push(
      question(
        "repo",
        "当前项目使用什么技术栈，关键页面在哪里？",
        "现有工程约定和相关文件能显著降低改动范围与回归风险。",
        ["React 项目", "Vue 项目", "后端模板项目", "我会在提示词里补充"],
      ),
    );
  }

  return candidates.slice(0, 3);
}

function mergeContextAnswers(requirement, answers) {
  const answerLines = [];
  const mapping = [
    ["audience", "目标用户"],
    ["platform", "运行平台"],
    ["stack", "技术栈偏好"],
    ["data", "数据存储"],
    ["style", "视觉方向"],
    ["repro", "问题复现条件"],
    ["repo", "现有项目上下文"],
    ["scope", "范围或约束"],
  ];

  for (const [id, label] of mapping) {
    const value = mergeAnswer(answers, id);
    if (value) answerLines.push(`${label}：${value}`);
  }

  const knownIds = new Set(mapping.map(([id]) => id));
  for (const [id, rawValue] of Object.entries(answers || {})) {
    const value = String(rawValue || "").trim();
    if (value && !knownIds.has(id)) answerLines.push(`补充说明：${value}`);
  }

  return {
    ...requirement,
    audience: requirement.audience || mergeAnswer(answers, "audience"),
    platform: mergeAnswer(answers, "platform"),
    techStack: uniq([
      ...requirement.techStack,
      ...(mergeAnswer(answers, "stack")
        ? mergeAnswer(answers, "stack")
            .split(/[、,，/]/)
            .map((item) => item.trim())
            .filter((item) => !/没有|不确定|请选择/.test(item))
        : []),
    ]),
    storage: mergeAnswer(answers, "data"),
    style: uniq([
      ...requirement.style,
      ...(mergeAnswer(answers, "style") ? [mergeAnswer(answers, "style")] : []),
    ]),
    answerLines,
  };
}

function scoreRequirement(requirement) {
  const dimensionValue = (key) => {
    const base = {
      goal: 74,
      context: 38,
      interaction: 34,
      constraint: 28,
      acceptance: 42,
      technology: 34,
    }[key];
    return Math.max(16, Math.min(98, base + requirement.lifts[key]));
  };

  const lifts = {
    goal: (requirement.idea.length > 18 ? 13 : 5) + (requirement.taskType !== "new" ? 5 : 0),
    context: (requirement.audience ? 16 : 0) + (requirement.projectType !== "unknown" ? 18 : 0) +
      (requirement.answerLines.length ? 12 : 0),
    interaction: Math.min(34, requirement.features.length * 8) + (requirement.style.length ? 12 : 0),
    constraint: (requirement.techStack.length ? 25 : 0) + (requirement.storage ? 14 : 0) +
      (requirement.answerLines.length ? 10 : 0),
    acceptance: Math.min(28, requirement.features.length * 7) +
      (requirement.answerLines.length ? 12 : 0),
    technology: (requirement.techStack.length ? 30 : 0) +
      (requirement.projectType !== "unknown" ? 18 : 0) +
      (requirement.storage ? 10 : 0),
  };

  requirement.lifts = lifts;
  const dimensions = [
    { key: "goal", label: "目标清晰度", value: dimensionValue("goal") },
    { key: "context", label: "使用场景", value: dimensionValue("context") },
    { key: "interaction", label: "交互完整度", value: dimensionValue("interaction") },
    { key: "constraint", label: "边界约束", value: dimensionValue("constraint") },
    { key: "acceptance", label: "验收质量", value: dimensionValue("acceptance") },
    { key: "technology", label: "技术可执行性", value: dimensionValue("technology") },
  ];

  return {
    score: Math.round(dimensions.reduce((sum, item) => sum + item.value, 0) / dimensions.length),
    dimensions,
  };
}

function buildRisks(requirement) {
  const risks = [];
  if (!requirement.audience) risks.push({ level: "medium", text: "目标用户尚未明确，视觉与流程可能出现偏差。" });
  if (requirement.projectType === "unknown") risks.push({ level: "high", text: "运行平台不明确，布局和能力边界存在返工风险。" });
  if (!requirement.techStack.length) risks.push({ level: "medium", text: "技术栈未定，AI 可能自行引入不必要的工程复杂度。" });
  if (!requirement.features.length) risks.push({ level: "high", text: "还没有识别到具体功能，生成结果容易停留在视觉空壳。" });
  if (requirement.taskType === "bug" && !/报错|错误|日志|复现/.test(requirement.idea)) {
    risks.push({ level: "high", text: "缺少报错信息或复现路径，排障准确率会明显降低。" });
  }
  if (requirement.answerLines.length) {
    risks.push({ level: "low", text: "已补充关键上下文，建议执行前再确认一次范围边界。" });
  }
  return risks.slice(0, 4);
}

function createFeatures(requirement) {
  const features = [...requirement.features];
  if (/导出/.test(requirement.answerLines.join(" "))) features.push("导出筛选后的数据");
  if (requirement.taskType === "bug") {
    features.push("定位根因并实施最小修复", "验证原问题不再复现");
  }
  if (requirement.taskType === "redesign") {
    features.push("保留现有业务能力", "统一视觉系统与响应式布局");
  }
  return uniq(features);
}

function sectionText(title, lines) {
  return `## ${title}\n${lines.filter(Boolean).map((line) => `- ${line}`).join("\n")}`;
}

function buildPrompt(requirement, style = "execution") {
  const project = PROJECT_LABELS[requirement.projectType] || PROJECT_LABELS.unknown;
  const target = TOOL_LABELS[requirement.targetTool] || TOOL_LABELS.codex;
  const stack = requirement.techStack.length
    ? requirement.techStack.join(" + ")
    : "由你根据项目目标选择成熟、低维护成本的技术方案，并在开始前说明理由";
  const audience = requirement.audience || "未指定，请优先按最典型的核心用户设计";
  const visual = requirement.style.length ? requirement.style.join("、") : "清晰、克制、有明确层级";
  const storage = requirement.storage || "如无必要，首版优先使用可替换的本地或轻量数据层";
  const features = createFeatures(requirement);
  const goal = compactIdea(requirement.idea);
  const guidance = TARGET_GUIDANCE[requirement.targetTool] || TARGET_GUIDANCE.codex;

  if (style === "concise") {
    return `你是一名资深产品工程师。请使用 ${target} 完成以下任务。

**目标**
${goal}

**上下文**
- 产品形态：${project}
- 目标用户：${audience}
- 技术栈：${stack}
- 视觉方向：${visual}
- 数据方式：${storage}
${requirement.answerLines.map((line) => `- ${line}`).join("\n")}

**必须交付**
${features.length ? features.map((feature, index) => `${index + 1}. ${feature}`).join("\n") : "1. 先补齐最小可行的核心闭环\n2. 交付可运行且完成度一致的界面"}

**工程约束**
- 先核对现有结构，保持现有约定；不要进行无关重构。
- 明确处理加载、空状态、错误、权限和移动端适配。
- 不虚构已经运行过的测试或已经实现的集成。

**验收**
- 核心流程可从入口连续完成，不依赖手工改代码。
- 视觉层级清楚，关键操作在桌面与移动端都可用。
- 构建或测试通过，并说明实际验证范围。

请直接开始检查和实现，完成后给出改动摘要与验证结果。`;
  }

  const spec = [
    `## 任务背景`,
    `用户希望构建或调整：${goal}`,
    "",
    `## 已知上下文`,
    `- 产品形态：${project}`,
    `- 目标用户：${audience}`,
    `- 首选技术栈：${stack}`,
    `- 数据策略：${storage}`,
    `- 视觉方向：${visual}`,
    ...requirement.answerLines.map((line) => `- 补充信息：${line}`),
    "",
    sectionText("核心目标", [
      "先交付最小但完整的核心使用闭环",
      "让普通用户在无需说明书的情况下完成主要任务",
      "为后续扩展保留清晰的数据与组件边界",
    ]),
    "",
    sectionText("必须实现", features.length ? features : ["识别并实现核心业务闭环", "提供完整可操作的产品界面"]),
    "",
    sectionText("体验要求", [
      "信息层级明确，主要操作始终可发现",
      "提供加载、空状态、错误与成功反馈",
      "在常见桌面和移动视口下保持可用",
      `视觉气质：${visual}`,
      "使用真实、一致、有实际意义的中文示例数据，不使用 Lorem Ipsum",
    ]),
    "",
    sectionText("工程约束", [
      "开始前先检查项目结构、依赖、路由、样式体系和未提交改动",
      "优先复用已有组件、设计令牌和工具函数，避免重复建设",
      "不引入与目标无关的依赖，不进行大范围无必要重构",
      "不覆盖无关的用户改动，不删除现有功能",
      "若关键信息冲突，采用最稳妥方案并明确说明假设",
    ]),
    "",
    sectionText("非目标", [
      "不扩展需求中没有出现的复杂运营后台",
      "不为了展示技术而引入微服务、复杂状态管理或过度抽象",
    ]),
    "",
    sectionText("执行方式", guidance),
    "",
    sectionText("验收标准", [
      "核心流程可以不中断地从头走到尾",
      "所有按钮、链接和表单都有真实行为或明确禁用状态",
      "桌面与移动端无横向溢出、遮挡或主要操作不可达",
      "控制台无新增错误，构建或测试结果真实可复现",
    ]),
  ];

  return `# 开发任务：${goal}

你是一名资深产品工程师，同时具备产品判断、交互设计、前端实现与质量验证能力。请使用 ${target} 独立完成以下开发任务。以仓库中的真实代码为准，不把假设当成事实。

${spec.join("\n")}

请现在开始。先给出精炼的实施判断，然后直接完成代码；最后报告改动内容、验证命令、实际结果和仍需注意的风险。`;
}

function buildStagedPrompt(requirement) {
  const brief = buildPrompt({ ...requirement, answerLines: requirement.answerLines }, "execution");
  return `# 分阶段开发任务

你将分三个阶段完成工作。每个阶段都要基于真实结果推进，不能跳过检查。

## 阶段 1：理解与检查
- 检查仓库结构、现有功能、技术栈、设计系统和可运行命令。
- 用不超过 8 行总结当前实现与本次改动边界。
- 列出与需求冲突或需要我确认的事项；没有冲突则直接进入阶段 2。

## 阶段 2：实施
- 先完成核心闭环，再补状态、边界和响应式体验。
- 复用现有组件与约定，控制改动范围。
- 每完成一个模块，说明用户现在能做什么。

## 阶段 3：验证与交接
- 运行适用的构建、类型检查或测试。
- 按验收清单逐项自检，真实说明通过、失败和未验证项。
- 给出改动摘要、关键文件、运行方式与后续建议。

以下是完整任务上下文：

${brief}`;
}

function buildChecklist(requirement) {
  return [
    "核心用户路径可以从入口连续完成",
    "主操作在桌面与移动端都清晰可见",
    "加载、空状态、错误和成功反馈完整",
    "没有纯装饰性按钮或无法使用的表单",
    "示例数据真实、连贯且与产品目标一致",
    "构建、类型检查或测试结果已实际验证",
    "改动范围与原始需求一致，没有无关重构",
  ];
}

function buildSpecSections(requirement) {
  const features = createFeatures(requirement);
  return [
    {
      title: "产品定义",
      items: [
        `目标：${compactIdea(requirement.idea)}`,
        `形态：${PROJECT_LABELS[requirement.projectType]}`,
        `用户：${requirement.audience || "待确认"}`,
      ],
    },
    {
      title: "功能范围",
      items: features.length ? features : ["完成一个最小可行核心闭环", "提供完整产品界面"],
    },
    {
      title: "体验方向",
      items: [
        `视觉：${requirement.style.length ? requirement.style.join("、") : "清晰、克制、有层级"}`,
        "关键状态必须有反馈",
        "桌面与移动端均可用",
      ],
    },
    {
      title: "技术与数据",
      items: [
        `技术栈：${requirement.techStack.length ? requirement.techStack.join(" + ") : "待选型"}`,
        `数据：${requirement.storage || "待确认，首版保持轻量"}`,
        "优先复用现有工程约定",
      ],
    },
  ];
}

export function compileLocally({
  idea,
  taskType = "auto",
  targetTool = "codex",
  answers = {},
}) {
  const text = compactIdea(idea);
  const base = {
    idea: text,
    taskType: detectTask(text, taskType),
    projectType: detectProject(text),
    targetTool,
    features: detectLabels(text, FEATURE_RULES),
    techStack: detectLabels(text, TECH_RULES),
    style: detectStyle(text),
    audience: detectAudience(text),
    storage: "",
    answerLines: [],
    lifts: {},
  };

  const partial = mergeContextAnswers(base, answers);
  const questions = buildQuestions(partial, answers);
  const scored = scoreRequirement(partial);
  const requirement = {
    ...partial,
    ...scored,
    questions,
  };
  requirement.risks = buildRisks(requirement);

  return {
    mode: "local",
    provider: "local",
    model: "本地需求编译器",
    title: compactIdea(idea).slice(0, 34),
    summary: `${PROJECT_LABELS[requirement.projectType]} · ${
      {
        new: "从零构建",
        modify: "现有项目调整",
        bug: "缺陷修复",
        feature: "功能扩展",
        redesign: "界面重构",
      }[requirement.taskType]
    }`,
    prompt: buildPrompt(requirement, "execution"),
    concisePrompt: buildPrompt(requirement, "concise"),
    stagedPrompt: buildStagedPrompt(requirement),
    checklist: buildChecklist(requirement),
    spec: buildSpecSections(requirement),
    risks: requirement.risks,
    questions,
    dimensions: scored.dimensions,
    score: scored.score,
    requirement,
  };
}

export function mergeAiResult(localResult, aiResult) {
  if (!aiResult || typeof aiResult !== "object") return localResult;
  const prompt = typeof aiResult.prompt === "string" && aiResult.prompt.trim()
    ? aiResult.prompt.trim()
    : localResult.prompt;
  const stagedPrompt =
    typeof aiResult.stagedPrompt === "string" && aiResult.stagedPrompt.trim()
      ? aiResult.stagedPrompt.trim()
      : localResult.stagedPrompt;

  return {
    ...localResult,
    ...aiResult,
    mode: "ai",
    title: aiResult.title || localResult.title,
    summary: aiResult.summary || localResult.summary,
    prompt,
    stagedPrompt,
    concisePrompt: aiResult.concisePrompt || localResult.concisePrompt,
    checklist: Array.isArray(aiResult.checklist) ? aiResult.checklist : localResult.checklist,
    spec: Array.isArray(aiResult.spec) ? aiResult.spec : localResult.spec,
    risks: Array.isArray(aiResult.risks) ? aiResult.risks : localResult.risks,
    questions: Array.isArray(aiResult.questions) ? aiResult.questions.slice(0, 3) : localResult.questions,
    dimensions: Array.isArray(aiResult.dimensions) ? aiResult.dimensions : localResult.dimensions,
    score: Number.isFinite(Number(aiResult.score)) ? Number(aiResult.score) : localResult.score,
  };
}

export function getPromptForTab(result, tab) {
  if (!result) return "";
  if (tab === "staged") return result.stagedPrompt;
  if (tab === "concise") return result.concisePrompt;
  if (tab === "spec") {
    return result.spec
      .map((section) => `## ${section.title}\n${section.items.map((item) => `- ${item}`).join("\n")}`)
      .join("\n\n");
  }
  if (tab === "checklist") {
    return `# 验收清单\n${result.checklist.map((item) => `- [ ] ${item}`).join("\n")}`;
  }
  return result.prompt;
}
