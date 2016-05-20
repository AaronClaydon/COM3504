var express = require('express');
var router = express.Router();
var SparqlClient = require('sparql-client');

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

router.post('/player', function(req, res) {
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

router.post('/', function(req, res) {
    var query = req.body;

    team_search(query.team1, function(team1_results) {
        team_search(query.team2, function(team2_results) {
            var final_response = {team1: team1_results, team2: team2_results};

            res.end(JSON.stringify(final_response));
        });
    });
});

module.exports = router;
