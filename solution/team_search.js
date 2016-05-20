var express = require('express');
var router = express.Router();
var SparqlClient = require('sparql-client');
var sparql_endpoint = 'http://dbpedia.org/sparql';

//Search for details of a given team name
function team_search(name, callback) {
    //SPARQL query for searching for a team
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
    var client = new SparqlClient(sparql_endpoint);

    //Execute SPARQL query
    client.query(query)
    .execute(function(error, results) {
        //Get first returned result
        var bind_vals = results.results.bindings[0];

        //Extract returned data and format it nicely
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

        //Move onto next stage where we search for player details
        players_search(team_data.link, function(players) {
            //Add player details to the team data
            team_data.players = players;

            //Call the completed callback with the team and player details
            callback(team_data);
        });
    });
}

//Search for player details for a team URI
function players_search(team, callback) {
    //SPARQL query for searching for all players in a team
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
    var client = new SparqlClient(sparql_endpoint);

    //Execute the query
    client.query(query)
    .execute(function(error, results) {
        var bind_vals = results.results.bindings;
        var players_data = [];

        //Iterate through all returned players
        for (var i = 0; i < bind_vals.length; i++) {
            var player_raw = bind_vals[i];

            //Format the returned player data nicely
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

        //Call the search complete callback with the players array
        callback(players_data);
    });
}

//Extract all details about a given player using their URI
function player_data(name, callback) {
    //SPARQL query for extracting all data from a given player URI
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
    var client = new SparqlClient(sparql_endpoint);

    //Execute the query
    client.query(query)
    .bind('player', '<' + name + '>') //bind the player URI to the ?player variable
    .execute(function(error, results) {
        //get the one and only result
        var player_raw = results.results.bindings[0];

        //Extract and format the player data
        var player = {
            link: name,
            image: player_raw.image.value,
            name: player_raw.name.value,
            dob: player_raw.dob.value,
            abstract: player_raw.abstract.value,
            position: player_raw.position_name.value.replace("(association football)", "").trim(),
            number: player_raw.number.value
        };

        //Call the player details complete callback with the player data
        callback(player);
    });
}

//Search for the career history for a given player URI
function career_history(name, callback) {
    //SPARQL query for searching for the career history for a given player URI
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
    var client = new SparqlClient(sparql_endpoint);

    //Execute the query
    client.query(query)
    .bind('player', '<' + name + '>') //bind the player URI to the ?player variable
    .execute(function(error, results) {
        var bind_vals = results.results.bindings;
        var career_data = [];

        //Iterate through all the career histories
        for (var i = 0; i < bind_vals.length; i++) {
            var career_raw = bind_vals[i];
            //Create a career object with only the URI
            var career = {
                link: career_raw.career.value,
            };

            //Optional values

            //Add team data to the career history
            if(career_raw.team !== undefined) {
                career.team = career_raw.team.value;
                career.team_name = career_raw.team_name.value;
            }
            //Add number of matches to the career history
            if(career_raw.matches !== undefined) {
                career.matches = career_raw.matches.value;
            }
            //Add number of goals to the career history
            if(career_raw.goals !== undefined) {
                career.goals = career_raw.goals.value;
            }
            //Add years to the career history
            if(career_raw.years !== undefined) {
                career.years = career_raw.years.value;
            }

            //Add to the array of career history
            career_data.push(career);
        }

        //Call the career history search complete callback with the array of careers
        callback(career_data);
    });
}

//POST /teamsearch
router.post('/', function(req, res) {
    var query = req.body;

    //Perform a search on the first team
    team_search(query.team1, function(team1_results) {
        //Perform a search on the second team
        team_search(query.team2, function(team2_results) {
            //Merge the results
            var final_response = {team1: team1_results, team2: team2_results};

            //Send the search results as JSON to the user
            res.end(JSON.stringify(final_response));
        });
    });
});

//POST /teamsearch/player
router.post('/player', function(req, res) {
    var query = req.body;

    //Get all the data about the given player
    player_data(query.player, function(player) {
        //Search for the given players career history
        career_history(query.player, function(career) {
            //Append career data to the player
            player.career = career;

            //Send the search results as JSON to the user
            res.end(JSON.stringify(player));
        });
    });
});

module.exports = router;
