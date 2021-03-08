var express = require('express');
var app = express();
var path = require('path');
var open = require('open');

app.use(express.static('public'));
app.get('/', function(req, res) {
    res.sendFile(path.join(__dirname + '/index.html'));
});
const launchApp = async () => {
    console.log('opening', process.argv)
    await open(`http://localhost:8080?deviceName=${process.argv[2] || ''}`,  {
        app: {
            name: open.apps.chrome
        }
    });
};

app.listen(8080, launchApp);