angular.module('MyApp', ['angular-js-xlsx'])
	.factory('zafClient', function() {
		return window.ZAFClient.init();
	})
	.factory('xlsx', function() {
		return window.XLSX;
	})
	.service('zaf',['zafClient', function(zafClient) {
		this.searchUser = function(email, callback) {
			zafClient.request({
				url: '/api/v2/users/search.json?query='+email,
				type: 'GET',
				dataType: 'json'
			}).then(callback);
		};

		this.createUser = function(user, callback, err) {
			zafClient.request({
				url: '/api/v2/users.json?async=true',
				secure: true,
				type: 'POST',
				contentType: 'application/json',
				data: JSON.stringify(
							{
							  "user": {
							    "email": user.email,
							    "name": user.email.substring(0, user.email.indexOf("@")),
							    "verified": true
							  }
							}
						)
			}).then(callback, err);
		};
	}])
	.controller('ExcelController', ['$scope', 'xlsx', 'zaf', function($scope, xlsx, zaf) {
		$scope.tickets = [];
		zaf.createUser({email: "anton@don.com"},function(data) {
			console.log(data);
		}, function(err) {
			console.log(err);
		});

		$scope.read = function(workbook) {
			var user_ticket_rows = to_json(workbook).Sheet1;

			user_ticket_rows.forEach(function(current_user_row) {
				zaf.searchUser(current_user_row.Email, function(data) {
					var user = data.users[0];

			    		//if user doesn't exist
					if (user === undefined) {
						//createe the user first
			    			return;
			    		}

					$scope.tickets.push({
						requester_id: user.id,
						subject: current_user_row.Subject,
						comment: {body: current_user_row.Body}
					});

				});

			});


			console.log($scope.tickets);
		};

		$scope.error = function(err) {

		};

		// TO JSON utils
		function to_json(workbook) {
			var result = {};
			workbook.SheetNames.forEach(function(sheetName) {
				var roa = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
				if(roa.length > 0){
					result[sheetName] = roa;
				}
			});
			return result;
		}

	}]);