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

}]);

MyApp.controller('ExcelController', ['$scope', 'xlsx', 'zaf', function($scope, xlsx, zaf) {
	$scope.tickets = [];
	$scope.numOfTickets = $scope.tickets.length;
	$scope.read = function(workbook) {
		//initialize tickets, so that it will contain none during the start.
		$scope.tickets = [];

		var user_ticket_rows = to_json(workbook).Sheet1;
		user_ticket_rows.forEach(function(current_user_row) {
			var user_promise = zaf.searchUser(current_user_row.Email);
			var create_promise = user_promise.then(function(data) {
				var user = data.users[0];

				if (user === undefined) {
					return zaf.createUser(current_user_row.Email);
				}

				$scope.$apply(function() {
					$scope.tickets.push({
						requester_id: user.id,
						subject: current_user_row.Subject,
						comment: {body: current_user_row.Body},
						_meta: current_user_row
					});
				});

				return user_promise;

			});
			console.log(current_user_row);
			create_promise.then(function(data) {
				if (data.count > 0) {
					return;
				}
				var user = data.user;
				console.log("ini user baru", user);

				$scope.$apply(function() {
					$scope.tickets.push({
						requester_id: user.id,
						subject: current_user_row.Subject,
						comment: {body: current_user_row.Body},
						_meta: current_user_row
					});
				});

			});
		});
		console.log($scope.tickets);


	};

	$scope.createTickets = function(){
		if ($scope.tickets.length < 1) return false;

		zaf.createTickets($scope.tickets).then(function(data) {
			console.log(data, $scope.tickets, " are created");
			$scope.tickets = [];
		}, function(err) {

		});
	};

	$scope.createTicketsBulk = function() {
		if ($scope.tickets.length < 1) return false;

		$scope.tickets.forEach(function(ticket) {
			console.log(ticket);
			zaf.createTicket(ticket).then(function(data) {

				console.log(data);
			}, function(err) {
				console.log(err);
			});
		});

	};



	$scope.error = function(err) {

	};

	$scope.check = function() {
		console.log("OK Check");
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