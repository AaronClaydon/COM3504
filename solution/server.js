var express = require('express');
var path = require('path');
var bodyParser = require('body-parser');

//Load the team and social route handlers
var team_search = require('./team_search');
var social_search = require('./social_search');

var app = express();

//Load POST request parser
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));

//Serve static files from public directory
app.use(express.static('public'));

//Send the interface file as the root route
app.get('/', function (req, res) {
    res.sendFile('queryInterface.html', { root: path.join(__dirname, '/public') });
});

//Set the path for the route handlers
app.use('/teamsearch', team_search);
app.use('/socialsearch', social_search);

//Start the web server
app.listen(4000, function () {
    console.log('Example app listening on port 4000!');
});
