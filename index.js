//Requirements
require('dotenv').config();
const Discord = require('discord.js');
const axios = require('axios');
const htmlToImage = require('node-html-to-image');
const { addCommas, createAndSendTemp, msToTime, useTemplate, processErrorCode, getServer } = require('./utils');
const bot = new Discord.Client();
const TOKEN = process.env.TOKEN;
bot.login(TOKEN);

//Bot Starting And Console Output
bot.on('ready', () => {
  console.info('TTApiBot is now operational with alot of help from logan & elfshot');
  bot.user.setActivity('Transport Tycoon', { type: 'WATCHING' });
});

const servers = [
  'http://server.tycoon.community:30120',
  'http://server.tycoon.community:30122',
  'http://server.tycoon.community:30123',
  'http://server.tycoon.community:30124',
  'http://server.tycoon.community:30125',
  'http://na.tycoon.community:30120',
  'http://na.tycoon.community:30122',
  'http://na.tycoon.community:30123',
  'http://na.tycoon.community:30124',
  'http://na.tycoon.community:30125',
];
//What endpoints can take a user id?
const userCapablePoints = [
  'wealth'
]

bot.on('message', async (msg) => {
  const args = msg.content.toLowerCase().split(' ');
  const prefix = args.shift();
  if (prefix !== '-tt') return;

  // Process what specific command the user has typer, will determine path & processing
  if (args.length < 1) return;
  
  const serverSelection = userCapablePoints.includes(args[0]) ? await getServer(args[1]) : await getServer();
  
  if (userCapablePoints.includes(args[0]) && !serverSelection) {
    msg.channel.send(`User ${args[1]} not found`); return;
  } 
  else if (!serverSelection) {
    msg.channel.send(`Could not find an active server`); return;
  };
  //Tycoon Server Selection And Key
  const TT = axios.create({
    baseURL: serverSelection,
    headers: { 'X-Tycoon-Key': process.env.TYCOONTOKEN }
  });
  try {
    // Custom inventory command, exists outside of the default endpoint as arg section
    if (args[0] === 'inventory') {
      const { data: { data: { inventory } } } = await TT(`/status/dataadv/${args[1]}`);
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
      // Custom skills command
    } else if (args[0] === 'skills') {
      const { data: { data: { gaptitudes_v } } } = await TT(`/status/data/${args[1]}`);
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
        const { data: serverData } = await axios(`${servers[srvId - 1]}/status/widget/players.json`);
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

      //Custom Economy Viewer
    } else if (args[0] === 'economy') {
      const { data } = await TT('/status/economy.csv');
      const splitEconomy = data.split('\n');
      splitEconomy.pop();
      const shortData = splitEconomy.splice(splitEconomy.length - 20);

      const economyData = [];
      shortData.forEach((economy) => {
        let split = economy.split(';');
        economyData.push({
          time: new Date(split[0] * 1000).toLocaleString(),
          debt: addCommas(split[1]),
          money: addCommas(split[2]),
          debts: addCommas(split[3]),
          millionaires: addCommas(split[4]),
          billionaires: addCommas(split[5]),
          users: addCommas(split[6]),
          players: addCommas(split[7])
        });

      });

      const img = await htmlToImage({ 
        html: useTemplate('economy'),
        content: {
          economyData: economyData
        }
      });
      msg.channel.send(new Discord.MessageAttachment(img, 'economy.png'));

      //Elfshots Custom Backpack Inventory Viewer
    }
      else if (args[0] === 'backpack') {
        const { data: { data: inventory } } = await TT(`/status/chest/u${args[1]}backpack`);
        const items = [];
  
        Object.keys(inventory).forEach((itemId) => {
          items.push({
            name: itemId,
            amount: inventory[itemId].amount,
            stripped: itemId.replace(/(<([^>]+)>)/gi, ''),
          });
        });
  
        items.sort((a, b) => a.stripped.localeCompare(b.stripped));
  
        const rows = [];
        const rowLimit = 20;
        
        for (let i=0; i < items.length; i += rowLimit) {
          rows.push(items.slice(i, i + rowLimit));
        }
        
        const img = await htmlToImage({ 
          html: useTemplate('backpack'),
          content: {
            rows,
            userId: args[1],
            totalItems: items.length
          }
        });
        msg.channel.send(new Discord.MessageAttachment(img, `napsack-${args[1]}.png`));
     
        
        //custom wealth command "SOTD Embed"
    } else if (args[0] === 'sotd') {
      const { data } = await TT(`/status/skillrotation.json`);
      let embed = new Discord.MessageEmbed()
        embed.setColor('#5B00C9')
        embed.setTitle(`Current Skill of the Day`)
        embed.setDescription(`Bonus%: ${data.bonus}\nSkill: ${data.skill}`)
      msg.channel.send(embed);
      //custom wealth command "generates wealth embed"
    } else if (args[0] === 'wealth') {
      const { data } = await TT(`/status/wealth/${args[1]}`);
      let embed = new Discord.MessageEmbed()
        embed.setColor('#5B00C9')
        embed.setTitle(`Wealth of ${args[1]}`)
        embed.setDescription(`Wallet: ${data.wallet}\nBank: ${data.bank}`)
      msg.channel.send(embed);
      //custom charges command "generates charges embed"
    } else if (args[0] === 'charges') {
      const { data } = await TT(`/status/charges.json`);
      let embed = new Discord.MessageEmbed()
        embed.setColor('#5B00C9')
        embed.setTitle(`API Charges`)
        embed.setDescription(`Charges Remaining: ${data}`)
      msg.channel.send(embed);
    }
    else {
      const response = await TT(`/status/${args[0]}${args[1] ? `/status/${args[1]}` : ''}`);
      const data = response.data;
      if (typeof data === 'object' || Array.isArray(data)) {
        createAndSendTemp(msg, JSON.stringify(data, null, 2), (args[0].includes('.json') ? args[0] : `${args[0]}.json`));


      } else if (/<\/?[a-z][\s\S]*>/i.test(data)) {
        const img = await htmlToImage({ html: data });
        msg.channel.send(new Discord.MessageAttachment(img, `${args[1]}.png`));

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


//Credits:sadboilogan"Almost complete bot Re-Write, Elfshot#0007 "shtuff"
// Edit Number to force restart Bot:2