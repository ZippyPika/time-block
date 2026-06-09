# 时间块记录 PWA

一个手机优先的离线时间记录 PWA。每天按 30 分钟时间块记录睡觉、学习、娱乐和日常，并提供本周复盘、统计和 JSON 备份。

## 本地开发

```bash
npm install
npm run dev
```

## 检查

```bash
npm test
npm run lint
npm run build
```

## 部署到 GitHub Pages

1. 在 GitHub 新建仓库，例如 `time-block-pwa`。
2. 推送本项目到仓库的 `main` 分支。
3. 打开仓库 `Settings` -> `Pages`。
4. 在 `Build and deployment` 里选择 `GitHub Actions`。
5. 之后每次推送到 `main`，`.github/workflows/pages.yml` 会自动构建并部署 `dist`。

项目已使用相对路径构建，适配：

- `https://用户名.github.io/time-block-pwa/`
- `https://用户名.github.io/`
- 自定义域名

## 数据是否会随版本更新丢失

不会因为普通代码更新而自动丢失。记录保存在浏览器本机 IndexedDB 中，只要站点来源不变，更新 GitHub Pages 版本后数据仍在。

会导致手机数据看起来消失的情况：

- 部署地址变了，例如从 `用户名.github.io/time-block-pwa/` 换到 `用户名.github.io/other-app/`。
- 协议、域名或端口变了。
- 手机浏览器清除了网站数据。
- 卸载 PWA 时系统同时删除了该站点数据。
- 应用未来做了不兼容的数据迁移。

建议定期在设置页导出 JSON 备份。
