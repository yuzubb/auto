// robotmon-scripts/discord-logger/index.js
// Robotmon スクリプト (ES5)
// Android 側から Discord Webhook にログを送る

// ============================================================
// 設定 — ここを書き換えてください
// ============================================================
var CONFIG = {
  webhookUrl: 'https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN',
  scriptName: 'MyScript',      // ログに表示されるスクリプト名
  intervalMs: 5000,            // ループ間隔 (ms)
  screenshotOnError: false,    // エラー時にスクリーンショットも送る場合 true
};
// ============================================================

var running = false;
var loopTimer = null;

// Discord Webhook に POST する
function sendToDiscord(content, imageBase64) {
  try {
    var payload;
    if (imageBase64) {
      // multipart は httpClient では難しいので embed で base64 を貼る方式はとれない
      // 画像が必要な場合は content にメッセージのみ送り、Bot 側の /screenshot を使う
      payload = JSON.stringify({ content: content + '\n*(画像は /screenshot コマンドで取得してください)*' });
    } else {
      payload = JSON.stringify({ content: content });
    }
    var res = httpClient('POST', CONFIG.webhookUrl, payload, { 'Content-Type': 'application/json' });
    return res;
  } catch (e) {
    console.log('[discord-logger] Webhook 送信エラー: ' + e);
  }
}

// ログ送信ヘルパー
function log(level, message) {
  var emoji = { INFO: 'ℹ️', WARN: '⚠️', ERROR: '❌', OK: '✅' }[level] || '🔹';
  var text = emoji + ' **[' + CONFIG.scriptName + ']** ' + message;
  console.log(text);
  sendToDiscord(text);
}

// --- メインのスクリプトロジック (自分のスクリプトに合わせて書き換える) ---

function doWork() {
  // 例: 画面の特定座標の色を読んで何かする
  // var img = getScreenshot();
  // var color = getImageColor(img, 500, 500);
  // releaseImage(img);
  // if (color == 0xFF0000) { log('WARN', '赤い何かを検出した'); }

  log('INFO', 'ループ実行中... (intervalMs=' + CONFIG.intervalMs + ')');

  // ここに実際の自動化コードを書く
}

function loop() {
  if (!running) return;
  try {
    doWork();
  } catch (e) {
    log('ERROR', 'doWork 例外: ' + e);
  }
  loopTimer = setTimeout(loop, CONFIG.intervalMs);
}

// Robotmon から呼ばれる start / stop
function start() {
  if (running) return;
  running = true;
  log('OK', 'スクリプト開始');
  loop();
}

function stop() {
  running = false;
  if (loopTimer !== null) {
    clearTimeout(loopTimer);
    loopTimer = null;
  }
  log('INFO', 'スクリプト停止');
}
