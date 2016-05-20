var express = require('express');
var router = express.Router();
var twit = require('twit');
var mysql = require('mysql');

var twitterClient = new twit({
    consumer_key: '8hoGnVhZ2ZNckjqBrgkmmLn7l',
    consumer_secret: 'H5IYUyUvTie4F2lqYwKwpwXYa272Dn5ODbxRDagdEEKlDiu92X',
    access_token: '95486057-b1XbCHo8lZtxxB13hmi6bSif7h1iLPV2bMmuqfWCk',
    access_token_secret: 'Loc3WXMGn52TKcGcEhtPX1J4JQLcBbCf5MtaaHjZQ0Co4'
});
var connection = mysql.createConnection({
    host: '10.0.0.21',
    user: 'com3504',
    password: 'password',
    database: 'com3504'
});
connection.connect();

//POST /socialsearch
router.post('/', function(req, res) {
    var query = req.body;

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

    //Check if this query is in the cache
    connection.query('SELECT query, since_id FROM queries WHERE query=?', [twitterQuery.toLowerCase()], function(err, rows, fields) {
        if (err) throw err;

        if(rows.length === 1) {
            //Existing query results
            var since_id = rows[0].since_id;

            //Get all the cached tweets for this query
            connection.query('SELECT tweet FROM query_tweets WHERE query=?', [twitterQuery.toLowerCase()], function(err, rows, fields) {
                var dbTweets = [];

                for (var i = 0; i < rows.length; i++) {
                    row = rows[i];

                    dbTweets.push(JSON.parse(row.tweet));
                }

                //Search twitter for tweets after this point
                twitterSearch(dbTweets, since_id);
            });
        } else {
            //Query has never been made before, nothing in the cache
            //Add the query into the cache of queries
            connection.query("INSERT INTO queries (query, since_id) VALUES ('" + twitterQuery.toLowerCase() + "',  '0');", function(err, rows, fields) {
                //Search twitter for this query
                twitterSearch([]);
            });
        }
    });

    //Search twitter for the given query
    function twitterSearch(tweets, since_id) {
        //Dont do the twitter search if database only
        if(query.databaseOnly) {
            //Parse and send tweets to user
            parseTweets(tweets);
        } else {
            var searchQuery;
            if(since_id === undefined) {
                //Search all tweets with this query
                searchQuery = { q: twitterQuery, count: 100 };
            } else {
                //Search for tweets after a given id
                searchQuery = { q: twitterQuery, count: 100, since_id: since_id }
            }

            //Search twitter
            twitterClient.get('search/tweets', searchQuery, function(err, data, response) {
                //Update the since_id in the database
                connection.query("UPDATE queries SET since_id=? WHERE query=?;", [data.search_metadata.max_id_str, twitterQuery.toLowerCase()]);

                for (var i_tweet = 0; i_tweet < data.statuses.length; i_tweet++) {
                    tweet = data.statuses[i_tweet];

                    //Push tweet into the list of tweets
                    tweets.push(tweet);

                    //Add the tweet to the cache
                    connection.query("INSERT INTO query_tweets (query, tweet) VALUES (?, ?);", [twitterQuery.toLowerCase(), JSON.stringify(tweet)]);
                }

                //Parse and send tweets to user
                parseTweets(tweets);
            });
        }
    }

    //Parse tweets - frequency, locations, and send to user
    function parseTweets(tweets) {
        var responseData = {};
        responseData.tweets = tweets;
        responseData.frequency = {
            words: [],
            people: []
        };

        //Extract frequency of words and people
        frequencyWordList = {};
        frequencyPeopleList = {};
        for (var i_tweet = 0; i_tweet < tweets.length; i_tweet++) {
            var tweet = tweets[i_tweet];

            //count number of tweets this user has had in the data set
            if(frequencyPeopleList[tweet.user.id_str] === undefined) {
                frequencyPeopleList[tweet.user.id_str] = {
                    user: tweet.user,
                    count: 0,
                    words: {}
                };
            }
            frequencyPeopleList[tweet.user.id_str].count += 1;

            //split the tweet text to get an array of words
            textSplit = tweet.text.split(' ');

            //iterate through all the words to count them
            for (var i_word = 0; i_word < textSplit.length; i_word++) {
                //make it lowercase so different cases are seen as the same
                word = textSplit[i_word].toLowerCase();

                //ignore the retweet text
                if(!(word === 'rt')) {
                    //if the word hasnt been seen before add it to the dictionary
                    if(frequencyWordList[word] === undefined) {
                        frequencyWordList[word] = 0;
                    }
                    //if the word hasnt been seen for this suer before add it to the dictionary
                    if(frequencyPeopleList[tweet.user.id_str].words[word] === undefined) {
                        frequencyPeopleList[tweet.user.id_str].words[word] = 0;
                    }

                    frequencyWordList[word] += 1;
                    frequencyPeopleList[tweet.user.id_str].words[word] += 1;
                }
            }
        }

        //Format and order the word frequency
        for (var word in frequencyWordList) {
            responseData.frequency.words.push({
                word: word,
                count: frequencyWordList[word]
            });
        }
        responseData.frequency.words.sort(function(a, b){
            return b.count - a.count;
        });
        responseData.frequency.words = responseData.frequency.words.slice(0, 20);

        //Format and order the user frequency
        for (var userID in frequencyPeopleList) {
            var userWordList = [];
            //Format the order the user's word frequency
            for (var word in frequencyPeopleList[userID].words) {
                userWordList.push({
                    word: word,
                    count: frequencyPeopleList[userID].words[word]
                });
            }
            userWordList.sort(function(a, b){
                return b.count - a.count;
            });
            userWordList = userWordList.slice(0, 10);

            //Add the user object
            responseData.frequency.people.push({
                user: frequencyPeopleList[userID].user,
                count: frequencyPeopleList[userID].count,
                words: userWordList
            });
        }
        responseData.frequency.people.sort(function(a, b){
            return b.count - a.count;
        });
        responseData.frequency.people = responseData.frequency.people.slice(0, 10);

        res.end(JSON.stringify(responseData));
    }
});

module.exports = router;
