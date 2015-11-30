var MainCtrl = app.controller('MainCtrl', function($rootScope, $scope, $routeParams, $timeout, config, fireParse, angularFire){
	// window.addEventListener("online", function(e) {alert("online");})
	if(navigator.onLine){
		var userList = new Firebase("https://"+config.fbdb+".firebaseio.com/presence");
		angularFire(userList, $scope, 'users', []).then(function() {});
	}else{
		$scope.users=[];
	}
	$scope.$on('authComplete', function(event, message) {
		if(navigator.onLine){
			//Register me in the presence
			var me = angular.fromJson(angular.toJson($rootScope.user));
			delete me.sessionToken
			delete me.updatedAt
			var myRef = new Firebase("https://"+config.fbdb+".firebaseio.com/presence/"+me.objectId);
			myRef.on('value', function(snap){
				console.log('auth presence',snap.val())
				if (snap.val() == null) {
					myRef.onDisconnect().remove();
					myRef.set(me);
				}
			});
		}
	});
	$scope.$on('authError', function(event, message) {
		$timeout(function(){
			$rootScope.temp.user={
				color:'#22AA88'
			}
			fireParse.user.loginModal();
		}, 2000);
	});
	$rootScope.$on('$routeChangeSuccess', function(evt, cur, prev) {
		var view = cur.params.view;
		if(cur.params.gameId != undefined){
			view = 'game'
		}
		ga('send', 'pageview', {
			'page': '/'+view,
			'title': view
		});
	})

	$rootScope.temp={};
	$rootScope.theme  = function(theme){
		document.getElementById('themeCSS').href='/css/themes/'+theme+'.css';
	};
	$scope.tools = {
		url:function(){
			return 'views/'+$routeParams.view+'.html';
		},
		init:function(){
			fireParse.user.init();
		},
		user:fireParse.user,
		users:function(){
			var users = [];
			if($scope.users){
				for (var key in $scope.users) {
					users.push($scope.users[key])
				}
			}
			return users;
		}
	}
	if($rootScope.user==undefined)
		$scope.tools.init();
	it.MainCtrl=$scope;
});


var GameCtrl = app.controller('GameCtrl', function($rootScope, $scope, $routeParams, $timeout, $http, config, gameTools){
	// window.addEventListener("online", function(e) {alert("online");})
	// console.log('gcrp',$routeParams)
	var gameId = $routeParams.gameId;
	if(gameId)
		$rootScope.gameId = gameId;
		
	$rootScope.moment = moment

	/*
		Someday, we should make this such that when a user goes to create a game they are presented with multiple options in a modal or even full screen format 
		(wherein they choose what they would like to do.) ::Play by myself, play with family or friends, Resume old game (alone), Resume old game (w/ family & friends)
		Then we only 'setup' || 'setupOffline' once they choose.  (If they are playing by themself [whether connected or not] do not report actions to Firebase)
	*/
	if(navigator.onLine){
		if($rootScope.user){ //We will not init the user object from this view.. ...The user object is getting init - so if they hit this page first, maybe we will wait for that obj to load, then init the game view.
			if(gameId && gameId.length>0){
				setup(gameId);
			}else{
				window.location.hash = '/home';
			}
		}else{
			$scope.$on('authComplete', function(event, message) {
				if(gameId && gameId.length>0){
					setup(gameId);
				}else{
					window.location.hash = '/home';
				}
			});
		}
	}else{
		if(gameId && gameId.length>0){
			setupOffline(gameId);
		}else{
			window.location.hash = '/home';
		}
	}
	function setup(gameId){
		// console.log('Setup Game: ',gameId);
		if(Firebase==false){
			location.reload();
			return;
		}
		var corpRef = new Firebase("https://"+config.fbdb+".firebaseio.com/corps");
		var gameRef = new Firebase("https://"+config.fbdb+".firebaseio.com/game/"+$routeParams.gameId);
		var boardRef = new Firebase("https://"+config.fbdb+".firebaseio.com/game/"+$routeParams.gameId+'/board');
		var pendingRef = new Firebase("https://"+config.fbdb+".firebaseio.com/game/"+$routeParams.gameId+'/pending');
		var userGameRef = new Firebase("https://"+config.fbdb+".firebaseio.com/presence/"+$rootScope.user.objectId+'/game');

		userGameRef.set(gameId);
		
			$rootScope.templateCorps = {
  "categories" : [ {
    "title" : "University",
    "corporations" : [ {
      "cost" : 2,
      "font" : "#ffffff",
      "title" : "Brigham Young University",
      "symbol" : "BYU",
      "background" : "#1002bd"
    }, {
      "cost" : 3,
      "font" : "#808080",
      "title" : "Princeton",
      "symbol" : "P",
      "background" : "#ffb56a"
    }, {
      "cost" : 3,
      "font" : "#ffffff",
      "title" : "Harvard",
      "symbol" : "H",
      "background" : "#800000"
    }, {
      "cost" : 1,
      "font" : "#ffff00",
      "title" : "Western New Mexico University",
      "symbol" : "WNMU",
      "background" : "#871b9e"
    }, {
      "cost" : 1,
      "font" : "#ffffff",
      "title" : "Eastern Arizona College",
      "symbol" : "EAC",
      "background" : "#d755d3"
    }, {
      "cost" : 2,
      "font" : "#d3d3d3",
      "title" : "Brigham young University Idaho",
      "symbol" : "BYUI",
      "background" : "#4494e3"
    }, {
      "cost" : 2,
      "font" : "#0000a0",
      "title" : "W nivsertiy",
      "symbol" : "WTY",
      "background" : "#eefcfd"
    } ]
  }, {
    "title" : "Tech Company",
    "corporations" : [ {
      "cost" : 2,
      "font" : "#ffffff",
      "title" : "Facebook",
      "symbol" : "FB",
      "background" : "#000093"
    }, {
      "cost" : 3,
      "font" : "#ffff00",
      "title" : "Google",
      "symbol" : "GOOG",
      "background" : "#0000ff"
    }, {
      "cost" : 2,
      "font" : "#93d3f7",
      "title" : "Intel",
      "symbol" : "INTEL",
      "background" : "#ffffff"
    }, {
      "cost" : 2,
      "font" : "#484848",
      "title" : "Amazon",
      "symbol" : "AMZN",
      "background" : "#ffbf80"
    }, {
      "cost" : 1,
      "font" : "#ffffff",
      "title" : "Twitter",
      "symbol" : "TWT",
      "background" : "#59a0ee"
    }, {
      "cost" : 1,
      "font" : "#294efa",
      "title" : "Napster",
      "symbol" : "NSTR",
      "background" : "#18b43c"
    }, {
      "cost" : 3,
      "font" : "#dddddd",
      "title" : "Tesla",
      "symbol" : "TSLA",
      "background" : "#b31313"
    }, {
      "cost" : 4,
      "font" : "#a8e8fb",
      "title" : "Space X",
      "symbol" : "SPCX",
      "background" : "#400040"
    } ]
  } ]
}

		// corpRef.on('value', function(snap){
		// 	// console.log('corps updated.',snap.val());
		// 	if(!$scope.$$phase){
		// 		$scope.$apply(function(){
		// 			$rootScope.templateCorps = snap.val();
		// 		})
		// 	}else{
		// 		$rootScope.templateCorps = snap.val();
		// 	}
		// });


		//Load Game
		gameRef.once('value', function(snap) { 
			$rootScope.$apply(function(){
				// console.log('initial load')
				$rootScope.game = snap.val();
				gameTools.game.init();
			})
		});
		gameRef.on('value', function(snap) {
			var gameUpdate = snap.val();
			// console.log('Game updated from firebase.')
			if(gameUpdate.merger || ($rootScope.game && gameTools.player.me() && $rootScope.game.turn!=gameTools.player.me().i)){
				if(!$rootScope.$$phase){
					$rootScope.$apply(function(){
						$rootScope.game = gameUpdate;
						gameTools.corp.purchaseClear();
					})
				}else{
					$rootScope.game = gameUpdate;
					gameTools.corp.purchaseClear();
				}
			}else{
				console.log(gameUpdate);
			}
		});
		pendingRef.on('value', function(snap) {
			if($rootScope.game){
				// console.log('Pending player change.')
				$('#sidebar a:first').tab('show');
				$rootScope.$apply(function(){
					$rootScope.game.pending = snap.val();
				})
			}
		});
		boardRef.on('value', function(snap) {
			// console.log('Board updated from firebase.')
			if($rootScope.game){
				gameRef.once('value', function(snap) { 
					if(!$rootScope.$$phase){
						$rootScope.$apply(function(){
							$rootScope.game = snap.val();
							gameTools.corp.purchaseClear();
						})
					}else{
						$rootScope.game = snap.val();
						gameTools.corp.purchaseClear();
					}
				});
			}
		});



		$(window).on('hashchange', function() {
			userGameRef.set(null);
			gameRef.off('value');		//Change 
			$rootScope.game=null;		//Remove all past data
		});
		

		window.addEventListener('focus', function() {
			$scope.focus = true;
		});

		window.addEventListener('blur', function() {
			$scope.focus = false;
		});



		//Update firebase when certain important actions occure
		$scope.$on('saveGame', function(event, message) {
			gameRef.set(angular.fromJson(angular.toJson($rootScope.game)));
		});
		$scope.$on('leaveGame', function(event, message) {
			userGameRef.set(null);
		});


		// Update views when certain actions occure
		setupListeners();


		$scope.tools=gameTools;
		$scope.instructions = function(){
			$('#instructionsModal').modal('show');
		}

		$scope.me = function(){
			return gameTools.player.me();
		}
	}




	//-------------------------------------------------:::OFFLINE MODE:::------------------------------------------------------
	//-------------------------------------------------:::OFFLINE MODE:::------------------------------------------------------
	//-------------------------------------------------:::OFFLINE MODE:::------------------------------------------------------
	//-------------------------------------------------:::OFFLINE MODE:::------------------------------------------------------





	function setupOffline(gameId){
		// console.log('Setup Offline')
		if(localStorage.corps){
			$rootScope.templateCorps=angular.fromJson(localStorage.corps);
		}else{
			$http.get("corps.json").success(function(data){
				localStorage.corps=angular.toJson(data);
				$rootScope.templateCorps=data;
			});
		}
		$scope.tools=gameTools;
		setupListeners();

		$scope.$on('saveGame', function(event, message) {
			localStorage.game=angular.toJson($rootScope.game);
		});

		$scope.instructions = function(){
			$('#instructionsModal').modal('show');
		}
		$scope.me = function(){
			return gameTools.player.me();
		}
		if(localStorage.game){
			// console.log('Get From localstorage')
			$rootScope.game = angular.fromJson(localStorage.game);
			gameTools.game.init();
		}else{
			gameTools.game.init();
		}
	}







	function setupListeners(){
		// Update views when certain actions occure
		// ======================================GAME PLAYER CHANGES=============================================
		$rootScope.$watch('game.players', function (players) {
			// console.log('players changed',players,$rootScope.user.pending)
			if(players){
				if($rootScope.user.pending){
					// console.log('I am pending')
					for(var i=0; i<players.length; i++){
						if(players[i].objectId==$rootScope.user.objectId){
							$rootScope.user.pending=false;
							$('#pendingModal').modal('hide')
						}
					}
				}
				if(players.length!=$rootScope.playerCt){
					$rootScope.playerCt=players.length;
					gameTools.player.myIndex = -1;
					gameTools.player.me();
				}
			}
		}, true);

		// ======================================GAME MERGER ACTIONS=============================================
		var trigger = false;
		$rootScope.$watch('game.merger', function (merger){
			if(gameTools.player.me()){
				if(merger!=null){
					trigger = true;
					$scope.tools.merge.mergeTradeSellModal();
				}else{
					$scope.tools.merge.hideMergeTradeSellModal();
					if($rootScope.game.turn==gameTools.player.me().i){
						gameTools.player.notify(gameTools.player.me());
					}
					if(trigger && gameTools.player.isHost(gameTools.player.me())){//If I am the host
						trigger = false;

						var currentPlayer = gameTools.player.get($rootScope.game.turn);
						if(currentPlayer.isComputer){
							console.log('trading is done... time to buy stock.')
							$timeout(function(){
								console.log('>>>>>>>>>>>END Merger>>>>>>>>>>>>>>>>>>');
								// console.log('Game: ',JSON.stringify($rootScope.game))
								gameTools.ai.chooseBuyStock($rootScope.game.turn);
							}, 500);
						}
					}
				}
			}
		});

		// ======================================GAME MERGER ACTIONS=============================================
		$rootScope.$watch('game.merger.turn', function (turn){
			// console.log('game.merger.turn',turn)
			if(gameTools.player.me()){
				if(turn==gameTools.player.me().i){
					gameTools.player.notify(gameTools.player.me());
				}
				if(gameTools.player.isHost(gameTools.player.me())){//If I am the host
					if(turn!=undefined && turn !=null){
						if(gameTools.player.get(turn).isComputer){
							console.log('Autos turn to trade or sell.')
							$timeout(function(){
								gameTools.ai.chooseTradeSell(gameTools.player.get(turn));
							}, 500);
						}
					}else{
						console.log('Turn is not defined anymore...')
					}
				}
			}
		});

		// ======================================GAME TURN ACTIONS=============================================
		$rootScope.$watch('game.turn', function (turn){
			console.log('Turn Change!',turn)
			if(gameTools.player.me()){
				if(gameTools.player.get(turn)==gameTools.player.me()){
					gameTools.player.notify(gameTools.player.me());
					$rootScope.temp.startOfTurn = moment();
					$rootScope.temp.clock = setInterval(function(){
						$rootScope.temp.timer = Math.round(moment().diff($rootScope.temp.startOfTurn) / 1000)
						$rootScope.$apply();
					}, 1000)
				}
				if(gameTools.player.isHost(gameTools.player.me())){//If I am the host
					if(gameTools.player.get(turn).isComputer){
						console.log('>>>>>>>>>>>>>>>>>>>>..Begin auto turn.')
						$timeout(function(){
							gameTools.ai.turn(gameTools.player.get(turn));
						}, 500);
					}
				}
			}else{
				console.log('something was not defined')
			}
		});
		$rootScope.$watch('game.final', function (end){
			if(end){
				$rootScope.messageCt=0;
				$('#settleEndModal').modal('show');
			}
		});
		// $rootScope.$watch('game.messages', function (messages){
		// 	if(messages && $rootScope.game){
		// 		if($rootScope.messageCt>messages.length){
		// 			$rootScope.messageCt = $rootScope.messageCt
		// 		}
		// 		for(var i=$rootScope.messageCt; i<messages.length; i++){
		// 			var lastMessage = messages[i];
		// 			notify(lastMessage.status,lastMessage.message,30)
		// 			$rootScope.messageCt++;
		// 		}
		// 	}
		// });
		// if($rootScope.messageCt==undefined){
		// 	$rootScope.messageCt=0;
		// 	$rootScope.playerCt=0;
		// }
	}

	it.GameCtrl=$scope;
});


var CorpCtrl = app.controller('CorpCtrl', function($rootScope, $scope, $routeParams, config, angularFire){
	var url = new Firebase("https://"+config.fbdb+".firebaseio.com/corps");
	angularFire(url, $rootScope, 'corporate', []).then(function() {
		if($rootScope.corporate==null)
			$rootScope.corporate={
				categories:[]
			};
		//maybe do something...
	});

	$scope.tools = {
		category:{
			add:function(){
				if($rootScope.corporate.categories==undefined)
					$rootScope.corporate.categories=[];
				var category = {
					title:$rootScope.temp.category,
					corporations:[]
				}
				$rootScope.corporate.categories.push(category);
				$rootScope.temp.category='';
			},
			delete:function(catIndex){
				$rootScope.corporate.categories.splice(catIndex, 1);
			},
			edit:function(catIndex){
				$rootScope.corporate.categories[catIndex].inEdit =! $rootScope.corporate.categories[catIndex].inEdit;
			},
			focus:function(catIndex){
				$scope.currentCat = $rootScope.corporate.categories[catIndex];
			}
		},
		corp:{
			getIndex:function(corp){
				return $scope.currentCat.corporations.indexOf(corp);
			},
			add:function(){
				if($scope.currentCat.corporations==undefined)
					$scope.currentCat.corporations=[];
				var tcc = $scope.currentCat.corporations;
				tcc.push({});
				$rootScope.temp.corp = tcc[tcc.length-1];
				$('#addCorpModal').modal('show');
			},
			edit:function(corp){
				var corpIndex = this.getIndex(corp);
				$rootScope.temp.corp = $scope.currentCat.corporations[corpIndex];
				$('#addCorpModal').modal('show');
			},
			delete:function(corp){
				var corpIndex = this.getIndex(corp);
				$scope.currentCat.corporations.splice(corpIndex, 1);
			},
			save:function(){
				$('#addCorpModal').modal('hide');
			}
		}
	};

	it.CorpCtrl=$scope;
});