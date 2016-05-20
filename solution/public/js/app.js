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
