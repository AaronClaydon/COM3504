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
            url: '/teamsearch'
        }).then(function successCallback(response) {
            //update the search results with the data from the server
            $scope.results = response.data;
            console.log($scope.results);
        }, function errorCallback(response) {
            alert("Whoops, looks like there was an error performing the request");
            console.log(response);
        });
    }

    $scope.playermore = function(id) {
        $http({
            method: 'POST',
            data: {player: id},
            url: '/teamsearch/player'
        }).then(function successCallback(response) {
            //update the search results with the data from the server
            $scope.player_results = response.data;
            $('#player_details_modal').modal('show');
            console.log($scope.player_results);
        }, function errorCallback(response) {
            alert("Whoops, looks like there was an error performing the request");
            console.log(response);
        });
    }
}]);
