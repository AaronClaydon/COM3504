appControllers.controller('TeamSearchFormController', ['$scope', '$http', function ($scope, $http) {
    //default test query
    $scope.query = {
        date: new Date(Date.now()),
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
            url: '/teamsearch'
        }).then(function successCallback(response) {
            //update the search results with the data from the server
            $scope.results = response.data;
        }, function errorCallback(response) {
            alert("Whoops, looks like there was an error performing the request");
            console.log(response);
        });
    }

    //Load more details about a player
    $scope.playermore = function(id) {
        //make a POST request to the server with the player URI
        $http({
            method: 'POST',
            data: {player: id},
            url: '/teamsearch/player'
        }).then(function successCallback(response) {
            //update the player search results with the data from the server
            $scope.player_results = response.data;

            //open the player details modal
            $('#player_details_modal').modal('show');
        }, function errorCallback(response) {
            alert("Whoops, looks like there was an error performing the request");
            console.log(response);
        });
    }
}]);
