var app = angular.module('footballApp', [
    'ngRoute',
    'footballControllers'
]);

app.config(['$routeProvider', function($routeProvider) {
    $routeProvider.
    when('/search', {
        templateUrl: 'partials/search_form.html',
        controller: 'SearchFormController'
    }).
    otherwise({
        redirectTo: '/search'
    });
}]);

var appControllers = angular.module('footballControllers', []);

appControllers.controller('SearchFormController', ['$scope', '$http', function ($scope, $http) {
    $('#search-tabs a').click(function (e) {
        e.preventDefault()
        $(this).tab('show')
    })

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

    $scope.deleteTerm = function(index) {
        $scope.query.terms.splice(index, 1);
    }

    $scope.addTerm = function() {
        $scope.query.terms.push({
            "type": "AUTHOR"
        });
    }

    $scope.search = function() {
        $http({
            method: 'POST',
            data: $scope.query,
            url: '/performsearch'
        }).then(function successCallback(response) {
            $scope.results = response.data;
            console.log($scope.results);
        }, function errorCallback(response) {
            alert("Whoops, looks like there was an error performing the request");
            console.log(response);
        });
    }
}]);
