# 測試（Playwright）

每個腳本開一個瀏覽器，操作頁面、印出結果並截圖，最後一行是 `errors: none` 或頁面上的錯誤。
寫入雲端的動作都被擋下或模擬，不會動到真的 Supabase。

```
python3 -m http.server 8765 --bind 127.0.0.1        # 在 repo 根目錄開本機伺服器
npm i -D playwright                                # 第一次
BROWSER_PATH="/Applications/Brave Browser.app/Contents/MacOS/Brave Browser" \
  node tests/test3.js http://127.0.0.1:8765 /tmp/shots   # 第二個參數：截圖資料夾
```

主要回歸：`test3`（練字流程、商店、版面）、`test_ux`、`test_heroes`（帳號、群俠譜、捎信，模擬 Supabase）、
`test_sentences`、`boot_honor`（戴稱號開機）、`step`（看筆順逐筆）、`batch`（九宮格、描後才能寫、錢莊）、
`fit_test`（自己寫的位置校正）、`sent_fixed`（換句時格子不動）、`three`（破音字讀音）。
效能：`perf2 <url> <倍數>`（降速 CPU 量測寫字時各函式耗時）、`perf_idle`。
