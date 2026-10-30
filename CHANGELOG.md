# Changelog

## v0.2.0 - 2026-10-30

### Added

- Windows 启动时自动检查 GitHub Release，并提供手动检查和更新提示。
- DragonAPI / New API 模型预设、Base URL 规范化和协议选择。
- 无消耗 `/models` 连接检测、实际请求地址展示和模型选择。
- PWA 安装清单、离线 Service Worker、192/512 图标和 Capacitor Android 工程。
- 全局按钮悬停、按压、涟漪和状态过渡动效。

### Changed

- 合并输入前后两套质量面板为共享评分组件。
- 将追问和风险整合为“待处理问题”。
- 输出区改为“提示词 / 交付资料”两级结构。
- 精简重复模型入口和首页流程模块。

### Fixed

- 修复 OpenAI 中转站 Base URL 拼接错误。
- 阻止 200 HTML 页面被误判为模型连接成功。
- 支持 Chat Completions 与 Responses 之间的受控协议回退。
