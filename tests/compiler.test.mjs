import test from "node:test";
import assert from "node:assert/strict";
import { compileLocally, mergeAiResult } from "../src/lib/compiler.js";

test("编译喝水提醒小程序并识别核心功能", () => {
  const result = compileLocally({
    idea: "做一个记录每天喝水的小程序，界面清爽一点，能提醒我。",
    taskType: "auto",
    targetTool: "codex",
  });

  assert.equal(result.requirement.taskType, "new");
  assert.equal(result.requirement.projectType, "miniapp");
  assert.match(result.requirement.features.join(" "), /提醒/);
  assert.ok(result.score > 0 && result.score <= 100);
  assert.ok(result.prompt.includes("验收标准"));
  assert.ok(result.questions.length <= 3);
});

test("现有 React 后台功能扩展保留技术栈并识别任务", () => {
  const result = compileLocally({
    idea: "给现有 React 后台增加可筛选、可导出的订单管理页。",
    taskType: "auto",
    targetTool: "claude-code",
    answers: {
      audience: "公司运营人员",
      data: "云端同步",
    },
  });

  assert.equal(result.requirement.taskType, "feature");
  assert.equal(result.requirement.projectType, "dashboard");
  assert.ok(result.requirement.techStack.includes("React"));
  assert.ok(result.prompt.includes("运营人员"));
  assert.ok(result.prompt.includes("云端同步"));
  assert.ok(result.prompt.includes("Claude Code"));
});

test("Bug 修复模式要求复现、根因和回归验证", () => {
  const result = compileLocally({
    idea: "我的 React 页面在手机上导航挤压，帮我修复并优化。",
    taskType: "bug",
    targetTool: "cursor",
    answers: {
      repro: "只在 390px 宽度出现",
    },
  });

  assert.equal(result.requirement.taskType, "bug");
  assert.match(result.prompt, /复现|根因/);
  assert.match(result.stagedPrompt, /验证/);
  assert.ok(result.checklist.length >= 5);
});

test("AI 结果只覆盖有效字段，异常数据回退本地结果", () => {
  const local = compileLocally({
    idea: "做一个团队任务看板",
    taskType: "new",
    targetTool: "lovable",
  });
  const invalid = mergeAiResult(local, null);
  assert.equal(invalid.prompt, local.prompt);

  const merged = mergeAiResult(local, {
    title: "团队任务看板",
    score: 88,
    prompt: "增强后的主提示词",
    questions: [],
  });
  assert.equal(merged.mode, "ai");
  assert.equal(merged.prompt, "增强后的主提示词");
  assert.equal(merged.stagedPrompt, local.stagedPrompt);
  assert.equal(merged.checklist.length, local.checklist.length);
});
