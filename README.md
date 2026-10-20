# 筆順描字本

給小朋友練習中文字的筆順網頁：看筆順 → 用手指描字 → 自己寫；生活常用詞庫依江湖名號由淺到深，也可以自己出題（例如名字）。

- 網站：https://yuankailiu.github.io/hanzi-trace/ （iPad / iPhone 用 Safari「分享 → 加入主畫面」即可全螢幕使用）

## 檔案

- `app.html`：頁面結構（也是 Claude artifact 的來源）。改完執行 `python3 build.py` 產生 GitHub Pages 用的 `index.html`。
- `style.css`、`js/app.js`（練習流程、詞庫、帳號）、`js/effects.js`（音效、劍氣、煙火、錢幣）、`js/pixel.js`（像素俠客、兵器、名號與武功境界）。
- `js/config.js`：雲端同步設定（Supabase）。留空時進度只存在該裝置。
- `data/cNNN.json`：筆順、部首、注音資料；`data/words.json`：詞庫。
- `manifest.webmanifest`、`icons/`：加入主畫面用的 App 設定與圖示。

## 重新產生資料

- 筆順資料：`python3 tools/make_data.py <hanzi-writer-data 套件資料夾> <makemeahanzi dictionary.txt> data`
- 詞庫：編輯 `tools/words.tsv`（詞、意思），再執行 `python3 tools/make_words.py`，會依筆畫數自動分 7 級。
- 圖示：`python3 tools/make_icon.py` 產生 `icons/icon.svg`，再轉成 PNG。

## 跨裝置同步（俠客帳號）

1. 到 https://supabase.com 建立免費專案。
2. Dashboard → SQL Editor，貼上 `supabase/schema.sql` 執行。
3. Project Settings → API，把 Project URL 與 anon public key 填進 `js/config.js`。
4. push 到 `gh-pages`。之後在任何裝置用同一個「江湖名字 + 4 位數密碼」登入，就會同步進度。

資料來源：[Make Me a Hanzi](https://github.com/skishore/makemeahanzi) / [hanzi-writer-data](https://github.com/chanind/hanzi-writer-data)，Arphic Public License（見 `data/ARPHICPL.TXT`）。
