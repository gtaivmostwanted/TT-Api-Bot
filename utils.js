const tmp = require('tmp');
const { join } = require('path');
const fs = require('fs');
const Discord = require('discord.js');
const axios = require('axios');

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
  var activeServer = null;
  for (const server of servers){
    try {
      const { data:{ players } } = await axios.get(`${server}/status/widget/players.json`);
      if (!players) return activeServer;
      if (userId) {
        for (const player of players) {
          if (player[2] == userId) {
            activeServer = server;
            break;
          };
        };
      }
      else { activeServer = server; break; };
    } catch(e) { continue };
    if (activeServer) break;
  }
  return activeServer
}

module.exports = {
  createAndSendTemp,
  useTemplate,
  msToTime,
  addCommas,
  processErrorCode,
  getServer,
};