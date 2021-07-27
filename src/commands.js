require('dotenv').config();
const { addCommas, createAndSendTemp, msToTime, useTemplate, processErrorCode, getServer, sotdGen, getUser, itemIdToName } = require('./utils');
const htmlToImage = require('node-html-to-image');
const Discord = require('discord.js');
const axios = require('axios');

const servers = [
  'https://tycoon-w8r4q4.users.cfx.re',
  'https://tycoon-2epova.users.cfx.re',
  'https://tycoon-2epovd.users.cfx.re',
  'https://tycoon-wdrypd.users.cfx.re',
  'https://tycoon-njyvop.users.cfx.re',
  'https://tycoon-2r4588.users.cfx.re',
  'https://tycoon-npl5oy.users.cfx.re',
  'https://tycoon-2vzlde.users.cfx.re',
  'https://tycoon-wmapod.users.cfx.re',
  'https://tycoon-wxjpge.users.cfx.re',
  'https://tycoon-2rkmr8.users.cfx.re'
];
//What endpoints can take a user id?
const userCapablePoints = [
  'wealth',
  'whereis',
];

async function commands(msg, bot) {
  try {
    var args = msg.content.toLowerCase().split(' ');
    const prefix = args.shift();
    if (prefix !== '-tt') return;

    // Process what specific command the user has typer, will determine path & processing
    if (args.length < 1) return;
  
    if (userCapablePoints.includes(args[0]) && !args[1]) args[1] = msg.author.id;
    const serverSelection = userCapablePoints.includes(args[0]) ? await getServer(args[1]) : await getServer();

    if (userCapablePoints.includes(args[0]) && !serverSelection) {
      msg.channel.send('User not found'); return;
    } 
    else if (!serverSelection) {
      msg.channel.send('Could not find an active server'); return;
    }
    //Tycoon Server Selection And Key
    const TT = axios.create({
      baseURL: serverSelection,
      headers: { 'X-Tycoon-Key': process.env.TYCOONTOKEN },
      timeout: 5000,
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
        try {
          const { data: { data } } = await TT(`/status/data/${args[1]}`);
          if (!data.gaptitudes_v && !data.gaptitudes) throw Error('User has no skills!');
          const gaptitudes_v = data.gaptitudes_v ? data.gaptitudes_v : data.gaptitudes;
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
        } catch(err) {
          console.log(err);
          msg.channel.send(`Error getting skills :(- ${err.message}`);
        }
      
        //Logans Custom Server List
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
        const shortData = splitEconomy.splice(splitEconomy.length - 5);

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
        try {
          const { data: { data: inventory } } = await TT(`/status/chest/u${args[1]}backpack`);
          const items = [];

          for (const itemId in inventory) {
            const item = itemIdToName(itemId);
            let name;
            if (item) name = item[0];
            else name = itemId;
            items.push({
              name: name,
              amount: inventory[itemId].amount,
              stripped: name.replace(/(<([^>]+)>)/gi, ''),
            });
          }

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
        } catch(err) {
          console.log(err);
        }

      //custom command "SOTD"
      } else if (args[0] === 'sotd') {
        msg.channel.send(await sotdGen());
        //custom embed "Wealth"
      } else if (args[0] === 'wealth') {
        try {
          const dbdata = await getUser(args);
          if (!dbdata.vrpId && parseInt(args[1]) > 1000000) msg.channel.send('User not found');
          const { data } = await TT(`/status/wealth/${dbdata.vrpId ? dbdata.vrpId : args[1] }`);
          if (!data) return;
          if (data.code == '412') { msg.channel.send('User not online'); return;
          }
          let embed = new Discord.MessageEmbed();
          embed.setColor('#5B00C9');
          embed.setAuthor('TT-Api-Bot', 'https://github.com/fluidicon.png',
            'https://github.com/gtaivmostwanted/TT-Api-Bot');
          embed.setTitle(`**Wealth of** ${dbdata.userName}`);
          embed.setDescription(`**Wallet**: $${addCommas(data.wallet)}\n**Bank**: $${addCommas(data.bank)}`);
          embed.setFooter('( つ ◕_◕ )つ Tycoon', 'https://cdn.discordapp.com/avatars/826359426457534475/af4862c0f0dcb4daa3b163bbe805d08e.png');
          embed.setTimestamp();
          msg.channel.send(embed);
        } catch(err) {
          console.log(err);
          msg.channel.send(err);
        }
        //custom embed "Snowflake2User"
      } else if (args[0] === 'snowflake') {
        try {
          const { data } = await TT(`/status/snowflake2user/${args[1]}`);
          if (!data) return;
          if (data.code == '412') { msg.channel.send('User not online'); return;
          }
          let embed = new Discord.MessageEmbed();
          embed.setColor('#5B00C9');
          embed.setAuthor('TT-Api-Bot', 'https://github.com/fluidicon.png',
            'https://github.com/gtaivmostwanted/TT-Api-Bot');
          embed.setTitle(`**Snowflake For** ${data.user_id}`);
          embed.setDescription(`**Data Type**: ${(data.type)}\n**Discord ID**: ${(data.discord_id)}`);
          embed.setFooter('( つ ◕_◕ )つ Tycoon', 'https://cdn.discordapp.com/avatars/826359426457534475/af4862c0f0dcb4daa3b163bbe805d08e.png');
          embed.setTimestamp();
          msg.channel.send(embed);
        } catch(err) {
          console.log(err);
          msg.channel.send(err);
        }
      //custom embed "charges"
      } else if (args[0] === 'charges') {
        const { data } = await TT('/status/charges.json');
        let embed = new Discord.MessageEmbed();
        embed.setColor('#5B00C9');
        embed.setAuthor('TT-Api-Bot', 'https://github.com/fluidicon.png',
          'https://github.com/gtaivmostwanted/TT-Api-Bot');
        embed.setTitle('API Charges');
        embed.setDescription(`**Charges Remaining**: ${addCommas(data)}`);
        embed.setFooter('( つ ◕_◕ )つ Tycoon', 'https://cdn.discordapp.com/avatars/826359426457534475/af4862c0f0dcb4daa3b163bbe805d08e.png');
        embed.setTimestamp();
        msg.channel.send(embed);
      //Custom Whois Command using Elfshots DB
      } else if (args[0] === 'whois') {
      //async function userProfile(msg, inputTaken, userId, discordId, userName) {
        try{
          if (!args[1]) args[1] = msg.author.id;
          const data = await getUser(args);  
          const inputTaken = data.inputTaken;
          const userId = data.vrpId;
          const userName = data.userName;
          const lastFound = new Date(data.lastFound);
          console.log(lastFound);
          var discordId = data.discordId;
          var discordAv;

          if (discordId != 'Not found') {
            await bot.users.fetch(discordId).then(myUser => {
              discordAv = myUser.avatarURL({ format: 'png', dynamic: true, size: 128 });
            });
            discordId = `<@${discordId}>`;
          }

          var embed = new Discord.MessageEmbed();
          embed.setTitle(`Profile of "${inputTaken}"`);
          //embed.setDescription('Something here')
          embed.addField('Name:', userName, true);
          embed.addField('In-game ID:', userId, true);
          //embed.addField(' ‎',' ‎', false)
          embed.addField('Discord:', discordId, true);
          embed.addField('Last found:', lastFound.toUTCString(), false);
          if (discordAv) embed.setImage(discordAv);
          embed.setAuthor('TT-Api-Bot', 'https://github.com/fluidicon.png',
            'https://github.com/gtaivmostwanted/TT-Api-Bot');
          embed.setColor('RANDOM');
          embed.setTimestamp();
          embed.setFooter('( つ ◕_◕ )つ Tycoon', 'https://cdn.discordapp.com/avatars/826359426457534475/af4862c0f0dcb4daa3b163bbe805d08e.png');
          msg.channel.send(embed);
        } catch(e) {console.log(e); msg.channel.send('Error!');}
            
      
        //custom embed "Alive" 

      } else if (args[0] === 'alive') {
        if (!args[1] || Number.isNaN(parseInt(args[1]))) return msg.reply('Please enter a number from 1-10!');
        const srvId = parseInt(args[1]);
        try {
          const { data } = await TT(`${servers[srvId - 1]}/status/alive`);
          let embed = new Discord.MessageEmbed();
          embed.setColor('05f415');
          embed.setTitle('Status');
          embed.setAuthor('TT-Api-Bot', 'https://github.com/fluidicon.png',
            'https://github.com/gtaivmostwanted/TT-Api-Bot');
          embed.setDescription(`${addCommas(data.description)}`);
          embed.setFooter('( つ ◕_◕ )つ Tycoon', 'https://cdn.discordapp.com/avatars/826359426457534475/af4862c0f0dcb4daa3b163bbe805d08e.png');
          embed.setTimestamp();
          msg.channel.send(embed);
        } catch (e) {
          console.log(e);
          let embed = new Discord.MessageEmbed();
          embed.setColor('fb0303');
          embed.setAuthor('TT-Api-Bot', 'https://github.com/fluidicon.png',
            'https://github.com/gtaivmostwanted/TT-Api-Bot');
          embed.setTitle('Status');
          embed.setDescription(`${(e)}`);
          embed.setFooter('( つ ◕_◕ )つ Tycoon', 'https://cdn.discordapp.com/avatars/826359426457534475/af4862c0f0dcb4daa3b163bbe805d08e.png');
          embed.setTimestamp();
          msg.channel.send(embed);
        }  
          
        //custom embed "Forecast" 
      } else if (args[0] === 'forecast') {
        if (!args[1] || Number.isNaN(parseInt(args[1]))) return msg.reply('Please enter a number from 1-10!');
        const srvId = parseInt(args[1]);
        try {
          const { data } = await TT(`${servers[srvId - 1]}/status/forecast.json`);
          let embed = new Discord.MessageEmbed();
          embed.setColor('#5B00C9');
          embed.setTitle('Current Forecast');
          embed.setAuthor('TT-Api-Bot', 'https://github.com/fluidicon.png',
            'https://github.com/gtaivmostwanted/TT-Api-Bot');
          embed.setDescription(`Weather Forecast: ${addCommas(data)}`);
          embed.setTimestamp();
          embed.setFooter('( つ ◕_◕ )つ Tycoon', 'https://cdn.discordapp.com/avatars/826359426457534475/af4862c0f0dcb4daa3b163bbe805d08e.png');
          msg.channel.send(embed);
          console.log(data);
        } catch (e) {
          console.log(e);
          msg.reply('Uh oh, server seems unresponsive! ' + e);
        }
          
        //custom embed "Weather" 
      } else if (args[0] === 'weather') {
        if (!args[1] || Number.isNaN(parseInt(args[1]))) return msg.reply('Please enter a number from 1-10!');
        const srvId = parseInt(args[1]);
        try {
          const { data } = await TT(`${servers[srvId - 1]}/status/weather.json`);
          let embed = new Discord.MessageEmbed();
          embed.setColor('#5B00C9');
          embed.setTitle('**Current Weather**');
          embed.setAuthor('TT-Api-Bot', 'https://github.com/fluidicon.png',
            'https://github.com/gtaivmostwanted/TT-Api-Bot');
          embed.setDescription(`**${(data.weather)}**`);
          embed.setFooter('( つ ◕_◕ )つ Tycoon', 'https://cdn.discordapp.com/avatars/826359426457534475/af4862c0f0dcb4daa3b163bbe805d08e.png');
          embed.setTimestamp();
          msg.channel.send(embed);
          console.log(data);
        } catch (e) {
          console.log(e);
          msg.reply('Uh oh, server seems unresponsive! ' + e);
        }
        //custom embed "whereis"
      } else if (args[0] === 'whereis') {
        try {
          var playerObj = {};
          const dbdata = await getUser(args);
          if (!dbdata.vrpId && parseInt(args[1]) > 1000000) msg.channel.send('User not found');
          const { data: { players } } = await TT('/status/map/positions.json');
          if (!players) return;
          let found = false;
          for (let i = 0; i < players.length; i++) {
            let element = players[i];
            if (element[2] != (dbdata.vrpId ? dbdata.vrpId : args[1])) continue;
            else if (element[2] == (dbdata.vrpId ? dbdata.vrpId : args[1])) {
              playerObj = {
                name: element[0],
                xyz: element[3],
                vehicle: element[4]['vehicle_name'],
                job: element[5]['name'],
              };
              found = true;
              break;
            }
          }
          if (!found) { msg.channel.send('Player not found'); return; }
          let server = `S${servers.indexOf(serverSelection) + 1}`;

          let embed = new Discord.MessageEmbed();
          embed.setColor('#5B00C9');
          embed.setTitle(`**Location of ${playerObj.name} - ${server}**`);
          embed.setAuthor('TT-Api-Bot', 'https://github.com/fluidicon.png',
            'https://github.com/gtaivmostwanted/TT-Api-Bot');
          embed.addField('Position:', `${playerObj.xyz.x}, ${playerObj.xyz.y}`, true);
          embed.addField('Job:', `${playerObj.job}`, true);
          embed.addField('Vehicle:', `${playerObj.vehicle}`, true);
          embed.addField('Map:', `https://ttmap.eu/?x=${playerObj.xyz.x}&y=${playerObj.xyz.y}&hideicons`, true);
          embed.setTimestamp();
          msg.channel.send(embed);

        } catch (e) { console.log(e); }
          
      //custom embed "Commands"
      } else if (args[0] === 'commands') {
        try {
          const commandsembed = {
            color: 1400250,
            author: {
              name: 'Tycoon Stats',
              url: 'http://discord.gg/3p2pQSxZRW',
            },
            description: 'Available Commands',
            thumbnail: {
              url: 'https://cdn.discordapp.com/avatars/826359426457534475/af4862c0f0dcb4daa3b163bbe805d08e.png',
            },
            fields: [
              {
                name: 'Server [1~10]',
                value: 'Show users in the selected server',
                inline: false,
              },
              {
                name: 'Economy',
                value: 'Display the economy over the past few hours',
                inline: false,
              },
              {
                name: 'Charges',
                value: 'Show the remaining API charges of the bot',
                inline: false,
              },
              {
                name: 'Wealth [vRp id]',
                value: "Show the player's wealth while they are online",
                inline: false,
              },
              {
                name: 'Inventory [vRp id]',
                value: "Show the selected player's inventory",
                inline: false,
              },
              {
                name: 'Backpack [vRp id]',
                value: "Show the contents of the selected player's backpack",
                inline: false,
              },
              {
                name: 'Skills [vRp id]',
                value: "Show the selected player's skills",
                inline: false,
              },
              {
                name: 'SOTD',
                value: 'Show current Skill of The Day with bonus percentage',
                inline: false,
              },
              {
                name: 'Alive [1~10]',
                value: 'Shows if the selected server is online',
                inline: false,
              },
              {
                name: 'WhoIs [vRp id or Discord id]',
                value: "Show the selected player's information",
                inline: false,
              },
              {
                name: 'Weather [1~10]',
                value: 'Show the current weather on selected server',
                inline: false,
              },
              {
                name: 'Forecast [1~10]',
                value: 'Show the current forecast on selected server',
                inline: false,
              },
            ],
          };
          msg.channel.send({ embed: commandsembed });
        } catch (e) {
          console.log(e);
          msg.channel.send('...' + e);
        }
        // Generic .json response shit
      } else {
        const response = await TT('/status/' + `${args[0]}${args[1] ? `/${args[1]}` : ''}`);
        const data = response.data;
        if (typeof data === 'object' || Array.isArray(data)) {
          createAndSendTemp(msg, JSON.stringify(data, null, 2), (args[0].includes('.json') ? args[0] : `${args[0]}.json`));
        }
      }
    } catch (err) {
      // Handling errors by returning statement to the message channel
      msg.channel.send(processErrorCode(err.response.data.code));
      // Can instead use the following line if you would rather not customise return values and use the Axios/Request returned message
      //msg.channel.send(err.response.data.error);
      console.log(err);
    }
  } catch(err) {
    console.log(err);
    msg.channel.send('There was an error!');
  }
}
module.exports = {
  commands,
};