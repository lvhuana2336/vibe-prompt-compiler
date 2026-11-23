import test from "node:test";
import assert from "node:assert/strict";
import {
  compileContentLocally,
  detectContentArtifact,
} from "../src/lib/content-compiler.js";

test("商务写作可生成 PPT 逐页提示词", () => {
  const result = compileContentLocally({
    idea: "向管理层汇报第三季度项目进展，说明风险和下一步。",
    domain: "business-writing",
    artifact: "ppt",
    target: "office-copilot",
    answers: { audience: "管理层", slideCount: "10-12 页" },
  });

  assert.equal(result.compileKind, "content");
  assert.equal(result.categoryLabel, "商务写作");
  assert.equal(result.requirement.artifact, "ppt");
  assert.match(result.prompt, /按页输出/);
  assert.match(result.prompt, /演讲备注/);
  assert.match(result.prompt, /Microsoft 365 Copilot/);
  assert.ok(result.checklist.some((item) => item.includes("每页只表达一个核心观点")));
});

test("数据分析可生成 Excel 公式与清洗提示词", () => {
  const result = compileContentLocally({
    idea: "清洗销售数据并分析渠道转化率，生成公式和图表。",
    domain: "data-analysis",
    artifact: "auto",
    answers: { audience: "运营团队", dataFields: "日期、渠道、访客数、订单数" },
  });

  assert.equal(result.requirement.artifact, "excel");
  assert.match(result.prompt, /公式、计算列和数据验证/);
  assert.match(result.prompt, /不得虚构原始资料/);
  assert.ok(result.risks.some((risk) => risk.text.includes("补造不存在的数据")));
});

test("营销内容可生成可直接使用的图像提示词", () => {
  const result = compileContentLocally({
    idea: "为通勤降噪耳机制作高级新品发布海报。",
    domain: "marketing",
    artifact: "image",
    target: "image-model",
    answers: { imageStyle: "高级商业摄影", ratio: "4:5" },
  });

  assert.equal(result.requirement.artifact, "image");
  assert.match(result.prompt, /正向提示词/);
  assert.match(result.prompt, /负面提示词/);
  assert.match(result.prompt, /4:5/);
  assert.match(result.concisePrompt, /高级商业摄影/);
});

test("产出格式自动识别覆盖文本、Word、PDF 和图像", () => {
  assert.equal(detectContentArtifact("写一封客户邮件", "auto"), "text");
  assert.equal(detectContentArtifact("整理成 Word 方案", "auto"), "word");
  assert.equal(detectContentArtifact("制作白皮书 PDF", "auto"), "pdf");
  assert.equal(detectContentArtifact("生成产品主视觉图片", "auto"), "image");
});
