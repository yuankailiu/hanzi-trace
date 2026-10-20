# 筆順描字本

給小朋友練習寫名字的中文筆順網頁：看筆順動畫 → 用手指描字 → 自己寫。

- 網站：https://yuankailiu.github.io/hanzi-trace/
- `app.html` 是主程式（也是 Claude artifact 的來源），改完後執行 `python3 build.py` 產生 `index.html`。
- `data/` 是筆順資料，來自 [Make Me a Hanzi](https://github.com/skishore/makemeahanzi) / [hanzi-writer-data](https://github.com/chanind/hanzi-writer-data)，Arphic Public License（見 `data/ARPHICPL.TXT`）。
- 重新產生 `data/`：`python3 tools/make_data.py <hanzi-writer-data 套件資料夾> <makemeahanzi dictionary.txt> data`（加入部首 `rad` 與注音 `zy`）。
- 發布：push 到 `gh-pages` 分支，GitHub Pages 會自動更新。
