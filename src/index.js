//Requirements
require('dotenv').config();
const Discord = require('discord.js');
const { commands } = require('./commands');
const { sotdGen } = require('./utils');
const bot = new Discord.Client();
const TOKEN = process.env.TOKEN;
var lastSOTD = 0;
bot.login(TOKEN);

//Bot Starting And Console Output
bot.on('ready', () => {
  console.info('TTApiBot is now operational with alot of help from logan & elfshot');
  bot.user.setActivity('Dying in Peace', { type: 'PLAYING' });
  sotdTimer();
});

bot.on('message', async (msg) => {
  commands(msg, bot);
});


function sotdTimer() {
  const date = new Date();
  try {
    (async () => {
      if (lastSOTD == date.getUTCDate()) return;
      if (date.getUTCHours() == 0 && date.getUTCMinutes() >= 10 && 
        date.getUTCMinutes() < 20) {
        bot.channels.cache.get(process.env.SOTDCHANNEL).send(await sotdGen());
      }
      lastSOTD = date.getUTCDate();
    })();
  }catch(err){console.log(err);}
    
  setTimeout(() => {
    sotdTimer();
    // modify the *5 for minutes
  }, ((1000 * 60) * 5) );
}

//Credits:sadboilogan"Almost complete bot Re-Write, Elfshot#0007 "shtuff"
// Edit Number to force restart Bot:2