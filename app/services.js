app.factory('config', function () {
	return {
		fbdb: 				'capitalgain',
		fireRoot: 			'https://capitalgain.firebaseio.com/',
		parseAppId: 		'PX69qDYYcXUBA8UqeUwXx7H3UNRujda9jxhjPI7K',
		parseJsKey: 		'oLvZK8eda5ihEq55BsfPVkGkaq4Djuq27BSAjogP',
		parseRestApiKey: 	'28HuQH9RHKcV4zkRYas1qpEWUgQ6r1aSWLDJRJlT'
	}
});

app.factory('fireParse', function ($rootScope, $timeout, $routeParams, $http, config) {
	/*
	 *	REQUIRES:
	 *	userSignupModal
	 *	userSettingsModal
	*/
	debug('fireParse')


	if(navigator.onLine)
		Parse.initialize(config.parseAppId, config.parseJsKey);
	$http.defaults.headers.common['X-Parse-Application-Id'] = config.parseAppId;
	$http.defaults.headers.common['X-Parse-REST-API-Key'] = config.parseRestApiKey;
	$http.defaults.headers.common['Content-Type'] = 'application/json';

	var fireParse = {
		config: config,
		user:{
			init:function(){
				if(navigator.onLine){
					fireParse.user.auth = new FirebaseSimpleLogin(fireParse.fireRoot, function(error, data) {
						if (error) {
							debug(error);
						} else if (data) {
							debug('FireAuth has been authenticated!')
							if(localStorage.user){
								var localUser = angular.fromJson(localStorage.user);
								$http.defaults.headers.common['X-Parse-Session-Token'] = localUser.sessionToken;
							}
							fireParse.user.initParse(data);
						} else {
							debug('not logged in.');
							$rootScope.$broadcast('authError');
						}
					});
				}else{
					if(localStorage.user){
						$rootScope.user = angular.fromJson(localStorage.user);
						$rootScope.$broadcast('authComplete');
					}else{
						$rootScope.$broadcast('authError');
					}
				}
			},
			initParse:function(){
				$http.get('https://api.parse.com/1/users/me').success(function(data){
					$rootScope.user = data;
					debug('user data assigned.');
					$rootScope.$broadcast('authComplete');
					$('#userSignupModal').modal('hide');
					$('#userLoginModal').modal('hide');
				}).error(function(){
					debug('User Not Authenticated Any More')
					$rootScope.$broadcast('authError');
					//User not authenticated any more...
					//???Clear user data???
				});
				debug('initParse complete');
			},
			signupModal:function(){
				$('#userLoginModal').modal('hide');
				$('#userSignupModal').modal('show');
			},
			signup:function(user){
				if(user.rememberMe)
					localStorage.setItem('localUser', angular.toJson(user))
				fireParse.user.signupParse(user)
			},
			signupParse:function(user){
				user.username = user.email;
				if(user.password!=user.password1){
					$rootScope.notify('error','Your passwords do not match.');
				}else{
					delete user.password1;
					$http.post('https://api.parse.com/1/users', user).success(function(data){
						fireParse.user.signupFire(user);
					}).error(function(error, data){
						debug('signupParse error: ',error,data);
						$rootScope.notify('error',error.error);
					});
				}
			},
			signupFire:function(user){
				fireParse.user.auth.createUser(user.email, user.password, function(error, data) {
					if(error)
						debug('signupFire error: ',error,data)
					else
						fireParse.user.login(user);
				});
			},
			loginModal:function(){
				$('#userSignupModal').modal('hide');
				$('#userLoginModal').modal('show');
			},
			login:function(user){
				fireParse.user.loginParse(user);
			},
			loginParse:function(user){
				var login = {
					username:user.email,
					password:user.password
				}
				$http.get("https://api.parse.com/1/login", {params: login}).success(function(data){
					$http.defaults.headers.common['X-Parse-Session-Token'] = data.sessionToken;
					localStorage.user=angular.toJson(data);
					$rootScope.user2=data;
					fireParse.user.loginFire(user);
				}).error(function(){
					// $('#loading').removeClass('active');
				});
			},
			loginFire:function(user){
				fireParse.user.auth.login('password', {
					email: user.email,
					password: user.password
				});
			},
			settingsModal:function(){
				$('#userSettingsModal').modal('show');
			},
			settingsSave:function(user){
				delete user.createdAt
				delete user.updatedAt
				delete user.sessionToken
				delete user.username
				debug('settingsSave',user);
				$http.put('https://api.parse.com/1/users/'+user.objectId, user).success(function(data){
					debug('updateUser',data)
				}).error(function(error, data){
					debug('settingsSave error: ',error,data);
					$rootScope.notify('error',error.error);
				});
			}
		}
	}
	if(navigator.onLine)
		fireParse.fireRoot = new Firebase(config.fireRoot)
	it.fireParse = fireParse;
	return fireParse;
});



app.factory('gameTools', function ($rootScope, $timeout, $q, $routeParams, ai) {
	var data = {};
	var tools = {
		audio: [
			{"name":"None", "mp3":""},
			{"name":"Switch", "mp3":new Audio("audio/switch.mp3")},
			{"name":"Beep", "mp3":new Audio("audio/done.mp3")},
			{"name":"Cool beat", "mp3":new Audio("audio/beat.mp3")},
			{"name":"Chime 1", "mp3":new Audio("audio/magic-chime-01.mp3")},
			{"name":"Chime 2", "mp3":new Audio("audio/magic-chime-03.mp3")},
			{"name":"Chime 3", "mp3":new Audio("audio/magic-chime-05.mp3")},
			{"name":"Cannon in: D", "mp3":new Audio("audio/cannonInD.mp3")},
			{"name":"Eye Of The Tigger", "mp3":new Audio("audio/eyeoftiger.ogg")}
		],
		lastPlayed:false,
		playAudio:function(audio){
			if(this.lastPlayed)
				this.lastPlayed.pause();
			this.lastPlayed = tools.audio[audio].mp3;
			this.lastPlayed.play();
		},
		clearHistory:function(playerIndex){
			var remove = true;
			while(remove){
				if($rootScope.game.history.length>$rootScope.game.players.length){
					var removed = $rootScope.game.history.shift();
				}else{
					remove = false;
				}
			}
		},
		message:function(player, type, message){
			var timeStamp = new Date();
			if(!$rootScope.temp)
				$rootScope.temp={};
			if(!$rootScope.temp.history)
				$rootScope.temp.history = {
					round:$rootScope.game.round,
					player:player.i,
					messages:[],
					timeStamp:timeStamp.toLocaleTimeString()
				};

			if(type=='merger'){
				for(var i=0; i<$rootScope.game.history.length; i++){
					if($rootScope.game.history[i].player==player.i){
						if(!$rootScope.game.history[i].messages)
							$rootScope.game.history[i].messages=[];
						$rootScope.game.history[i].messages.push(message);
					}
				}
			}else{
				if(!$rootScope.temp.history)
					$rootScope.temp.history = [{messages: 'Nothing...', player: player.i}]
				if(type=='end'){
					if(!$rootScope.game.history)
						$rootScope.game.history = [];
					$rootScope.game.history.push($rootScope.temp.history)
					$rootScope.temp.history = null;
				}else{
					if(!$rootScope.temp.history.messages)
						$rootScope.temp.history.messages=[];
					$rootScope.temp.history.messages.push(message)
				}
			}
		},
		rtc:{
			join:function(room){
				if(room){
					debug('Joining Room: '+room)
					tools.rtc.connection = new SimpleWebRTC({
						localVideoEl: 'localVideo',
						remoteVideosEl: 'remoteVideos',
						autoRequestMedia: true
					});
						tools.rtc.connection.on('readyToCall', function () {
						tools.rtc.connection.joinRoom(room);
					});
				}
			}
		},
		// train: {
		// 	init: function(){
		// 		$('#playerSettingsModal').modal('hide');
		// 		$('#trainingModal').modal('show');
		// 		var tiles = tools.tile.list();
		// 			tiles = angular.copy(tiles);
		// 		$rootScope.training = tiles.map(function(tile){
		// 			return {
		// 				action: 'place',
		// 				value: tile.address,
		// 				options: []
		// 			}
		// 		})
		// 		tools.train.start($rootScope.training[0])
		// 	},
		// 	start: function(item){
		// 		$rootScope.train = item;
		// 		tools.train.listen();
		// 	},
		// 	remove: function(option){
		// 		var i = $rootScope.train.options.indexOf(option);
		// 		$rootScope.train.options.splice(i, 1);
		// 	},
		// 	next: function(){
		// 		var item = $rootScope.train
		// 		if(item.options.length > 3){
		// 			var index = $rootScope.training.indexOf(item);
		// 			var next = $rootScope.training[index+1];
		// 			if(next)
		// 				tools.train.start(next)
		// 			else
		// 				alert('Done Training!')
		// 		}
		// 	},
		// 	listen: function(){
		// 		var recognition = new webkitSpeechRecognition();
		// 		recognition.continuous = true;
		// 		recognition.interimResults = true;
		// 		recognition.onresult = function(event) {
		// 			var results = event.results;
		// 			for(var i=event.resultIndex; i<event.results.length; i++){
		// 				var options = event.results[i];
		// 				if(options.isFinal){
		// 					for(var ii=0; ii<options.length; options++){
		// 						var cmd = options[ii].transcript;
		// 							cmd = cmd.replace(/\W/g, '')
		// 							cmd = cmd.toUpperCase()
		// 							$rootScope.train.options.push(cmd)
		// 							$rootScope.$apply();
		// 							tools.train.next();
		// 					}
		// 				}
		// 			}
		// 		}
		// 		recognition.start();
		// 	}
		// },
		speech: function(){
			it.e = []
			var recognition = new webkitSpeechRecognition();
			recognition.continuous = true;
			recognition.interimResults = true;
			recognition.onresult = function(event) {
				var me = tools.player.me();
				var results = event.results;
				for(var i=event.resultIndex; i<event.results.length; i++){
					var options = event.results[i];
					if(options.isFinal){
						for(var ii=0; ii<options.length; ii++){
							var cmd = options[ii].transcript;
								cmd = cmd.trim();
								cmd = cmd.toUpperCase()
							var alt = cmd.replace(/\W/g, '')
							console.log(cmd,alt)
							if(alt == 'INTERN' || cmd == 'END TURN'){
								tools.player.endTurn(me);
							}else if(cmd == 'SHOW ME THE MONEY' && $rootScope.game.settings.allowStats){
								var players = $rootScope.game.players;
								for(var i=0; i<players.length; i++)
									$rootScope.notify(players[i].name+' has: $'+players[i].money)
							}else if($rootScope.game.step == 0){
								var tile = tools.tile.get(cmd)
								if(tile){
									tools.tile.focus(me, tile)
									$rootScope.$apply();
								}
							}else if($rootScope.game.step == 1){
								var cs = tools.corp.list();
								for(var i=0; i<cs.length; i++){
									var ttl = cs[i].title.toUpperCase();
									var sym = cs[i].symbol.toUpperCase();
									$rootScope.$apply(function(){
										if(cmd.indexOf(ttl) != -1)
											tools.corp.buyStock(cs[i], me)
										else if(alt.indexOf(sym) != -1)
											tools.corp.buyStock(cs[i], me)
									})
								}
							}
						}
					}
				}
			}
			recognition.start();
		},
		abc:'ABCDEFGHIJKLMNOPQRSTUVWXYZ!@#$%^&*abcdefghijklmnopqrstuvwxyz',
		tileName:function(x,y){
			return tools.abc[y]+(x+1);
		},
		game:{
			init:function(){
				if($routeParams.gameId==$rootScope.user.objectId){
					if($rootScope.game && $rootScope.game.players && $rootScope.game.board){
						$rootScope.notify('This is your game -- already in progress');
					}else{
						$rootScope.notify('New')
						tools.game.create();
					}
				}else{
					if($rootScope.game && $rootScope.game.players){
						tools.game.join();
					}
				}
			},
			create:function(){
				$rootScope.game = {
					temp:{placeholder:1},
					category:{},
					players:[],
					time_start: new Date(),
					round:0,
					turn:0,
					step:0,
					purchases:0,
					settings:{
						startMoney: 6000,
						benchTiles: 6,
						stock: 25,
						tilesX: 12,
						tilesY: 9,
						buysPerTurn: 3
					}
				};
				var player = tools.game.formatPlayer($rootScope.user)
					player.i=0;
					player.audio=1;
					player.autoAdvance=false;
				$rootScope.game.players.push(player);
				$rootScope.$broadcast('saveGame');
				tools.game.setupModal();
				ga('send', 'event', 'game', 'new game', 50);
			},
			join:function(){
				$rootScope.notify('Joining Game')
				var g = $rootScope.game;
				var playerFound = false;
				var pendingFound = false;

				debug(g.players)
				if(g.players)
					for(var i=0; i<g.players.length; i++)
						if(g.players[i].objectId==$rootScope.user.objectId)
							playerFound = true;
				if(g.pending)
					for(var i=0; i<g.pending.length; i++)
						if(g.pending[i].objectId==$rootScope.user.objectId)
							pendingFound = true;

				//If username & color are not setup, first, prompt user
				if(!playerFound){
					$rootScope.user.pending=true;
					$('#pendingModal').modal({
						keyboard: false,
						backdrop: 'static',
						show: true
					});
					if(!pendingFound){
						if(!g.pending)
							$rootScope.game.pending=[];
						$rootScope.game.pending.push($rootScope.user);
						$rootScope.$broadcast('saveGame');
					}
					$rootScope.notify('Welcome to the game!');
				}else{
					$rootScope.notify('Welcome back to the game!');
				}
			},
			viewOnly:function(){
				var player = $rootScope.user;
				var g = $rootScope.game;
				if(g && g.players)
					for(var i=0; i<g.players.length; i++)
						if(g.players[i].objectId==player.objectId)
							tools.player.remove(player)
				if(g && g.pending)
					for(var i=0; i<g.pending.length; i++)
						if(g.pending[i].objectId==player.objectId)
							g.pending.splice(i, 1);
				player.pending=false;
				$rootScope.$broadcast('saveGame');
				$rootScope.$broadcast('leaveGame');
				$('#pendingModal').modal('hide');
				ga('send', 'event', 'game', 'view');
			},
			setupModal:function(){
				if($rootScope.game){
					$rootScope.temp.game = angular.copy($rootScope.game.settings);
					if($rootScope.templateCorps)
						$rootScope.temp.game.category = $rootScope.templateCorps.categories[0]
					$('#setupModal').modal('show');
				}
			},
			formatPlayer:function(playerDetails){
				var player = angular.copy(playerDetails);
					player.money = $rootScope.game.settings.startMoney;
					player.i = $rootScope.game.players.length;
					player.audio = 1;
					player.autoAdvance = false;
				return player;
			},
			save:function(){
				$rootScope.$broadcast('newGame');
				$('#setupModal').modal('hide');
				debug('save',$rootScope.temp.game.category)
				$rootScope.game.category = angular.copy($rootScope.temp.game.category);
				$rootScope.game.settings = angular.copy($rootScope.temp.game);
				$rootScope.game.settings.category = null;
				for(var i=0; i<$rootScope.game.category.corporations.length; i++){
					var corp = $rootScope.game.category.corporations[i];
					corp.stock = $rootScope.game.settings.stock;
					corp.i = i;
				}
				this.restart();
			},
			restart:function(){
				$rootScope.game.time_start=new Date();
				$rootScope.game.round=0;
				$rootScope.game.turn=0;
				$rootScope.game.step=0;
				$rootScope.game.purchases=0;
				$rootScope.game.final=null;
				$rootScope.game.history=[];
				tools.board.setup();
				tools.tile.deal();
				tools.bank.reset();
				tools.player.reset();
			},
			nextTurn:function(player){
				var purchases = [];
				if($rootScope.temp.purchases){
					for(var i=0; i<$rootScope.temp.purchases.length; i++){
						var purchase = $rootScope.temp.purchases[i];
						debug('purchase',purchase)
						if(purchases[purchase.corp.i])
							purchases[purchase.corp.i]++;
						else
							purchases[purchase.corp.i]=1;
					}
				}
				for(var i=0; i<purchases.length; i++)
					if(purchases[i])
						tools.message(player, 'message', 'Purchased '+purchases[i]+' stock in: '+tools.corp.get(i).symbol);
					
					// var message = 'Purchased stock in: '+corp.title

				tools.message(player, 'end')
				var game = $rootScope.game;
				if(player.i==game.turn){
					tools.tile.deal(player);
					tools.corp.purchaseClear();
					if($rootScope.game.lastTile && $rootScope.game.lastTile.owner!=player.objectId) //If I was not the last one to place a tile
						$rootScope.game.lastTile = null;	//We need to set it to null otherwise the: canPlaceTile function will not work properly.
					if(game.turn==game.players.length-1)
						game.turn=0;
					else
						game.turn++;
					if(player.i==0)
						$rootScope.game.round++;

					tools.clearHistory(game.turn);
					$rootScope.game.step=0;
					$rootScope.game.purchases=0;
					$rootScope.$broadcast('saveGame');
				}
			},
			setStep:function(player, step, callback){
				if(tools.player.isMyTurn(player)){
					if(step==1){
						if(tools.player.tiles(player).length==0 || !tools.ai.canPlaceTile(player)){
							tools.game.step(player, step, callback)
						}else{
							if(callback)
								callback('error', '1. You must place a tile first.')
							else
								$rootScope.notify('error', 'You must place a tile first.')
						}
					}else if(step==2){
						if($rootScope.game.step==1 || !tools.ai.canPlaceTile(player)){
							tools.game.step(player, step, callback)
						}else{
							if(callback)
								callback('error', '2. You must place a tile first.')
							else
								$rootScope.notify('error', 'You must place a tile first.')
						}
					}
				}
			},
			step:function(player, step, callback){
				if(step!=undefined){
					$rootScope.game.step=step;
					if(step==2 && (player.autoAdvance || player.isComputer)){
						tools.game.nextTurn(player);
					}
					if(callback)
						callback('success', 'Step Changed.')
				}else
					return $rootScope.game.step;
			},
			end:function(){
				var corps = $rootScope.game.category.corporations;
				var players = $rootScope.game.players;
				var message = '';
				for(var c=0; c<corps.length; c++){
					var corp = corps[c]
					if(tools.corp.tiles(corp.i).length>0){
						var corpCost = tools.corp.value(corp).cost;
						message += '<h3>For: '+corp.title+'</h3><p>'+tools.merge.divyBonus(corp)+'';
						for(var p=0; p<players.length; p++){
							if(players[p] && players[p].stock)
								if(players[p].stock[corp.i]!=undefined){
									var stockCt = players[p].stock[corp.i].length;
									var ttl = stockCt*corpCost;
									players[p].money+=ttl;
									message += '<br>'+players[p].name+' received: $'+ttl+' for selling '+stockCt+' stocks.';
								}
						}
						message+='</p>';
					}
				}
				$rootScope.game.final={message: message};
				$rootScope.game.time_end = new Date();
				$rootScope.game.time_lapsed = $rootScope.game.time_end-new Date($rootScope.game.time_start);
				$rootScope.game.time_formated = (new Date).clearTime().addSeconds($rootScope.game.time_lapsed/1000).toString('H:mm:ss');
				$rootScope.$broadcast('saveGame');

				ga('send', 'event', 'gameEnd', 'players', players.length+' players');
				ga('send', 'event', 'gameEnd', 'time', $rootScope.game.time_formated);
			},
			endModal:function(){
				$('#settleEndModal').modal('show');
			},
			confirmOverride:function(){
				return (tools.player.me().i==$rootScope.game.turn || confirm('WARNING: You should only do this when it is your turn. Doing this right now could mess up something in the game.  Are you sure you want to continue?'))
			}
		},

		bank:{
			reset:function(){
				for(var i=0; i<$rootScope.game.players.length; i++){
					$rootScope.game.players[i].money = angular.copy($rootScope.game.settings.startMoney);
				}
			}
		},

		board:{
			setup:function(){
				var settings = $rootScope.game.settings;
				var board = [];
				for(var y=0; y<settings.tilesY; y++){
					var col = [];
					for(var x=0; x<settings.tilesX; x++){
						var tile = {
							address: tools.tileName(x,y),
							onBoard: false,
							owner: -1,
							x: x,
							y: y
						}
						col.push(tile);
					}
					board.push(col);
				}
				$rootScope.game.board = board;
				$rootScope.messageCt=0;
			}
		},
					//Deal, pick up, place, join, add corp, merge.... Change owner, change corp, 
		tile:{
			get:function(ref){
				var x = tools.abc.indexOf(ref[0])
				var y = ref.substr(1,2)-1;
				if($rootScope.game.board[x])
					return $rootScope.game.board[x][y];
			},
			list:function(){
				var board = $rootScope.game.board;
				var arrayList = [];
				for (x=0; x<board.length; x++) { 
					for (y=0; y<board[x].length; y++){
						var tile = board[x][y];
						arrayList.push(tile);	
					};
				};
				return arrayList;
			},
			listAvail:function(){
				var board = $rootScope.game.board;
				var arrayList = [];
				for (x=0; x<board.length; x++) { 
					for (y=0; y<board[x].length; y++){
						var tile = board[x][y];
						if(tile.owner == -1 && !tile.onBoard)
							arrayList.push(tile);	
					};
				};
				return arrayList;
			},
			deal:function(callback){
				tools.tile.clean();
				var tilesAvail = tools.tile.listAvail();
				var eog = true;
				for(var pi=0; pi<$rootScope.game.players.length; pi++){
					var player = $rootScope.game.players[pi];
					var myTiles = tools.player.tiles(player);
					if(!player.benchTiles)
						player.benchTiles=[];
					for(var btc=myTiles.length; btc<$rootScope.game.settings.benchTiles; btc++){
						var tile = tilesAvail.randomRemove();
						if(tile){
							eog=false;
							tile.owner=player.objectId;
						}else if(player.benchTiles.length>0){
							eog=false;
						}
					}
					if(myTiles.length>0)
						eog=false;
				}
				if(eog)
					tools.game.end();
			},
			focus:function(player, tile){
				if(tools.player.isMyTurn(player)){
					if(tools.game.step()==0)
						tools.tile.place(player, tile).then(function(result){
							if(result.message)
								$rootScope.notify(result.status, result.message)
						},function(result){
							$rootScope.notify(result.status, result.message)
						})
					else if(tools.game.step()==1)
						if(tile.corp!=undefined)
							tools.corp.buyStock(tools.corp.get(tile.corp), player)
						else
							$rootScope.notify('error','You must click on a tile that already has a '+$rootScope.game.category.title+' on it.')
					else
						$rootScope.notify('There is nothing left to do... maybe you get to see corp info')
				}else{
					if(tile.corp!=undefined){
						var corp = tools.corp.get(tile.corp);
						var messages = [
							'That is a neat '+$rootScope.game.category.title+' do you wish it were your turn so you could buy some?',
							'I like '+corp.title+' as well!  Maybe we should buy some.'
						]
						if(tools.corp.value(corp, 'cost') > tools.player.me().money)
							$rootScope.notify('error', 'That is great, you have some high aspirations, now you just need to save up to buy some stock in '+corp.title);
						else
							$rootScope.notify('error',messages[lib.randomInt(0,messages.length-1)])
					}else if(tile.onBoard){
						$rootScope.notify('error','Do you remember who placed that tile?')
					}else if(tile.owner==player.objectId){
						$rootScope.notify('error','Wait!  It is not your turn yet...')
					}else{
						$rootScope.notify('error','Dont you wish you had that tile!')
					}
				}
			},
			place:function(player, tile, auto){
				var deferred = $q.defer();
				var isHuman = !player.isComputer;
				if(!player || !tile)
					deferred.reject({status:'error', code:'notDefined', message:'Something was not defined.'});
				else if(tile.onBoard)
					deferred.reject({status:'error', code:'alreadyPlaced', message:'Someone already placed that tile.'});
				else if(!tools.player.isMyTurn(player))
					deferred.reject({status:'error', code:'notYourTurn', message:'It is not your turn.'});
				else if(tools.game.step()!=0)
					deferred.reject({status:'error', code:'wrongStep', message:'You only place one tile at the beginning of your turn.'});
				else if(tile.owner!=player.objectId)
					deferred.reject({status:'error', code:'doesNotHave', message:'You do not have that tile.'});
				else{
					var neighborStats = this.neighborStats(tile)
					debug('neighborStats',JSON.stringify(neighborStats));
					if(neighborStats.corporations.length>1){//Merge corps
						tile.onBoard=true;
						$rootScope.game.lastTile = tile;
						$rootScope.game.mergers = neighborStats.corporations;
						tools.game.step(player, 1);
						if(isHuman)
							tools.merge.mergeCorpModal();
						deferred.resolve({status:'success', code:'merger', message:'You just started a merger!'});

					}else if(neighborStats.corporations.length==1){//set tile and neighbors to same corp
						tile.onBoard=true;
						$rootScope.game.lastTile = tile;
						this.setCorp(neighborStats.corporations[0].i)
						tools.game.step(player, 1);
						deferred.resolve({status:'success', code:'noAction'});

					}else if(neighborStats.onBoard.length>0){
						if(tools.corp.listAvail().length>0){//place corp
							tile.onBoard=true;
							$rootScope.game.lastTile = tile;
							tools.game.step(player, 1);
							if(isHuman)
								tools.corp.placeCorpModal();
							deferred.resolve({status:'success', code:'placeCorp', message:'You get to place a corporation!'});

						}else{//Can not place corp
							tile.onBoard=false;
							deferred.reject({status:'error', code:'noNewCorp', message:'You can not place that tile at this time because all corporations are on the board.'});
						}
					}else{//Loner Tile
						tile.onBoard=true;
						$rootScope.game.lastTile = tile;
						tools.game.step(player, 1);
						deferred.resolve({status:'success', code:'noAction'});
					}
				}
				
				return deferred.promise;
			},
			neighborStats:function(tile){
				if(typeof(tile)!='object')
					tile = this.get(tile);
				var collection = {
					hasCorp:[],
					onBoard:[],
					corporateIndexes:[],
					corporations:[]
				};
				var neighbors = this.neighbors(tile);
				for(var i=0; i<neighbors.length; i++){
					if(neighbors[i].onBoard)
						collection.onBoard.push(neighbors[i])
					if(neighbors[i].corp!=undefined && neighbors[i].corp>-1)
						collection.hasCorp.push(neighbors[i])
					if(neighbors[i].corp!=undefined && collection.corporateIndexes.indexOf(neighbors[i].corp)==-1){
						collection.corporateIndexes.push(neighbors[i].corp)
						collection.corporations.push(tools.corp.get(neighbors[i].corp))
					}
				}
				return collection;
			},
			setCorp:function(corpIndex){
				debug('setCorp',corpIndex)
				if(corpIndex!=undefined && $rootScope.game.lastTile){
					this.setNeighbors(corpIndex, $rootScope.game.lastTile);
				}
			},
			setNeighbors: function(corpIndex, tile){
				if(tile.onBoard){
					$rootScope.game.board[tile.y][tile.x].corp = corpIndex;
					tile.corp = corpIndex;
					var neighbors = this.neighbors(tile);
					for(var i=0; i<neighbors.length; i++)
						if(neighbors[i] && neighbors[i].onBoard && neighbors[i].corp!=corpIndex)
							tools.tile.setNeighbors(corpIndex, neighbors[i])
				}
			},
			neighbors: function(tile){
				if(typeof(tile)!='object')
					tile = this.get(tile);
				var board = $rootScope.game.board;
				var neighbors=[];
				if(tile.y>0)//Top
					neighbors.push(board[tile.y-1][tile.x]);
				if(tile.x<board[0].length-1)//Right
					neighbors.push(board[tile.y][tile.x+1]);
				if(tile.y<board.length-1)//Bottom
					neighbors.push(board[tile.y+1][tile.x]);
				if(tile.x>0)//Left
					neighbors.push(board[tile.y][tile.x-1]);
				return neighbors;
			},
			//If There is a tile that would merge two un-mergeable companies, remove that tile from the player's hand.
			clean: function(){
				var tiles = tools.tile.list();
				for(var i=0; i<tiles.length; i++){
					if(!tiles[i].onBoard){
						var largeCorporations = 0;
						var ci = tools.tile.neighborStats(tiles[i]).corporateIndexes;
						if(ci.length>1)
							for(var ii=0; ii<ci.length; ii++)
								if(tools.corp.tiles(ci[ii]).length>=11)
									largeCorporations++;
						if(largeCorporations>1)
							tiles[i].owner=false;
					}
				}
			},
			style:function(tile){
				if(tile && tile.corp!=undefined){
					var corp = tools.corp.get(tile.corp);
					if(corp)
						return 'background:'+corp.background+'; color:'+corp.font+';';
				}
			}
		},

		corp:{
			save: function(){
				//Set new details for current corp...
				//current corp needs to be set when clicked on from the settings modal.
				//hide addCorp modal
			},
			get: function(corpIndex){
				if($rootScope.game && corpIndex!=undefined)
					return $rootScope.game.category.corporations[corpIndex];
			},
			focus:function(corp, player){
				if(typeof(corp)!='object')
					corp = tools.corp.get(corp);
				if(typeof(player)!='object')
					player = tools.player.get(player);

			},
			value: function(corp, type){
				if(corp!=undefined){
					if(typeof(corp)!='object')
						corp = this.get(corp);
					var tileCt = tools.corp.tiles(corp.i).length;
					var level = 0;
					if(tileCt==undefined)
						tileCt=0;

					if(tileCt==0)
						level = 2;
					else if(tileCt<6)
						level = tileCt;
					else if(tileCt>=6 && tileCt<=10)
						level = 6;
					else if(tileCt>=11 && tileCt<=20)
						level = 7;
					else if(tileCt>=21 && tileCt<=30)
						level = 8;
					else if(tileCt>=31 && tileCt<=40)
						level = 9;
					else if(tileCt>=41)
						level = 10;
					level+=corp.cost;

					var prices={};
					prices.cost=(level*100);
					prices.majority=(level*1000);
					prices.minority=(level*1000)/2;
					if(type!=undefined){
						return prices[type];
					}else{
						return prices;
					}
				}
			},
			corpStatsModal:function(){
				$('#corpStatsModal').modal('show');
			},
			placeCorpModal:function(){
				$('#placeCorpModal').modal({
					keyboard: false,
					backdrop: 'static',
					show: true
				});
			},
			place:function(corp, player, callback){
				it.cplaced=corp;
				tools.tile.setCorp(corp.i);
				var message = 'Placed: '+corp.title
					tools.message(player, 'message', message);
				debug(message)
				tools.corp.brokerStock(corp, player, 0, callback);
				$('#placeCorpModal').modal('hide');
				ga('send', 'event', 'game', 'place', corp.title);
				if(callback)
					callback();
			},
			isOnBoard: function(corp){
				return !!tools.corp.tiles(corp.i).length;
			},
			tiles: function(corpIndex){
				var tiles = [];
				var gameTiles = tools.tile.list();
				for(var i=0; i<gameTiles.length; i++)
					if(gameTiles[i].corp==corpIndex)
						tiles.push(gameTiles[i])
				return tiles;
			},
			list: function(){
				return $rootScope.game.category.corporations;
			},
			listAvail: function(){
				var list = [];
				if($rootScope.game && $rootScope.game.category && $rootScope.game.category.corporations){
					var corporations = $rootScope.game.category.corporations;
					for(var i=0; i<corporations.length; i++)
						if(this.tiles(corporations[i].i).length==0)
							list.push(corporations[i])
				}
				return list;
			},
			listOnBoard: function(){
				var list = [];
				if($rootScope.game && $rootScope.game.category && $rootScope.game.category.corporations){
					var corporations = $rootScope.game.category.corporations;
					for(var i=0; i<corporations.length; i++)
						if(this.tiles(corporations[i].i).length>0)
							list.push(corporations[i])
				}
				return list;
			},
			playersStock:function(corp){
				if(typeof(corp)!='object')
					corp = this.get(corp);
				playersStock=[];
				for(var i=0; i<$rootScope.game.players.length; i++){
					var player = $rootScope.game.players[i];
					var stockCt = tools.player.stockCt(player, corp);
					playersStock.push(stockCt);
				}
				return playersStock;
			},
			brokerStock:function(corp, player, priceOverride, callback){
				tools.corp.buy(corp, player, priceOverride, false, callback);
			},
			buyStock:function(corp, player, callback){
				tools.corp.buy(corp, player, false, true, callback);
			},
			buy:function(corp, player, priceOverride, isPurchase, callback){
				debug(player.name+' is purchasing Stock: '+corp.title);
				debug('buy',corp,player,callback)
				if(!isPurchase || (tools.player.isMyTurn(player) && tools.game.step()==1)){
					if($rootScope.game.purchases<3){
						if(corp && player){
							if(tools.corp.tiles(corp.i).length>0){
								if(corp.stock>0){
									var price = null;
									if(priceOverride!==false){
										price = priceOverride
									}else{
										price = tools.corp.value(corp).cost
									}
									if(player.money>=price){
										if(!player.stock)
											player.stock=[]
										if(!player.stock[corp.i])
											player.stock[corp.i]=[];
										player.stock[corp.i].push(price);
										corp.stock--;
										player.money -= price;
										if(isPurchase){
											var transaction = {
												player:player,
												corp:corp
											}
											this.purchasePush(transaction);
											$rootScope.game.purchases++;
											if($rootScope.game.purchases==3)
												tools.game.setStep(player, 2);
											if(callback)
												callback('success','Purchase successful!');
										}else{
											debug('!!!!!!!!Is NOT a purchase!')
										}
									}else{
										if(callback)
											callback('error','You do not have engough money to buy this stock.')
										else
											$rootScope.notify('error','You do not have engough money to buy this stock.')
									}
								}else{
									if(callback)
										callback('error','There are no stocks available for this company.')
									else
										$rootScope.notify('error','There are no stocks available for this company.')
								}
							}else{
								if(callback)
									callback('error',corp.title+' is not on the board.')
								else
									$rootScope.notify('error',corp.title+' is not on the board.')
							}
						}else{
							if(callback)
								callback('error','Corp or player was undefined.')
							else
								$rootScope.notify('error','Corp or player was undefined.')
						}
					}else{
						if(callback)
							callback('error','You can only purchase 3 stocks.')
						else
							$rootScope.notify('error','You can only purchase 3 stocks.')
					}
				}else{
					if(callback)
						callback('error','You can not purchase at this time. ')
					else
						$rootScope.notify('error','You can not purchase at this time.')
				}
				debug(+tools.game.step()+' '+tools.player.isMyTurn(player));
			},
			purchasePush:function(purchase){
				if(!$rootScope.temp.purchases)
					$rootScope.temp.purchases=[];
				$rootScope.temp.purchases.push(purchase)
			},
			purchaseUndo:function(purchase){
				var transaction = $rootScope.temp.purchases.splice($rootScope.temp.purchases.indexOf(purchase), 1)[0];
				transaction.corp.stock++;
				var cost = transaction.player.stock[transaction.corp.i].pop();
				transaction.player.money+=cost;
				$rootScope.game.purchases--;
				tools.game.setStep(transaction.player, 1)
				$rootScope.notify('Purchase of: '+transaction.corp.title+' has been reverted.')
				ga('send', 'event', 'game', 'undo', 'purchase');
			},
			purchaseClear:function(){
				if(!$rootScope.temp)
					$rootScope.temp={};
				$rootScope.temp.purchases=[];
			},
			purchaseList:function(){
				if($rootScope.game && $rootScope.temp && $rootScope.temp.purchases)
					return $rootScope.temp.purchases;
			},
			majMin:function(corp){
				if(typeof(corp)!='object')
					corp = this.get(corp);
				var result = {};
					result.majSH=[];
					result.minSH=[];

				var stockCounts = tools.corp.playersStock(corp);
				result.majority = stockCounts.max();
				result.minority = stockCounts.diff([result.majority]).max();
				if(result.minority<0)
					result.minority=0;
				result.third 	= stockCounts.diff([result.majority, result.minority]).max();
				if(result.third<0)
					result.third=0;

				for(var i=0; i<stockCounts.length; i++)
					if(stockCounts[i]>0 && stockCounts[i]==result.majority)
						result.majSH.push(i)
					else if(result.minority!=0 && stockCounts[i]==result.minority)
						result.minSH.push(i)
				if(result.minSH.length==0 || result.majSH.length>1)
					result.minSH = result.majSH;
				return result;
			},
			style:function(corp){
				if(typeof(corp)!='object')
					corp = this.get(corp);
				return 'background:'+corp.background+'; color:'+corp.font+';';
			}
		},

		merge:{
			mergeCorpModal:function(){
				$('#mergeCorpModal').modal({
					keyboard: false,
					backdrop: 'static',
					show: true
				});
			},
			corp:function(corpToKeep, player, callback){
				var mergers = $rootScope.game.mergers;
				var dominantMerger = tools.merge.dominantMerger(mergers);
				if(dominantMerger.indexOf(corpToKeep.i) != -1){
					var leaving = [];
					for(var i=0; i<mergers.length; i++)
						if(mergers[i].i!=corpToKeep.i)
							leaving.push(mergers[i].i)

					$('#mergeCorpModal').modal('hide');
					$rootScope.game.merger = {
						keep: corpToKeep.i,
						leaving: leaving,
						initTurn: player.i,
						turn: player.i
					}
					var message = tools.merge.divyBonus(tools.corp.get(leaving[0]));
					$rootScope.game.merger.message = message;
					$rootScope.$broadcast('saveGame');
					if(callback)
						callback('success', 'tradeSell')
				}else{
					if(callback)
						callback('error', 'You must choose the largest company to be the acquisitor.')
					else
						$rootScope.notify('error','You must choose the largest company to be the acquisitor.')
				}
			},
			divyBonus:function(corp){
				var majMin = tools.corp.majMin(corp);
				var bonus = tools.corp.value(corp);
				var majSH = majMin.majSH;
				var minSH = majMin.minSH;
				var player = null;
				var players = '';
				var message = '';
				if(majSH.length>1){
					var share = Math.ceil(bonus.majority/majSH.length);
					player = tools.player.get(majSH[0]);
					player.money += share;
					players = player.name;
					for(var i=1; i<majSH.length; i++){
						player = tools.player.get(majSH[i]);
						player.money += share;
						players += ' and '+player.name;
					}
					message = players+' each received: $'+share+' spliting $'+bonus.majority+' for majority shareholder bonuses.';
				}else{
					player = tools.player.get(majSH[0])
					player.money += bonus.majority;
					message = player.name+' received $'+bonus.majority+' for a majority shareholder bonus.'
				}
				if(minSH.length>1){
					var share = Math.ceil(bonus.minority/minSH.length);
					player = tools.player.get(minSH[0]);
					player.money += share;
					players = player.name;
					for(var i=1; i<minSH.length; i++){
						player = tools.player.get(minSH[i]);
						player.money += share;
						players += ' and '+player.name;
					}
					message += '<br>'+players+' each received: $'+share+' spliting $'+bonus.minority+' for minority shareholder bonuses.';
				}else{
					player = tools.player.get(minSH[0])
					player.money += bonus.minority;
					message += '<br>'+player.name+' received $'+bonus.minority+' for a minority shareholder bonus.'
				}
				return message;
			},
			staying:function(){
				if($rootScope.game && $rootScope.game.merger)
					return tools.corp.get($rootScope.game.merger.keep);
			},
			leaving:function(){
				if($rootScope.game && $rootScope.game.merger)
					return tools.corp.get($rootScope.game.merger.leaving[0]);
			},
			mergeTradeSellModal:function(){
				if($rootScope.game.merger)
					$('#mergeTradeSellModal').modal({
						keyboard: false,
						backdrop: 'static',
						show: true
					}).on('hidden.bs.modal', function(){
						tools.merge.mergeTradeSellModal();
					});
			},
			trade: function(player, callback){
				var leaving = tools.merge.leaving();
				var staying = tools.merge.staying();

				if(staying.stock>0){
					if(player.stock[leaving.i].length>=2){
						var price  = player.stock[leaving.i].pop();
							price += player.stock[leaving.i].pop();
						leaving.stock+=2;
						player.money += price;
						tools.corp.brokerStock(staying, player, price, callback)
						tools.message(player, 'merger','Traded 2 '+leaving.symbol+' - for 1 '+staying.symbol)
						if(callback)
							callback('success', 'Traded 2 '+leaving.symbol+' - for 1 '+staying.symbol)
					}else{
						if(callback)
							callback('error','You do not own enough stock to trade')
						else
							$rootScope.notify('error','You do not own enough stock to trade')
					}
				}else{
					if(callback)
						callback('error',staying.title+' does not have any available stocks')
					else
						$rootScope.notify('error',staying.title+' does not have any available stocks')
				}
			},
			sell: function(player, callback){
				var leaving = tools.merge.leaving();
				if(player.stock[leaving.i].length>0){
					player.stock[leaving.i].pop();
					player.money  += tools.corp.value(leaving).cost;
					leaving.stock++;
					tools.message(player, 'merger', 'Sold a stock in: '+leaving.symbol)
				}
				if(callback)
					callback()
			},
			hideMergeTradeSellModal:function(){
				$('#mergeTradeSellModal').modal('hide');
			},
			nextTurn: function(){
				var turn = $rootScope.game.merger.turn;
				if(turn<$rootScope.game.players.length-1)
					$rootScope.game.merger.turn++;
				else
					$rootScope.game.merger.turn = 0;
				if($rootScope.game.merger.turn == $rootScope.game.merger.initTurn)
					tools.merge.closeDeal();
				else
					$rootScope.$broadcast('saveGame');
				//If there are more than one merging corps: remove one and continue sequence of turns... end when all are done.
			},
			closeDeal:function(){
				if($rootScope.game.merger.leaving.length>1){
					$rootScope.game.merger.leaving.shift();
					var nextLeaving = tools.corp.get($rootScope.game.merger.leaving[0]);
					var message = tools.merge.divyBonus(nextLeaving);
					$rootScope.game.merger.message = message;
				}else{
					tools.tile.setCorp($rootScope.game.merger.keep)
					$rootScope.game.merger=false;
					$rootScope.game.mergers=false;
					$rootScope.notify('This merger is a done deal!');
				}
				$rootScope.$broadcast('saveGame');
			},
			dominantMerger:function(corps){
				var largestSize = 0;
				var largest = [];
				if(corps!=undefined){
					for(var i=0; i<corps.length; i++)
						if(largestSize<tools.corp.tiles(corps[i].i).length)
							largestSize = tools.corp.tiles(corps[i].i).length;
					for(var i=0; i<corps.length; i++)
						if(tools.corp.tiles(corps[i].i).length==largestSize)
							largest.push(corps[i].i)
					return largest;
				}
			},
			lesserMerger:function(corps){
				var largestSize = 0;
				var smaller = [];
				if(corps!=undefined){
					for(var i=0; i<corps.length; i++)
						if(largestSize<tools.corp.tiles(corps[i].i).length)
							largestSize = tools.corp.tiles(corps[i].i).length;
					for(var i=0; i<corps.length; i++)
						if(tools.corp.tiles(corps[i].i).length<largestSize)
							smaller.push(corps[i].i)
					return smaller;
				}
			}
		},

		player:{
			add:function(){
				$rootScope.temp.player = {
					"name"       : chance.name(),
					"color"      : chance.color(),
					"money"      :$rootScope.game.settings.startMoney,
					"audio"      :0,
					"game"       :$rootScope.game.id,
					"i"          :$rootScope.game.players.length,
					"objectId"   :'comp-'+lib.randomInt(),
					"isComputer" :true,
					"autoAdvance":false,
					"online"     :true,
					"isNew"	 :true
				}
				$('#playerSettingsModal').modal('show');
			},
			edit:function(player){
				$rootScope.temp.player=player;
				$('#playerSettingsModal').modal('show');
			},
			save:function(){
				$('#playerSettingsModal').modal('hide');
				var player = $rootScope.temp.player;
				if(player.isNew){
					$rootScope.game.players.push(player);
					ga('send', 'event', 'game', 'add computer');
				}else{
					$rootScope.game.players[player.i]=player;
					ga('send', 'event', 'game', 'edit settings');
				}
				$rootScope.temp.player=null;
			},
			toggleComputer:function(player){
				if(tools.game.confirmOverride()){
					player.isComputer=!player.isComputer;
					$rootScope.$broadcast('saveGame');
				}
			},
			get:function(index){
				if($rootScope.game && $rootScope.game.players)
					return $rootScope.game.players[index];
			},
			reset:function(){
				for(var i=0; i<$rootScope.game.players.length; i++){
					$rootScope.game.players[i].money 	= $rootScope.game.settings.startMoney;
					$rootScope.game.players[i].stock 	= [];
				}
				$rootScope.$broadcast('saveGame');
			},
			approve:function(pendingIndex){
				if(tools.game.confirmOverride()){
					var player = tools.game.formatPlayer($rootScope.game.pending[pendingIndex]);
					$rootScope.game.players.push(player);
					$rootScope.game.pending.splice(pendingIndex, 1);
					tools.tile.deal();
					$rootScope.$broadcast('saveGame');
				}
			},
			takeover:function(player){
				if(player.isComputer){
					var tiles = tools.tile.list();
					for(var i=0; i<tiles.length; i++){
						if(tiles[i].owner==player.objectId){
							tiles[i].owner=$rootScope.user.objectId
						}
					}
					player.objectId = $rootScope.user.objectId;
				}
			},
			remove:function(player){
				if(player && tools.game.confirmOverride()){
					if(player.stock)
						for(var i=0; i<player.stock.length; i++)
							if(player.stock[i]!=undefined)
								for(var ct=0; ct<player.stock[i].length; ct++)
									tools.corp.get(i).stock++
					var tiles = tools.tile.list();
					if(tiles)
						for(var i=0; i<tiles.length; i++)
							if(tiles[i].owner==player.objectId && !tiles[i].onBoard){
								tiles[i].owner = -1;
							}
					$rootScope.game.players.splice(player.i, 1);
					for(var i=0; i<$rootScope.game.players.length; i++)
						$rootScope.game.players[i].i=i;
					if($rootScope.game.turn>$rootScope.game.players.length-1)
						$rootScope.game.turn = 0;
					$rootScope.$broadcast('saveGame');
				}
			},
			leave:function(player){
				debug('leave',player)
				if(!player){
					tools.game.viewOnly();
					$rootScope.game=null;
					window.location='#/home';
				}else{

				}
			},
			me:function(){
				if($rootScope.game && $rootScope.game.players && $rootScope.user)
					for(var i=0; i<$rootScope.game.players.length; i++)
						if($rootScope.game.players[i].objectId==$rootScope.user.objectId)
							return $rootScope.game.players[i];
			},
			isMyTurn:function(player){
				if(player)
					return player.i==$rootScope.game.turn;
			},
			isHost:function(player){
				if(player)
					return player.i==0;
				else
					return false;
			},
			isOwner:function(){
				if($rootScope.user)
					return $rootScope.user.objectId==$routeParams.gameId;
			},
			tiles:function(player){
				if(typeof(player)!='object')
					player = tools.player.get(player);
				if(player){
					var board = $rootScope.game.board;
					var arrayList = [];
					if(board){
						for (x=0; x<board.length; x++) { 
							for (y=0; y<board[x].length; y++){
								var tile = board[x][y];
								if(tile.owner == player.objectId && !tile.onBoard)
									arrayList.push(tile);
							};
						};
					}
					return arrayList;
				}else{
					return [];
				}
			},
			stock:function(player){
				corpList = [];
				if($rootScope.game && player && player.stock){
					var corporations = $rootScope.game.category.corporations;
					for(var i=0; i<corporations.length; i++)
						if(player.stock[i]!=undefined)
							corpList.push(corporations[i]);
				}
				return corpList;
			},
			stockCt:function(player, corp){
				if(player && player.stock && corp && player.stock[corp.i])
					return player.stock[corp.i].length
				else
					return 0;
			},
			hasMaj:function(player, corp){
				if(typeof(player)!='object')
					player = tools.player.get(player);
				if(typeof(corp)!='object')
					corp = tools.corp.get(corp);
				return (tools.corp.majMin(corp).majSH.indexOf(player.i) != -1);
			},
			hasMin:function(player, corp){
				if(typeof(player)!='object')
					player = tools.player.get(player);
				if(typeof(corp)!='object')
					corp = tools.corp.get(corp);
				return (tools.corp.majMin(corp).minSH.indexOf(player.i) != -1);
			},
			endTurn:function(player){
				clearInterval($rootScope.temp.clock);
				var timeSpent = moment().diff($rootScope.temp.startOfTurn);
				if(!player.timeSpent)
					player.timeSpent =  []
				player.timeSpent.push(timeSpent);
				
				if(tools.player.tiles(player).length==0 || !tools.ai.canPlaceTile(player)){
					tools.game.nextTurn(player);
				}else{
					$rootScope.notify('error','You can not end your turn until after you place a tile.');
				}
			},
			audio:function(player){
				if(player && player.audio)
					return tools.audio[player.audio];
				else
					return tools.audio[0];
			},
			toggleAudio:function(player){
				if(player.audio!=undefined){
					if(player.audio!=tools.audio.length-1)
						player.audio++;
					else
						player.audio=0;
				}else{
					player.audio==1;
				}
			},
			notify: function(player){
				tools.display.modalOff();
				if(player.audio!=0)
					tools.playAudio(player.audio);
				$rootScope.notify('Its your turn!');
				if(tools.player.me().vocalize)
					tools.speech();
				if(document.webkitHidden)
					alert('Hey, where did you go?  It is your turn!')
			},
			style:function(player){
				if(typeof(player)!='object')
					player = this.get(player);
				if(player){
					if(lib.color.isDark(player.color))
						return 'background:'+player.color+'; color:#FFF;';
					else
						return 'background:'+player.color+'; color:#000;';
				}
			}
		},

		/*
			- Place tile

		*/
		ai:{
			turn:function(player){
				tools.ai.countAllStocks();
				debug('starting my turn: '+player.name)
				$rootScope.$apply();
				tools.ai.placeTile(player);
			},
			placeTile:function(player, i){
				tools.ai.countAllStocks();
				if(typeof(player)!='object')
					player = tools.player.get(player);

				if(!i)	//i is a counter to keep track of location (in case we need to try to place more than once)
					i=0;
				$rootScope.$apply();
				var myTiles = tools.player.tiles(player);
				var ranks = tools.ai.rankTiles(player);
				var maxRank = ranks.max();
				var tileToPlace = myTiles.splice(ranks.indexOf(maxRank), 1)[0];
				debug('placeTile',myTiles,ranks,maxRank,tileToPlace)

				tools.tile.place(player, tileToPlace, true).then(function(response){
					if(response.code=='merger'){
						tools.ai.chooseMerger(player);
					}else if(response.code=='placeCorp'){
						tools.ai.chooseNewCorp(player);
					}else{
						tools.ai.chooseBuyStock(player);
					}
				}, function(response){
					tools.ai.chooseBuyStock(player);
				});
			},
			rankTiles:function(player){
				if(typeof(player)!='object')
					player = tools.player.get(player);
				var ranks = [];
				var tiles = tools.player.tiles(player);
				var corpsAvail = tools.corp.listAvail();
				
				for(var i=0; i<tiles.length; i++){
					var tile = tiles[i];
					var rank = 0;
					var nStats = tools.tile.neighborStats(tile);
						nStats.onBench = [];
						nStats.oponentPlaced = [];
						nStats.onBoard = [];
					var neighbors = tools.tile.neighbors(tile);
					for(var n=0; n<neighbors.length; n++){
						var neighbor = neighbors[n];
						if(neighbor.onBoard){
							if(neighbor.owner!=player.objectId)
								nStats.oponentPlaced.push(neighbor);
							nStats.onBoard.push(neighbor);
						}else{
							if(neighbor.owner==player.objectId)
								nStats.onBench.push(neighbor);
						}
					}

					if(nStats.corporations.length>1){	//If tile merges corps
						var lesserMerger = tools.merge.lesserMerger(nStats.corporations);
						debug('Tile Merges Corps![player,corps,hasMaj,money]',player,nStats.corporations,tools.player.hasMaj(player, lesserMerger[c]),player.money)
						for(var c=0; c<lesserMerger.length; c++){
							if(tools.player.hasMaj(player, lesserMerger[c])){
								var majMin = tools.corp.majMin(lesserMerger[c]);
								if(majMin.majSH.length == 1)
									rank = 100;
								else
									if(player.money<6000){
										rank = 90
									}else{
										rank = -50
									}
							}else{
								rank = -100
							}
						}
					}else if(nStats.corporations.length==1){	//If tile extends a corp
						if(tools.player.hasMaj(player, nStats.corporations[0]))
							rank = 20
						else
							rank = -20
					}else{
						if(nStats.oponentPlaced.length>0){	//If oponent placed tile next to one that I have
							rank = 50;
						}else if(nStats.onBoard.length>0){	//If tile creates a new corp
							//// if Would have maj in corp placed.
							var availRanks = tools.ai.rankPlaceCorp(player)
							if(availRanks.max() > 25)
								rank = 30;
							else
								rank = -30
						}else if(nStats.onBench.length>0){	//If creates a possibility
							rank = 20;
						}else if(neighbors.length==2){		//If tile is in corner
							rank = 3
						}else if(neighbors.length==3){		//If tile is on side
							rank = 2
						}else{								//If tile is a loner
							rank = 1;
						}
					}

					if(nStats.corporations.length==0 && nStats.onBoard.length>0 && corpsAvail.length==0)
						rank = -2000;

					ranks.push(rank);
				}
				return ranks;
			},
			tileToChoose:function(player){
				if($rootScope.game){
					if(typeof(player)!='object')
						player = tools.player.get(player);
					var ranks = tools.ai.rankTiles(player);
					return tools.player.tiles(player)[ranks.indexOf(ranks.max())]
				}
			},
			canPlaceTile:function(player){
				if(typeof(player)!='object')
					player = tools.player.get(player);
				var tileRanks = tools.ai.rankTiles(player);
				
				var reason = false;
				if(!$rootScope.game)
					reason = 'There is no game.'
				if(!reason && tools.player.tiles(player).length==0)
					reason = 'You do not have any tiles to place.'
				if(!reason && $rootScope.game.lastTile && $rootScope.game.lastTile.owner==player.objectId)
					reason = 'You already placed a tile.'
				if(!reason && tileRanks.max()==-2000)
					reason = 'All your tiles currently perform an illegal operation.'
				return !reason;
			},
			chooseNewCorp:function(player){
				tools.ai.countAllStocks();
				if(typeof(player)!='object')
					player = tools.player.get(player);

				var corpsAvail = tools.corp.listAvail();
				var myCorpStats = tools.ai.rankPlaceCorp(player);
				debug('TESTING: chooseNewCorp',myCorpStats,corpsAvail)
				var max = myCorpStats.max();
				var ctpi = myCorpStats.indexOf(max);
				tools.corp.place(tools.corp.get(ctpi), player, function(){
					debug('corp placed!');
					tools.ai.chooseBuyStock(player);
				})
			},
			chooseMerger:function(player){
				tools.ai.countAllStocks();
				if(typeof(player)!='object')
					player = tools.player.get(player);

				debug('AI: Choose Corp');
				var mergers = $rootScope.game.mergers;
				var dominantMerger = tools.merge.dominantMerger(mergers);


				var corpChosen = null;
				if(dominantMerger.length>1){
					for(var i=0; i<dominantMerger.length; i++)
						if(tools.player.hasMaj(player, dominantMerger[i]))
							corpChosen = tools.corp.get(dominantMerger[i]);
					if(!corpChosen)
						for(var i=0; i<dominantMerger.length; i++)
							if(tools.player.hasMin(player, dominantMerger[i]))
								corpChosen = tools.corp.get(dominantMerger[i]);
				}
				if(!corpChosen)
					corpChosen = tools.corp.get(dominantMerger[0]);

				tools.merge.corp(corpChosen, player, function(status, message){
					debug('AI: ChooseMerger: ',status,message)
					if(status=='success'){
						debug('Yay!  Now we will wait for an update to trigger our chooseTradeSell');
					}else{
						alert('There was an ai error choosing the merger.');
					}
				});
			},
			chooseTradeSell:function(player){
				tools.ai.countAllStocks();
				if(typeof(player)!='object')
					player = tools.player.get(player);
				var leaving = tools.merge.leaving();
				var staying = tools.merge.staying();
				var action = 'keep';
				if(player.stock[leaving.i] && player.stock[leaving.i].length>0){
					var tileRatio = it.GameCtrl.tools.tile.listAvail().length/it.GameCtrl.tools.tile.list().length*100;
					if(tileRatio<50){
						if(it.gameTools.corp.listAvail().length>1)
							action = 'sell'
					}else if(tileRatio<30){
						if(it.gameTools.corp.listAvail().length>1)
							action = 'sell'
					}else if(tileRatio<25){
						if(it.gameTools.corp.listAvail().length>1)
							action = 'sell'
					}else if(tileRatio<18){
						//if rank tiles == 50|75 we may want to keep...
						action = 'sell'
					}

					var opp = tools.ai.myCorpStats(player.i)[staying.i].data;
					var myStockCt = player.stock[leaving.i].length;
					if(action=='sell'){
						if(myStockCt>1 && staying.stock>0){
							if(opp.secureMaj>0 || opp.obtainMaj>0){
								if(myStockCt/2 >= opp.secureMaj)
									action='trade';
								if(myStockCt/2 >= opp.obtainMaj)
									action='trade';
							}
						}
					}

					if(action=='sell'){
						tools.merge.sell(player, function(){
							tools.ai.chooseTradeSell(player);
						})
					}else if(action=='trade'){
						debug('AI is trading!')
						tools.merge.trade(player, function(){
							tools.ai.chooseTradeSell(player);
						})
					}else{
						tools.merge.nextTurn();
					}
				}else{
					tools.merge.nextTurn();
				}
			},
			chooseBuyStock:function(player){
				tools.ai.countAllStocks();
				if(typeof(player)!='object')
					player = tools.player.get(player);
				if($rootScope.game.purchases<3){
					var analysis = tools.ai.rankPurchases(player);
					var highestRank = 0
					if(tools.corp.listOnBoard().length >= ($rootScope.game.category.corporations.length/$rootScope.game.players.length * player.i))
						highestRank = analysis.rankings.max();
					for(var i=0; i<analysis.rankings.length;  i++)
						if(analysis.rankings[i] > 40)
							highestRank = analysis.rankings.max();
					// console.debug('Player: '+player.i+' vs round: '+$rootScope.game.round);
					// if($rootScope.game.round>=player.i){
						if(highestRank>0){
							var bestBuy = analysis.corpStats[analysis.rankings.indexOf(highestRank)];
							var amountToBuy = bestBuy.data[bestBuy.target];

							tools.corp.buyStock(bestBuy.corp, player, function(status, message){
								debug(status,message)
								if(status!='error')
									tools.ai.chooseBuyStock(player);
							});
						}else{
							debug('Nao vou comprar esta vez');
							tools.ai.endTurn(player);
						}
					// }else{
					// 	tools.ai.endTurn(player);
					// }
				}else{
					debug('ja tenho comprido o maximo')
				}
				tools.ai.countAllStocks();
			},
			endTurn:function(player){
				if($rootScope.game.turn==player.i){
					tools.ai.countAllStocks();
					tools.player.endTurn(player);
				}
			},
			rankPlaceCorp:function(player){
				var corpsAvail = tools.corp.listAvail()
				var corpStats = tools.ai.myCorpStats(player)
				var rankings = []
				for(var c=0; c<corpStats.length; c++){
					var stat = corpStats[c];
					var rank = -200;
					for(var a=0; a<corpsAvail.length; a++){
						var corpAvail = corpsAvail[a]
						if(corpAvail.i==c){
							if(stat.majMin.majSH.indexOf(player.i) != -1)
								if(stat.majMin.majSH.length==1)
									rank = 200;
								else
									rank = 100;
							else if(corpAvail.stock==25)
								rank = 75;
							else if(stat.majMin.minSH.indexOf(player.i) != -1)
								if(stat.majMin.minSH.length==1)
									rank = 50;
								else
									rank = 25;
							else
								rank = 10;
								
							if(stat.majMin.majority - stat.myStockCt < stat.possible + 1)
								rank += 10;
							else
								rank -= 10;
						}
					}
					rankings.push(rank)
				}
				return rankings;
			},
			rankPurchases:function(player){
				if(typeof(player)!='object')
					player = tools.player.get(player);
				var buysPerTurn = $rootScope.game.settings.buysPerTurn;
				var corps 		= tools.corp.list();
				var corpStats 	= tools.ai.myCorpStats(player);
				var rankings 	= [];
				var targets 	= [];
				for(var i=0; i<corps.length; i++){
					var corp = corps[i];
					var stat = corpStats[i];
						stat.isOnBoard = tools.corp.isOnBoard(corp);
					if(stat.data.secureCorp>0 && stat.possible>=stat.data.secureCorp){
						stat.value=200; stat.target='secureCorp';
					}else if(stat.data.secureMaj>0 && stat.possible>=stat.data.secureMaj){
						stat.value=50; stat.target='secureMaj';//WAS: 100
					}else if(stat.data.obtMaj>0 && stat.possible>=stat.data.obtMaj){
						stat.value=50; stat.target='obtMaj';
					}else if(stat.data.tieMaj>0 && stat.possible>=stat.data.tieMaj){
						stat.value=25; stat.target='tieMaj';
					}else if(stat.data.secureMin>0 && stat.possible>=stat.data.secureMin){
						stat.value=10; stat.target='secureMin';
					}else if(stat.data.obtMin>0 && stat.possible>=stat.data.obtMin){
						stat.value=9; stat.target='obtMin';
					}else if(stat.data.tieMin>0 && stat.possible>=stat.data.tieMin){
						stat.value=8; stat.target='tieMin';
					}else{
						stat.value=1; stat.target='none';
					}


					if(!stat.isOnBoard)
						stat.value=-500;
					else if(stat.possible==0)
						stat.value=-100;
					else if(stat.value<25 && stat.majMin.minority==0)
						stat.value=24;

					//New Ranking
					stat.value -= tools.corp.value(corp).cost/1000;

					rankings.push(stat.value);
					targets.push(stat.target);
				}
				var result={
					corpStats: corpStats,
					rankings: rankings,
					targets: targets
				}
				debug('purchase rankings: ',player,result)
				return result;
			},
			tile:function(ref){
				return $rootScope.game.board;
			},
			myCorpStats:function(player){
				if(typeof(player)!='object')
					player = tools.player.get(player);

				var buysPerTurn = $rootScope.game.settings.buysPerTurn;
				var corps = tools.corp.list();
				var stats = [];
				for(var i=0; i<corps.length; i++){
					var corp 		= corps[i];
					var mm 			= tools.corp.majMin(corp);
					var myStockCt 	= tools.player.stockCt(player, corp);
					var canBuyCt 	= Math.floor(player.money/tools.corp.value(corp).cost);
					var possible 	= Math.min(canBuyCt, buysPerTurn, corp.stock);
					var stat = {
						corp: corp,
						majMin: mm,
						myStockCt: myStockCt,
						canBuyCt: canBuyCt,
						possible: possible,
						data:{
							secureCorp:0,
							secureMaj:0,
							obtainMaj:0,
							tieMaj:0,
							secureMin:0,
							obtainMin:0,
							tieMin:0
						}
					};

					if(mm.majSH.indexOf(player.i)!=-1 && mm.majSH.length==1){//if I am only majsh
						stat.data.secureCorp 	= (Math.ceil($rootScope.game.settings.stock/2) - myStockCt);
						stat.data.secureMaj 	= (mm.minority + 1 + buysPerTurn - myStockCt);

					}else if(mm.majSH.indexOf(player.i)!=-1 && mm.majSH.length>1){//if I am joint majsh
						stat.data.secureCorp 	= (Math.ceil($rootScope.game.settings.stock/2) - myStockCt);
						stat.data.secureMaj 	= (mm.majority + 1 + buysPerTurn - myStockCt);

					}else if(mm.minSH.indexOf(player.i)!=-1 && mm.minSH.length==1){//if I am only minSH
						stat.data.secureCorp 	= (Math.ceil($rootScope.game.settings.stock/2) - myStockCt);
						stat.data.secureMaj 	= (mm.majority + 1 + buysPerTurn - myStockCt);
						stat.data.obtainMaj 	= (mm.majority + 1 - myStockCt);
						stat.data.tieMaj 	    = (mm.majority - myStockCt);
						stat.data.secureMin 	= (mm.third + 1 + buysPerTurn - myStockCt);
					}else if(mm.minSH.indexOf(player.i)!=-1 && mm.minSH.length>1){//if I am joint minSH
						stat.data.secureCorp 	= (Math.ceil($rootScope.game.settings.stock/2) - myStockCt);
						stat.data.secureMaj 	= (mm.majority + 1 + buysPerTurn - myStockCt);
						stat.data.obtainMaj 	= (mm.majority + 1 - myStockCt);
						stat.data.tieMaj 		= (mm.majority - myStockCt);
						stat.data.secureMin 	= (mm.minority + 1 + buysPerTurn - myStockCt);
						stat.data.obtainMin 	= (mm.minority + 1 - myStockCt);
					}else{//I am not minSH
						stat.data.secureCorp 	= (Math.ceil($rootScope.game.settings.stock/2) - myStockCt);
						stat.data.secureMaj 	= (mm.majority + 1 + buysPerTurn - myStockCt);
						stat.data.obtainMaj 	= (mm.majority + 1 - myStockCt);
						stat.data.tieMaj 		= (mm.majority - myStockCt);
						stat.data.secureMin 	= (mm.minority + 1 + buysPerTurn - myStockCt);
						stat.data.obtainMin 	= (mm.minority + 1 - myStockCt);
						stat.data.tieMin 		= (mm.minority - myStockCt);
					}

					stats.push(stat);
				}
					return stats;
			},
			triggerCt: 0,
			countAllStocks:function(){
				for(var c=0; c<$rootScope.game.category.corporations.length; c++){
					var cTotal = 0;
					var corp = $rootScope.game.category.corporations[c]
					cTotal += corp.stock;
					for (var i=0; i<$rootScope.game.players.length; i++) {
						var player = $rootScope.game.players[i];
						if(player.stock && player.stock[c])
							cTotal += player.stock[c].length
					}
					if(cTotal!=$rootScope.game.settings.stock)
						console.error(corp.title+' only has: '+cTotal+' stock')
				}
			},
			akct: 1,
			allKnowing:function(ct){
				debug('ak:'+ct)
				if((this.akct==0 && ct==1) || ct == 3)
					$('#fullStatsModal').modal('show');
				this.akct=ct
			}
		},
		display:{
			uniqueStartCosts:function(){
				var corps = tools.corp.list();
				var startPrices = [];
				for(var i=0; i<corps.length; i++)
					if(startPrices.indexOf(corps[i].cost) == -1)
						startPrices.push(corps[i].cost)
				startPrices.sort();
				return startPrices;
			},
			toggleModal:function(){
				data.minModal=!data.minModal;
			},
			modalOff:function(){
				data.minModal=false;
			},
			minModal:function(){
				return data.minModal;
			},
		}
	}
	it.gameTools = tools;
	return tools;
});



app.factory('ai', function ($rootScope) {
	var data = {};
	//	Patience 		= Spend less than others 
	// 	risk 	 		= 
	// 	All in one 		= 
	//	spread thin 	= 
	//	
	// var profiles = [
	// 	{
	// 		priorities:{
	// 			variables:['money','majorities','minorities','corpsOnBoard','corpsOffBoard','officeSpace'],
	// 			tiles:{
	// 				'solo':{
	// 					'by':{
	// 						'small'{
	// 							'majority':1,
	// 							'minority'1,
	// 							'other'1
	// 						},
	// 						'large'{
	// 							'majority'1,
	// 							'minority'1,
	// 							'other'1
	// 						}
	// 					},
	// 					'position':{
	// 						'corner':3,
	// 						'side':2,
	// 						'middle':1,
	// 						'other':0
	// 					}
	// 				},
	// 				'create'{
	// 					'opportunity':4,
	// 					'corpOnOwn':5,
	// 					'corpOnOther':6,
	// 				},
	// 				'merge'{
	// 					'small'{
	// 						'majority':10,
	// 						'minority':5,
	// 						'other':0
	// 					},
	// 					'large'{
	// 						'majority':4,
	// 						'minority':2,
	// 						'other':0
	// 					}
	// 				}
	// 			},

	// 			purchases:{

	// 			},
	// 			mergers:{

	// 			}
	// 		},
	// 		attributes:{
	// 			patience: .5,
	// 			risk: .5
	// 		}
	// 	}
	// ]
	var ai = {
		play:function(profile){

		}
	}

	it.ai = ai;
	return ai;
});