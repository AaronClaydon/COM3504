var express = require('express');
var path = require('path');
var bodyParser = require('body-parser');
var twit = require('twit');
var mysql      = require('mysql');
var SparqlClient = require('sparql-client');
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
var app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(express.static('public'));

app.get('/', function (req, res) {
    res.sendFile('queryInterface.html', { root: path.join(__dirname, '/public') });
});

//SPARQL SEARCHES
function team_search(name, callback) {
    var query = "PREFIX dbp: <http://dbpedia.org/property/>" +
                "PREFIX dbo: <http://dbpedia.org/ontology/>" +
                "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
                "SELECT * WHERE { {" +
                    "?club a <http://www.wikidata.org/entity/Q476028>." +
                    "?club dbp:clubname '" + name + "'@en." +
                    "?club dbp:clubname ?name." +
                    "OPTIONAL {" +
                    "?club rdfs:comment ?comment." +
                    //"?club dbo:thumbnail ?image." +
                    "?club dbp:manager ?manager." +
                    "?manager rdfs:label ?manager_name." +
                    "?manager rdfs:comment ?manager_description." +
                    "?manager dbo:thumbnail ?manager_image." +
                    "?club dbo:ground ?stadium." +
                    "?stadium rdfs:label ?stadium_name." +
                    "?stadium rdfs:comment ?stadium_description." +
                    "?stadium dbo:thumbnail ?stadium_image." +
                    "FILTER(langMatches(lang(?comment), 'EN'))." +
                    "FILTER(langMatches(lang(?manager_name), 'EN'))" +
                    "FILTER(langMatches(lang(?manager_description), 'EN')) " +
                    "FILTER(langMatches(lang(?stadium_name), 'EN'))" +
                    "FILTER(langMatches(lang(?stadium_description), 'EN'))" +
                "}}}";
    var client = new SparqlClient('http://dbpedia.org/sparql');

    client.query(query)
    .execute(function(error, results) {
        var bind_vals = results.results.bindings[0];
        var team_data = {
            link: bind_vals.club.value,
            name: bind_vals.name.value,
            description: bind_vals.comment.value,
            manager: {
                link: bind_vals.manager.value,
                name: bind_vals.manager_name.value,
                description: bind_vals.manager_description.value,
                image: bind_vals.manager_image.value
            },
            stadium: {
                link: bind_vals.stadium.value,
                name: bind_vals.stadium_name.value,
                description: bind_vals.stadium_description.value,
                image: bind_vals.stadium_image.value
            }
        };

        players_search(team_data.link, function(players) {
            team_data.players = players;
            callback(team_data);
        });
    });
}

function players_search(team, callback) {
    var query = "PREFIX dbp: <http://dbpedia.org/property/>" +
                "PREFIX dbo: <http://dbpedia.org/ontology/>" +
                "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
                "SELECT ?player (SAMPLE(?name) AS ?name) (SAMPLE(?image) AS ?image) (SAMPLE(?dob) AS ?dob) (SAMPLE(?position_name) AS ?position) (SAMPLE(?number) AS ?number) WHERE { {" +
                    "<" + team + "> dbp:name ?player." +
                    "?player a dbo:SoccerPlayer." +
                        "?player foaf:name ?name." +
                        "?player dbo:thumbnail ?image." +
                        "?player dbo:birthDate ?dob." +
                        "?player dbo:position ?position." +
                        "?position rdfs:label ?position_name." +
                        "?player dbp:clubnumber ?number." +
                        "FILTER(langMatches(lang(?name), 'EN'))." +
                        "FILTER(langMatches(lang(?position_name), 'EN'))." +
                "}} GROUP BY ?player";
    var client = new SparqlClient('http://dbpedia.org/sparql');

    client.query(query)
    .execute(function(error, results) {
        var bind_vals = results.results.bindings;
        var players_data = [];

        for (var i = 0; i < bind_vals.length; i++) {
            var player_raw = bind_vals[i];
            var player = {
                link: player_raw.player.value,
                image: player_raw.image.value,
                name: player_raw.name.value,
                dob: player_raw.dob.value,
                position: player_raw.position.value.replace("(association football)", "").trim(),
                number: player_raw.number.value
            };

            players_data.push(player);
        }
        callback(players_data);
    });
}

app.post('/playersearch', function(req, res) {
    var query = req.body;

    function player_data(name, callback) {
        var query = "PREFIX dbp: <http://dbpedia.org/property/>" +
                    "PREFIX dbo: <http://dbpedia.org/ontology/>" +
                    "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
                    "SELECT * WHERE { {" +
                        "?player foaf:name ?name." +
                        "?player dbo:thumbnail ?image." +
                        "?player dbo:birthDate ?dob." +
                        "?player dbo:position ?position." +
                        "?position rdfs:label ?position_name." +
                        "?player dbp:clubnumber ?number." +
                        "?player dbo:abstract ?abstract." +
                        "FILTER(langMatches(lang(?abstract), 'EN'))." +
                        "FILTER(langMatches(lang(?name), 'EN'))." +
                        "FILTER(langMatches(lang(?position_name), 'EN'))." +
                    "}} LIMIT 1";
        var client = new SparqlClient('http://dbpedia.org/sparql');

        client.query(query)
        .bind('player', '<' + name + '>')
        .execute(function(error, results) {
            var player_raw = results.results.bindings[0];
            var player = {
                link: name,
                image: player_raw.image.value,
                name: player_raw.name.value,
                dob: player_raw.dob.value,
                abstract: player_raw.abstract.value,
                position: player_raw.position_name.value.replace("(association football)", "").trim(),
                number: player_raw.number.value
            };

            callback(player);
        });
    }

    function career_history(name, callback) {
        var query = "PREFIX dbp: <http://dbpedia.org/property/>" +
                    "PREFIX dbo: <http://dbpedia.org/ontology/>" +
                    "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
                    "SELECT * WHERE { {" +
                        "?player dbo:careerStation ?career." +
                        "OPTIONAL { ?career dbo:team ?team. ?team rdfs:label ?team_name. FILTER(langMatches(lang(?team_name), 'EN')). }." +
                        "OPTIONAL { ?career dbo:numberOfMatches ?matches.}." +
                        "OPTIONAL { ?career dbo:numberOfGoals ?goals.}." +
                        "OPTIONAL { ?career dbo:years ?years.}." +
                    "}} ORDER BY DESC(?years)";
        var client = new SparqlClient('http://dbpedia.org/sparql');

        client.query(query)
        .bind('player', '<' + name + '>')
        .execute(function(error, results) {
            var bind_vals = results.results.bindings;
            var career_data = [];

            for (var i = 0; i < bind_vals.length; i++) {
                var career_raw = bind_vals[i];
                var career = {
                    link: career_raw.career.value,
                };
                if(career_raw.team !== undefined) {
                    career.team = career_raw.team.value;
                    career.team_name = career_raw.team_name.value;
                }
                if(career_raw.matches !== undefined) {
                    career.matches = career_raw.matches.value;
                }
                if(career_raw.goals !== undefined) {
                    career.goals = career_raw.goals.value;
                }
                if(career_raw.years !== undefined) {
                    career.years = career_raw.years.value;
                }

                career_data.push(career);
            }
            callback(career_data);
        });
    }

    player_data(query.player, function(player) {
        career_history(query.player, function(career) {
            player.career = career;
            res.end(JSON.stringify(player));
        });
    });
});

app.post('/gamesearch', function(req, res) {
    var query = req.body;

    team_search(query.team1, function(team1_results) {
        team_search(query.team2, function(team2_results) {
            var final_response = {team1: team1_results, team2: team2_results};

            res.end(JSON.stringify(final_response));
        });
    });
});

app.post('/performsearch', function(req, res) {
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

app.listen(4000, function () {
    console.log('Example app listening on port 4000!');
});
