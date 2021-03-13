var express = require('express');
var app = express();
var path = require('path');
var open = require('open');
const io = require('socket.io-client');
const fs = require('fs');
const sharedPath = "./shared/";
const deviceName = process.argv[2];

const manager = new io.Manager("https://gr6.algonics.net", { secure: true, reconnection: true, rejectUnauthorized: false });
const devicesSocket = manager.socket('/fileDevices');
devicesSocket.connect();
devicesSocket.emit('addToConnectedDevices', { deviceName });

const fileSocket = manager.socket(`/files`);
fileSocket.connect();

let pingSignalInterval = null;
let fileStream = null;

devicesSocket.on('sessionInit', (data) => {
  console.log('fileSessionInit', data);
  fileSocket.emit('connectToSession', { sessionId: data.sessionId });
  fs.readdir(sharedPath, (err, fileNames) => {
    pingSignalInterval = setInterval(() => {
      const files = fileNames.map((fileName)=> {
        const stats = fs.statSync(`${sharedPath}${fileName}`);
        return { fileName, size: stats.size };
      });
      fileSocket.emit("sendData", {
          sessionId: data.sessionId,
          type: 'fileList', 
          data: files,
          sender: 'device',
      }); 
    }, 1000);
  });


  fileSocket.on("listenData", (channelData) => {
    if (channelData.type === 'getFile') {
      if (fileStream) fileStream.close();
      fileStream = fs.createReadStream(`${sharedPath}${channelData.data.fileName}`);
      fileStream.on('data', (chunk) => {
        fileSocket.emit('sendData', {
          sessionId: channelData.sessionId,
          type: 'chunk',
          data: chunk,
          sender: 'device',
        });
      });
      fileStream.on('end', function(err) {
        fileSocket.emit('sendData', {
          sessionId: channelData.sessionId,
          type: 'fileEnd',
          sender: 'device',
          data: { fileName: channelData.data.fileName },
        });
      });
    }

    if (channelData.type === 'fileListReceived') {
      clearInterval(pingSignalInterval);
    }

    if (channelData.type === 'endFile') {
      fileStream.close();
    }
  });

});

app.use(express.static('public'));
app.get('/', function(req, res) {
    res.sendFile(path.join(__dirname + '/index.html'));
});
const launchApp = async () => {
    console.log('opening', deviceName)
    await open(`http://localhost:8080?deviceName=${ deviceName || ''}`,  {
        app: {
            name: open.apps.chrome
        }
    });
};

app.listen(8080, launchApp);