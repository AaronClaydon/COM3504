var express = require('express');
var path = require('path');
var bodyParser = require('body-parser');

var team_search = require('./team_search');
var social_search = require('./social_search');

var app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(express.static('public'));

app.get('/', function (req, res) {
    res.sendFile('queryInterface.html', { root: path.join(__dirname, '/public') });
});

app.use('/teamsearch', team_search);
app.use('/socialsearch', social_search);

app.listen(4000, function () {
    console.log('Example app listening on port 4000!');
});
