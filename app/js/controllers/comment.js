'use strict';

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

angular.module('tradity').
	controller('CommentCtrl', function($scope, socket) {
		$scope.editComment = function(comment) {
			socket.emit('change-comment-text', {
				commentid: comment.commentid,
				comment: prompt('Neuer Kommentartext: (Leerlassen zum Beibehalten)') || comment.comment,
				trustedhtml: false
			}, function() { alert('Ok!'); });
		};

		$scope.deleteComment = function(comment) {
			socket.emit('change-comment-text', {
				commentid: comment.commentid,
				comment: '<em>Dieser Kommentar wurde durch die Moderatoren gelöscht.</em>',
				trustedhtml: true
			}, function() { alert('Ok!'); });
		};
		
		$scope.sendComment = function() {
			var eventid = false;
			
			var curScope = $scope;
			
			while (!eventid && curScope) {
				if      (curScope.trade)  eventid = curScope.trade.eventid;
				else if (curScope.user)   eventid = curScope.user.registerevent;
				else if (curScope.school) eventid = curScope.school.eventid;
				
				curScope = curScope.$parent;
			}
			
			if (!eventid)
				return alert('Konnte kein Kommentarevent finden!');

			socket.emit('comment', {
				eventid: eventid,
				comment: $scope.comment,
				ishtml: $scope.ishtml
			}, function(data) {
				if (data.code == 'comment-notfound') {
					alert('Kommentarevent nicht gefunden.\nHier läuft etwas falsch.');
				} else if (data.code == 'comment-success') {
					var time = new Date();
					$scope.comments.unshift({
						comment: $scope.comment,
						trustedhtml: $scope.ishtml,
						username: $scope.ownUser.name,
						profilepic: $scope.ownUser.profilepic,
						time: time.getTime() / 1000 - 1
					});
					$scope.comment = '';
				} else if (data.code == 'format-error') {
					console.log($scope);
					alert('Sorry, etwas ging hier schief.');
				}
			});
		};
	});
