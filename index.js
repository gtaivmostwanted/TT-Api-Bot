require('dotenv').config();

const Discord = require('discord.js');
const tmp = require('tmp');
const fs = require('fs');
const axios = require('axios');
const htmlToImage = require('node-html-to-image');

const TT = axios.create({
  baseURL: 'http://server.tycoon.community:30125/status',
  headers: {
    'X-Tycoon-Key': 'nFdioVX2DSTGbjT4KLWkcyE030c3VyKOoUjr7'
  }
});

const bot = new Discord.Client();
const TOKEN = process.env.TOKEN;

bot.login(TOKEN);

bot.on('ready', () => {
  console.info('TTApiBot is now operational with alot of help from https://github.com/sadboilogan.');
  bot.user.setActivity('Transport Tycoon', {type: 'WATCHING'})
});

function createAndSendTemp(msg, data, fileName) {
  tmp.file((err, path, fd, cleanupCallback) => {
    fs.writeFileSync(path, data);
    msg.channel.send(new Discord.Attachment(path, fileName)).then((msgres) => {
      cleanupCallback();
    })
  })
}

function addCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

bot.on('message', async (msg) => {
  const args = msg.content.toLowerCase().split(" ");
  const prefix = args.shift();
  if (prefix !== '-tt') return;

  // Process what specific command the user has typer, will determine path & processing
  if (args.length < 1) return;

  try {
    if (args[0] === 'advanced') args[0] = `${args[0]}/`
    const response = await TT(`/${args[0]}${args[1] ? `/${args[1]}` : ''}`);
    const data = response.data;

    if (typeof data === 'object' || Array.isArray(data)) {
      createAndSendTemp(msg, JSON.stringify(data, null, 2), (args[0].includes('.json') ? args[0] : `${args[0]}.json`));
    } else if (/<\/?[a-z][\s\S]*>/i.test(data)) {
      const img = await htmlToImage({html: data});
      msg.channel.send(new Discord.Attachment(img, `${args[1]}.png` ))
    } else if (args[0] === 'economy.csv') {
      const splitEconomy = data.split('\n');
      splitEconomy.pop();
      const shortData = splitEconomy.splice(splitEconomy.length - 10);
      let htmlData = `<table><tr><th>Time</th><th>Debt</th><th>Money</th><th>Debts</th><th>Millionaires</th><th>Billionaires</th><th>Users</th><th>Players</th></tr>`
      shortData.forEach((economy) => {
        let split = economy.split(';')
        htmlData += `
        <tr>
          <td>${new Date(split[0] * 1000).toLocaleString()}</td>
          <td>${addCommas(split[1])}</td>
          <td>${addCommas(split[2])}</td>
          <td>${addCommas(split[3])}</td>
          <td>${addCommas(split[4])}</td>
          <td>${addCommas(split[5])}</td>
          <td>${addCommas(split[6])}</td>
          <td>${addCommas(split[7])}</td>
        </tr>
        `
      });

      htmlData += `</table>
      <style>
        * {
          font-family: Comic Sans MS;
        }
        table, th, td {
          border: 1px solid black;
          border-collapse: collapse;
        }
        th, td {
          padding: 0.3rem;
        }
      </style>
      `
      const img = await htmlToImage({html: htmlData});
      msg.channel.send(new Discord.Attachment(img,`economy.png`))
    }
  } catch(err) {
    msg.channel.send(`An error occured! ${err}`)
    console.log(err)
  }
});


 //Credits:PlagueBringer22#6238 "original bot code" sadboilogan"Almost complete bot Re-Write
// change number here to restart bot:5