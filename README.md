# HubSpot x BotBonnie Integration

將 BotBonnie LINE 聯絡人同步至 HubSpot CRM，並讓 HubSpot Workflow 直接透過 BotBonnie 發送 LINE 訊息。

## 專案架構

```
.
├── api/                         # Vercel Serverless Functions
│   ├── _verify.js               # HubSpot webhook 簽名驗證 (v3)
│   ├── send-line-text-message.js  # Workflow Action：發送 LINE 文字訊息
│   ├── send-line-module-message.js # Workflow Action：發送 BotBonnie Module
│   └── sync.js                  # Cron 觸發的聯絡人同步端點
├── sync-service/                # BotBonnie → HubSpot 同步邏輯
│   └── src/
│       ├── lib/
│       │   ├── botbonnieClient.js  # BotBonnie API 封裝
│       │   └── hubspotClient.js    # HubSpot API Client
│       └── sync/
│           ├── pollBotBonnie.js    # 分頁拉取 BotBonnie 聯絡人
│           ├── mapProperties.js    # 欄位對應（BotBonnie → HubSpot）
│           └── upsertContacts.js   # 批次 upsert 至 HubSpot
├── src/                         # HubSpot Project 定義
│   └── app/
│       └── app-hsmeta.json      # HubSpot Private App 設定
└── vercel.json                  # Vercel 部署設定（Functions + Cron）
```

## 功能說明

### 1. HubSpot Workflow Actions

部署至 Vercel 的 webhook 端點，供 HubSpot Workflow 呼叫：

| 端點 | 說明 |
|------|------|
| `POST /api/send-line-text-message` | 發送文字訊息給指定 LINE 用戶 |
| `POST /api/send-line-module-message` | 發送 BotBonnie Module（模板訊息）給指定 LINE 用戶 |

所有端點均驗證 HubSpot v3 HMAC 簽名（`X-HubSpot-Signature-V3`），並在 5 分鐘時間窗口內拒絕過期請求。

**Workflow Action 輸入欄位：**

`send-line-text-message`：
- `lineUserId`：BotBonnie LINE User ID
- `messageText`：要發送的文字內容

`send-line-module-message`：
- `lineUserId`：BotBonnie LINE User ID
- `moduleId`：BotBonnie Module ID

### 2. 聯絡人同步（BotBonnie → HubSpot）

每天 UTC 02:00（台灣時間 10:00）由 Vercel Cron 自動執行。分頁拉取所有 BotBonnie LINE 聯絡人，批次 upsert 至 HubSpot。

**同步邏輯：**
- 有 email 的用戶：以 `email` 為識別鍵 upsert
- 無 email 的用戶：以 `botbonnie_line_user_id` 為識別鍵 upsert

**自訂 HubSpot 屬性（botbonnie_*）：**

| 屬性名稱 | 說明 |
|----------|------|
| `botbonnie_line_user_id` | LINE User ID |
| `botbonnie_display_name` | LINE 顯示名稱 |
| `botbonnie_profile_pic` | 大頭貼 URL |
| `botbonnie_created_at` | 建立時間（timestamp） |
| `botbonnie_status_message` | LINE 狀態消息 |
| `botbonnie_gender` | 性別 |
| `botbonnie_location` | 地區 |
| `botbonnie_birthday` | 生日 |
| `botbonnie_tags` | 標籤（逗號分隔） |
| `botbonnie_param_{key}` | 自訂參數（動態對應） |

## 環境變數

在 Vercel 專案中設定以下環境變數：

| 變數名稱 | 說明 | 必填 |
|----------|------|------|
| `BOTBONNIE_API_TOKEN` | BotBonnie API Token（JWT） | 是 |
| `BOTBONNIE_PAGE_ID` | BotBonnie Page ID | 是 |
| `HUBSPOT_CLIENT_SECRET` | HubSpot Private App Client Secret（用於 webhook 簽名驗證） | 是 |
| `PRIVATE_APP_ACCESS_TOKEN` | HubSpot Private App Access Token（用於 API 呼叫） | 是 |
| `CRON_SECRET` | Vercel Cron 認證 token | 建議設定 |

```bash
vercel env add BOTBONNIE_API_TOKEN
vercel env add BOTBONNIE_PAGE_ID
vercel env add HUBSPOT_CLIENT_SECRET
vercel env add PRIVATE_APP_ACCESS_TOKEN
vercel env add CRON_SECRET
```

## 部署

### Vercel

```bash
# 首次部署
vercel

# 正式環境部署
vercel --prod
```

部署後，Vercel Cron 會自動依 `vercel.json` 排程每日執行同步。

### HubSpot Project

```bash
# 部署 HubSpot Private App（需安裝 HubSpot CLI）
hs project upload --profile=staging   # 部署至測試帳號
hs project upload --profile=production # 部署至正式帳號
```

## 設定 HubSpot Workflow Action

1. 進入 HubSpot → Automation → Workflows
2. 新增 Action → 選擇「Custom code」或透過 Private App 的 Workflow Extension
3. 將 `actionUrl` 設為 Vercel 部署後的端點 URL（例如 `https://your-project.vercel.app/api/send-line-text-message`）
4. 設定輸入欄位 `lineUserId`（從聯絡人屬性 `botbonnie_line_user_id` 取值）與 `messageText`

## 本地開發

```bash
# 安裝依賴
npm install

# 設定環境變數
cp sync-service/.env.example sync-service/.env
# 編輯 .env 填入必要的 token

# 本地啟動（使用 Vercel CLI）
vercel dev

# 手動執行同步（測試用）
node -e "require('./sync-service/src/sync/pollBotBonnie').runSync()"

# 建立 HubSpot 自訂屬性
cd sync-service && node scripts/createProperties.js
```

## 安全性

- 所有 Workflow Action webhook 均驗證 HubSpot v3 HMAC-SHA256 簽名
- 請求 body 大小限制為 1 MB
- 時間戳記超過 5 分鐘的請求一律拒絕（防 replay attack）
- Cron 端點以 `CRON_SECRET` Bearer token 保護
