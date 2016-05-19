var app = angular.module('footballApp', [
    'ngRoute',
    'footballControllers'
]);

app.config(['$routeProvider', function($routeProvider) {
    $routeProvider.
    when('/social_search', {
        templateUrl: 'partials/social_search_form.html',
        controller: 'SocialSearchFormController'
    }).
    when('/team_search', {
        templateUrl: 'partials/team_search_form.html',
        controller: 'TeamSearchFormController'
    }).
    otherwise({
        redirectTo: '/social_search'
    });
}]);

var appControllers = angular.module('footballControllers', []);

appControllers.controller('TeamSearchFormController', ['$scope', '$http', function ($scope, $http) {
    //default test query
    $scope.query = {
        date: '12/05/2016',
        team1: 'Manchester United',
        team2: 'Arsenal'
    };

    //search results tab button press changes content
    $('#search-tabs a').click(function (e) {
        e.preventDefault()
        $(this).tab('show')
    });

    //perform the search
    $scope.search = function() {
        //post the search query to the server
        $http({
            method: 'POST',
            data: $scope.query,
            url: '/gamesearch'
        }).then(function successCallback(response) {
            //update the search results with the data from the server
            $scope.results = response.data;
            console.log($scope.results);
        }, function errorCallback(response) {
            alert("Whoops, looks like there was an error performing the request");
            console.log(response);
        });
    }
}]);

appControllers.controller('SocialSearchFormController', ['$scope', '$http', function ($scope, $http) {
    function loadTweetMap() {
        console.log("load tweet map");
        //Create map object
        var map = new google.maps.Map(document.getElementById('tweet-map'), {
            center: {lat: 53.3810469, lng: -1.4800108},
            zoom: 2
        });

        //iterate through all tweets
        for (var i = 0; i < $scope.results.tweets.length; i++) {
            var tweet = $scope.results.tweets[i];

            //if the tweet has a coordinate location attached
            if(tweet.coordinates && tweet.coordinates.coordinates) {
                //Info window containing the tweet text
                tweetPosition = {lat: tweet.coordinates.coordinates[0], lng: tweet.coordinates.coordinates[1]}
                infoWindow = new google.maps.InfoWindow({
                    content: '<div class="media-left"><a href="#"><img class="media-object" src="' + tweet.user.profile_image_url + '"></a></div>' +
                             '<div class="media-body"><h4 class="media-heading">' +
                             tweet.user.name +' <small>@' + tweet.user.screen_name + ' ' + tweet.created_at + '</small></h4>' +
                             tweet.text + '</div>'
                });

                //Add a marker on the map for this tweet at it's location
                marker = new google.maps.Marker({
                    position: tweetPosition,
                    map: map,
                    title: '@' + tweet.user.screen_name + ': ' + tweet.text
                });

                //Open the tweet info window when the marker has been clicked
                marker.addListener('click', function() {
                    infoWindow.open(map, marker);
                });
            }
        }
    }

    //search results tab button press changes content
    $('#search-tabs a').click(function (e) {
        e.preventDefault()
        $(this).tab('show')
    });
    //load the tweet map if the locations tab has been selected
    $('#search-tabs a').on('shown.bs.tab', function (e) {
        if($(e.target).context.hash === '#locations') {
            loadTweetMap();
        }
    })

    //default test query
    $scope.query = {
        type: 'OR',
        databaseOnly: false,
        terms: [
            {
                "type": "AUTHOR",
                "value": "ManUtd"
            },
            {
                "type": "MENTION",
                "value": "WayneRooney"
            },
            {
                "type": "TAG",
                "value": "ManUtdVArsenal"
            }
        ]
    };

    //delete a given search term
    $scope.deleteTerm = function(index) {
        $scope.query.terms.splice(index, 1);
    }

    //add a new search term
    $scope.addTerm = function() {
        $scope.query.terms.push({
            "type": "AUTHOR"
        });
    }

    //perform the search
    $scope.search = function() {
        //post the search query to the server
        $http({
            method: 'POST',
            data: $scope.query,
            url: '/performsearch'
        }).then(function successCallback(response) {
            //update the search results with the data from the server
            $scope.results = response.data;
            console.log($scope.results);
        }, function errorCallback(response) {
            alert("Whoops, looks like there was an error performing the request");
            console.log(response);
        });
    }
}]);
