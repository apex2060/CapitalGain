var it = {};

var app = angular.module('CapitalTech', ['firebase'])
.config(function($routeProvider,$httpProvider) {
	$routeProvider
	.when('/:view', {
		templateUrl: 'views/main.html'
	})
	.when('/game/:gameId', {
		templateUrl: 'views/game.html',
	})
	.when('/game/:gameId/:view', {
		templateUrl: 'views/all.html',
	})
	.otherwise({
		redirectTo: '/home'
	});
});

angular.element(document).ready(function() {
	angular.bootstrap(document, ['CapitalTech']);
});