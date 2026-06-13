# Robotmon Discord Bot

Discord から Android (Robotmon) をリモートコントロールするBotです。

```
Discord → Bot (Node.js) → gRPC → Robotmon (Android)
Android → httpClient → Discord Webhook → Discord
```

---

## 構成

```
robotmon-discord/
├── discord-bot/               # Node.js Discord Bot
│   ├── proto/robotmon.proto   # gRPC定義
│   ├── src/
│   │   ├── index.js           # Bot本体
│   │   ├── robotmon-client.js # gRPCクライアント
│   │   └── register-commands.js # スラッシュコマンド登録 (初回のみ)
│   ├── .env.example
│   └── package.json
└── robotmon-scripts/
    └── discord-logger/        # Android側スクリプト (ES5)
        ├── index.js
        └── index.html
```

---

## セットアップ

### 1. Discord Bot を作成

1. [Discord Developer Portal](https://discord.com/developers/applications) でアプリを作成
2. Bot を作成して **Token** をコピー
3. OAuth2 → URL Generator で `bot` + `applications.commands` スコープを選択し招待
4. サーバーの任意のチャンネルで **Webhook URL** を作成

### 2. Android 側の準備

1. [Robotmon](https://play.google.com/store/apps/details?id=com.r2studio.robotmon) をインストール
2. Robotmonサービスを起動（Android 8以上はEasyMode対応、PC不要）
3. `discord-logger/` フォルダを `/sdcard/Robotmon/discord-logger/` にコピー
4. `discord-logger/index.js` の `CONFIG.webhookUrl` を書き換える
5. Robotmonアプリでスクリプトを選択してPlayボタン、またはBotの `/script start discord-logger` で起動

### 3. Discord Bot を起動

```bash
cd discord-bot
cp .env.example .env
# .env を編集
npm install
node src/register-commands.js   # 初回のみ: スラッシュコマンド登録
npm start
```

### 4. ポートフォワード（PCとAndroidをUSB接続する場合）

```bash
adb forward tcp:7912 tcp:7912
```

Wi-Fi接続の場合は `.env` の `ROBOTMON_HOST` を Android の IP アドレスに変更。

---

## スラッシュコマンド一覧

| コマンド | 説明 |
|---|---|
| `/screenshot` | スクリーンショットを取得してDiscordに送信 |
| `/tap <x> <y> [during]` | 指定座標をタップ |
| `/swipe <x1> <y1> <x2> <y2> [duration]` | スワイプ |
| `/script start\|stop <name>` | スクリプトの起動・停止 |
| `/screensize` | 画面サイズを取得 |

---

## Android側スクリプト (discord-logger) のカスタマイズ

`robotmon-scripts/discord-logger/index.js` の `doWork()` 関数に自動化コードを書きます。
`log('INFO', 'メッセージ')` で Discord に通知が飛びます。

```javascript
function doWork() {
  var img = getScreenshot();
  // ... 画像処理・条件判定など ...
  log('WARN', '何かを検出しました');
  releaseImage(img);
}
```

---

## 別アプリへの応用

`discord-bot/src/robotmon-client.js` の gRPC メソッドと、
`discord-bot/src/index.js` のコマンドハンドラーは独立しています。

別のゲームやアプリ用にスクリプトを追加したい場合：

1. `robotmon-scripts/<your-app-name>/index.js` を作成（`start()` / `stop()` を実装）
2. Android の `/sdcard/Robotmon/<your-app-name>/index.js` にコピー
3. Discord から `/script start <your-app-name>` で起動

追加のコマンドが必要な場合は `register-commands.js` にコマンドを追加し、
`index.js` にハンドラーを追加してください。
