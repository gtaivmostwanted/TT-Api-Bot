//Requirements
require('dotenv').config();
const Discord = require('discord.js');
const axios = require('axios');
const htmlToImage = require('node-html-to-image');
const { addCommas, createAndSendTemp, msToTime, useTemplate, processErrorCode } = require('./utils');
const bot = new Discord.Client();
const TOKEN = process.env.TOKEN;
bot.login(TOKEN);

//Tycoon Server Selection And Key
const TT = axios.create({
  baseURL: 'http://na.tycoon.community:30120/status',
  headers: { 'X-Tycoon-Key': process.env.TYCOONTOKEN }
});

//Bot Starting And Console Output
bot.on('ready', () => {
  console.info('TTApiBot is now operational with alot of help from logan & elfshot');
  bot.user.setActivity('Transport Tycoon', { type: 'WATCHING' });
});

const servers = [
  'server.tycoon.community:30120',
  'server.tycoon.community:30122',
  'server.tycoon.community:30123',
  'server.tycoon.community:30124',
  'server.tycoon.community:30125',
  'na.tycoon.community:30120',
  'na.tycoon.community:30122',
  'na.tycoon.community:30123',
  'na.tycoon.community:30124',
  'na.tycoon.community:30125',
];

bot.on('message', async (msg) => {
  const args = msg.content.toLowerCase().split(' ');
  const prefix = args.shift();
  if (prefix !== '-tt') return;

  // Process what specific command the user has typer, will determine path & processing
  if (args.length < 1) return;

  try {
    // Custom inventory command, exists outside of the default endpoint as arg section
    if (args[0] === 'inventory') {
      const { data: { data: { inventory } } } = await TT(`/dataadv/${args[1]}`);
      const items = [];

      Object.keys(inventory).forEach((itemId) => {
        items.push({
          name: inventory[itemId].name,
          amount: inventory[itemId].amount,
          weight: inventory[itemId].weight,
          stripped: inventory[itemId].name.replace(/(<([^>]+)>)/gi, ''),
          total: (inventory[itemId].weight * inventory[itemId].amount).toFixed(2)
        });
      });

      items.sort((a, b) => a.stripped.localeCompare(b.stripped));

      const rows = [];
      const rowLimit = 20;
      
      for (let i=0; i < items.length; i += rowLimit) {
        rows.push(items.slice(i, i + rowLimit));
      }
      
      const img = await htmlToImage({ 
        html: useTemplate('inventory'),
        content: {
          rows,
          userId: args[1],
          totalItems: items.length
        }
      });
      msg.channel.send(new Discord.MessageAttachment(img, `inventory-${args[1]}.png`));
    } else if (args[0] === 'skills') {
      const { data: { data: { gaptitudes_v } } } = await TT(`/data/${args[1]}`);
      const skillArr = [];

      Object.keys(gaptitudes_v).forEach((cat) => {
        let data = {
          name: cat.charAt(0).toUpperCase() + cat.slice(1),
          skills: []
        };

        Object.keys(gaptitudes_v[cat]).forEach((skill) => {
          const skillLevel = Math.floor((Math.sqrt(1 + 8 * gaptitudes_v[cat][skill] / 5) - 1) / 2);
          data.skills.push({
            name: skill === 'skill' ? cat.charAt(0).toUpperCase() + cat.slice(1) : skill.charAt(0).toUpperCase() + skill.slice(1),
            level: skillLevel,
            maxLevel: skill === 'strength' ? '30' : '100'
          });
        });

        skillArr.push(data);
      });

      skillArr.sort((a, b) => a.skills.length - b.skills.length);

      const firstRow = [];
      const secondRow = [];
      skillArr.forEach((skill) => {
        if (firstRow.length < 5) {
          firstRow.push(skill);
        } else {
          secondRow.push(skill);
        }
      });

      const img = await htmlToImage({
        html: useTemplate('skills'), 
        content: {
          userId: args[1],
          firstRow,
          secondRow
        }
      });
      msg.channel.send(new Discord.MessageAttachment(img, `skills-${args[1]}.png`));
    } else if (args[0] === 'server') {
      if (!args[1] || Number.isNaN(parseInt(args[1]))) return msg.reply('Please enter a number from 1-10!');
      const srvId = parseInt(args[1]);

      try {
        const { data: serverData } = await axios(`http://${servers[srvId - 1]}/status/widget/players.json`);
        const playercount = serverData.players.length;

        if (serverData.players.length > 10) serverData.players.length = 10;

        const img = await htmlToImage({
          html: useTemplate('server'),
          content: {
            players: serverData.players,
            server: serverData.server,
            playercount,
            srvId,
            timeRemaining: serverData.server.dxp[0] ? msToTime(serverData.server.dxp[2]) : null
          }
        });

        msg.channel.send(new Discord.MessageAttachment(img, `server-${args[1]}.png`));
      } catch (e) {
        console.log(e);
        msg.reply('Uh oh, server seems unresponsive! ' + e);
      }

    } else {
      const response = await TT(`/${args[0]}${args[1] ? `/${args[1]}` : ''}`);
      const data = response.data;
      if (typeof data === 'object' || Array.isArray(data)) {
        createAndSendTemp(msg, JSON.stringify(data, null, 2), (args[0].includes('.json') ? args[0] : `${args[0]}.json`));


      } else if (/<\/?[a-z][\s\S]*>/i.test(data)) {
        const img = await htmlToImage({ html: data });
        msg.channel.send(new Discord.MessageAttachment(img, `${args[1]}.png`));

        // Custom Economy Command Converting CSV to img
      } else if (args[0] === 'economy.csv') {
        const splitEconomy = data.split('\n');
        splitEconomy.pop();
        const shortData = splitEconomy.splice(splitEconomy.length - 10);
        let htmlData = '<table><tr><th>Time</th><th>Debt</th><th>Money</th><th>Debts</th><th>Millionaires</th><th>Billionaires</th><th>Users</th><th>Players</th></tr>';
        shortData.forEach((economy) => {
          let split = economy.split(';');
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
        `;
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
      `;
        const img = await htmlToImage({ html: htmlData });
        msg.channel.send(new Discord.MessageAttachment(img, 'economy.png'));
      }
    }


  } catch (err) {
    // Handling errors by returning statement to the message channel
    msg.channel.send(processErrorCode(err.response.data.code));
    // Can instead use the following line if you would rather not customise return values and use the Axios/Request returned message
    //msg.channel.send(err.response.data.error);
    console.log(err);
  }
});


//Credits:sadboilogan"Almost complete bot Re-Write, Elfshot#0007 "Remade Inventory Command"
// Edit Number to force restart Bot:2