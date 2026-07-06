# 家庭日常英语口语 · Home English（可安装 App 版）

家里一天用得到的英语，中英对照，按场景整理。点任意一句用**浏览器自带语音**朗读，**不需要任何 API、不花钱、不用 API key**。

现在是 **PWA（可安装网页应用）**：装到手机桌面有自己的图标、打开全屏没有地址栏、**断网也能用**，体感和真 App 一样。

- 1015 句，28 大场景：厨房、吃喝点餐、客厅、卧室、盥洗如厕身体、健康看病、和孩子、情绪、社交、购物、出行、手机网络、工作、时间天气、钱、家务维修、夫妻家人、应急、宠物、带娃、学校、运动、旅行、办事、鼓励安慰、抱怨闲聊、兴趣娱乐、口头禅
- 点句子听读，点「朗读本节」连续播放，可切 en-US / en-GB、调语速
- 复习测试：支持「口语自测」和「输入检测」，可按现有分类抽 10/30/50 句练习
- 🔎 联网查词/翻译：本地没有的词（如「粽子」）点「联网查词」，中↔英都能查，结果可朗读、可「⭐收藏」进自己的词库（免费，无需 key；查词需联网）
- 安卓/电脑 Chrome：页面里有「📲 安装到手机」按钮
- iPhone：Safari「分享 → 添加到主屏幕」

---

## 文件清单（全部上传到同一个仓库）

```
index.html            主程序
practice-core.js      复习测试答案匹配、缩写、错词分析等纯逻辑
practice.js           复习测试页面、进度恢复、语音输入降级
manifest.json         App 信息（名字、图标、主题色）
service-worker.js     离线缓存
icon-192.png          图标
icon-512.png          图标
apple-touch-icon.png  iPhone 主屏图标
package.json          本地测试命令
tests/                复习测试纯逻辑测试
```

---

## 部署到 GitHub Pages

1. 登录 github.com -> + -> New repository -> 名字 `home-english`，选 Public -> Create
2. 仓库页 -> Add file -> Upload files -> 把上面 6 个文件全部拖进去 -> Commit changes
3. Settings -> Pages -> Source 选 main 分支、/ (root) -> Save
4. 等 1-3 分钟，出现网址：https://你的用户名.github.io/home-english/
5. 手机打开网址 -> 按按钮或「添加到主屏幕」安装

> ⚠️ PWA 的离线和安装功能必须在 GitHub Pages（https）上才生效，本地直接双击打开是体验不到的。
> iPhone 第一次进去要先点一下屏幕才会出声（Apple 安全策略）。

---

## 改了内容怎么更新

1. 在 index.html 底部的 DATA 里加句子（格式 ["English","中文"]）
2. 打开 service-worker.js，把第一行的版本号 +1（现在是 v3，下次改成 v4，以此类推）——这样手机才会拉到新内容，不会一直读旧缓存
3. 在 GitHub 重新 Upload / Commit，几分钟后生效

## 本地测试

```
npm test
```

---

没有广告、没有弹窗、不上传任何数据。
