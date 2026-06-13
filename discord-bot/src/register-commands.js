// src/register-commands.js
// Run once: node src/register-commands.js
// Registers slash commands with Discord

require('dotenv').config();
const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const commands = [
  new SlashCommandBuilder()
    .setName('screenshot')
    .setDescription('Androidのスクリーンショットを取得してDiscordに送信'),

  new SlashCommandBuilder()
    .setName('tap')
    .setDescription('Android画面をタップ')
    .addIntegerOption(o => o.setName('x').setDescription('X座標').setRequired(true))
    .addIntegerOption(o => o.setName('y').setDescription('Y座標').setRequired(true))
    .addIntegerOption(o => o.setName('during').setDescription('タップ前の待機ms (default: 50)').setRequired(false)),

  new SlashCommandBuilder()
    .setName('swipe')
    .setDescription('Android画面をスワイプ')
    .addIntegerOption(o => o.setName('x1').setDescription('開始X').setRequired(true))
    .addIntegerOption(o => o.setName('y1').setDescription('開始Y').setRequired(true))
    .addIntegerOption(o => o.setName('x2').setDescription('終了X').setRequired(true))
    .addIntegerOption(o => o.setName('y2').setDescription('終了Y').setRequired(true))
    .addIntegerOption(o => o.setName('duration').setDescription('スワイプ時間ms (default: 300)').setRequired(false)),

  new SlashCommandBuilder()
    .setName('script')
    .setDescription('Robotmonスクリプトを起動・停止')
    .addStringOption(o =>
      o.setName('action')
        .setDescription('start または stop')
        .setRequired(true)
        .addChoices(
          { name: 'start', value: 'start' },
          { name: 'stop',  value: 'stop'  }
        )
    )
    .addStringOption(o => o.setName('name').setDescription('スクリプト名').setRequired(true)),

  new SlashCommandBuilder()
    .setName('screensize')
    .setDescription('Android画面サイズを取得'),
].map(cmd => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log('スラッシュコマンドを登録中...');
    await rest.put(
      Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),
      { body: commands }
    );
    console.log('✅ 登録完了');
  } catch (err) {
    console.error('❌ 登録失敗:', err);
  }
})();
