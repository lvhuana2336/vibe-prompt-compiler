import {
  getArtifactPreset,
  getContentScenes,
  getContentTarget,
  getModePreset,
} from "../data/scenes.js";

const ROLE_BY_DOMAIN = {
  "business-writing": "资深商务写作顾问",
  "data-analysis": "资深数据分析师",
  marketing: "资深品牌与营销内容策略师",
};

const DIMENSION_LABELS = [
  ["goal", "目标清晰度"],
  ["audience", "受众与场景"],
  ["structure", "内容结构"],
  ["constraint", "格式约束"],
  ["acceptance", "验收质量"],
  ["execution", "可执行性"],
];

const ARTIFACT_LABELS = {
  text: "通用文本",
  ppt: "PPT 演示",
  word: "Word 文档",
  excel: "Excel 表格",
  pdf: "PDF 文档",
  image: "图像提示词",
};

function compactIdea(text) {
  return String(text || "").replace(/\s+/g, " ").replace(/[。！？!?]+$/g, "").trim();
}

function answer(answers, id) {
  return String(answers?.[id] || "").trim();
}

function uniq(items) {
  return [...new Set(items.filter(Boolean))];
}

function question(id, title, reason, options) {
  return { id, question: title, reason, options };
}

export function detectContentArtifact(text, selected = "auto") {
  if (selected && selected !== "auto") return selected;
  if (/ppt|演示文稿|幻灯片|汇报页/i.test(text)) return "ppt";
  if (/excel|表格|公式|透视表|工作表|数据清洗/i.test(text)) return "excel";
  if (/pdf|白皮书|电子书|报告文件/i.test(text)) return "pdf";
  if (/图片|配图|海报|主视觉|封面|图像提示词|文生图|插画/i.test(text)) return "image";
  if (/word|文档|纪要|方案|周报|需求文档|sop/i.test(text)) return "word";
  return "text";
}

function detectScene(domain, text, selected = "auto") {
  if (selected && selected !== "auto") return selected;
  const rules = {
    "business-writing": [
      ["minutes", /会议|纪要/i],
      ["weekly", /周报|月报|工作汇报|项目汇报/i],
      ["email", /邮件|来信|回复客户|商务沟通/i],
      ["proposal", /方案|提案|计划书/i],
      ["requirements", /需求|prd|功能说明/i],
      ["sop", /sop|流程|规范|操作手册/i],
    ],
    "data-analysis": [
      ["cleaning", /清洗|重复|缺失|异常值|脏数据/i],
      ["formula", /公式|函数|excel|计算列/i],
      ["chart", /图表|可视化|趋势图|柱状图|折线图/i],
      ["dashboard", /仪表盘|看板|dashboard/i],
      ["insight", /分析|洞察|结论|原因/i],
    ],
    marketing: [
      ["social", /小红书|公众号|微博|社媒|朋友圈|帖子/i],
      ["ad", /广告|投放|脚本|短视频/i],
      ["landing", /落地页|详情页|官网|产品页/i],
      ["brand", /品牌|口吻|语气|改写/i],
      ["visual", /海报|主视觉|配图|图片|封面/i],
    ],
  };
  return rules[domain]?.find(([, pattern]) => pattern.test(text))?.[0] || "general";
}

function sceneLabel(domain, scene) {
  return (
    getContentScenes(domain).find((preset) => preset.id === scene)?.name ||
    getContentScenes(domain)[0].name
  );
}

function detectAudience(text) {
  if (/老板|领导|管理层|高管/.test(text)) return "管理层";
  if (/客户|甲方|合作方/.test(text)) return "客户或合作方";
  if (/同事|团队|内部/.test(text)) return "团队内部";
  if (/消费者|用户|买家|顾客/.test(text)) return "目标消费者";
  if (/学生|老师|学员/.test(text)) return "学生或学员";
  return answer({}, "audience");
}

function buildQuestions(domain, artifact, text, answers) {
  const candidates = [];
  if (!detectAudience(text) && !answer(answers, "audience")) {
    candidates.push(
      question(
        "audience",
        "这份内容主要给谁看？",
        "受众会直接决定信息密度、措辞和行动号召。",
        ["管理层", "客户或合作方", "团队内部", "目标消费者"],
      ),
    );
  }

  if (artifact === "ppt" && !answer(answers, "slideCount")) {
    candidates.push(
      question(
        "slideCount",
        "演示文稿预计多少页？",
        "页数决定叙事颗粒度和每页信息量。",
        ["6-8 页", "10-12 页", "15 页左右", "由内容自动决定"],
      ),
    );
  } else if (artifact === "excel" && !answer(answers, "dataFields")) {
    candidates.push(
      question(
        "dataFields",
        "表格里有哪些字段或列？",
        "字段、数据类型和计算目标是 Excel 提示词准确的核心。",
        ["日期、渠道、金额", "姓名、部门、指标", "商品、销量、库存", "我会补充字段说明"],
      ),
    );
  } else if (artifact === "image" && !answer(answers, "imageStyle")) {
    candidates.push(
      question(
        "imageStyle",
        "画面希望采用什么视觉风格？",
        "风格、构图和光线决定图像提示词的稳定性。",
        ["高级商业摄影", "极简平面设计", "3D 质感", "电影感写实"],
      ),
    );
  } else if (!answer(answers, "length")) {
    candidates.push(
      question(
        "length",
        "期望内容多长？",
        "明确篇幅能避免结果过短、空泛或过度展开。",
        ["简短直接", "中等篇幅", "详细完整", "由内容自动决定"],
      ),
    );
  }

  if (domain === "business-writing" && !answer(answers, "tone")) {
    candidates.push(
      question(
        "tone",
        "希望采用什么语气？",
        "正式程度和关系会影响措辞与结构。",
        ["专业正式", "简洁直接", "温和有礼", "有说服力"],
      ),
    );
  } else if (domain === "data-analysis" && !answer(answers, "metric")) {
    candidates.push(
      question(
        "metric",
        "最需要回答哪个业务问题？",
        "分析必须围绕明确指标，避免只做表面描述。",
        ["增长或下降原因", "渠道效果对比", "异常数据定位", "预测与建议"],
      ),
    );
  } else if (domain === "marketing" && !answer(answers, "channel")) {
    candidates.push(
      question(
        "channel",
        "内容投放在哪个渠道？",
        "不同渠道的字数、语气和行动号召不同。",
        ["小红书", "公众号", "短视频", "官网落地页"],
      ),
    );
  }

  if (!answer(answers, "facts") && !/根据|以下|已有|数据|字段|资料/.test(text)) {
    candidates.push(
      question(
        "facts",
        "有哪些必须使用的事实、数据或原文？",
        "提示词不能替你编造产品事实、数字或引用。",
        ["我会粘贴资料", "暂无资料", "只使用产品名称", "允许使用示例数据"],
      ),
    );
  }

  return candidates.slice(0, 3);
}

function buildArtifactProfile(artifact, answers) {
  const length = answer(answers, "length") || "根据任务自动决定";
  const profiles = {
    text: {
      sections: [
        "标题与开场",
        "核心内容与必要细节",
        "结论、下一步或行动号召",
        `篇幅：${length}`,
      ],
      checks: ["开头直接进入主题", "信息有明确层级", "结尾给出可执行下一步"],
      instruction: "输出可直接发布或发送的完整文本，不要只列写作建议。",
    },
    ppt: {
      sections: [
        "封面与核心结论",
        `页数：${answer(answers, "slideCount") || "8-12 页"}`,
        "每页标题、3-5 个要点和视觉建议",
        "数据页需说明图表类型与解读",
        "结尾包含总结、行动项和演讲备注",
      ],
      checks: ["每页只表达一个核心观点", "叙事从问题到结论连贯", "视觉建议与内容匹配"],
      instruction: "按页输出，标明页码、标题、页面内容、视觉建议和演讲备注。",
    },
    word: {
      sections: [
        "标题、受众与文档目的",
        "摘要或执行摘要",
        "分层标题与正文",
        "必要的表格、清单和结论",
        `篇幅：${length}`,
      ],
      checks: ["标题层级完整", "事实与观点区分", "结论与原始目标一致"],
      instruction: "输出完整文档结构和可直接使用的正文，不虚构引用或数据。",
    },
    excel: {
      sections: [
        `字段：${answer(answers, "dataFields") || "先列出并核对字段、类型和示例值"}`,
        "工作表与 Sheet 结构",
        "公式、计算列和数据验证",
        "条件格式、图表或透视表",
        "数据清洗及异常处理步骤",
      ],
      checks: ["公式引用范围明确", "异常和空值有处理方式", "不得编造源数据"],
      instruction: "按工作表输出结构、字段、公式、操作步骤和验证方法；示例数据需标明为示例。",
    },
    pdf: {
      sections: [
        "封面、标题与目标读者",
        "目录和章节结构",
        "正文、图表、重点框与结论",
        "版式、页码和导出要求",
        `篇幅：${length}`,
      ],
      checks: ["目录与内容一致", "页面信息密度可控", "事实与引用准确"],
      instruction: "输出适合最终导出 PDF 的完整内容结构与排版要求。",
    },
    image: {
      sections: [
        `主体：${compactIdea(answer(answers, "subject") || "从原始想法中提取")}`,
        "动作、环境与背景",
        "构图、视角和镜头",
        `风格：${answer(answers, "imageStyle") || "高级、清晰、可信"}`,
        "光线、色彩、材质与细节",
        "画面文字、比例和负面提示",
      ],
      checks: ["主体和构图明确", "风格词具体可执行", "包含比例与负面提示"],
      instruction: "输出可直接粘贴到图像生成模型的完整提示词，并附精简版。",
    },
  };
  return profiles[artifact] || profiles.text;
}

function scoreContent({ idea, audience, artifact, scene, answers, profile }) {
  const answerCount = Object.values(answers || {}).filter((value) => String(value || "").trim()).length;
  const values = {
    goal: Math.min(98, 58 + Math.min(24, compactIdea(idea).length / 3)),
    audience: audience ? 84 : 46,
    structure: 82,
    constraint: Math.min(94, 52 + answerCount * 8 + (artifact !== "text" ? 10 : 0)),
    acceptance: Math.min(94, 62 + profile.checks.length * 6),
    execution: scene === "general" ? 72 : 86,
  };
  const dimensions = DIMENSION_LABELS.map(([key, label]) => ({ key, label, value: Math.round(values[key]) }));
  return {
    dimensions,
    score: Math.round(dimensions.reduce((sum, item) => sum + item.value, 0) / dimensions.length),
  };
}

function buildChecklist(domain, artifact, profile) {
  const platformChecks = {
    "business-writing": ["目的、受众和下一步明确", "语气与关系匹配", "没有编造事实或引用"],
    "data-analysis": ["指标定义明确", "数据异常和缺失有处理", "结论能由数据支持"],
    marketing: ["目标用户与渠道明确", "卖点具体", "包含清晰行动号召"],
  }[domain];
  return uniq([...platformChecks, ...profile.checks]);
}

function buildRisks({ domain, artifact, audience, text, answers }) {
  const risks = [];
  if (!audience) risks.push({ level: "medium", text: "目标受众未明确，内容语气和信息密度可能产生偏差。" });
  if (artifact === "excel" && !answer(answers, "dataFields") && !/字段|列|表格|数据/.test(text)) {
    risks.push({ level: "high", text: "缺少字段和数据类型，公式或清洗步骤可能无法直接使用。" });
  }
  if (artifact === "image" && !answer(answers, "imageStyle")) {
    risks.push({ level: "medium", text: "视觉风格未明确，图像结果可能存在较大随机性。" });
  }
  if (domain === "data-analysis") {
    risks.push({ level: "high", text: "原模型可能补造不存在的数据；必须核对源数据和公式范围。" });
  } else {
    risks.push({ level: "medium", text: "模型可能补写未提供的事实，发送前需核对数字、名称和引用。" });
  }
  return risks;
}

function buildPrompt({ idea, domain, artifact, scene, target, audience, answers, profile }) {
  const role = ROLE_BY_DOMAIN[domain];
  const modeName = getModePreset(domain).name;
  const targetName = getContentTarget(target).name;
  const targetGuidance = {
    general: "输出清晰、完整、可直接使用的成品内容。",
    chatgpt: "按最终交付格式输出，避免先写空泛方法论。",
    claude: "保持结构完整，长内容使用清晰标题层级。",
    "office-copilot": "输出适合 Office 文档或演示文稿逐段创建的内容。",
    "wps-ai": "使用适合中文办公软件复制的结构和格式。",
    canva: "同时给出版式、视觉层级和可替换文案。",
    "image-model": "输出正向提示词、负面提示词和长宽比，不写与生成无关的解释。",
  }[target] || "输出清晰、完整、可直接使用的成品内容。";
  const facts = answer(answers, "facts") || "仅使用原始想法中明确提供的事实；信息不足时列出缺口。";
  const tone = answer(answers, "tone") || answer(answers, "channel") || "清晰、专业、有明确重点";

  if (artifact === "image") {
    return `# ${modeName}图像提示词

你是一名图像创意总监。请根据以下要求生成可直接用于图像模型的提示词。

## 创作目标
${idea}

## 画面结构
${profile.sections.map((item) => `- ${item}`).join("\n")}

## 输出要求
- 风格方向：${answer(answers, "imageStyle") || "高级、清晰、可信"}
- 目标模型：${targetName}
- 画面比例：${answer(answers, "ratio") || "根据使用渠道自动选择，并明确写出"}
- 如画面包含文字，必须给出准确文字、位置和字体气质
- 明确主体、环境、构图、镜头、光线、色彩和材质
- 输出正向提示词、负面提示词、精简版提示词
- 不得添加原始需求中不存在的品牌、人物或产品事实

请直接输出最终提示词。`;
  }

  return `# ${modeName}任务：${sceneLabel(domain, scene)}

你是一名${role}。请使用 ${targetName} 完成以下内容生成任务。

## 目标
${idea}

## 受众与场景
- 目标受众：${audience || "未指定，请按最典型受众处理"}
- 使用场景：${sceneLabel(domain, scene)}
- 语气：${tone}

## 已知事实
${facts}

## 输出结构
${profile.sections.map((item) => `- ${item}`).join("\n")}

## 质量约束
- 不得虚构原始资料中不存在的数据、引用、客户、产品或结论
- 信息和资料不足时先列出缺口，不得自行补全为事实
- 删除空泛套话，每个段落都要提供具体信息或行动
- ${profile.instruction}
- ${targetGuidance}

## 验收标准
${buildChecklist(domain, artifact, profile).map((item) => `- ${item}`).join("\n")}

请先简要确认信息缺口；信息充分时直接输出完整成品。`;
}

function buildStagedPrompt(basePrompt) {
  return `# 分阶段内容生成

## 阶段 1：确认信息
- 提炼目标、受众、事实、格式和禁止项。
- 只列出真正阻塞交付的信息缺口，不要为了追问而追问。

## 阶段 2：生成内容
- 先建立结构，再逐段完成内容。
- 保持事实与观点边界，不编造资料。

## 阶段 3：交付检查
- 按验收标准逐项检查。
- 指出仍需人工核实的数据、引用或品牌信息。

以下是完整任务：

${basePrompt}`;
}

export function compileContentLocally({
  idea,
  domain,
  artifact = "auto",
  scene = "auto",
  target = "general",
  answers = {},
}) {
  const text = compactIdea(idea);
  const resolvedArtifact = detectContentArtifact(text, artifact);
  const resolvedScene = detectScene(domain, text, scene);
  const audience = answer(answers, "audience") || detectAudience(text);
  const profile = buildArtifactProfile(resolvedArtifact, answers);
  const questions = buildQuestions(domain, resolvedArtifact, text, answers);
  const scored = scoreContent({
    idea: text,
    audience,
    artifact: resolvedArtifact,
    scene: resolvedScene,
    answers,
    profile,
  });
  const prompt = buildPrompt({
    idea: text,
    domain,
    artifact: resolvedArtifact,
    scene: resolvedScene,
    target,
    audience,
    answers,
    profile,
  });
  const checklist = buildChecklist(domain, resolvedArtifact, profile);
  const risks = buildRisks({ domain, artifact: resolvedArtifact, audience, text, answers });
  const mode = getModePreset(domain);
  const artifactInfo = getArtifactPreset(resolvedArtifact);
  const concisePrompt =
    resolvedArtifact === "image"
      ? `为${audience || "目标受众"}创作：${text}。视觉风格：${answer(answers, "imageStyle") || "高级、清晰、可信"}；画面比例：${answer(answers, "ratio") || "根据使用渠道明确写出"}。请给出主体、环境、构图、镜头、光线、色彩和材质，并同时输出正向提示词、负面提示词和一个精简版。不得加入原始需求中不存在的品牌或产品事实。`
      : `你是一名${ROLE_BY_DOMAIN[domain]}。请为${audience || "目标受众"}完成：${text}。使用 ${getContentTarget(target).name}，按${artifactInfo.name}结构输出。不得虚构事实、数据或引用；信息不足时先列出缺口。${profile.instruction}`;

  return {
    mode: "local",
    provider: "local",
    model: "本地内容编译器",
    compileKind: "content",
    categoryLabel: mode.name,
    title: text.slice(0, 34),
    summary: `${mode.name} · ${artifactInfo.name} · ${sceneLabel(domain, resolvedScene)}`,
    prompt,
    concisePrompt,
    stagedPrompt: buildStagedPrompt(prompt),
    checklist,
    spec: [
      {
        title: "内容定义",
        items: [
          `目标：${text}`,
          `方向：${mode.name}`,
          `场景：${sceneLabel(domain, resolvedScene)}`,
          `产出：${artifactInfo.name}`,
        ],
      },
      {
        title: "受众与表达",
        items: [
          `受众：${audience || "待确认"}`,
          `语气：${answer(answers, "tone") || answer(answers, "channel") || "清晰、专业"}`,
          `目标工具：${getContentTarget(target).name}`,
        ],
      },
      { title: "产出结构", items: profile.sections },
      { title: "质量要求", items: checklist },
    ],
    risks,
    questions,
    dimensions: scored.dimensions,
    score: scored.score,
    requirement: {
      idea: text,
      compileKind: "content",
      contentDomain: domain,
      artifact: resolvedArtifact,
      scene: resolvedScene,
      targetTool: target,
      audience,
      answerLines: Object.entries(answers || {})
        .filter(([, value]) => String(value || "").trim())
        .map(([key, value]) => `${key}：${value}`),
      questions,
      dimensions: scored.dimensions,
      risks,
      score: scored.score,
    },
  };
}

export { ARTIFACT_LABELS };
