# Neko歌姬计划 · 移动端 Web 版

基于 [NekoMusic API](https://github.com/FantasyNetworkCN/NekoMusicDocs) 官方文档实现的移动端适配 Web 客户端。
支持 iOS Safari「添加到主屏幕」并全屏运行（PWA），可一键部署到 **Netlify** 或 **腾讯云 EdgeOne Makers（原 EdgeOne Pages）**。

> **署名声明**：本程序由 **Neko歌姬计划 API** 提供技术支持。
> 依据上游 [LICENSE](./LICENSE)（AGPL-3.0 + 附加条款），本应用：
> - 保留 Neko 品牌标识，不声称独立原创；
> - 界面内置中/英双语切换；
> - 在「设置 → 关于与开源」中永久展示署名、源码链接与 API 文档链接；
> - 源码以 AGPL-3.0 开源（见下）。

## 功能

- 🎧 在线播放：热门排行 / 最新上架 / 每日推荐 / 搜索（歌曲·歌单·歌手）
- 📃 歌单：创建 / 重命名 / 删除 / 收藏歌单、添加与移除歌曲
- ❤️ 收藏：歌曲收藏（乐观更新，离线回滚）
- 👤 账号：登录 / 注册（滑块验证码 + 邮箱验证码）/ 忘记密码 / 修改密码 / 头像上传
- ⬆️ 上传音乐：自动读取音频时长，支持封面与 LRC 歌词
- 📱 播放器：迷你条 + 全屏播放页（封面 / 歌词滚动 / 播放队列 / 三种播放模式）
- 🌓 外观：白天 / 黑夜模式一键切换（设置页）
- 🌐 i18n：中文 / English 一键切换（设置页）
- 📲 PWA：可安装，iOS 全屏，锁屏媒体控制（Media Session），封面缓存
- 🐱 品牌：全部图标/logo 采用官方 NekoMusic 标识（自动从官方 favicon 生成）

## 技术栈

Vite 8 · React 19 · TypeScript · react-router-dom 7 · zustand 5 · vite-plugin-pwa

## 本地开发

```bash
npm install
npm run dev        # http://localhost:5173
```

自定义 API 地址（可选，默认官方演示站）：

```bash
# Windows PowerShell
$env:VITE_API_BASE = "https://your-api.example.com"; npm run dev
```

## 部署到 Netlify

1. 把仓库推到 GitHub；
2. Netlify 新建站点，选择该仓库；
3. Build command：`npm run build`，Publish directory：`dist`（已写入 `netlify.toml`，通常无需手动配置）。

SPA 路由回退已通过 `netlify.toml` / `public/_redirects` 配置。

## 部署到腾讯 EdgeOne Makers（原 EdgeOne Pages）

EdgeOne 的构建与 SPA 回退已写入根目录 `edgeone.json`（注意：EdgeOne **不读取** `netlify.toml` / `_redirects`，
SPA 路由回退靠 `edgeone.json` 的 `rewrites` 实现）：

```json
{
  "buildCommand": "npm run build",
  "installCommand": "npm install",
  "outputDirectory": "dist",
  "nodeVersion": "22.21.1",
  "rewrites": [{ "source": "/*", "destination": "/index.html" }]
}
```

> `nodeVersion` 用了预装的 22.21.1 —— Vite 8 要求 Node ≥ 20.19 / ≥ 22.12，平台预置列表中的 20.18.0、22.11.0 均不满足。

### 方式一：Git 仓库接入（推荐）

1. 登录 [pages.edgeone.ai](https://pages.edgeone.ai)，「创建项目」→「导入 Git 仓库」；
2. 授权 GitHub / GitLab / Gitee 后选择本仓库；平台会自动检测 Vite，构建命令与输出目录 `dist` 自动生效；
3. 推送提交到默认分支（`main`）即自动触发构建部署，项目获得 `*.edgeone.app` 域名。

### 方式二：CLI 部署（本地构建上传）

```bash
npm install -g edgeone     # 全局安装 EdgeOne CLI
edgeone login              # 浏览器登录（可选 Global / China 区）
npm run build              # 先构建出 dist/
edgeone makers deploy ./dist -n <项目名>     # 部署（生产环境）
```

CI 中可用 API Token：`edgeone makers deploy ./dist -n <项目名> -t $EDGEONE_API_TOKEN`。

### 方式三：直接上传（无构建）

控制台「直接上传」拖入 `dist/` 文件夹即可（平台不执行构建，需先 `npm run build`）。

### 绑定自定义域名

控制台「域名管理」→ 添加自定义域名 → 按指引加验证解析 → 配置 CNAME → 申请免费 SSL 证书。
加速区域选「全球可用区（不含中国大陆）」可免 ICP 备案（中国大陆访问建议选此项）。

## 生成 PWA 图标

图标由官方 favicon（`https://music.cnmsb.xin/favicon.ico`，WebP 格式）程序化生成，
产出 PWA 图标、iOS 桌面图标与站内 logo：

```bash
npm install          # 需要 sharp（已含于 devDependencies）
node scripts/gen-icons.mjs
```

## 项目结构

```
src/
  api/        API 客户端与全部接口封装
  components/ 通用组件（播放器、列表、验证码、图标等）
  pages/      页面（首页/搜索/歌单/我的/登录注册/上传/设置…）
  store/      zustand 状态（auth/player/ui/favorites）
  utils/      LRC 解析等工具
  i18n.ts     中英文案与语言切换
```

## 开源协议

本应用源码遵循 **GNU Affero General Public License v3.0**（[LICENSE](./LICENSE)）。
上游 API 文档与协议：[NekoMusicDocs](https://github.com/FantasyNetworkCN/NekoMusicDocs)。
