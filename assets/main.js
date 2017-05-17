var MyApp = angular.module('MyApp', ['angular-js-xlsx']);

//need to be refactored ASAP
MyApp.directive("dropzone", function() {
	return {
		restrict : "A",
		link: function (scope, element, attrs) {
			function handleDrop(evt) {
		                	evt.stopPropagation();
		                	evt.preventDefault();

		                	var files = evt.dataTransfer.files;
				for (var i = 0, f = files[i]; i != files.length; ++i) {
					var reader = new FileReader();
					var name = f.name;

					reader.onload = function (e) {
						if (!e) {
							var data = reader.content;
						} else {
							var data = e.target.result;
						}

						/* if binary string, read with type 'binary' */
						try {
							var workbook = XLS.read(data, { type: 'binary' });
							workbook.namefile = name;
 							if (attrs.onread) {
								var handleRead = scope[attrs.onread];
								if (typeof handleRead === "function") {
									handleRead(workbook);
								}
							}
						} catch (e) {
							if (attrs.onerror) {
								var handleError = scope[attrs.onerror];
								if (typeof handleError === "function") {
									handleError(e);
								}
							}
						}

					 	 // Clear input file
					  	element.val('');
					};

					//extend FileReader
					if (!FileReader.prototype.readAsBinaryString) {
						FileReader.prototype.readAsBinaryString = function (fileData) {
							var binary = "";
							var pt = this;
							var reader = new FileReader();
							reader.onload = function (e) {
								var bytes = new Uint8Array(reader.result);
								var length = bytes.byteLength;
								for (var i = 0; i < length; i++) {
									binary += String.fromCharCode(bytes[i]);
								}
								//pt.result  - readonly so assign binary
								pt.content = binary;
								$(pt).trigger('onload');
							};
						reader.readAsArrayBuffer(fileData);
						}
					}

					reader.readAsBinaryString(f);

				}
			}
			element.bind('drop', handleDrop);
		}
	};
});
MyApp.directive('dmuploader', function() {
	return {
		link: function(scope, element, attrs) {
		      	$("#"+attrs.id).dmUploader({
			        onInit: function(){
			        		console.log('kena init');
			        },
			        onBeforeUpload: function(id){
			        },
			        onNewFile: function(id, file){
					console.log('newFile', id, file, scope);
				},
			        onComplete: function(){
					console.log('completed');        },
			        onUploadProgress: function(id, percent){
					console.log('in progress', id, percent);
				},
			        onUploadSuccess: function(id, data){
					console.log('upload success', id, data);
			        },
			        onUploadError: function(id, message){
					console.log('upload error', id, message);
				},
			        onFileTypeError: function(file){
					console.log('file type error', file);
				},
			        onFileSizeError: function(file){
					console.log('file size error', file);
				},
			        /*onFileExtError: function(file){
			          $.danidemo.addLog('#demo-debug', 'error', 'File \'' + file.name + '\' has a Not Allowed Extension');
			        },*/
			        onFallbackMode: function(message){
					console.log('fallback mode', message);
				}
		      });
		}
	};
});

MyApp.factory('zafClient', function() {
		return window.ZAFClient.init();
	})
	.factory('xlsx', function() {
		return window.XLSX;
	});

MyApp.service('zaf',['zafClient', function(zafClient) {
	this.searchUser = function(email) {
		return zafClient.request({
			url: '/api/v2/users/search.json?query='+email,
			type: 'GET',
			dataType: 'json'
		});
	};

	this.createUser = function(email, name, role) {
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

	this.createTicket = function(ticket) {
		return zafClient.request({
			  url: '/api/v2/tickets.json',
			  secure: true,
			  type: 'POST',
			  contentType: 'application/json',
			  data: JSON.stringify({
				  "ticket": ticket
				})
		});
	};


	this.createUsers = function(users) {
		var role = "E";
		var name = "none";

		if (!name) name = email.substring(0, email.indexOf("@"));

		return zafClient.request({
			url: '/api/v2/users.json?async=true',
			secure: true,
			type: 'POST',
			contentType: 'application/json',
			data: JSON.stringify(
						{
						  "user": {
							 "email": email,
							 "name": name,
							 "role": role,
							 "verified": true
						  }
						}
					)
		});
	}

}]);

MyApp.controller('ExcelController', ['$scope', 'xlsx', 'zaf', function($scope, xlsx, zaf) {
	$scope.tickets = [];

	$scope.rows_meta = {
		numOfNonmember: 0
	};

	$scope.views = {
		namefile: "Drag and drop an excel file here",
		shouldCreateUser: {
			notify: "You should create the remaining users first",
			active: false
		},
		noTicketsToCreate: {
			notify: "There are no tickets to be created, please insert a new one",
			active: false
		},
		successCreateUser: {
			notify: "Success creating new users",
			active: false
		},
		successCreateTickets: {
			notify: "Success creating new tickets",
			active: false
		},
		createTicketsError: {
			notify: "Error creating ticket",
			active: false
		},
		createUsersError: {
			notify: "Error creating users",
			active: false
		},
		searchUsersError: {
			notify: "Error searching users",
			active: false
		},
		invalidRow: {
			notify: "Invalid row: Di Kolom pertama harus ada Email, Subject, dan Body (semua dengan awalan kapital) dan semua barisnya dibawah kolom tersebut haruslah diisi ",
			active: false
		},
		noUsersToCreate: {
			notify: "No users to be created",
			active: false
		}
	};
	$scope.init = function() {
			$scope.views.noTicketsToCreate.active = false;
			$scope.views.shouldCreateUser.active = false;
			$scope.views.successCreateUser.active = false;
			$scope.views.successCreateTickets.active = false;
			$scope.views.createTicketsError.active = false;
			$scope.views.createUsersError.active = false;
			$scope.views.searchUsersError.active = false;
			$scope.views.invalidRow.active = false;
			$scope.views.noUsersToCreate.active = false;



			$scope.rows_meta.numOfNonmember = 0;
			$scope.tickets = [];

			$scope.$apply();
	};

	$scope.read = function(workbook) {
		$scope.init();

		//bug, user ngga lolos validate, tapi tetep kecreate

		// $scope.tickets = [];
		$scope.views.namefile = workbook.namefile;
		$scope.user_ticket_rows = to_json(workbook).Sheet1;
		$scope.user_ticket_rows.forEach(function(row) {
			if (!$scope.validateRow(row)) {
				$scope.views.invalidRow.active = true;
				$scope.$apply();
				return false;
			}

			var userRequest = zaf.searchUser(row.Email);
			userRequest.then(function(data) {
				var user = data.users[0];

				if (user === undefined) {
					row.__exist__ = false;
					$scope.rows_meta.numOfNonmember++;

					$scope.$apply();
					return;
				}

				row.Id = user.id;
				row.__exist__ = true;
				$scope.tickets.push({
					requester_id: row.Id,
					subject: row.Subject,
					comment: {body: row.Body}
				});
				$scope.$apply();
			}, function(err) {
				$scope.views.searchUsersError.notify = err.responseText + ", please refresh";
				$scope.views.searchUsersError.active = true;
				$scope.$apply();
			});
		});

		$scope.$apply();
		console.log($scope.user_ticket_rows);
	};

	$scope.createManyUsers = function() {
		if ($scope.rows_meta.numOfNonmember < 1) {
			$scope.views.noUsersToCreate.active = true;
			return false;
		}

		$scope.user_ticket_rows.forEach(function(row) {
			if (!$scope.validateRow(row)) {
				return false;
			}

			if (!row.__exist__) {
				var userCreateRequest = zaf.createUser(row.Email);
				userCreateRequest.then(function(data) {
					var user = data.user;
					row.Id = user.id;
					row.__exist__ = true;
					$scope.rows_meta.numOfNonmember--;
					$scope.tickets.push({
						requester_id: row.Id,
						subject: row.Subject,
						comment: {body: row.Body}
					});

					if ($scope.rows_meta.numOfNonmember < 1) {
						$scope.views.successCreateUser.active = true;
						$scope.views.shouldCreateUser.active = false;
					}

					$scope.$apply();
				}, function(err) {
					$scope.views.createUsersError.notify = err.responseText + ", please refresh";
					$scope.views.createUsersError.active = true;
					$scope.$apply();

					console.log("kena ",err);
				});

			}
		});
	};

	$scope.createTickets = function() {

		if ($scope.tickets.length < 1) {
			$scope.views.noTicketsToCreate.active = true;
			return false;
		}
		if ($scope.rows_meta.numOfNonmember > 0)  {
			$scope.views.shouldCreateUser.active = true;

			console.log("should create users first");
			return false;
		}

		console.log('create tickets');
		// var tickets = [];
		// $scope.user_ticket_rows.forEach(function(row) {
		// 	if (row.__exist__) {
		// 		tickets.push({
		// 			requester_id: row.Id,
		// 			subject: row.Subject,
		// 			comment: {body: row.Body}
		// 		});
		// 	}
		// });

		var createTicketsRequest = zaf.createTickets($scope.tickets);
		createTicketsRequest.then(function(data) {
			console.log(data, "has been created");

			$scope.rows_meta.numOfNonmember = 0;
			$scope.tickets = [];
			$scope.user_ticket_rows = [];

			$scope.views.successCreateTickets.active = true; 
			$scope.views.successCreateTickets.active = "Success creating tickets from " + $scope.views.namefile;
			$scope.views.namefile = "Drag and drop an excel file here";
			$scope.$apply(); 
		}, function(err) {
			$scope.views.createTicketsError.notify = err.responseText + "<strong>, please refresh</strong>";
			$scope.views.createTicketsError.active = true;
			$scope.$apply();

			console.log("kena ",err);
		});

	};

	$scope.error = function(err) {

	};

	 $scope.validateRow = function(row) {
		if (row === undefined) return false;
		if (!row.hasOwnProperty('Email')) return false;
		if (!row.hasOwnProperty('Subject')) return false;
		if (!row.hasOwnProperty('Body')) return false;
		return true;
	};

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