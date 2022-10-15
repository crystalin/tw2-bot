/*global require,console,process*/
'use strict';

var conf = require('./tw2-conf.json');

var keypress = require('keypress');
keypress(process.stdin);

//var nodemailer = require('nodemailer');

var jade = require('jade');
var express = require('express');
var events = require('events');
var underscore = require('underscore');
var io = require('./socket.io.js');
var routeProvider = require('./routes.js');
var eventTypeProvider = require('./events.js');
var printf = require('printf');
var fs = require('fs');

String.prototype.trunc = String.prototype.trunc ||
    function(n){
        return this.length>n ? this.substr(0,n-1)+'&hellip;' : this;
    };

var util = {};

util.MINUTE = 60;
util.HOUR = util.MINUTE * 60;
util.DAY = util.HOUR * 24;
util.getTime = function(timestamp) {
    var date = new Date(timestamp * 1000);
    var hours = '0' + date.getHours();
    var minutes = '0' + date.getMinutes();

    var formattedTime = hours.substr(hours.length-2) + ':' + minutes.substr(minutes.length-2);

    return formattedTime;
};

util.calculateDistance = function(start, end) {
    var dy = start.y - end.y,
        dx = start.x - end.x;
    if (dy % 2) {
        dx += start.y % 2 ? 0.5 : -0.5;
    }
    return Math.sqrt(dx * dx + dy * dy * 0.75);
};

util.calculateTimeTo = function(distance, unitspeed) {
    return distance * unitspeed;
};


util.maxRecruits = function(unit, resources) {
    return Math.min(
        Math.floor(resources.wood / unit.wood),
        Math.floor(resources.clay / unit.clay),
            Math.floor(resources.iron / unit.iron),
        Math.floor(resources.food / unit.food));
};

util.canFinishQuest = function (quest) {
    var goals   = quest.goals;
    var len     = goals.length;

    if (this.closed) {
        return false;
    }
    for (var i = 0; i < len; i++) {
        var goal = goals[i];

        if (goal.progress < goal.limit) {
            return false;
        }
    }
    return true;
};

util.buildingCost = function(buildingName, level, type) {
    if (!type) {
        return;
    }
    var building = util.buildingsInformation[buildingName];
    if (type == 'food') {
        return parseInt(Math.round(Math.pow(building.food_factor, level - 1) * building.food -
                                   Math.pow(building.food_factor, level - 2) * building.food), 10);
    }
    return Math.pow(building[type+'_factor'], level - 1) * building[type];
};


util.buildingPower = function(buildingName, level) {
    return util.buildingCost(buildingName, level, 'function');
};

util.POINTS_TO_LEVEL = {
    0: 0,
    100: 2,
    200: 5,
    300: 9,
    400: 16,
    1000: 20,
    3000: 25
};

util.levelByPoint = function(villagePoints) {
    var lowest = 0;
    var lowestLevel = util.POINTS_TO_LEVEL[lowest];
    var biggest = 3000;
    var biggestLevel = util.POINTS_TO_LEVEL[biggest];
    underscore.each(util.POINTS_TO_LEVEL, function(level, point) {
        if (villagePoints > point && point > lowest) {
            lowest = point;
            lowestLevel = util.POINTS_TO_LEVEL[point];
        }
        if (villagePoints < point && point < biggest) {
            biggest = point;
            biggestLevel = util.POINTS_TO_LEVEL[point];
        }
    });

    return biggestLevel - (biggest - villagePoints) / (biggest - lowest) * (biggestLevel - lowestLevel);
};

util.WorldNames = {
    'en1': 'Alnwick (EN 1)',
    'en2': 'Bastille (EN 2)',
    'en3': 'Castel Del Monte (EN 3)',
    'en4': 'Drachenfels (EN 4)',
};

util.UnitPriorities = { // Equivalent to level factor
    spear : 1,
    sword: 0.7,
    axe: 2.3,
    archer: 0.6,
    light_cavalry: 1,
    mounted_archer: 0.8,
    heavy_cavalry: 0.3,
    ram: 0.1,
    catapult: 0.01,
    knight: 0,
    snob: 0,
    trebuchet: 0,
    doppelsoldner: 0,
};


util.buildingsInformation = {};
util.unitsInformation = {};

/*var transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
      XOAuth2: {
        user: conf.GMAIL_SENDER,
        clientId: conf.GOOGLE_API_CLIENT_ID,
        clientSecret: conf.GOOGLE_API_CLIENT_SECRET,
        refreshToken: conf.GMAIL_REFRESH_TOKEN,
        accessToken: conf.GMAIL_ACCESS_TOKEN
      }
    },
    debug: true
});

var lastSentAlert = new Date().getTime();
var alertMail = {
    from: 'Alert TW2 Vision ✔ <alan.second.mail@gmail.com>', // sender address
    to: 'alan.sapede@gmail.com', // list of receivers
    subject: '[TW2 Vision] Alert, receving attack ✔', // Subject line
    text: 'To be done', // plaintext body
};
*/

var Account = function(name, password) {
    this.name = name;
    this.password = password;
    this.characters = {};
};


var Character = function(id, account, world, characterInfo) {
    this.id = id;
    this.account = account;
    this.world = world;
    this.villages = {};

    this.waitingArmy = false;
    this.callbacks = {};
    this.timeouts = {};
    this.messageCount = 0;
    this.eventEmitter = new events.EventEmitter();

    this.initSocket();

    this.eventEmitter.on(eventTypeProvider.GAME_DATA_UNITS, function(data) {
        util.unitsInformation = data;
    }.bind(this));
    this.eventEmitter.on(eventTypeProvider.GAME_DATA_BUILDINGS, function(data) {
        util.buildingsInformation = data;
    }.bind(this));

    this.eventEmitter.on(eventTypeProvider.CHARACTER_INFO, function(data) {
        underscore.each(data.villages, function(village) {
            if (!this.villages[village.id]) {
                this.villages[village.id] = new Village(this, this.world, village, characterInfo);
            }
        }.bind(this));
    }.bind(this));

    this.eventEmitter.on(eventTypeProvider.CHARACTER_VILLAGES, function(data) {
        underscore.each(data.villages, function(village) {
            if (!this.villages[village.id]) {
                this.villages[village.id] = new Village(this, this.world, {
                    id: village.id,
                    name: village.name,
                    x: village.x,
                    y: village.y,
                }, characterInfo);
            }
        }.bind(this));
    }.bind(this));



    this.eventEmitter.on(eventTypeProvider.QUESTS_QUEST_PROGRESS, function(data) {
        underscore.delay(function() {
            underscore.each(this.villages, function(village) {
                this.emit(routeProvider.QUEST_FINISH_QUEST, {
                    village_id : village.id,
                    quest_id: data.quest_id
                });
            }.bind(this));
        }.bind(this), 5000);
    }.bind(this));

    this.eventEmitter.on(eventTypeProvider.MAP_VILLAGE_DATA, function(data) {
        this.world.updateNeighbourhood(data);
    }.bind(this));

    this.eventEmitter.on(eventTypeProvider.REPORT_NEW, function(data) {
        this.emit(routeProvider.REPORT_GET, {id: data.id});
    }.bind(this));


    this.eventEmitter.on(eventTypeProvider.REPORT_VIEW, function(report) {
        var neighbourId = 0;
        switch(report.type) {
            case 'ReportScouting':
                neighbourId = report.ReportScouting.defVillageId;
                break;
            case 'ReportAttack':
                neighbourId = report.ReportAttack.defVillageId;
                break;
        }

        if (neighbourId) {
            this.world.addReport(report, neighbourId);
        }
    }.bind(this));

    this.eventEmitter.on(eventTypeProvider.REPORT_LIST, function(data) {
        var alreadyParsed = false;
        for (var index = 0; index < data.reports.length; index++) {
            var report = data.reports[index];
            alreadyParsed = this.world.containsReport(report.id);
            if (alreadyParsed) {
                break;
            }
            underscore.delay(this.emit.bind(this, routeProvider.REPORT_GET, {id: report.id}),
                             index * 500);
        }
        if (!alreadyParsed && data.offset + conf.REPORT_COUNT <= data.total) {
            underscore.delay(function() {
                this.queryReports(data.offset + conf.REPORT_COUNT, conf.REPORT_COUNT);
            }.bind(this), conf.REPORT_COUNT * 1000);
        }

    }.bind(this));

    this.eventEmitter.on(eventTypeProvider.COMMAND_SENT, function(data) {
        var village = this.villages[data.home.id];
        var neibghour = village.world.neighbourhood[data.target.id];
        if (neibghour && (neibghour.x != data.target.x ||
                          neibghour.y != data.target.y)) {
            console.log('CANCELLING : \n', JSON.stringify(neibghour), '\nvs\n', JSON.stringify(data.target));
            delete village.world.neighbourhood[data.target.id];
            this.emit(routeProvider.COMMAND_CANCEL, {
                'command_id' : data.id
            });
        }
        this.retrieveVillageArmy(village);
    }.bind(this));
    this.eventEmitter.on(eventTypeProvider.COMMAND_RETURNED, function(data) {
        this.retrieveVillageArmy(this.villages[data.village_id]);
    }.bind(this));

    this.eventEmitter.on(eventTypeProvider.MESSAGE_ERROR, function(data) {
        console.log('[' + this.world.id + ', ' + this.id +',     ERROR]', JSON.parse(JSON.stringify(data)));
    }.bind(this));

    this.eventEmitter.on('Exception/ErrorException', function(data) {
        console.log('[' + this.world.id + ', ' + this.id +', EXCEPTION]', JSON.parse(JSON.stringify(data)));
    }.bind(this));

    this.eventEmitter.on('Socket/Connect', this.login.bind(this));
};

Character.prototype.retrieveVillageArmy = function(village) {
    if (this.waitingArmy) {
        setTimeout(function() {
            this.retrieveVillageArmy(village);
        }.bind(this), 3000);
        return;
    }
    this.waitingArmy = true;

    this.eventEmitter.once(eventTypeProvider.VILLAGE_UNITSCREEN_INFO, function(data) {
        village.military = data;
        this.waitingArmy = false;
        village.onEvent(eventTypeProvider.VILLAGE_UNITSCREEN_INFO, data);
    }.bind(this));
    this.emit(routeProvider.VILLAGE_GET_UNITSCREEN_INFO, {
        'village_id' : village.id
    });
};



Character.prototype.initSocket = function() {

    this.socket = io.connect(conf.SOCKET_URL, {
        'secure'                    : conf.SOCKET_SECURE,
        'sync disconnect on unload' : false,
        'force new connection'      : true
    });

    this.socket.on(conf.SOCKET_KEY, this.onSocketMessage.bind(this));

    this.socket.on('reconnect', function () {
        console.warn('[' + this.world.id + ', ' + this.id +' SOCKET] ON RECONNECT', arguments);
    }.bind(this));

    this.socket.on('connect', function() {
        console.log('[' + this.world.id + ', ' + this.id +' SOCKET] connect :: Fired upon connecting.', arguments);
        this.eventEmitter.emit('Socket/Connect');
    }.bind(this));
    this.socket.on('error', function() {
        console.log('[' + this.world.id + ', ' + this.id +' SOCKET] error :: Fired upon a connection error', arguments);
    }.bind(this));
    this.socket.on('disconnect', function() {
        console.log('[' + this.world.id + ', ' + this.id +' SOCKET] disconnect :: Fired upon a disconnection.', arguments);
    }.bind(this));
    this.socket.on('reconnect', function() {
        console.log('[' + this.world.id + ', ' + this.id +' SOCKET] reconnect :: Fired upon a successful reconnection.', arguments);
    }.bind(this));
    this.socket.on('reconnect_attempt', function() {
        console.log('[' + this.world.id + ', ' + this.id +' SOCKET] reconnect_attempt :: Fired upon an attempt to reconnect.', arguments);
    }.bind(this));
    this.socket.on('reconnecting', function() {
        console.log('[' + this.world.id + ', ' + this.id +' SOCKET] reconnecting :: Fired upon an attempt to reconnect.', arguments);
    }.bind(this));
    this.socket.on('reconnect_error', function() {
        console.log('[' + this.world.id + ', ' + this.id +' SOCKET] reconnect_error :: Fired upon a reconnection attempt error.', arguments);
    }.bind(this));
    this.socket.on('reconnect_failed', function() {
        console.log('[' + this.world.id + ', ' + this.id +' SOCKET] reconnect_failed :: Fired when couldnt reconnect within reconnectionAttempts', arguments);
    }.bind(this));
};

Character.prototype.login = function() {
    this.emit(routeProvider.LOGIN, {
        'name': this.account.name,
        'pass': this.account.password
    }, function() {
        this.select();
    }.bind(this));
};

Character.prototype.select = function() {
    this.emit(routeProvider.SELECT_CHARACTER, {
        'id'        : this.id,
        'world_id'  : this.world.id,
        'ref_param' : null
    }, function onCharacterSelected(data) {
        if (data.error_code) {
            console.log('Failed to log character', this.id, data.error_code);
        }
        console.log('[' + this.world.id + ', ' + this.id +' ***** INFO] Logged in Character ', data.id, 'on world', data.world_id, 'on map', data.map_name);
        this.emit(routeProvider.GAME_DATA_UNITS, {});
        this.emit(routeProvider.GAME_DATA_BUILDINGS, {});
        this.emit(routeProvider.CHAR_GET_INFO, {});
        this.emit(routeProvider.QUESTS_GET_QUEST_LINES, {});
        this.queryReports(0, conf.REPORT_COUNT);
    }.bind(this));
};

Character.prototype.onSocketMessage = function (message) {
    if (conf.SOCKET_DEBUG > 0) {
        if (message.data && conf.SOCKET_DEBUG > 1) {
            console.log('[' + this.world.id + ', ' + this.id +'] ', ((new Date()).toLocaleTimeString()) + ' | got socket.io message' + ((message.data && message.data.village_id) !== undefined ? ' for #' + message.data.village_id : '       '), message.type, JSON.parse(JSON.stringify(message)));
        } else {
            console.log('[' + this.world.id + ', ' + this.id +']', ((new Date()).toLocaleTimeString()) + ' | got socket.io message' + ((message.data && message.data.village_id) !== undefined ? ' for #' + message.data.village_id : '       '), message.type);
        }
    }
    if (this.callbacks[message.id]) {
        var tmp = this.callbacks[message.id];
        clearTimeout(this.timeouts[message.id]);
        delete this.callbacks[message.id];
        delete this.timeouts[message.id];
        tmp(message.data, message.type);
    }
    this.eventEmitter.emit(message.type, message.data);
    var villageId = message.data && (message.data.village_id ||
                                     message.data.villageId ||
                                     message.data.id);
    if (villageId) {
        if (this.villages[villageId]) {
            this.villages[villageId].onEvent(message.type, message.data);
            this.villages[villageId].messages.push({
                type: message.type,
                data: message.data,
                time: new Date().getTime(),
                receiving: true
            });
        }
    }

};


Character.prototype.emit = function(route, data, opt_callback) {
    if (route.data) {
        var paramLength = route.data.length;

        // check if all needed parameters are set
        for (var i = 0; i < paramLength; i++) {
            // skip check for optional params:
            if (route.data[i].indexOf('opt_') !== 0 && !data.hasOwnProperty(route.data[i])) {
                throw new Error('Missing parameter ' + route.data[i] + ' for route ' + route.type);
            }
        }
    }

    this.messageCount = ++this.messageCount;

    if (!route.type) {
        throw new Error('Missing type for route ' + JSON.stringify(route));
    }

    if (conf.SOCKET_DEBUG > 0) {
        console.log('[' + this.world.id + ', ' + this.id +'] emitting message #' + this.messageCount + ' to backend', route.type, conf.SOCKET_DEBUG > 1 ? JSON.parse(JSON.stringify(data)) : '');
    }

    if (underscore.isFunction(opt_callback)) {
        this.callbacks[this.messageCount] = opt_callback;
        this.timeouts[this.messageCount] = setTimeout(function() {
            if (!this.socket.connected) {
                this.initSocket();
                console.warn('socket is not connected!', route, data, (opt_callback ? opt_callback.toString() : ''));
                return;
            }

        }.bind(this), 8000);
    }

    if (data && data.village_id && this.villages[data.village_id]) {
        this.villages[data.village_id].messages.push({
            type: route.type,
            data: data,
            id: this.messageCount,
            time: new Date().getTime()
        });
    }

    this.socket.emit(conf.SOCKET_KEY, {
        'type'      : route.type,
        'data'      : data,
        'id'        : this.messageCount,
        'headers'   : {
            'traveltimes': [
                ['browser_send', Date.now()]
            ]
        }
    });
};

Character.prototype.queryReports = function(offset, count) {
    offset = offset || 0;
    count = count || 100;

    this.emit(routeProvider.REPORT_GET_LIST_REVERSE, {
        count: count || 100,
        filters: [],
        offset: offset || 0,
        query: '',
        types: ['attack', 'scouting'],
    });
};

Character.prototype.needsResources = function() {
    return underscore.filter(this.villages, function(village) {
        return village.getTotalResources() < village.storage; // lower than 1/3 of resources
    });
};

/**
 * The information about the current world and its villages.
 * @param {[type]} id Id of the world
 */
var World = function(id) {
    this.id = id;
    this.neighbourhood = {};
    this.villages = {};

    this.dataName = 'world_' + this.id + '.json';
    this.isProcessingData = false;

    console.log('[World ' + this.id + '] Created');
    this.loadData();

    this.saveData = underscore.debounce(this.saveData, 10000);
};

World.prototype.updateNeighbourhood = function(data) {
    underscore.each(data.villages, function(neighbour) {
        if (this.villages[neighbour.id]) {
            this.villages[neighbour.id].points = neighbour.points;
        }
        if (this.neighbourhood[neighbour.id]) {
            underscore.extend(this.neighbourhood[neighbour.id], neighbour);
        } else {
            this.neighbourhood[neighbour.id] = new Neighbour(neighbour);
        }
    }.bind(this));
    this.saveData();
};

World.prototype.addReport = function(report, villageId) {
    if (!this.neighbourhood[villageId]) {
        return;
    }
    this.neighbourhood[villageId].addReport(report);
    this.saveData();
};

World.prototype.saveData = function() {
    var newName = this.dataName + '.tmp';
    fs.writeFile(newName, JSON.stringify(this.neighbourhood, null, 4), function(err) {
        if(err) {
          console.log('Failed to write neighbours', err);
        } else {
          fs.rename(newName, this.dataName, function(err) {
            if(err) {
              console.log('Failed to rename neighbours', err);
            } else {
              console.log('Neighbours saved.');
            }
          }.bind(this));
        }
    }.bind(this));
};

World.prototype.loadData = function() {
    fs.readFile(this.dataName, 'utf8', function (err, data) {
        if (!err) {
            console.log('Neighbours loaded.');
            underscore.each(JSON.parse(data), function(neighbour, id) {
                this.neighbourhood[id] = new Neighbour(neighbour);
            }.bind(this));
        } else {
            console.log('NO NEIGHBOURS FILE!!');
        }
    }.bind(this));
};

World.prototype.totalUpgradeTime = function(buildingName, level, hqLevel) {
    var building = util.buildingsInformation[buildingName];

    var hqFactor = util.buildingPower('headquarter', hqLevel);

    var baseTime = building.build_time *
        Math.pow(building.build_time_factor,
                 level + building.build_time_offset / level);


    return  parseInt(Math.round(Math.round(baseTime) * hqFactor), 10);
};

World.prototype.totalUpgradeCost = function(buildingName, level) {
    var building = util.buildingsInformation[buildingName];
    var required = {
        wood: Math.pow(building.wood_factor, level - 1) * building.wood,
        clay: Math.pow(building.clay_factor, level - 1) * building.clay,
        iron: Math.pow(building.iron_factor, level - 1) * building.iron
    };
    return required.wood + required.clay + required.iron;
};

World.prototype.timeToRecruit = function(unitName, barracksLevel) {
    var unit = util.unitsInformation[unitName];
    return unit.build_time * util.buildingPower('barracks', barracksLevel);
};

World.prototype.containsReport = function(reportId) {
    return underscore.find(this.neighbourhood, function(neighbour) {
        return underscore.find(neighbour.reports, function(report) {
            return report.id == reportId;
        });
    });
};

World.prototype.needsHelp = function() {
    var villages = [];
    for (var villageId in this.villages) {
        var village = this.villages[villageId];
        if (village.underAttack) {
            villages.push(village);
        }
    }
    return villages;
};

/**
 * A village that is not one of ours.
 * @param {[type]} data  The data as received by the server
 * @param {[type]} world The world it belongs to
 */
var Neighbour = function (data) {
    this.reports = {};
    this.buildings = {};
    this.resources = {};
    this.updatedAt = 0;
    this.points = 0;

    underscore.extend(this, data);
};

Neighbour.prototype.power = function(buildingName) {
    return util.buildingPower(buildingName, this.buildings[buildingName]);
};

Neighbour.prototype.expectedResources = function() {
    var resources = {
        'wood': 0,
        'iron': 0,
        'clay': 0,
        'food': 0,
    };
    var elapsedHours = 5;
    var points = this.points || 50;
    var maxCapacity = 1000;

    underscore.each(this.resources, function(value, name) {
        resources[name] = value;
    });

    if (this.updatedAt) {
       elapsedHours = ((new Date().getTime() / 1000) - this.updatedAt) / (60 * 60);
    }

    if (!underscore.isEmpty(this.buildings)) {
        if (this.buildings.warehouse) {
            maxCapacity = util.buildingPower('warehouse', this.buildings.warehouse);
        } else {
            maxCapacity = util.buildingPower('warehouse',
                Math.max(this.buildings.timber_camp, this.buildings.clay_pit,
                         this.buildings.iron_mine));
        }
        resources.wood += elapsedHours * this.power('timber_camp');
        resources.clay += elapsedHours * this.power('clay_pit');
        resources.iron += elapsedHours * this.power('iron_mine');
    } else {
        maxCapacity = util.buildingPower('warehouse', util.levelByPoint(points));
        resources.wood += elapsedHours * util.buildingPower('timber_camp', util.levelByPoint(points));
        resources.clay += elapsedHours * util.buildingPower('clay_pit', util.levelByPoint(points));
        resources.iron += elapsedHours * util.buildingPower('iron_mine', util.levelByPoint(points));
    }
    resources.wood = Math.min(resources.wood, maxCapacity);
    resources.clay = Math.min(resources.clay, maxCapacity);
    resources.iron = Math.min(resources.iron, maxCapacity);

    return resources;
};

Neighbour.prototype.expectedTotalResources = function() {
    var resources = this.expectedResources();
    return resources.wood + resources.iron + resources.clay;
};

Neighbour.prototype.addReport = function(report) {
    this.reports[report.id] = report;
    if (report.time_created < this.updatedAt) {
        return;
    }
    this.updatedAt = report.time_created;
    switch(report.type) {
        case 'ReportScouting':
            this.buildings = report.ReportScouting.defBuildings;
            this.resources = report.ReportScouting.defResources;
            break;
        case 'ReportAttack':
            if (report.result == 3) {
                this.isDangerous = true;
            }
            underscore.extend(this.buildings, report.ReportAttack.buildings);
            underscore.extend(this.resources, report.ReportAttack.storage);
            break;
    }
};

function Character() {
    this.villages = {};
}

function Village(owner, world, data, characterInfo) {

    this.owner = owner;
    this.world = world;
    this.units = {};
    this.military = {};
    this.messages = [];
    this.questLines = {};
    this.buildings = {};
    this.inConstruction = {};
    this.resources = {};
    this.receivedEvents = {};
    this.incomingCommands = [];
    this.neighboursExtension = 0;
    this.lastResourceUpdate = null;
    this.emitter = new events.EventEmitter();
    this.underAttack = false;
    this.attackMode = characterInfo.attackMode || 'on';

    this.build = underscore.debounce(this.build.bind(this), 30000);
    this.recruit = underscore.debounce(this.recruit.bind(this), 30000);
    this.attack = underscore.debounce(this.attack.bind(this), 30000);

    underscore.extend(this, data);
    this.world.villages[this.id]=this;

    console.log('[Village ' + this.id, ', ' + world, '] Created');

    this.emitter.on(eventTypeProvider.BUILDING_QUEUE, function(data) {
        this.inConstruction = data;
        if (this.isReady()) {
            underscore.delay(function() {
                this.build();
            }.bind(this), 10000);
        }
    }.bind(this));
    this.emitter.on(eventTypeProvider.VILLAGE_UNIT_INFO, function(data) {
        this.units = data;
        underscore.delay(function() {
            this.chooseMilitaryStrategy();
        }.bind(this), 10000);
    }.bind(this));
    this.emitter.on(eventTypeProvider.VILLAGE, function(data) {
        underscore.extend(this, data);
    }.bind(this));
    this.emitter.on(eventTypeProvider.VILLAGE_RESOURCES_CHANGED, function(data) {
        underscore.extend(this, data);
        this.lastResourceUpdate = new Date().getTime()/1000;
        underscore.delay(function() {
            this.build();
        }.bind(this), 10000);
        underscore.delay(function() {
            this.recruit();
        }.bind(this), 30000);
    }.bind(this));

    this.emitter.on(eventTypeProvider.UNIT_RECRUIT_JOB_FINISHED, function() {
        underscore.delay(function() {
            this.recruit();
        }.bind(this), 15000);
    }.bind(this));


    this.emitter.on(eventTypeProvider.BUILDING_UPGRADING, function() {
        this.owner.emit(routeProvider.VILLAGE_GET_BUILDING_QUEUE, {'village_id' : this.id});
    }.bind(this));

    this.emitter.on(eventTypeProvider.BUILDING_LEVEL_CHANGED, function(data) {
        this.buildings[data.building].level = data.level;
        underscore.delay(function() {
            this.build();
        }.bind(this), 15000);
        this.owner.emit(routeProvider.VILLAGE_GET_BUILDING_QUEUE, {'village_id' : this.id});
        this.summonPaladin();
    }.bind(this));


    this.emitter.on(eventTypeProvider.TRADING_TRANSPORT_ARRIVED, function() {
        this.getTradingList();
    }.bind(this));
    this.emitter.on(eventTypeProvider.TRADING_OFFER_ACCEPTED, function() {
        this.getTradingList();
    }.bind(this));
    this.emitter.on(eventTypeProvider.TRADING_TRANSPORT_NEW, function() {
        this.getTradingList();
    }.bind(this));

    this.emitter.on(eventTypeProvider.TRADING_TRANSPORT_INDEX, function(data) {
        this.transports = data.transports;
    }.bind(this));

    this.emitter.on(eventTypeProvider.QUESTS_QUEST_LINES, function(data) {
        this.questLines = data.quests_lines;
        this.checkQuests();
    }.bind(this));

    this.emitter.on(eventTypeProvider.SCOUTING_INFO, function(data) {
        this.tavern = data;
    }.bind(this));


    this.emitter.on(eventTypeProvider.VILLAGE_ARMY_CHANGED, function() {
        this.owner.emit(routeProvider.VILLAGE_UNIT_INFO, {'village_id' : this.id});
    }.bind(this));

    this.emitter.on(eventTypeProvider.SCOUTING_SPY_PRODUCED, function() {
        this.owner.emit(routeProvider.SCOUTING_GET_INFO, {'village_id' : this.id});
    }.bind(this));

    this.emitter.on(eventTypeProvider.VILLAGE_UNITSCREEN_INFO, function() {
        if (this.isReady()) {

            underscore.each(this.military.outgoingArmies, function(army) {
                var neibghour = this.world.neighbourhood[army.village.village_id];
                if (neibghour && (neibghour.x != army.village.village_x ||
                                  neibghour.y != army.village.village_y)) {
                    console.log('CANCELLING wrong village: ', JSON.stringify(neibghour), '\nvs\n', JSON.stringify(army.village));
                    delete this.world.neighbourhood[army.village.village_id];
                    this.owner.emit(routeProvider.COMMAND_CANCEL, {
                        'command_id' : army.id
                    });
                }

                if (army.time_completed > (new Date() / 1000 + 15 * util.HOUR) &&
                    army.time_start < (new Date() / 1000 + 10 * util.MINUTE)) {
                    console.log('CANCELLING too far (15H+): ', JSON.stringify(army));
                    delete this.world.neighbourhood[army.village.village_id];
                    this.owner.emit(routeProvider.COMMAND_CANCEL, {
                        'command_id' : army.id
                    });
                }
            }.bind(this));

            this.chooseMilitaryStrategy();
        }
    }.bind(this));

    this.emitter.on('Village/Ready', function(village) {
        this.startingStep = 0;
        village.displayReport();
        underscore.delay(function() {
            this.chooseMilitaryStrategy();
        }.bind(this), 10000);
        underscore.delay(function() {
            this.build();
        }.bind(this), 18000);
        underscore.delay(function() {
            this.recruit();
        }.bind(this), 32000);
        underscore.delay(function() {
            this.recruitSpy();
        }.bind(this), 44000);

    }.bind(this));

    this.owner.retrieveVillageArmy(this);
    this.owner.emit(routeProvider.VILLAGE_GET_VILLAGE, {'village_id' : this.id});
    this.owner.emit(routeProvider.VILLAGE_UNIT_INFO, {'village_id' : this.id});
    this.owner.emit(routeProvider.VILLAGE_GET_BUILDING_QUEUE, {'village_id' : this.id});
    this.owner.emit(routeProvider.SCOUTING_GET_INFO, {'village_id' : this.id});

    this.getTradingList();
    this.getIncomingCommands();

    this.searchNeighbours(this.x, this.y);

    setInterval(function() {
        this.searchNeighbours(this.x, this.y);
        underscore.delay(function() {
            this.getTradingList();
            this.recruit();
        }.bind(this), 7000);
        underscore.delay(function() {
            this.owner.emit(routeProvider.VILLAGE_RESOURCE_INFO, {'village_id' : this.id});
        }.bind(this), 10000);
        underscore.delay(function() {
            this.owner.emit(routeProvider.VILLAGE_UNIT_INFO, {'village_id' : this.id});
        }.bind(this), 15000);
        underscore.delay(function() {
            this.owner.emit(routeProvider.SCOUTING_GET_INFO, {'village_id' : this.id});
            this.build();
        }.bind(this), 20000);
        underscore.delay(function() {
            this.recruitSpy();
        }.bind(this), 30000);
        underscore.delay(function() {
            this.owner.retrieveVillageArmy(this);
            this.getIncomingCommands();
        }.bind(this), 47000);
        underscore.delay(function() {
            this.mintCoint();
        }.bind(this), 53000);

    }.bind(this), 10 * 60 * 1000);

    setInterval(function() {
        this.updateResources();
    }.bind(this), 20000);
}

Village.prototype.power = function(name) {
    return util.buildingPower(name, this.buildings[name].level);
};

Village.prototype.cost = function(name, type) {
    return util.buildingCost(name, this.buildings[name].level, type);
};

Village.prototype.estimatedFarm = function() {
    var food = util.buildingPower('farm', this.buildings.farm.level);


    underscore.each(this.units.available_units, function(unit, unitName) {
        var info = util.unitsInformation[unitName];
        food -= unit.total * info.food;
    }.bind(this));

    underscore.each(this.units.queues, function(buildingQueues) {
        underscore.each(buildingQueues, function(recruiting) {
            var info = util.unitsInformation[recruiting.unit_type];
            food -= (recruiting.amount-recruiting.recruited) * info.food;
        }.bind(this));
    }.bind(this));

    underscore.each(this.buildings, function(building, buildingName) {
        if (buildingName == 'church') {
            return;
        }
        food -= this.cost(buildingName, 'food');
    }.bind(this));
    return Math.floor(food);
};


Village.prototype.updateResources = function() {
    if (!this.lastResourceUpdate) {
        return;
    }
    var now = new Date().getTime()/1000;
    var elapsedSeconds = now - this.lastResourceUpdate;
    this.lastResourceUpdate = now;

    this.resources.wood = Math.min(this.storage, this.resources.wood + this.power('timber_camp') / 3600 * elapsedSeconds);
    this.resources.iron = Math.min(this.storage, this.resources.iron + this.power('iron_mine') / 3600 * elapsedSeconds);
    this.resources.clay = Math.min(this.storage, this.resources.clay + this.power('clay_pit') / 3600 * elapsedSeconds);
};

Village.prototype.getIncomingCommands = function() {
    this.owner.emit(routeProvider.OVERVIEW_GET_INCOMING, {
        command_types: ['attack'],
        count: 25,
        offset: 0,
        sorting: 'time_completed',
        reverse: 0,
        groups: [],
        villages: []
    }, function(data) {
        this.underAttack = false;
        this.incomingCommands = [];
        underscore.each(data.commands, function(command) {
            if (command.command_type == 'attack' &&
                command.target_village_id == this.id) {
                this.incomingCommands.push(command);
                this.underAttack = true;
            }
        }.bind(this));
    }.bind(this));
};

Village.prototype.getTradingList = function() {
    this.owner.emit(routeProvider.TRADING_GET_TRANSPORTS, {
        count: 235,
        offset: 0,
        order: 1,
        ordered_by: 'transport_id',
        village_id : this.id
    });
};

Village.prototype.maxUnlockedSpy = function() {
    if (this.buildings.tavern.level === 0) {
        return 0;
    }
    return 1 + Math.floor(this.buildings.tavern.level / 3);
};

Village.prototype.numberSpy = function() {
    if (!this.tavern) {
        return 0;
    }
    for (var i = 1; i <= 5; i++) {
        if (!this.tavern['spy_'+i]) {
            return i - 1;
        }
    }
    return 0;
};

Village.prototype.recruitSpy = function() {
    if (!this.tavern) {
        return;
    }

    var slot = this.numberSpy() + 1;
    if (slot > 5 || slot > this.maxUnlockedSpy()) {
        return;
    }

    var totalCost = this.tavern.spy_prices[slot - 1].wood +
                    this.tavern.spy_prices[slot - 1].clay +
                    this.tavern.spy_prices[slot - 1].iron;
    if (totalCost > this.getTotalResources() / 4) {
        console.log('[' + this.world.id + ', ' + this.id +' --Tavern] Keeping resources');
        return;
    }

    if (this.tavern.spy_prices[slot - 1].wood > this.resources.wood &&
        this.tavern.spy_prices[slot - 1].clay > this.resources.clay &&
        this.tavern.spy_prices[slot - 1].iron > this.resources.iron) {

        this.owner.emit(routeProvider.SCOUTING_RECRUIT, {
            'village_id' : this.id,
            slot: slot
        });

    }
};

Village.prototype.helpOtherResources = function() {
    var others = this.owner.needsResources();
    for (var i = others.length - 1; i >= 0; i--) {
        var village = others[i];
        if (village.id != this.id) {
            // TODO
        }
    }
};

Village.prototype.mintCoint = function() {
    if (this.buildings.academy.level > 0 &&
        this.isAtMaxStorage() &&
        this.resources.wood > 28000 &&
        this.resources.clay > 30000 &&
        this.resources.iron > 25000) {
        this.owner.emit(routeProvider.MINT_COINS, {
            'village_id' : this.id,
            'amount': 1
        });
    }
};

Village.prototype.withdrawSupportExceptFrom = function(villagesUnderAttack) {
    for (var i = this.military.awayArmies.length - 1; i >= 0; i--) {
        var army = this.military.awayArmies[i];
        if (!underscore.contains(underscore.pluck(villagesUnderAttack, 'id'), army.village.village_id)) {
            this.owner.emit(routeProvider.COMMAND_WITHDRAWSUPPORT, {
                'id' : army.id,
                'units': {}
            });
        }
    }
};


Village.prototype.displayReport = function() {
    console.log('============== Village [' + this.villageId + '] === X: ' + this.x + ' / Y: ' + this.y + ' ==============');

    var buildingsConstruction = {};
    if (this.inConstruction) {
        underscore.each(this.inConstruction.queue, function(queue) {
            buildingsConstruction[queue.building] = queue;
        });
    }

    if (this.buildings) {
        console.log('-----------------------Buildings-----------------------');
        underscore.each(this.buildings, function(building, buildingName) {
            var queue = buildingsConstruction[buildingName];
            if (queue) {
                console.log('> ', printf('% 15s', buildingName), ': ', printf('% 2d', building.level) + ' => ' + printf('% 2d', queue.level), '     [' + util.getTime(queue.time_completed) + ']');
            } else if (building.level > 0) {
                console.log('] ', printf('% 15s', buildingName), ': ', printf('% 2d', building.level));
            }
        });
    }

    this.displayResources();
    if (this.units) {
        var totalAttack = this.getTotalAttack();
        console.log('--------Units--' + printf(' % 6d in-town ', this.getInTownCapacity()) + '-' + printf(' % 8d atk ', totalAttack) + '---------');

        underscore.each(this.units.available_units, function(unit, unitName) {
            if (unit.total > 0 ) {
                var attack = util.unitsInformation[unitName].attack * unit.total;
                console.log('* ', printf('% 15s', unitName), ':', printf('% 4d', unit.in_town) + '/' + printf('%4d', unit.total), printf('% 10d atk', attack));
            }
        }.bind(this));
    }
    console.log('-----------------------Production----------------------');
    if (this.inConstruction) {
        underscore.each(this.inConstruction.queue, function(queue) {
            console.log('+ ', printf('% 15s', queue.building), ': ', printf('% 6d', queue.level), '         [' + util.getTime(queue.time_completed) + ']');
        });
    }
    if (this.units && this.units.queues) {
        underscore.each(this.units.queues.barracks, function(queue) {
            console.log('+ ', printf('% 15s', queue.unit_type), ':', printf('% 3d', queue.recruited) + '/' + printf('% 3d', queue.amount), '         [' + util.getTime(queue.time_completed) + ']');
        });
    }

    console.log('-----------------------Attacking----------------------');
    if (this.military) {
        underscore.each(this.military.outgoingArmies, function(army) {

            var units = [];
            underscore.each(army, function(value, name) {
                if (util.unitsInformation[name] && value > 0 ) {
                    units.push(name + ':' + value);
                }
            }.bind(this));

            console.log(army.direction == 'forward'? '---->' : '<----',
                printf('% 15s', (army.village.character_name || '').trunc(15)),
                '[' + util.getTime(army.time_completed) + ']',
                units.join(', '));
        }.bind(this));
    }

    this.displayBestTargets(10);

    console.log('========================================================');
};

Village.prototype.getTotalAttack = function() {
    return underscore.reduce(this.units.available_units, function(sum, unit, unitName) {
      return sum + util.unitsInformation[unitName].attack * unit.total;
    }, 0);
};

Village.prototype.getTotalDef = function(against) {
    return underscore.reduce(this.units.available_units, function(sum, unit, unitName) {
      return sum + util.unitsInformation[unitName]['def_' + against] * unit.total;
    }, 0);
};

Village.prototype.displayResources = function() {
    if (this.resources) {
        console.log('-----------------------Resources-----------------------');
        console.log('^ ', printf('% 15s', 'Maximum'), ':', printf('% 6d', Math.floor(this.storage)));
        underscore.each(this.resources, function(resourceCount, resourceName) {
            var productionRate = this.production_rates[resourceName];
            if (productionRate) {
                console.log('^ ', printf('% 15s', resourceName), ':', printf('% 6d', Math.floor(resourceCount)), '         [' + printf('% 4d', Math.floor(productionRate)) +'/h]');
            } else {
                console.log('^ ', printf('% 15s', resourceName), ':', printf('% 6d', Math.floor(resourceCount)));
            }
        }.bind(this));
    }
};

Village.prototype.displayBestTargets = function(limit) {
    console.log('-----------------------Targets----------------------');

    var targets = this.selectTargetsToAttack();
    if (limit) {
        targets = underscore.first(targets, limit);
    }

    underscore.each(targets, function(target) {
        var neighbour = target.neighbour;
        var distance = util.calculateDistance(this, neighbour);
        console.log(printf('% 15s', (neighbour.character_name || (''+neighbour.id)).trunc(15)),
            '[' + neighbour.x + ', ' + neighbour.y + ']',
            printf('% 5d', neighbour.points),
            '     [' +  printf('% 2.1f', distance) + ' blocks]',
            '  [' +  printf('% 10d', neighbour.expectedTotalResources()) + ' $]',
            '  [' + printf('% 5.f', target.resourcesRatio) + ']');
    }.bind(this));
};

Village.prototype.searchNeighbours = function(x, y) {
    var size =  50;
    this.owner.emit(routeProvider.MAP_GETVILLAGES, {
        'x' : Math.floor(x / size) * size,
        'y' : Math.floor(y / size) * size,
        'width' : size,
        'height' : size
    });
    this.owner.emit(routeProvider.MAP_GETVILLAGES, {
        'x' : Math.floor(x / size) * size + size,
        'y' : Math.floor(y / size) * size,
        'width' : size,
        'height' : size
    });
    this.owner.emit(routeProvider.MAP_GETVILLAGES, {
        'x' : Math.floor(x / size) * size - size,
        'y' : Math.floor(y / size) * size,
        'width' : size,
        'height' : size
    });
    this.owner.emit(routeProvider.MAP_GETVILLAGES, {
        'x' : Math.floor(x / size) * size,
        'y' : Math.floor(y / size) * size + size,
        'width' : size,
        'height' : size
    });
    this.owner.emit(routeProvider.MAP_GETVILLAGES, {
        'x' : Math.floor(x / size) * size,
        'y' : Math.floor(y / size) * size - size,
        'width' : size,
        'height' : size
    });
};

Village.prototype.isUpgrading = function(buildingName) {
    underscore.each(this.inConstruction.queue, function(queue) {
        if (queue.building == buildingName) {
            return true;
        }
    });
    return false;
};

Village.prototype.canUpgrade = function(buildingName) {
    var building = util.buildingsInformation[buildingName];

    var futurLevel = this.buildings[buildingName].level + 1;
    underscore.each(this.inConstruction.queue, function(queue) {
        if (queue.building == buildingName) {
            futurLevel += 1;
        }
    });

    if (futurLevel > building.max_level) {
        return false;
    }

    var required = {
        wood: Math.pow(building.wood_factor, futurLevel - 1) * building.wood,
        clay: Math.pow(building.clay_factor, futurLevel - 1) * building.clay,
        iron: Math.pow(building.iron_factor, futurLevel - 1) * building.iron,
        food: parseInt(Math.round(Math.pow(building.food_factor, futurLevel - 1) * building.food -
                                  Math.pow(building.food_factor, futurLevel - 2) * building.food), 10)
    };
    return underscore.every(required, function(amount, name){
        //console.log('can build', buildingName, name, this.resources[name] , amount);
        return this.resources[name] >= amount;
    }.bind(this));
};


Village.prototype.checkQuests = function() {
    underscore.each(this.questLines, function(questLine) {
        console.log('     Quest line:', questLine.name, '[Progress: ' + questLine.quest_line_progress + ']');
        underscore.each(questLine.quests, function(quest) {
            if (util.canFinishQuest(quest)) {
                console.log('     Finishing quest:', quest.quest_id, '[Type: ' + quest.type + ']');
                this.owner.emit(routeProvider.QUEST_FINISH_QUEST, {
                    village_id : this.id,
                    quest_id: quest.quest_id
                });
            }
        }.bind(this));

    }.bind(this));
};

Village.prototype.getMessages = function(limit) {
    limit = limit || this.messages.length;
    return underscore.first(underscore.sortBy(this.messages, function(message) {
        return -message.time;
    }), limit);
};

Village.prototype.getLatestRecruitingEnd = function() {
    var end = new Date().getTime() / 1000;
    underscore.each(this.units.queues.barracks, function(queue) {
        end = Math.max(end, queue.time_completed);
    });
    return end;
};

Village.prototype.timeUntilNextFreeRecruiting = function() {
    var now = new Date().getTime() / 1000;
    var end = now;
    underscore.each(this.units.queues.barracks, function(queue) {
        end = Math.max(end, queue.time_completed);
    });
    return end - now;
};

Village.prototype.isAtMaxStorage = function() {
    var upperLimit = (this.storage / 5 * 4);
    var lowerlimit = (this.storage / 2);
    return (this.resources.wood > upperLimit ||
            this.resources.clay > upperLimit ||
            this.resources.iron > upperLimit) &&
           !(this.resources.wood < lowerlimit ||
             this.resources.clay < lowerlimit ||
             this.resources.iron < lowerlimit);
};


Village.prototype.totalExpectedUnit = function(unitName) {
    var total = this.units.available_units[unitName].total;
    for (var i = this.units.queues.barracks.length - 1; i >= 0; i--) {
        var queue = this.units.queues.barracks[i];
        if (queue.unit_type == unitName) {
            total += queue.amount - queue.recruited;
        }
    }
    return total;
};

Village.prototype.selectBestRecruit = function() {
    var limitedResources = {
         wood: this.resources.wood,
         iron: this.resources.iron,
         clay: this.resources.clay,
         food: this.resources.food - Math.floor(this.timeUntilNextFreeRecruiting() / util.DAY * 10), // Always keep some food
    };
    var barracksLevel = this.buildings.barracks.level;
    return underscore.chain(util.unitsInformation)
        .filter(function(unitInfo){
            return unitInfo.required_level <= barracksLevel &&
                unitInfo.load > 0 &&
                unitInfo.building == 'barracks' &&
                util.maxRecruits(unitInfo, limitedResources) > 5;
        }.bind(this)).map(function(unitInfo) {
            var max_recruits = util.maxRecruits(unitInfo, limitedResources);
            var currentCount = this.totalExpectedUnit(unitInfo.name);
            var cost = unitInfo.iron + unitInfo.wood + unitInfo.clay;
            return {
                name: unitInfo.name,
                cost: cost,
                load: unitInfo.load,
                speed: unitInfo.speed,
                attack: unitInfo.attack,
                max_recruits: max_recruits,
                ratio: (currentCount+max_recruits) / util.UnitPriorities[unitInfo.name]
                //ratio: unitInfo.load * 2 + unitInfo.attack - unitInfo.speed*3 - cost/10 + max_recruits/3 - unitInfo.build_time / 80
                /*unitInfo.load / (unitInfo.iron + unitInfo.wood + unitInfo.clay) /  unitInfo.speed  * unitInfo.attack * max_recruits*/
            };
        }.bind(this)).sortBy(function(data) {
            return data.ratio;
        }).value();
};

Village.prototype.recruit = function() {
    if (!this.isReady()) {
        return;
    }
    /*if (this.inConstruction.queue.length < 2 ) { // Don't recruit unless you have enough money to build first.
        console.log('[' + this.world.id + ', ' + this.id +' --Recruit] Keeping resources');
        return;
    }*/

    if (this.units.queues.barracks.length > 2) {
        console.log('[' + this.world.id + ', ' + this.id +' --Recruit] Already enough recruiting');
        if (!this.isAtMaxStorage() || this.inConstruction.queue.length < 1) {
            return;
        }
        console.log('[' + this.world.id + ', ' + this.id +' --Recruit] Forcing to train to spend max capacity resources');
    }
    if (this.resources.food < (this.power('farm') / 20) || this.resources.food < 50) {
        console.log('[' + this.world.id + ', ' + this.id +' --Recruit] Missing food');
        return;
    }
    var unitsToBuild = this.selectBestRecruit();
    if (underscore.isEmpty(unitsToBuild)) {
        console.log('[' + this.world.id + ', ' + this.id +' --Recruit] No units to recruit');
        return;
    }
    //console.log('[' + this.world.id + ', ' + this.id +' --Recruit] ', JSON.parse(JSON.stringify(unitsToBuild)));

    var bestUnitToBuild = underscore.first(unitsToBuild);
    //console.log('[' + this.world.id + ', ' + this.id +' --Recruit] ', JSON.parse(JSON.stringify(bestUnitToBuild)));
    //
    /*var bestCount = this.isAtMaxStorage() ?
                    bestUnitToBuild.max_recruits :
                    Math.floor(bestUnitToBuild.max_recruits * 2 / 3);*/
    var bestCount = Math.min(Math.floor(bestUnitToBuild.max_recruits), 100);
    this.barracksRecruit(bestUnitToBuild.name, bestCount);
};


Village.prototype.isMaxLevel = function(buildingName) {
    var building = util.buildingsInformation[buildingName];
    var buildingLevel = this.buildings[buildingName].level;

    if (buildingLevel >= building.max_level) {
        return true;
    }
    return false;
}

Village.prototype.shouldBuild = function(buildingName, level) {
    var hqLevel = this.buildings.headquarter.level;
    var hqMax = (hqLevel == util.buildingsInformation.headquarter.max_level)
    var barracksLevel = this.buildings.barracks.level;
    var farmLevel = this.buildings.farm.level;
    var warehouseLevel = this.buildings.warehouse.level;
    var resourceLevel = Math.min(this.buildings.timber_camp.level,
                                 this.buildings.clay_pit.level,
                                 this.buildings.iron_mine.level);
    switch (buildingName) {
        case 'headquarter': return (barracksLevel > (hqLevel-1) / 1.4 || barracksLevel == 25) &&
                                   farmLevel > hqLevel - 2 &&
                                   resourceLevel > hqLevel - 2 &&
                                   warehouseLevel > hqLevel - 2;

        case 'barracks': return level < hqLevel;
        case 'farm': return level < hqLevel || this.resources.food <= 10;
        case 'warehouse': return level < hqLevel;

        case 'timber_camp': return level < 7 || level <= hqLevel + 2;
        case 'clay_pit': return level < 7 || level <= hqLevel + 2;
        case 'iron_mine': return level < 7 || level <= hqLevel + 2;

        case 'church': return hqLevel >= 10 && this.buildings.church.level < 1;
        case 'market': return hqLevel > 20 && (level <= (hqLevel / 2) || hqMax);
        case 'preceptory': return hqLevel >= 25;
        case 'rally_point': return hqLevel > 20;

        case 'hospital': return hqLevel > 10 && level <= (hqLevel / 2);
        case 'statue': return hqLevel > 10 && level <= (hqLevel / 6);
        case 'tavern': return hqLevel > 10 && level <= (hqLevel / 2);
        case 'wall': return hqLevel > 10 && level <= (hqLevel / 1.2) || this.underAttack;

        case 'academy': return true;
        case 'chapel': return true;
    }
    return true;
};


Village.prototype.selectBestConstruction = function() {
    var headquarterLevel = this.buildings.headquarter.level;
    var constructionLevels = {};
    underscore.each(this.buildings, function(building, name) {
        constructionLevels[name] = building.level;
    });

    underscore.each(this.inConstruction.queue, function(queue) {
        constructionLevels[queue.building] += 1;
    });

    return underscore.chain(util.buildingsInformation)
        .filter(function(buildingInfo){
            return buildingInfo.required_level <= headquarterLevel &&
                this.canUpgrade(buildingInfo.id) &&
                this.shouldBuild(buildingInfo.id, constructionLevels[buildingInfo.id] + 1) &&
                !this.isUpgrading(buildingInfo.id);
        }.bind(this)).map(function(buildingInfo) {
            var nextLevel = constructionLevels[buildingInfo.id] + 1;
            var time = this.world.totalUpgradeTime(buildingInfo.id, nextLevel, headquarterLevel);
            var cost = this.world.totalUpgradeCost(buildingInfo.id, nextLevel);
            return {
                id: buildingInfo.id,
                level: nextLevel,
                time: Math.floor(time),
                cost: Math.floor(cost),
                priority: 0 - this.world.totalUpgradeTime(buildingInfo.id, nextLevel, headquarterLevel)
                //priority: /*Math.floor(nextLevel/util.BuildingPriorities[buildingInfo.id])*/ 0 - Math.floor(cost/time*10)
            };
        }.bind(this)).sortBy(function(data) {
            return data.priority;
        }).value();
};

Village.prototype.build = function() {
    if (!this.isReady()) {
        return;
    }
    if (this.inConstruction.queue.length >= 2) {
        console.log('[' + this.world.id + ', ' + this.id +' --Build] Already enough construction');
        return;
    }

    if (this.getTotalResources() >= this.storage * 2 &&
        !this.isUpgrading('warehouse') && !this.isMaxLevel('warehouse')) {
        if (!this.canUpgrade('warehouse')) {
            console.log('[' + this.world.id + ', ' + this.id +' --Build] Warehouse is required, not enough resources for it.');
            return;
        }
    }

    if ((this.resources.food < util.buildingPower('farm', this.buildings.farm.level) / 10 ||
         this.resources.food < 50) && this.timeUntilNextFreeRecruiting() < 3 * util.DAY &&
         !this.isUpgrading('farm') && !this.isMaxLevel('farm')) {
        if (!this.canUpgrade('farm')) {
            console.log('[' + this.world.id + ', ' + this.id +' --Build] Farm is required, not enough resources for it.');
            return;
        }
    }

    var buildingsToBuild = this.selectBestConstruction();
    if (underscore.isEmpty(buildingsToBuild)) {
        console.log('[' + this.world.id + ', ' + this.id +' --Build] No buildings to build');
        return;
    }
    console.log('[' + this.world.id + ', ' + this.id +' --Build]', JSON.parse(JSON.stringify(buildingsToBuild)));

    var bestBuildingToBuild = underscore.first(buildingsToBuild);
    //console.log('[BLD Brain] ', JSON.parse(JSON.stringify(bestBuildingToBuild)));

    this.upgradeBuilding(bestBuildingToBuild.id);
};

Village.prototype.getTotalResources = function() {
    return this.resources.wood + this.resources.clay + this.resources.iron;
};

Village.prototype.selectTargetsToAttack = function(limit) {

    var neighboursInAttack = {};
    if (this.military) {
        underscore.each(this.military.outgoingArmies, function(army) {
            if (army.direction != 'back') {
                neighboursInAttack[army.village.village_id] = army;
            }
        });
    }

    var nextConstruction = this.inConstruction && this.inConstruction.queue[0];
    var minDistance = 0;
    if (nextConstruction &&
        this.resources.wood >= this.storage * 0.9 &&
        this.resources.iron >= this.storage * 0.9 &&
        this.resources.clay >= this.storage * 0.9) {
        var time = nextConstruction.time_completed - (new Date().getTime() / 1000);
        minDistance = time / 60; /*minutes*/
        minDistance /= 14; /* max speed per tiles */
        minDistance /= 2; /* round trip */
    }

    var targets = underscore.map(this.world.neighbourhood, function(neighbour) {
        var distance = util.calculateDistance(this, neighbour);
        var expectedTotalResources = neighbour.expectedTotalResources();
        var maxToSteal = Math.min(this.getInTownCapacity(), expectedTotalResources);
        return {
            distance: distance,
            expectedTotalResources: expectedTotalResources,
            resourcesRatio : expectedTotalResources / distance ,
            maxToSteal : maxToSteal / distance ,
            neighbour: neighbour
        };
    }.bind(this)).filter(function(container) {
        return !container.neighbour.isDangerous &&
               !container.neighbour.beginner_protection &&
               container.neighbour.id != this.villageId &&
               !container.neighbour.character_id &&
               !neighboursInAttack[container.neighbour.id] &&
               container.distance >= minDistance &&
               container.distance <= 35;
    }.bind(this));

    var sortedTargets = underscore.sortBy(targets, function(target){
        return -target.maxToSteal * 100000 - target.expectedTotalResources - target.distance;
    });

    if (limit) {
        return underscore.first(sortedTargets, limit);
    }
    return sortedTargets;
};


Village.prototype.chooseMilitaryStrategy = function() {

    if (this.attackMode != 'on') {
        return;
    }

    if (this.underAttack) {
        this.withdrawSupportExceptFrom([]);
        return;
    }

    var villagesUnderAttack = this.world.needsHelp();
    var villagesToHelp = [];
    for (var i = villagesUnderAttack.length - 1; i >= 0; i--) {
        var villageUnderAttack = villagesUnderAttack[i];
        var timeToHelp = util.calculateDistance(this, villageUnderAttack) * 14 * 60;
        var timeToArrive = timeToHelp + (new Date().getTime() / 1000);
        for (var j = villageUnderAttack.incomingCommands.length - 1; j >= 0; j--) {
             var command = villageUnderAttack.incomingCommands[j];
             if (command.time_completed > timeToArrive) {
                villagesToHelp.push(villageUnderAttack);
                break;
             }
        }
    }

    this.withdrawSupportExceptFrom(villagesUnderAttack);

    if (villagesToHelp.length > 0) {
        villagesToHelp = underscore.sortBy(villagesToHelp, function(villageToHelp) {
            return util.calculateDistance(this, villageToHelp);
        }.bind(this));
        this.support(villagesToHelp[0]);
    } else {
        this.attack();
    }
};

Village.prototype.support = function(otherVillage) {

    var army = {};
    var unitsCount = 0;

    underscore.each(util.unitsInformation, function(unitInfo) {
        var availabeUnits = this.units.available_units[unitInfo.name].in_town;
        if (availabeUnits.in_town === 0 ||
            (!unitInfo.def_kav && !unitInfo.def_inf && !unitInfo.def_arc)) {
            return;
        }
        army[unitInfo.name] = availabeUnits;
        unitsCount += availabeUnits;
    }.bind(this));

    if (unitsCount < 10) {
        return;
    }

    this.sendCustomArmy('support', otherVillage.id, army);
};

Village.prototype.attack = function() {

    if (this.attackMode != 'on') {
        return;
    }
    // If enough atk capacity
    // List all village :
    //   * not being attacked
    //   * with expected capacity > storage / 10;
    //
    //
    if (this.getInTownCapacity() < this.storage / 10) {
        console.log('[' + this.world.id + ', ' + this.id +' --Attack] Not enough units to attack');
        return;
    }
    /*if (this.resources.wood >= this.storage * 0.95 &&
        this.resources.iron >= this.storage * 0.95 &&
        this.resources.clay >= this.storage * 0.95) {
        console.log('[' + this.world.id + ', ' + this.id +' --Attack] Storage is full, waiting for further attacks');
        return;
    }*/

    console.log('[' + this.world.id + ', ' + this.id +' --Attack] Current Capacity ', this.getInTownCapacity(), ' with storage', this.storage);
    console.log('[' + this.world.id + ', ' + this.id +' --Attack] Pending Army:');
    underscore.each(this.units.available_units, function(units, name){
        if (units.in_town > 0) {
            console.log('                           ', printf('%15s: %5d', name, units.in_town));
        }
    });



    var targets = this.selectTargetsToAttack();

    if (!targets) {
        //this.extendNeighbourhoods(); // TO REIMPLEMENT
        return;
    }

    var bestTarget = underscore.first(targets);

    //console.log('[' + this.world.id + ', ' + this.id +' --Attack] target:', JSON.parse(JSON.stringify(bestTarget)));
    var UnitsInfoBySpeed = underscore.sortBy(util.unitsInformation, function(unit) {
        return unit.speed;
    });

    var army = {};

    var expectedLeftResources = bestTarget.expectedTotalResources;
    var blockRange = Math.floor(bestTarget.distance / 6);
    if (blockRange >= 2) {
        expectedLeftResources = expectedLeftResources * 0.6;
    } else if (blockRange === 1) {
        expectedLeftResources = expectedLeftResources * 0.8;
    }
    var currentCount = 0;
    var slowest = 0;
    underscore.each(UnitsInfoBySpeed, function(unitInfo) {
        var availabeUnits = this.units.available_units[unitInfo.name];
        if (availabeUnits.in_town === 0 || !unitInfo.load ||
            expectedLeftResources < unitInfo.load * 5) {
            return;
        }
        //console.log('[' + this.world.id + ', ' + this.id +' --Attack] target:', expectedLeftResources, unitInfo.name, expectedLeftResources / unitInfo.load);
        var requiredUnits = Math.floor(expectedLeftResources / unitInfo.load);
        var unitToUse = Math.min(requiredUnits, availabeUnits.in_town);
        if (unitInfo.speed > slowest && unitToUse < currentCount/5) {
            return;
        }
        slowest = Math.max(unitInfo.speed, slowest);
        currentCount += unitToUse;
        army[unitInfo.name] = unitToUse;
        expectedLeftResources -= army[unitInfo.name] * unitInfo.load;
    }.bind(this));

    if (underscore.isEmpty(army)) {
        console.log('[' + this.world.id + ', ' + this.id +' --Attack] No army to send');
        return;
    }

    console.log('[' + this.world.id + ', ' + this.id +' --Attack] Expecting ', bestTarget.expectedTotalResources, 'from ', bestTarget.neighbour.id);
    console.log('[' + this.world.id + ', ' + this.id +' --Attack] Sending ', JSON.stringify(army));
    console.log('[' + this.world.id + ', ' + this.id +' --Attack] Will be left ', expectedLeftResources);

    if (!conf.ATTACK_MODE) {
        console.log('[' + this.world.id + ', ' + this.id +' --Attack] No attack: MODE is off');
        return;
    }

    this.sendCustomArmy('attack', bestTarget.neighbour.id, army);

    this.chooseMilitaryStrategy(); // Starts another attack

    //console.log('Sending Army', JSON.parse(JSON.stringify(army)));
    //console.log('to', JSON.parse(JSON.stringify(bestTarget)));

};

Village.prototype.onEvent = function(event) {
    var wasReady = this.isReady();
    this.receivedEvents[event] = true;

    //console.log('Received event', event, 'for village', this.id, arguments);
    this.emitter.emit.apply(this.emitter, arguments);
    if (!wasReady && this.isReady()) {
        this.emitter.emit('Village/Ready', this);
    }

};

Village.prototype.getInTownCapacity = function() {
    var capacity = 0;
    underscore.each(this.units.available_units, function(unit, unitName) {
        capacity += util.unitsInformation[unitName].load * unit.in_town;
    }.bind(this));
    return capacity;
};

Village.prototype.isReady = function() {
    return  this.receivedEvents[eventTypeProvider.VILLAGE] &&
            this.receivedEvents[eventTypeProvider.BUILDING_QUEUE] &&
            this.receivedEvents[eventTypeProvider.VILLAGE_UNIT_INFO];
};

Village.prototype.barracksRecruit = function(type, amount, callback) {
    this.owner.emit(routeProvider.BARRACKS_RECRUIT, {
        village_id: this.id,
        unit_type: type,
        amount: amount
    }, function(data) {
        if (data.error_code) {
            console.log('Failed to recruit ' +  amount + ' ' + type, data.error_code);
        } else {
            console.log('[' + this.world.id + ', ' + this.id +' ***** INFO] Recruiting', amount, type, 'until', new Date(data.time_completed));
        }
        if (callback) callback(data);
    }.bind(this));
};

Village.prototype.upgradeBuilding = function(buildingName, callback) {
    this.owner.emit(routeProvider.VILLAGE_UPGRADE_BUILDING, {
        building: buildingName,
        village_id: this.id,
        location: 'hq',
        premium: false
    } , function(data) {
        if (data.error_code) {
            console.log('Failed to build ' +  buildingName, data.error_code);
        } else {
            console.log('[' + this.world.id + ', ' + this.id +' ***** INFO] Building', buildingName, 'until', new Date(data.time_completed));
        }
        if (callback) callback(data);
    }.bind(this));
};

Village.prototype.sendCustomArmy = function(commandType, targetId, units) {
    this.owner.emit(routeProvider.SEND_CUSTOM_ARMY, {
        'start_village'     : this.id,
        'target_village'    : targetId,
        'type'              : commandType,
        'units'             : units,
        'icon'              : 0,
        'officers'          : {},
        'catapult_target'   : {}
    });
};

Village.prototype.summonPaladin = function() {
    if (this.units.available_units.knight.total === 0 &&
        this.buildings.statue.level > 0) {
        this.owner.emit(routeProvider.STATUE_RECRUIT, {
            village_id: this.id,
            unit_type: 'knight',
            amount: 1
        });
    }
};



/********* MAIN *********/
/************************/

var accounts = {};
var worlds = {};

process.stdin.on('keypress', function (ch, key) {
  if (key && key.name == 'v') {
    underscore.each(accounts, function(account) {
        underscore.each(account.characters, function(character) {
            underscore.each(character.villages, function(village) {
                village.displayReport();
            });
        });
    });
  }
  if (key && key.name == 'r') {
    underscore.each(accounts, function(account) {
        underscore.each(account.characters, function(character) {
            underscore.each(character.villages, function(village) {
                village.displayResources();
            });
        });
    });
  }
  if (key && key.name == 'b') {
    underscore.each(accounts, function(account) {
        underscore.each(account.characters, function(character) {
            underscore.each(character.villages, function(village) {
                village.displayBestTargets();
            });
        });
    });
  }
  if (key && key.ctrl && key.name == 'c') {
    process.exit(0);
  }
});

process.stdin.setRawMode(true);
process.stdin.resume();

var characterCount = 0;
underscore.each(conf.accounts, function(accountInfo) {
    accounts[accountInfo.name] = new Account(accountInfo.name, accountInfo.password);
    var account = accounts[accountInfo.name];
    underscore.each(accountInfo.characters, function(characterInfo) {
        if (!worlds[characterInfo.world]) {
            worlds[characterInfo.world] = new World(characterInfo.world);
        }
        var world = worlds[characterInfo.world];


        underscore.delay(function() {
            account.characters[characterInfo.world] = new Character(accountInfo.id, account, world, characterInfo);
        }, characterCount * 30000);
        characterCount += 1;
    });
});


function findVillage(villageId) {

    for (var accountId in accounts) {
        var account = accounts[accountId];
        for (var characterId in account.characters) {
            var character = account.characters[characterId];
            for (var villageid in character.villages) {
                var village = character.villages[villageid];
                if (village.id == villageId) {
                    return village;
                }
            }
        }
    }
}

var app = express();
app.get('/', function (req, res) {

    var html = jade.renderFile('tw2-web.jade', {
        accounts: accounts,
        util: util
    });

    res.send(html);
});

app.get('/village/:villageId/attack/:state', function (req, res) {
    var villageId = req.params && req.params.villageId;
    var state = req.params && req.params.state;
    var village = findVillage(villageId);


    if (village) {
        console.log('found village:' , villageId, 'set attackMode to', state);
        village.attackMode = state;
    } else {
        console.log('NOT FOUND village:' , villageId);
    }

    res.redirect('/');
});

var server = app.listen(7700, function () {

  var host = server.address().address;
  var port = server.address().port;

  console.log('Example app listening at http://%s:%s', host, port);

});