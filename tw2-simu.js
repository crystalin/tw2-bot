/*global require,console,process*/
'use strict';


var keypress = require('keypress');
keypress(process.stdin);

//var nodemailer = require('nodemailer');

var moment = require('moment');
var newVillageJson = require('./tw2-new-village.json');
var buildingsInfoJson = require('./tw2-buildings-info.json');
var unitsInfoJson = require('./tw2-units-info.json');
var underscore = require('underscore');
var routeProvider = require('./routes.js');
var printf = require('printf');


var currentTime = 0;

String.prototype.trunc = String.prototype.trunc ||
    function(n){
        return this.length>n ? this.substr(0,n-1)+'&hellip;' : this;
    };

var util = {};

util.HOUR = 60 * 60;
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

util.buildingPower = function(buildingName, level) {
    var building = util.buildingsInformation[buildingName];
    return Math.pow(building.function_factor, level - 1) * building.function;
};

util.buildingCost = function(buildingName, level, type) {
    if (!type) {
        return;
    }
    var building = util.buildingsInformation[buildingName];
    return Math.pow(building[type+'_factor'], level - 1) * building[type];
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
};

util.BuildingPriorities = { // Equivalent to level factor
    academy: 20,
    barracks: 50,
    chapel: 0.2,
    church: 0.2,
    clay_pit: 1.2,
    farm: 1.2,
    headquarter: 50,
    hospital: 0.2,
    iron_mine: 1.2,
    market: 0.2,
    preceptory: 0.3,
    rally_point: 0.3,
    statue: 0.3,
    tavern: 0.8,
    timber_camp: 1.2,
    wall: 1,
    warehouse: 1.2,
};

util.ImportantBuildings = {
    academy: 0,
    barracks: 1,
    chapel: 0,
    church: 0,
    clay_pit: 1,
    farm: 1,
    headquarter: 1,
    hospital: 0,
    iron_mine: 1,
    market: 0,
    preceptory: 0,
    rally_point: 0,
    statue: 0,
    tavern: 0,
    timber_camp: 1,
    wall: 0,
    warehouse: 1,
};

util.UnitPriorities = { // Equivalent to level factor
    spear : 1,
    sword: 0.3,
    axe: 2.3,
    archer: 0.6,
    light_cavalry: 1,
    mounted_archer: 0.8,
    heavy_cavalry: 0.1,
    ram: 0.01,
    catapult: 0.01,
    knight: 0,
    snob: 0,
    trebuchet: 0,
    doppelsoldner: 0,
};

util.StartingGuide = [
   'timber_camp',
   'clay_pit',
   'iron_mine',
   'timber_camp',
   'clay_pit',
   'iron_mine',
   'timber_camp',
   'clay_pit',
   'iron_mine',
   'barracks',
   'warehouse',
   'timber_camp',
   'clay_pit',
   'iron_mine',
   'timber_camp',
   'clay_pit',
   'iron_mine',
   'barracks',
   'farm',
   'warehouse',
];


util.buildingsInformation = buildingsInfoJson;
util.unitsInformation = unitsInfoJson;


var World = {};

World.totalUpgradeTime = function(buildingName, level, hqLevel) {
    var building = util.buildingsInformation[buildingName];

    var hqFactor = util.buildingPower('headquarter', hqLevel);

    var baseTime = building.build_time *
        Math.pow(building.build_time_factor,
                 level + building.build_time_offset / level);


    return  parseInt(Math.round(Math.round(baseTime) * hqFactor), 10);
};

World.totalUpgradeCost = function(buildingName, level) {
    var building = util.buildingsInformation[buildingName];
    var required = {
        wood: Math.pow(building.wood_factor, level - 1) * building.wood,
        clay: Math.pow(building.clay_factor, level - 1) * building.clay,
        iron: Math.pow(building.iron_factor, level - 1) * building.iron,
        food: Math.pow(building.food_factor, level - 1) * building.food
    };
    return required.wood + required.clay + required.iron;
};

World.timeToRecruit = function(unitName, barracksLevel) {
    var unit = util.unitsInformation[unitName];
    return unit.build_time * util.buildingPower('barracks', barracksLevel);
};

function Village(data, characterInfo) {

    this.events = [];
    this.units = {};
    this.messages = [];
    this.questLines = {};
    this.buildings = {};
    this.inConstruction = {
        queue: []
    };
    this.resources = {};
    this.receivedEvents = {};
    this.buildingsInNeed = {};
    this.incomingCommands = [];
    this.neighboursExtension = 0;
    this.isStarting = false;
    this.startingStep = 0;
    this.underAttack = false;
    this.attackMode = characterInfo && characterInfo.attackMode || 'on';

    underscore.extend(this, data);

    console.log('[Village ' + this.id, '] Created');
}


Village.prototype.recruitSpy = function() {
    if (!this.tavern) {
        return;
    }

    var slot = this.nextSpyToRecruit();
    if (slot > 5) {
        return;
    }

    var totalCost = this.tavern.spy_prices[slot - 1].wood +
                    this.tavern.spy_prices[slot - 1].clay +
                    this.tavern.spy_prices[slot - 1].iron;
    if (totalCost > this.getTotalResources() / 4) {
        //console.log('[' + this.id +' --Tavern] Keeping resources');
        return;
    }

    if (this.tavern.spy_prices[slot - 1].wood > this.storage.wood &&
        this.tavern.spy_prices[slot - 1].clay > this.storage.clay &&
        this.tavern.spy_prices[slot - 1].iron > this.storage.iron) {

        this.owner.emit(routeProvider.SCOUTING_RECRUIT, {
            'village_id' : this.id,
            slot: slot
        });

    }
};

Village.prototype.getTotalAttack = function() {
    return underscore.reduce(this.units.available_units, function(sum, unit, unitName) {
      return sum + util.unitsInformation[unitName].attack * unit.total;
    }, 0);
};

Village.prototype.getTotalLoad = function() {
    return underscore.reduce(this.units.available_units, function(sum, unit, unitName) {
      return sum + util.unitsInformation[unitName].load * unit.total;
    }, 0);
};

Village.prototype.getTotalDef = function(against) {
    return underscore.reduce(this.units.available_units, function(sum, unit, unitName) {
      return sum + util.unitsInformation[unitName]['def_' + against] * unit.total;
    }, 0);
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
        food: Math.pow(building.food_factor, futurLevel - 1) * building.food
    };
    return underscore.every(required, function(amount, name){
        //console.log('can build', buildingName, name, this.resources[name] , amount);
        return this.resources[name] >= amount;
    }.bind(this));
};

Village.prototype.getLatestRecruitingEnd = function() {
    var end = currentTime;
    underscore.each(this.units.queues.barracks.queue, function(queue) {
        end = Math.max(end, queue.time_completed);
    });
    return end;
};

Village.prototype.timeUntilNextFreeRecruiting = function() {
    var now = currentTime;
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

Village.prototype.selectBestRecruit = function() {
    var limitedResources = {
         wood: this.resources.wood,
         iron: this.resources.iron,
         clay: this.resources.clay,
         food: this.resources.food - Math.floor(this.timeUntilNextFreeRecruiting() / util.DAY * 50), // Always keep some food
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
            var currentCount = this.units.available_units[unitInfo.name].total;
            var cost = unitInfo.iron + unitInfo.wood + unitInfo.clay;
            return {
                name: unitInfo.name,
                cost: cost,
                unitInfo: unitInfo,
                load: unitInfo.load,
                speed: unitInfo.speed,
                attack: unitInfo.attack,
                build_time: unitInfo.build_time,
                max_recruits: max_recruits,
                ratio: (currentCount+max_recruits) / util.UnitPriorities[unitInfo.name]
                /*unitInfo.load / (unitInfo.iron + unitInfo.wood + unitInfo.clay) /  unitInfo.speed  * unitInfo.attack * max_recruits*/
            };
        }.bind(this)).sortBy(function(data) {
            return data.ratio;
        }).value();
};

Village.prototype.recruit = function() {
    if (this.isStarting) {
        return;
    }
    if (this.getTotalResources() < this.storage ) { // Don't recruit unless you have enough money to build first.
        //console.log('[' + this.id +' --Recruit] Keeping resources');
        return;
    }

    if (this.units.queues.barracks.length > 2) {
        //console.log('[' + this.id +' --Recruit] Already enough recruiting');
        if (!this.isAtMaxStorage() || this.inConstruction.queue.length < 1 || underscore.size(this.buildingsInNeed) > 0) {
            return;
        }
        //console.log('[' + this.id +' --Recruit] Forcing to train to spend max capacity resources');
    }
    if (this.resources.food < util.buildingPower('farm', this.buildings.farm) / 10 &&
        this.resources.food < 100 && this.timeUntilNextFreeRecruiting() > 4 * util.DAY) {
        //console.log('[' + this.id +' --Recruit] Missing food');
        return;
    }
    var unitsToBuild = this.selectBestRecruit();
    if (underscore.isEmpty(unitsToBuild)) {
        //console.log('[' + this.id +' --Recruit] No units to recruit');
        return;
    }
    //console.log('[' + this.id +' --Recruit] ', JSON.parse(JSON.stringify(unitsToBuild)));

    var bestUnitToBuild = underscore.first(unitsToBuild);
    //console.log('[' + this.id +' --Recruit] ', JSON.parse(JSON.stringify(bestUnitToBuild)));

    var bestCount = Math.min(Math.floor(bestUnitToBuild.max_recruits * 2 / 3), 50);

    this.events.push({
        time: currentTime,
        type: 'recruiting',
        name: bestUnitToBuild.name,
        count: bestCount
    });

    this.resources.iron -= bestUnitToBuild.unitInfo.iron * bestCount;
    this.resources.clay -= bestUnitToBuild.unitInfo.clay * bestCount;
    this.resources.wood -= bestUnitToBuild.unitInfo.wood * bestCount;
    this.resources.food -= bestUnitToBuild.unitInfo.food * bestCount;

    this.units.queues.barracks.push({
        recruited: 0,
        amount: bestCount,
        unit_type: bestUnitToBuild.name,
        end_time: currentTime + World.timeToRecruit(bestUnitToBuild.name, this.buildings.barracks.level)
    });
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
            if (!util.ImportantBuildings[buildingInfo.id]) {
                return false;
            }
            return buildingInfo.required_level <= headquarterLevel &&
                constructionLevels[buildingInfo.id] <= buildingInfo.max_level &&
                this.canUpgrade(buildingInfo.id) &&
                !this.isUpgrading(buildingInfo.id);
        }.bind(this)).map(function(buildingInfo) {
            var nextLevel = constructionLevels[buildingInfo.id] + 1;
            var time = World.totalUpgradeTime(buildingInfo.id, nextLevel, headquarterLevel);
            var cost = World.totalUpgradeCost(buildingInfo.id, nextLevel);
            return {
                id: buildingInfo.id,
                buildingInfo: buildingInfo,
                level: nextLevel,
                time: time,
                cost: Math.floor(cost),
                priority: 0 - cost/time*util.BuildingPriorities[buildingInfo.id]
            };
        }.bind(this)).sortBy(function(data) {
            return data.priority;
        }).value();
};

Village.prototype.build = function() {
    if (this.inConstruction.queue.length >= 2) {
        //console.log('[' + this.id +' --Build] Already enough construction');
        return;
    }
    var bestBuildingToBuild = null;

    if (this.isStarting) {
        var buildingName = util.StartingGuide[this.startingStep];
        console.log('Starting pack ', this.startingStep, '=>', buildingName);
        if (this.canUpgrade(buildingName)) {
            bestBuildingToBuild = {
                id: buildingName,
                level: this.buildings[buildingName].level + 1,
                buildingInfo: util.buildingsInformation[buildingName]
            };
            this.startingStep += 1;
            if (this.startingStep >= util.StartingGuide.length) {
                this.isStarting = false;
            }
        } else {
          //  console.log('Starting pack: waiting for resources', JSON.stringify(this.resources));
        }
        return;
    }

    if (this.getTotalResources() >= this.storage * 2 &&
        !this.isUpgrading('warehouse')) {
        //this.buildingsInNeed.warehouse = true;
        if (!this.canUpgrade('warehouse')) {
            //console.log('[' + this.id +' --Build] Warehouse is required, not enough resources for it.');
            return;
        }
    }

    if ((this.resources.food < util.buildingPower('farm', this.buildings.farm.level) / 10 ||
         this.resources.food < 200) && this.timeUntilNextFreeRecruiting() < 3 * util.DAY &&
         !this.isUpgrading('farm')) {
        this.buildingsInNeed.farm = true;
        if (!this.canUpgrade('farm')) {
            //console.log('[' + this.id +' --Build] Farm is required, not enough resources for it.');
            return;
        }
    }

    if (!bestBuildingToBuild) {
        var buildingsToBuild = this.selectBestConstruction();
        if (underscore.isEmpty(buildingsToBuild)) {
            //console.log('[' + this.id +' --Build] No buildings to build');
            return;
        }
        //console.log('[' + this.id +' --Build]', JSON.parse(JSON.stringify(buildingsToBuild)));

        bestBuildingToBuild = underscore.first(buildingsToBuild);
    }
    //console.log('[BLD Brain] ', JSON.parse(JSON.stringify(bestBuildingToBuild)));

    this.events.push({
        time: currentTime,
        type: 'building',
        name: bestBuildingToBuild.id,
        level: bestBuildingToBuild.level
    });

    this.resources.iron -= bestBuildingToBuild.buildingInfo.iron;
    this.resources.clay -= bestBuildingToBuild.buildingInfo.clay;
    this.resources.wood -= bestBuildingToBuild.buildingInfo.wood;
    this.resources.food -= bestBuildingToBuild.buildingInfo.food;

    this.inConstruction.queue.push({
        building: bestBuildingToBuild.id,
        start_time: currentTime
    });
};

Village.prototype.getTotalResources = function() {
    return this.resources.wood + this.resources.clay + this.resources.iron;
};

Village.prototype.getInTownCapacity = function() {
    var capacity = 0;
    underscore.each(this.units.available_units, function(unit, unitName) {
        capacity += util.unitsInformation[unitName].load * unit.in_town;
    }.bind(this));
    return capacity;
};


Village.prototype.power = function(name) {
    return util.buildingPower(name, this.buildings[name].level);
};

Village.prototype.cost = function(name, type) {
    return util.buildingCost(name, this.buildings[name].level, type);
};

Village.prototype.update = function(seconds) {
    currentTime += seconds;

    while (this.inConstruction.queue.length > 0) {
        var inConstruction = this.inConstruction.queue[0];
        var building = this.buildings[inConstruction.building];
        var hqLevel = this.buildings.headquarter.level;
        if (inConstruction.start_time + World.totalUpgradeTime(inConstruction.building, building.level + 1, hqLevel) < currentTime) {
            building.level += 1;
            this.inConstruction.queue.shift();
            if (this.inConstruction.queue[0]) {
                this.inConstruction.start_time = currentTime;
            }
        } else {
            break;
        }
    }


    while (this.units.queues.barracks.length > 0) {
        var recruiting = this.units.queues.barracks[0];
        var barracksLevel = this.buildings.barracks.level;
        if(recruiting.end_time < currentTime) {
            this.units.available_units[recruiting.unit_type].in_town += 1;
            this.units.available_units[recruiting.unit_type].total += 1;
            recruiting.recruited += 1;
            if (recruiting.recruited == recruiting.amount) {
                console.log('done recruiting', recruiting.recruited, recruiting.unit_type);
                this.units.queues.barracks.shift();
                recruiting = this.units.queues.barracks[0];
            }

            if (recruiting) {
                recruiting.end_time = currentTime + World.timeToRecruit(recruiting.unit_type, barracksLevel);
            }
        } else {
            break;
        }
    }


    var averageSteal = village.getTotalLoad() / 3 / 3600 / 4 * seconds;

    this.storage = this.power('warehouse');
    this.resources.wood = Math.min(this.storage, this.resources.wood + this.power('timber_camp') / 3600 * seconds) + averageSteal;
    this.resources.iron = Math.min(this.storage, this.resources.iron + this.power('iron_mine') / 3600 * seconds) + averageSteal;
    this.resources.clay = Math.min(this.storage, this.resources.clay + this.power('clay_pit') / 3600 * seconds) + averageSteal;
    this.resources.food = util.buildingPower('farm', this.buildings.farm.level);


    underscore.each(this.units.available_units, function(unit, unitName) {
        var info = util.unitsInformation[unitName];
        this.resources.food -= unit.total * info.food;
    }.bind(this));

    underscore.each(this.units.queues.barracks, function(recruiting) {
        var info = util.unitsInformation[recruiting.unit_type];
        this.resources.food -= (recruiting.amount-recruiting.recruited) * info.food;
    }.bind(this));

    underscore.each(this.buildings, function(building, buildingName) {
        if (buildingName == 'church') {
            return;
        }
        this.resources.food -= this.cost(buildingName, 'food');
    }.bind(this));

    if (currentTime % 100000 === 0) {
        console.log('status', this.storage, this.resources.wood, this.resources.iron, this.resources.clay, this.resources.food);
    }

    //console.log(JSON.stringify(this.resources));
    this.build();
    this.recruit();
};




var village = new Village(newVillageJson);
for (var i = 0; i < 100000; i++) {
    village.update(15);
}

underscore.each(village.events, function(evt) {
    console.log(printf('%02.1f', evt.time / 60 / 60 / 24), evt.type, evt.name, evt.count || evt.level);
});
console.log('Atk', village.getTotalAttack());
console.log('Res', village.getTotalResources());
console.log('Load', village.getTotalLoad());

underscore.each(village.units.available_units, function(unit, unitName) {
    console.log(printf('%20s', unitName), printf('%05d', unit.total));
});
console.log('');
underscore.each(village.buildings, function(unit, unitName) {
    console.log(printf('%20s', unitName), printf('%05d', unit.level));
});
console.log('status', village.storage, village.resources.wood, village.resources.iron, village.resources.clay, village.resources.food + '/' + village.power('farm'));