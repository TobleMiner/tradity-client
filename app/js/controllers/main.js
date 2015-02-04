angular.module('tradity').
	controller('MainCtrl', function($sce, chat, ranking, $user, $rootScope, $scope, $location, $state, $stateParams, socket, safestorage, dailyLoginAchievements, $http, $interval, $timeout, API_HOST, API_CONNECT_TEST_PATH, DEFAULT_PROFILE_IMG) {
		$scope.Math = Math;
		$scope.vtime = function(t) { return vagueTime.get({to: t, units: 's', lang: 'de'}); };

		$scope.isAdmin = false;
		$rootScope.ownUser = $scope.ownUser = $user;
		$scope.loading = false;
		$scope.serverConfig = {};
		$scope.hasOpenQueries = socket.hasOpenQueries.bind(socket);
		$scope.version = null;
		
		$scope.connectionLastRx = 0;
		$scope.connectionCheck = function() {
			var alive = function() {
				if ($state.includes('error')) {
					socket.reconnect();
					$state.go('game.feed');
				}
			};
			var dead = function() {
				$state.go('error.connection');
			};
			
			var curRx = socket.rxPackets();
			if (curRx > $scope.connectionLastRx) {
				$scope.connectionLastRx = curRx;
				return alive(); // everything okay
			}
			
			$scope.connectionLastRx = curRx;
			socket.emit('ping', {
				_expect_no_response: true
			}, alive);
			
			$timeout(function() {
				if (socket.rxPackets() > $scope.connectionLastRx)
					return;
				
				var connectTest = $http.get(API_HOST + API_CONNECT_TEST_PATH);
				connectTest.success(alive);
				connectTest.error(dead);
			}, 3000);
		};
		
		$timeout($scope.connectionCheck, 3141);
		var connectionCheck = $interval($scope.connectionCheck, 20000);
		
		$scope.$on('destroy', function() {
			$interval.cancel(connectionCheck);
		});

		$scope.showSearch = function() {
			$scope.search = true;
		}

		$scope.openSearch = function(query) {
			$state.go('game.search', {
				query: query
			});
		}

		$rootScope.$on('$stateChangeSuccess', function(event, toState, toParams) { 
			if (toParams.query) {
				$scope.searchBarText = toParams.query;
				$scope.search = true;
			}
			else {
				$scope.search = false;
				$scope.searchBarText = '';
			}
		})

		$scope.$on('makeadmin', function() {
			$scope.isAdmin = true;
			socket.emit('set-debug-mode', { debugMode: true, __only_in_srv_dev_mode__: true });
		});

		$scope.$on('user-update', function() {
			if (!$scope.ownUser) {
				safestorage.clear();
				
				$scope.isAdmin = false;
				return;
			}
			
			safestorage.check().then(function() {
				dailyLoginAchievements.check();
			});

			if ($scope.isAdmin)
				return;

			if ($scope.ownUser.access.indexOf('*') != -1)
				$scope.$emit('makeadmin');

			if (!$scope.ownUser.profilepic)
				$scope.ownUser.profilepic = DEFAULT_PROFILE_IMG;
		});

		$scope.isActive = function(route) {
			return route === $location.path();
		};

		$scope.logout = function() {
			$scope.eventIDs = {};
			$scope.messages = [];
			
			socket.emit('logout', function(data) {
				safestorage.clear();
				
				$scope.ownUser = null;
				$scope.isAdmin = false;
				$scope.$broadcast('user-update', null);
				$state.go('index.login');
			});
		};

		socket.on('*', function(data) {
			if (data.code == 'not-logged-in' && !/^fetch-events/.test(data['is-reply-to'])) {
				$scope.ownUser = null;
				if ($state.includes('game'))
					$state.go('index.login');
			}
		}, $scope);


		socket.on('server-config', function(data) {
			var cfg = data.config;
			for (var k in cfg)
				$scope.serverConfig[k] = cfg[k];
			
			if (data.versionInfo)
				$scope.version = data.versionInfo;
			
			if (socket.protocolVersion() < $scope.version.minimum)
				notification('Deine Tradity-Clientversion wird leider nicht mehr unterstützt!');
			
			$scope.ownUserRanking = ranking.getRanking(null, $scope.serverConfig.ranking || {}, null, null, true);
			$scope.ownUserRanking.onRankingUpdated(function() {
				if ($scope.ownUser)
					$scope.ownUser.rank = $scope.ownUserRanking.get('all').rankForUser($scope.ownUser.uid);
			});
			
			$scope.$on('user-update', function() {
				if ($scope.ownUser)
					$scope.ownUserRanking.fetch();
			});
		});
		
		socket.on('internal-server-error', function() {
			alert('Es gab leider einen Fehler – das Tech-Team von Tradity wurde informiert!');
		});
	});
