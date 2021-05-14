//Requirements
require('dotenv').config();
const Discord = require('discord.js');
const { commands, sotdTimer } = require('./commands')
const bot = new Discord.Client();
const TOKEN = process.env.TOKEN;
bot.login(TOKEN);

//Bot Starting And Console Output
bot.on('ready', () => {
  console.info('TTApiBot is now operational with alot of help from logan & elfshot');
  bot.user.setActivity('Transport Tycoon', { type: 'WATCHING' });
  sotdTimer(bot);
});

bot.on('message', async (msg) => {
  commands(msg);
});


//Credits:sadboilogan"Almost complete bot Re-Write, Elfshot#0007 "shtuff"
// Edit Number to force restart Bot:2