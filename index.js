//Requirements
require('dotenv').config();
const Discord = require('discord.js');
const tmp = require('tmp');
const fs = require('fs');
const axios = require('axios');
const htmlToImage = require('node-html-to-image');
const { TransportTycoon } = require('transporttycoon');
const bot = new Discord.Client();
const TOKEN = process.env.TOKEN;
bot.login(TOKEN);

//Tycoon Server Selection And Key
const TT = axios.create({
  baseURL: 'http://server.tycoon.community:30120/status',
  headers: {'X-Tycoon-Key': process.env.TYCOONTOKEN}
});

//Bot Starting And Console Output
bot.on('ready', () => {
  console.info('TTApiBot is now operational with alot of help from https://github.com/sadboilogan.');
  bot.user.setActivity('Transport Tycoon', {type: 'WATCHING'})
});

//Loading TransportTycoon Module
(async () => {
  const TT = new TransportTycoon('API KEY', true);
  await TT.setupCharges();
  const economy = await TT.getEconomyInfo();
  console.log(economy);
})();
function createAndSendTemp(msg, data, fileName) {
  tmp.file((err, path, fd, cleanupCallback) => {
    fs.writeFileSync(path, data);
    msg.channel.send(new Discord.MessageAttachment(path, fileName)).then((msgres) => {
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
    // Custom inventory command, exists outside of the default endpoint as arg section
    if (args[0] === 'inventory') {
      const response = await TT(`/data/${args[1]}`);
      const inventoryData = response.data.data.inventory;
      const inventoryDataKeys = Object.keys(inventoryData);
      let inventory = [];
      inventoryDataKeys.forEach((value) => {
        let item = [value, inventoryData[value]['amount']];
        inventory.push(item);
      })
      let htmlData = `<table><tr><th>Item</th><th>Amount</th></tr>`;
      inventory.forEach((item) => {
        let name = item[0]
        if (name.includes('|')){
          let segments = name.split('|')
          if (segments.length < 3) {
            name = `${segments[0]}: ${segments[1]}`;
          } else if (segments.length == 3){
            if (segments[0].includes('note')) {
              name = `${segments[0]}: ${segments[1]}`;
            } else name = `${segments[0]}: ${segments[2]}`;
          }
        }
        const amount = item[1];
        name = name.replace('_', ' ');
        name = name.replace('"',' ');
        name = name.replace("/(<img>.*?</img>)/","");
        name = name.replace(/\w\S*/g, (w) => (w.replace(/^\w/, (c) => c.toUpperCase())));

        htmlData += `<tr>
        <td>${name}</td>
        <td>${amount}</td>
        </tr>`;
      })
      htmlData += "</table>"
      console.log(htmlData);
      const img = await htmlToImage({html: htmlData});
      msg.channel.send(new Discord.MessageAttachment(img,`inventory${args[1]}.png`))
    
    } else {
      const response = await TT(`/${args[0]}${args[1] ? `/${args[1]}` : ''}`);
      const data = response.data;
      if (typeof data === 'object' || Array.isArray(data)) {
      createAndSendTemp(msg, JSON.stringify(data, null, 2), (args[0].includes('.json') ? args[0] : `${args[0]}.json`));
    
    
    } else if (/<\/?[a-z][\s\S]*>/i.test(data)) {
      const img = await htmlToImage({html: data});
      msg.channel.send(new Discord.MessageAttachment(img, `${args[1]}.png` ))
    
    // Custom Economy Command Converting CSV to img
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
      msg.channel.send(new Discord.MessageAttachment(img,`economy.png`))
    }}


  } catch(err) {
    msg.channel.send(`An error occured! ${err}`)
    console.log(err)
  }
});


//Credits:sadboilogan"Almost complete bot Re-Write, Elfshot#0007 "Remade Inventory Command"
// Edit Number to force restart Bot:2