# Recruitment Calendar · 秋招日历

<p align="center">
  <img src="public/og.png" alt="Recruitment Calendar preview" width="100%" />
</p>

<p align="center">
  A private-by-default calendar for tracking applications, assessments and interviews.<br />
  一款默认保护隐私的秋招投递、测评与面试进度管理工具。
</p>

<p align="center">
  <a href="https://qiqi068-casey.github.io/autumn-recruitment-calendar/"><strong>Live Demo · 在线体验</strong></a>
  ·
  <a href="https://github.com/qiqi068-casey/autumn-recruitment-calendar/actions/workflows/deploy-pages.yml">
    <img src="https://github.com/qiqi068-casey/autumn-recruitment-calendar/actions/workflows/deploy-pages.yml/badge.svg" alt="Deploy GitHub Pages" />
  </a>
</p>

## 中文介绍

秋招日历将投递截止、笔试测评、面试安排和待投递公司集中到一张连续日历中，帮助求职者清晰追踪每个机会的当前阶段和下一步行动。

### 核心功能

- 在连续滚动日历中管理投递 DDL、测评和面试
- 自动统计日历中不重复的公司数量及每周完成进度
- 复制已有安排，选择目标日期后粘贴并调整阶段，无需重复填写公司、岗位、链接和备注
- 管理高意向与低意向的待投递公司
- 搜索公司或岗位，勾选已完成事项
- 中英文界面切换；中文版显示中国法定节假日
- 日程、备忘录和公司列表自动保存在当前浏览器
- 适配桌面端和移动端

### 复制安排工作流

1. 在“当日安排”中点击目标记录旁的复制按钮 `⧉`。
2. 在日历中选择下一环节的目标日期。
3. 点击“粘贴”。
4. 在预填弹窗中修改进度、日期或时间并保存。

原安排会保留，粘贴后生成一条新的进度记录。

### 数据与隐私

本项目不需要账号，也不会把求职记录上传到服务器。日程、备忘录、待投递公司和语言选择均保存在浏览器 `localStorage` 中。

- GitHub 仓库和公开演示站不包含作者的个人投递记录
- 每位访问者只能看到自己浏览器中保存的数据
- 更换设备、浏览器或网站域名后，数据不会自动迁移
- 清除浏览器网站数据会删除本地记录

## English

Recruitment Calendar brings application deadlines, assessments, interviews and target companies into one continuous calendar, making each opportunity and next step easy to track.

### Highlights

- Track application deadlines, assessments and interviews
- Count unique companies and monitor weekly completion progress automatically
- Copy an existing event, choose a target date, paste it and update the stage
- Organize high- and low-interest companies in an application queue
- Search by company or role and mark events as complete
- Switch between English and Chinese; Chinese mode includes public holidays in China
- Store schedules, notes and company lists locally in the browser
- Responsive layout for desktop and mobile

### Privacy

No account or backend is required. Personal recruitment data stays in the visitor's own browser through `localStorage`; it is not committed to this repository or uploaded to the deployed site.

## Tech stack

- React 19
- TypeScript
- Vite and vinext
- GitHub Actions
- GitHub Pages
- Browser `localStorage`

## Run locally

Node.js 22.13 or newer is recommended.

```bash
npm install
npm run dev
```

Build the GitHub Pages version:

```bash
npm run build:pages
```

## Deployment

Every push to `main` runs the GitHub Actions workflow in `.github/workflows/deploy-pages.yml`. A successful workflow publishes the latest version to:

<https://qiqi068-casey.github.io/autumn-recruitment-calendar/>

## Roadmap

- Export and import local data for backup and migration
- Optional cross-device synchronization
- More recruitment-stage analytics
