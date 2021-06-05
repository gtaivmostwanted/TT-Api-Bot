const tmp = require('tmp');
const { join } = require('path');
const fs = require('fs');
const Discord = require('discord.js');
const axios = require('axios');

const itemsInfo = JSON.parse((fs.readFileSync(join(__dirname.split('\\src')[0], '\\itemsInfo.json')).toString()));

const servers = [
  'http://server.tycoon.community:30169',
  'http://server.tycoon.community:30122',
  'http://server.tycoon.community:30123',
  'http://server.tycoon.community:30124',
  'http://server.tycoon.community:30125',
  'http://na.tycoon.community:30120',
  'http://na.tycoon.community:30122',
  'http://na.tycoon.community:30123',
  'http://na.tycoon.community:30124',
  'http://na.tycoon.community:30125',
]

function createAndSendTemp(msg, data, fileName) {
  tmp.file((err, path, fd, cleanupCallback) => {
    if (err) throw new Error(err);
    fs.writeFileSync(path, data);
    msg.channel.send(new Discord.MessageAttachment(path, fileName)).then(() => {
      cleanupCallback();
    });
  });
}

function useTemplate(template) {
  return fs.readFileSync(join(__dirname, 'templates', `${template}.hbs`)).toString();
}

function msToTime(s) {
  const ms = s % 1000;
  s = (s - ms) / 1000;
  var secs = s % 60;
  s = (s - secs) / 60;
  const mins = s % 60;
  const hrs = (s - mins) / 60;

  return hrs + ':' + mins + ':' + secs + '.' + ms;
}

function addCommas(x) {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function processErrorCode(code) {
  switch (code) {
    case '423':
      return "This account's data is locked from public view.";
    case '400':
      return 'Invalid request check input and try again.';
    case '402':
      return 'No API charges remaining.';
    case '403':
      return 'Request has been forbidden! (Broken key?)';
    case '404':
      return 'Invalid Api Route.';
    case '412':
      return 'invalid vRP ID entered';
    default:
      return 'No handler request found for code: '+code;
  }
}

async function getServer(userId = null) {
  try {
    if (parseInt(userId) > 1000000) {
      let obj = await getUser(['', userId]);
      if (!obj) return;
      var userId = obj.vrpId;
    }
    var activeServer = null;
    for (const server of servers){
      try {
        const { data:{ players } } = await axios.get(`${server}/status/widget/players.json`);
        if (!players) continue;
        if (userId) {
          for (const player of players) {
            if (player[2] == userId) {
              activeServer = server;
              break;
            }
          }
        }
        else { activeServer = server; break; }
      } catch(e) { continue; }
      if (activeServer) break;
    }
    return activeServer;
  } catch(e) { console.log(e); }
}

async function sotdGen() {
  try {
    const { data } = await axios.get(`${await getServer()}/status/skillrotation.json`, {
      headers: { 'X-Tycoon-Key': process.env.TYCOONTOKEN }, timeout: 5000 });
    let embed = new Discord.MessageEmbed();
    embed.setColor('#5B00C9');
    embed.setTitle('Skill of the Day -');
    embed.setDescription(`**Skill**: ${data.skill}\n**Bonus**: ${data.bonus}%`);
    embed.setTimestamp();
    return embed;
  } catch(err) {
    console.log(err);
    return err;
  }
}

async function getUser(args) {
  try {
    args[1] = args[1].replace(/[^0-9]/g, '');
    
    if (typeof(parseInt(args[1])) != 'number' || isNaN(parseInt(args[1]))) return;
    const BASE_URL = process.env.USERLINK;
    if (!BASE_URL) console.log('This command will not function on self-hosted instances of this bot.');

    var { data: { data } } = await axios.get(BASE_URL + (parseInt(args[1]) < 1000000 ? `vrpid=${args[1]}` : `discordid=${args[1]}` ));
    if (data.error) { console.log(data.error); return; }
    
    if (data.discordId == null) data.discordId = 'Not found';
    data.inputTaken = args[1];

  } catch(err) {
    console.log(err);
  }
  return data;
}

function itemIdToName(itemId) {
  let returnItem = itemsInfo[itemId] ? [itemsInfo[itemId].name, itemsInfo[itemId].weight] : null;
  return returnItem;
}

module.exports = {
  createAndSendTemp,
  useTemplate,
  msToTime,
  addCommas,
  processErrorCode,
  getServer,
  sotdGen,
  getUser,
  itemIdToName,
};