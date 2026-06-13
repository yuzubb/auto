// src/index.js
// Discord Bot — Robotmon コントローラー

require('dotenv').config();
const { Client, GatewayIntentBits, AttachmentBuilder } = require('discord.js');
const RobotmonClient = require('./robotmon-client');

// ── Bot & gRPC クライアント初期化 ──────────────────────────────────────────
const discord = new Client({ intents: [GatewayIntentBits.Guilds] });

const robotmon = new RobotmonClient(
  process.env.ROBOTMON_HOST || '127.0.0.1',
  parseInt(process.env.ROBOTMON_PORT || '7912', 10)
);

// ── スクリプト管理 ────────────────────────────────────────────────────────
// running scripts: name -> gRPC stream cancel handle (or true for RunScript)
const runningScripts = new Map();

// ── ログストリーム → Webhook ───────────────────────────────────────────────
let logStream = null;

function startLogStream() {
  if (logStream) return;
  console.log('[Bot] Robotmon ログストリーム開始');

  logStream = robotmon.streamLogs(
    async (message) => {
      // Webhook URL が設定されていれば Discord に通知
      const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
      if (!webhookUrl || !message) return;
      try {
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: `🤖 **[Robotmon Log]** ${message}` }),
        });
      } catch (e) {
        console.error('[Webhook] 送信失敗:', e.message);
      }
    },
    (err) => {
      console.error('[Log stream] エラー:', err.message);
      logStream = null;
      // 5秒後に再接続
      setTimeout(startLogStream, 5000);
    }
  );
}

// ── コマンドハンドラー ─────────────────────────────────────────────────────
discord.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;

  // /screenshot
  if (commandName === 'screenshot') {
    await interaction.deferReply();
    try {
      const result = await robotmon.getScreenshot();
      if (!result.image || result.image.length === 0) {
        return interaction.editReply('⚠️ スクリーンショットデータが空です');
      }
      const buf = Buffer.isBuffer(result.image) ? result.image : Buffer.from(result.image);
      const attachment = new AttachmentBuilder(buf, { name: 'screenshot.png' });
      await interaction.editReply({ content: '📱 スクリーンショット', files: [attachment] });
    } catch (err) {
      await interaction.editReply(`❌ エラー: ${err.message}`);
    }
    return;
  }

  // /tap
  if (commandName === 'tap') {
    await interaction.deferReply();
    const x      = interaction.options.getInteger('x');
    const y      = interaction.options.getInteger('y');
    const during = interaction.options.getInteger('during') ?? 50;
    try {
      await robotmon.tap(x, y, during);
      await interaction.editReply(`✅ タップ完了: (${x}, ${y}) during=${during}ms`);
    } catch (err) {
      await interaction.editReply(`❌ エラー: ${err.message}`);
    }
    return;
  }

  // /swipe
  if (commandName === 'swipe') {
    await interaction.deferReply();
    const x1       = interaction.options.getInteger('x1');
    const y1       = interaction.options.getInteger('y1');
    const x2       = interaction.options.getInteger('x2');
    const y2       = interaction.options.getInteger('y2');
    const duration = interaction.options.getInteger('duration') ?? 300;
    try {
      await robotmon.swipe(x1, y1, x2, y2, duration);
      await interaction.editReply(`✅ スワイプ完了: (${x1},${y1}) → (${x2},${y2}) ${duration}ms`);
    } catch (err) {
      await interaction.editReply(`❌ エラー: ${err.message}`);
    }
    return;
  }

  // /script start|stop <name>
  if (commandName === 'script') {
    await interaction.deferReply();
    const action = interaction.options.getString('action');
    const name   = interaction.options.getString('name');

    if (action === 'start') {
      if (runningScripts.has(name)) {
        return interaction.editReply(`⚠️ スクリプト「${name}」は既に実行中です`);
      }
      try {
        // スクリプトを呼び出す規約: スクリプトファイルは Android 側の
        // /sdcard/Robotmon/<name>/index.js に存在する想定
        // RunScript で start() を呼ぶ
        const script = `
          var scriptPath = getStoragePath() + '/${name}/index.js';
          var code = readFile(scriptPath);
          if (!code) { console.log('Script not found: ' + scriptPath); }
          else { eval(code); if (typeof start === 'function') start(); }
        `;
        const res = await robotmon.runScript(script);
        runningScripts.set(name, true);
        await interaction.editReply(`▶️ スクリプト「${name}」を起動しました\n> ${res.message || 'OK'}`);
      } catch (err) {
        await interaction.editReply(`❌ 起動失敗: ${err.message}`);
      }

    } else if (action === 'stop') {
      if (!runningScripts.has(name)) {
        return interaction.editReply(`⚠️ スクリプト「${name}」は実行中ではありません`);
      }
      try {
        const script = `if (typeof stop === 'function') stop();`;
        const res = await robotmon.runScript(script);
        runningScripts.delete(name);
        await interaction.editReply(`⏹️ スクリプト「${name}」を停止しました\n> ${res.message || 'OK'}`);
      } catch (err) {
        await interaction.editReply(`❌ 停止失敗: ${err.message}`);
      }
    }
    return;
  }

  // /screensize
  if (commandName === 'screensize') {
    await interaction.deferReply();
    try {
      const size = await robotmon.getScreenSize();
      await interaction.editReply(`📐 画面サイズ: ${size.width} × ${size.height}`);
    } catch (err) {
      await interaction.editReply(`❌ エラー: ${err.message}`);
    }
    return;
  }
});

// ── 起動 ──────────────────────────────────────────────────────────────────
discord.once('ready', () => {
  console.log(`✅ Discord Bot ログイン: ${discord.user.tag}`);
  startLogStream();
});

discord.login(process.env.DISCORD_TOKEN);
