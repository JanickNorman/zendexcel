var MyApp = angular.module('MyApp', ['angular-js-xlsx']);

MyApp.factory('zafClient', function() {
		return window.ZAFClient.init();
	})
	.factory('xlsx', function() {
		return window.XLSX;
	});

MyApp.service('zaf',['zafClient', function(zafClient) {

	// this.testPromise = function() {
	// 	$.when(zafClient.request({
	// 		url: '/api/v2/users/search.json?query='+"jamichael@parle.com",
	// 	 	type: 'GET',
	// 	 	dataType: 'json'
	// 	}).then(function(b) {
	// 		console.log("kena");
	// 	}), zafClient.request({
	// 		url: '/api/v2/users/search.json?query='+"yanicknorman@gmail.com",
	// 	 	type: 'GET',
	// 	 	dataType: 'json'
	// 	}).then(function(a) {
	// 		console.log('ini juga kena');
	// 	})).done(function() {
	// 		console.log("semua udah dapet ya");
	// 	});

	// };
	this.searchUser = function(email, callback) {
		return zafClient.request({
			url: '/api/v2/users/search.json?query='+email,
			type: 'GET',
			dataType: 'json'
		});
	};

	this.createUser = function(email, callback, err) {
		return zafClient.request({
			url: '/api/v2/users.json?async=true',
			secure: true,
			type: 'POST',
			contentType: 'application/json',
			data: JSON.stringify(
						{
						  "user": {
						    "email": email,
						    "name": email.substring(0, email.indexOf("@")),
						    "verified": true
						  }
						}
					)
		});

	};

	this.createTickets = function(tickets) {
		return zafClient.request({
			  url: '/api/v2/tickets/create_many.json',
			  secure: true,
			  type: 'POST',
			  contentType: 'application/json',
			  data: JSON.stringify({
				  "tickets": tickets
				})
		});

	};

}]);

MyApp.controller('ExcelController', ['$scope', 'xlsx', 'zaf', function($scope, xlsx, zaf) {
	// zaf.createUser({email: "dad@don.com"},function(data) {
	// 	if (data.responseJSON.error == "RecordInvalid") {
	// 		return;
	// 	}
	// 	console.log(data);
	// }, function(err) {
	// 	console.log(err);
	// });

	//zaf.testPromise();
	$scope.tickets = [];
	$scope.numOfTickets = 0;
	$scope.read = function(workbook) {
		var user_ticket_rows = to_json(workbook).Sheet1;


		user_ticket_rows.forEach(function(current_user_row) {
			var user_promise = zaf.searchUser(current_user_row.Email);
			var create_promise = user_promise.then(function(data) {
				var user = data.users[0];

				if (user === undefined) {
					return zaf.createUser(current_user_row.Email);
				}

				$scope.tickets.push({
					requester_id: user.id,
					subject: current_user_row.Subject,
					comment: {body: current_user_row.Body}
				});
				$scope.numOfTickets++;
				return user_promise;

			});
			console.log(current_user_row);
			create_promise.then(function(data) {
				if (data.count > 0) {
					return;
				}
				var user = data.user;
				console.log("ini user baru", user);
				$scope.tickets.push({
					requester_id: user.id,
					subject: current_user_row.Subject,
					comment: {body: current_user_row.Body}
				});
				$scope.numOfTickets++;
			});
		});


		console.log(tickets);
		console.log("ticketnya ada ", tickets.length);

	};

	$scope.createTickets = function(){
		zaf.createTickets($scope.tickets);
		console.log($scope.tickets, " are created");
		$scope.tickets = [];
	};

	$scope.error = function(err) {

	};

	// TO JSON utils sementara
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