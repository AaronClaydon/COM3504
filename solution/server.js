var express = require('express');
var path = require('path');
var bodyParser = require('body-parser');
var twit = require('twit');
var twitterClient = new twit({
    consumer_key: '8hoGnVhZ2ZNckjqBrgkmmLn7l',
    consumer_secret: 'H5IYUyUvTie4F2lqYwKwpwXYa272Dn5ODbxRDagdEEKlDiu92X',
    access_token: '95486057-b1XbCHo8lZtxxB13hmi6bSif7h1iLPV2bMmuqfWCk',
    access_token_secret: 'Loc3WXMGn52TKcGcEhtPX1J4JQLcBbCf5MtaaHjZQ0Co4'
});
var app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(express.static('public'));

app.get('/', function (req, res) {
    res.sendFile('queryInterface.html', { root: path.join(__dirname, '/public') });
});

app.post('/performsearch', function(req, res) {
    var query = req.body;
    var responseData = {};

    //Build the twitter query
    var twitterQuery = "";
    for (var i = 0; i < query.terms.length; i++) {
        term = query.terms[i];

        if(term.type === 'AUTHOR') {
            twitterQuery += 'from:' + term.value;
        } else if(term.type === 'MENTION') {
            twitterQuery += '@' + term.value;
        } else if(term.type === 'TAG') {
            twitterQuery += '#' + term.value;
        } else {
            twitterQuery += term.value;
        }

        //Spacing between terms
        if(query.type === 'OR') {
            //Only add the OR statement at the end if this isn't the last term
            //Prevents a hanging OR
            if(i !== (query.terms.length - 1)) {
                twitterQuery += ' OR ';
            }
        } else {
            //Blank space between terms is an AND
            twitterQuery += ' ';
        }
    }

    twitterClient.get('search/tweets', { q: twitterQuery, count: 100 }, function(err, data, response) {
        responseData.tweets = data.statuses;

        res.end(JSON.stringify(responseData));
    });
});

app.listen(4000, function () {
    console.log('Example app listening on port 4000!');
});
