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
				debug('auth presence',snap.val())
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
				color: chance.color()
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


var GameCtrl = app.controller('GameCtrl', function($rootScope, $scope, $routeParams, $timeout, $http, $q, config, gameTools){
	var gameId = $rootScope.gameId = $routeParams.gameId;
	var fbRef = {}
	var g = $q.defer();
	$rootScope.me 		= gameTools.player.me;
	$rootScope.moment 	= moment;
	$rootScope.notify 	= function(status, message, showTime){
		notify(status, message, showTime);
		if(message==undefined){
			message = status;
			status = undefined;
		}
		if(gameTools.player.me() && gameTools.player.me().vocalize){
			var voices = speechSynthesis.getVoices();
			var msg = new SpeechSynthesisUtterance();
				msg.voice = voices[1];
				msg.text = message;
		    window.speechSynthesis.speak(msg);
		}
	}
	$scope.tools 		= angular.extend(gameTools, {
		instructions: function(){
			$('#instructionsModal').modal('show');
		},
		chat: {
			init: function(){
				fbRef.chat.set([])
			},
			send: function(message){
				if(message){
					fbRef.chat.push({
						user: gameTools.player.me().name,
						message: message
					})
					$scope.temp.message = '';
				}
			}
		}
	});

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
		fbRef.game 			= new Firebase("https://"+config.fbdb+".firebaseio.com/game/"+gameId);
		fbRef.board 		= new Firebase("https://"+config.fbdb+".firebaseio.com/game/"+gameId+'/board');
		fbRef.chat 			= new Firebase("https://"+config.fbdb+".firebaseio.com/game/"+gameId+'/chat');
		fbRef.pending		= new Firebase("https://"+config.fbdb+".firebaseio.com/game/"+gameId+'/pending');
		fbRef.userGame 		= new Firebase("https://"+config.fbdb+".firebaseio.com/presence/"+$rootScope.user.objectId+'/game');
		fbRef.userGame.set(gameId);
		$http.get('/corps.json').success(function(c){
			$rootScope.templateCorps = c;
		})


		if(Firebase==false){
			location.reload();
			return;
		}

		//Load Game
		fbRef.game.once('value', function(snap) { 
			$rootScope.$apply(function(){
				debug('initial load')
				$rootScope.game = snap.val();
				g.resolve(snap.val())
				gameTools.game.init();
			})
		});
		fbRef.game.on('value', function(snap) {
			var gameUpdate = snap.val();
			debug('Game updated from firebase.')
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
				debug(gameUpdate);
			}
		});
		fbRef.pending.on('value', function(snap) {
			if($rootScope.game){
				debug('Pending player change.')
				$('#sidebar a:first').tab('show');
				$rootScope.$apply(function(){
					$rootScope.game.pending = snap.val();
				})
			}
		});
		fbRef.board.on('value', function(snap) {
			debug('Board updated from firebase.')
			if($rootScope.game){
				fbRef.game.once('value', function(snap) { 
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
		fbRef.chat.on('value', function(snap) {
			if($rootScope.game){
				if(!$rootScope.$$phase){
					$rootScope.$apply(function(){
						$rootScope.game.chat = snap.val();
					})
				}else{
					$rootScope.game.chat = snap.val();
				}
			}
		});
		fbRef.chat.on("child_added", function(snap) {
			var lm = snap.val();
			if(lm.message=="come back")
				alert('Calling all players!')
			$rootScope.notify('success', lm.message,  1);
		});

		$(window).on('hashchange', function() {
			fbRef.userGame.set(null);
			fbRef.game.off('value');		//Change 
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
			fbRef.game.set(angular.fromJson(angular.toJson($rootScope.game)));
		});
		$scope.$on('leaveGame', function(event, message) {
			fbRef.userGame.set(null);
		});
		$scope.$on('newGame', function(event, message) {
			$scope.tools.chat.init();
		});
		// Update views when certain actions occure
		setupListeners();
	}

	//-------------------------------------------------:::OFFLINE MODE:::------------------------------------------------------
	//-------------------------------------------------:::OFFLINE MODE:::------------------------------------------------------
	//-------------------------------------------------:::OFFLINE MODE:::------------------------------------------------------
	//-------------------------------------------------:::OFFLINE MODE:::------------------------------------------------------
	function setupOffline(gameId){
		debug('Setup Offline')
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
			debug('Get From localstorage')
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
			debug('players changed',players,$rootScope.user.pending)
			if(players){
				if($rootScope.user.pending){
					debug('I am pending')
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
				if(merger){
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
							$timeout(function(){
								debug('Game: ',JSON.stringify($rootScope.game))
								gameTools.ai.chooseBuyStock($rootScope.game.turn);
							}, 500);
						}
					}
				}
			}
		});

		// ======================================GAME MERGER ACTIONS=============================================
		$rootScope.$watch('game.merger.turn', function (turn){
			debug('game.merger.turn',turn)
			if(gameTools.player.me()){
				if(turn==gameTools.player.me().i){
					gameTools.player.notify(gameTools.player.me());
				}
				if(gameTools.player.isHost(gameTools.player.me())){//If I am the host
					if(turn!=undefined && turn !=null){
						if(gameTools.player.get(turn).isComputer){
							$timeout(function(){
								gameTools.ai.chooseTradeSell(gameTools.player.get(turn));
							}, 500);
						}
					}else{
						debug('Turn is not defined anymore...')
					}
				}
			}
		});

		// ======================================GAME TURN ACTIONS=============================================
		$rootScope.$watch('game.turn', function (turn){
			if(turn!=undefined && gameTools.player.me()){
				if(turn==gameTools.player.me().i){
					gameTools.player.notify(gameTools.player.me());
					$rootScope.temp.startOfTurn = moment();
					$rootScope.temp.clock = setInterval(function(){
						$rootScope.temp.timer = Math.round(moment().diff($rootScope.temp.startOfTurn) / 1000)
						$rootScope.$apply();
					}, 1000)
				}
				if(gameTools.player.isHost(gameTools.player.me())){//If I am the host
					if(gameTools.player.get(turn).isComputer){
						$timeout(function(){
							gameTools.ai.turn(gameTools.player.get(turn));
						}, 500);
					}
				}
			}else{
				debug('SWND')
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