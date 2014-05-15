angular.module('tradity').
	controller('RankingXPCtrl', function($scope, socket) {
		socket.emit('get-ranking', {
			since: 0,
			schoolid: $scope.schoolid,
			_cache: 30
		},
		function(data) {
			if (data.code == 'get-ranking-success') {
				$scope.results = rankify(data.result, function(r) { return r.xp; }, function(r) { return r.xp != null; });
			}
		});
	});