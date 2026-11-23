export const CREATION_MODES = [
  {
    id: "code",
    name: "开发任务",
    shortName: "开发",
    description: "构建产品、修改项目或修复代码",
  },
  {
    id: "business-writing",
    name: "商务写作",
    shortName: "商务",
    description: "邮件、纪要、周报、方案与流程文档",
  },
  {
    id: "data-analysis",
    name: "数据分析",
    shortName: "数据",
    description: "表格清洗、公式、图表与分析报告",
  },
  {
    id: "marketing",
    name: "营销内容",
    shortName: "营销",
    description: "社媒文案、广告、落地页与视觉提示词",
  },
];

export const ARTIFACT_PRESETS = [
  { id: "auto", name: "自动选择", shortName: "自动" },
  { id: "text", name: "通用文本", shortName: "文本" },
  { id: "ppt", name: "PPT 演示", shortName: "PPT" },
  { id: "word", name: "Word 文档", shortName: "Word" },
  { id: "excel", name: "Excel 表格", shortName: "Excel" },
  { id: "pdf", name: "PDF 文档", shortName: "PDF" },
  { id: "image", name: "图像提示词", shortName: "图像" },
];

export const CONTENT_SCENE_PRESETS = {
  "business-writing": [
    { id: "auto", name: "自动判断" },
    { id: "email", name: "商务邮件" },
    { id: "minutes", name: "会议纪要" },
    { id: "weekly", name: "周报月报" },
    { id: "proposal", name: "项目方案" },
    { id: "requirements", name: "需求文档" },
    { id: "sop", name: "SOP / 流程" },
  ],
  "data-analysis": [
    { id: "auto", name: "自动判断" },
    { id: "cleaning", name: "数据清洗" },
    { id: "formula", name: "Excel 公式" },
    { id: "insight", name: "分析结论" },
    { id: "chart", name: "图表方案" },
    { id: "dashboard", name: "仪表盘说明" },
  ],
  marketing: [
    { id: "auto", name: "自动判断" },
    { id: "social", name: "社媒文案" },
    { id: "ad", name: "广告脚本" },
    { id: "landing", name: "落地页文案" },
    { id: "brand", name: "品牌口吻" },
    { id: "visual", name: "营销视觉" },
  ],
};

export const CONTENT_TARGETS = [
  { id: "general", name: "通用 AI" },
  { id: "chatgpt", name: "ChatGPT" },
  { id: "claude", name: "Claude" },
  { id: "office-copilot", name: "Microsoft 365 Copilot" },
  { id: "wps-ai", name: "WPS AI" },
  { id: "canva", name: "Canva AI" },
  { id: "image-model", name: "图像生成模型" },
];

export const CONTENT_EXAMPLES = {
  "business-writing": [
    "根据这份项目进度，写一封向客户说明延期原因和补救计划的邮件。",
    "把以下会议内容整理成有结论、负责人和时间节点的会议纪要。",
  ],
  "data-analysis": [
    "我有一张包含日期、渠道、订单数和收入的表，帮我生成分析公式和图表方案。",
    "清洗这份销售数据，找出重复、缺失和异常值，并给出分析报告结构。",
  ],
  marketing: [
    "为一款适合通勤的降噪耳机写一组小红书文案和三条广告标题。",
    "做一个新品发布海报的图像提示词，风格高级，保留品牌主色。",
  ],
};

export function getModePreset(id) {
  return CREATION_MODES.find((mode) => mode.id === id) || CREATION_MODES[0];
}

export function getArtifactPreset(id) {
  return ARTIFACT_PRESETS.find((artifact) => artifact.id === id) || ARTIFACT_PRESETS[0];
}

export function getContentScenes(mode) {
  return CONTENT_SCENE_PRESETS[mode] || CONTENT_SCENE_PRESETS["business-writing"];
}

export function getContentTarget(id) {
  return CONTENT_TARGETS.find((target) => target.id === id) || CONTENT_TARGETS[0];
}
