# 筆順描字本

給小朋友（包括在國外學中文的孩子）練習中文字的筆順網頁：看筆順 → 用手指描字 → 自己寫。
字形、筆順、注音照台灣教育部標準；題目來自教育部國小學童常用字詞，依字頻由淺到深，跟著俠客等級慢慢變難。

- 網站：https://yuankailiu.github.io/hanzi-trace/ （iPad / iPhone 用 Safari「分享 → 加入主畫面」即可全螢幕使用）

## 資料來源

| 內容 | 來源 | 授權 |
|---|---|---|
| 字形與筆順（約 4,800 常用字） | [教育部國字標準字體筆順學習網](https://stroke-order.learningweb.moe.edu.tw/)，經 [g0v/zh-stroke-data](https://github.com/g0v/zh-stroke-data) | g0v 專案標示 CC0 |
| 其他罕用字的字形與筆順、部首 | [Make Me a Hanzi](https://github.com/skishore/makemeahanzi) / [hanzi-writer-data](https://github.com/chanind/hanzi-writer-data) | Arphic Public License（`data/ARPHICPL.TXT`） |
| 注音（台灣讀音） | 教育部《重編國語辭典修訂本》，經 [g0v/moedict-data](https://github.com/g0v/moedict-data) | CC BY-ND 3.0 TW |
| 詞語與單字、分級 | 教育部[《國小學童常用字詞調查報告書》](https://language.moe.gov.tw/001/Upload/files/SITE_CONTENT/M0001/PRIMARY/SHINDEX.HTM)字頻總表、詞頻總表 | 教育部 |
| 例句（句子練習的主力） | 教育部[《國語小字典》](https://dict.mini.moe.edu.tw/) 2019 版（20260929 資料），例句與注音原樣使用 | CC BY-ND 3.0 TW（`data/MINIDICT-LICENSE.txt`） |
| 自編分級句子（一到四年級） | `tools/sentences.txt`，句型依吳欣儒、洪敏雄（2023）〈臺灣國小國語教科書的常用句型分析〉表 9 | 本專案 |
| 例句（句子練習的主力） | 教育部[《國語小字典》](https://dict.mini.moe.edu.tw/) 2019 版（20260929 資料），例句與注音原樣使用 | CC BY-ND 3.0 TW（`data/MINIDICT-LICENSE.txt`） |
| 自編分級句子（一到四年級） | `tools/sentences.txt`，句型依吳欣儒、洪敏雄（2023）〈臺灣國小國語教科書的常用句型分析〉表 9 | 本專案 |

分級：以每個詞最少見的那個字在兒童字頻表的排名切成 7 級（300 / 600 / 1,000 / 1,400 / 1,800 / 2,300 / 2,700 字），對應 108 課綱低、中、高年級識字量。

## 檔案

- `app.html`：頁面結構（也是 Claude artifact 的來源）。改完執行 `python3 build.py` 產生 GitHub Pages 用的 `index.html`。
- `style.css`（Catppuccin Latte / Mocha 配色）、`js/app.js`（練習流程、題庫、等級、帳號）、`js/effects.js`（音效、語音、劍氣、煙火、錢幣）、`js/doll.js`（俠客紙娃娃：把美術素材包的圖層疊起來畫、商店圖示）、`js/catalog.js`（物品清單，由素材包產生，不要手改）、`js/pixel.js`（v0 手繪像素俠客，素材載入不到時才用；git 標籤 `pixel-v0` 是換素材前的版本）。
- `js/config.js`：雲端同步設定（Supabase）。留空時進度只存在該裝置。
- `data/cNNN.json`：筆順、部首、注音；`data/words.json`：詞語題庫；`data/sentences.json`：句子題庫。
- `sprites/`：美術素材包裡遊戲用得到的部分（圖層、寵物、寶物、背景、商店圖示），由 `tools/sync_sprites.py` 複製，不要手改。
- `manifest.webmanifest`、`icons/`：加入主畫面用的 App 設定與圖示。

## 重新產生資料

```
python3 tools/make_data.py <hanzi-writer-data 資料夾> <makemeahanzi dictionary.txt> <zh-stroke-data/json 資料夾> data <moedict dict-revised.json>
python3 tools/make_words.py <SHREST1.DBF> <shrest2.dbf>      # 來自報告書的 download/result.zip
python3 -I tools/make_sentences.py <dict_mini xlsx> <SHREST1.DBF> <moedict dict-revised.json>   # data/sentences.json
python3 -I tools/sync_sprites.py <sprite_pack 資料夾>              # sprites/ 與 js/catalog.js；美術素材包更新後執行
python3 tools/make_icon.py                                   # icons/icon.svg，再轉成各尺寸 PNG
```

## 美術素材

俠客、兵器、飾品、髮色、夥伴、寶物的圖由另一邊的美術素材包提供（含 `manifest.json` 與說明）。遊戲只讀不改；素材包更新後執行 `tools/sync_sprites.py` 再建置即可。遊戲這邊對素材的需求與回饋記在 `tools/SPRITE_FEEDBACK.md`。

## 跨裝置同步（俠客帳號）

1. 到 https://supabase.com 建立免費專案。
2. Dashboard → SQL Editor，貼上 `supabase/schema.sql` 執行。
3. Project Settings → API，把 Project URL 與 anon public key 填進 `js/config.js`。
4. push 到 `gh-pages`。之後在任何裝置用同一個「江湖名字 + 4 位數密碼」登入，就會同步進度。
