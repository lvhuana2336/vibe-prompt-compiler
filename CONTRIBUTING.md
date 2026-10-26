# 贡献指南

感谢你改进言构。提交代码前，请先确认改动范围清晰，并避免提交无关格式化或构建产物。

## 开发环境

- Node.js 22.12 或更高版本
- pnpm 11
- Windows 10/11 x64（构建桌面安装包时需要）

```powershell
pnpm install
pnpm dev
```

桌面开发模式：

```powershell
pnpm desktop:dev
```

## 提交前检查

```powershell
pnpm test
pnpm build
```

涉及界面改动时，请补充桌面和移动视口截图，并检查控制台错误、布局溢出和关键交互。

## 安全要求

- 不得提交 API Key、`.env`、私钥或真实用户数据。
- 模型接口必须保留失败回退和明确错误提示。
- 不得在 Electron 渲染进程中开启 Node.js 集成。
- 新增外部链接时必须确认导航和下载行为安全。

## Pull Request

PR 应说明：

- 改动解决了什么问题；
- 主要实现方式；
- 已执行的验证；
- 可能的风险或未覆盖场景。

提交信息建议使用 Conventional Commits，例如 `feat: add model preset` 或 `fix: preserve local draft on provider failure`。
