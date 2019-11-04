var Service, Characteristic;

var pollingtoevent = require("polling-to-event");
const waitUntil = require("wait-until");
const sectoralarm = require("sectoralarm");


module.exports = function(homebridge){
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    homebridge.registerAccessory("homebridge-sector-securitysystem", "Sector-SecuritySystem", SectorSecuritySystemAccessory);
    homebridge.registerAccessory("homebridge-sector-securitysystem", "Sector-SecuritySystemSensor", SectorSecurityTemperatureAccessory);
};

var currentState;

/**
 * The main class acting as the Security System Accessory
 *
 * @param log The logger to use
 * @param config The config received from HomeBridge
 * @constructor
 */
function SectorSecuritySystemAccessory(log, config) {
    var self = this;
    self.log = log;
    self.name = config.name;
    
    self.email = config.email;
    self.password = config.password;
    self.siteId = config.siteId;
    self.code = config.code;

    // the service
    self.securityService = null;

    // polling settings
    self.polling = true;
    self.pollInterval = config.pollInterval || 3000;

    // cached values
    self.previousCurrentState = null;
    self.previousTargetState = null;
    
    self.log("About to initialize.");
    self.init();
}

function translateFromState(log, aState) {
    log.debug("translateFromState() State is " + aState);
    var translatedSate = "UNKNOWN";

    switch (aState) {
    case Characteristic.SecuritySystemTargetState.STAY_ARM:
        translatedSate = "partial";
        break;
    case Characteristic.SecuritySystemTargetState.NIGHT_ARM:
        translatedSate = "partial";
        break;
    case Characteristic.SecuritySystemTargetState.AWAY_ARM:
        translatedSate = "armed";
        break;
    case Characteristic.SecuritySystemTargetState.DISARM:
        translatedSate = "disarmed";
        break;
    case 4:
        translatedSate = "ALARM";
        break;
    }

    return translatedSate;
}

function translateToState(log, aState) {

    log.debug("translateToState() State is " + aState);

    // 0 -  Characteristic.SecuritySystemTargetState.STAY_ARM:
    // 1 -  Characteristic.SecuritySystemTargetState.AWAY_ARM:
    // 2-   Characteristic.SecuritySystemTargetState.NIGHT_ARM:
    // 3 -  Characteristic.SecuritySystemTargetState.DISARM:
    var translatedSate = "UNKNOWN";

    switch (String(aState)) {
    case "partialArmed":
        translatedSate = Characteristic.SecuritySystemTargetState.NIGHT_ARM;
        break;
    case "annex":
        translatedSate = Characteristic.SecuritySystemTargetState.STAY_ARM;
        break;
    case "armed":
        translatedSate = Characteristic.SecuritySystemTargetState.AWAY_ARM;
        break;
    case "disarmed":
        translatedSate = Characteristic.SecuritySystemTargetState.DISARM;
        break;
    case 4:
        translatedSate = "ALARM";
        break;
    }

    log.debug("translateToState() Translated state is " + translatedSate);
    return translatedSate;
}


/**
 * Initializer method, fired after the config has been applied
 */
SectorSecuritySystemAccessory.prototype.init = function() {
    var self = this;
    self.log("Initilizing...");
    // set up polling if requested
    if (self.polling) {
        self.log("Starting polling with an interval of %s ms", self.pollInterval);
        var emitter = pollingtoevent(function (done) {
            self.getState(function (err, result) {
                done(err, result);
            });
        }, {
            longpolling: true,
            interval: self.pollInterval
        });

        emitter.on("longpoll", function (state) {
            self.log.debug("In poll function");
            
            if (state) {
                // Get OnceMore time Current State:
                self.log.debug("New state detected: (" + state + ") -> " + translateFromState(self.log, state) + ". Notify!");
                self.securityService.setCharacteristic(Characteristic.SecuritySystemCurrentState, state);
                currentState = state;
            }
        });

        emitter.on("err", function (err) {
            self.log("Polling failed, error was %s", err);
        });
    }
    self.log.debug("Exiting init...");
};

/**
 * Gets the state of the security system from a given URL
 *
 * @param {string} url The URL to poke for the result
 * @param {string} body The body of the request
 * @param {Function} callback The method to call with the results
 */
SectorSecuritySystemAccessory.prototype.getState = function(callback) {
    var self = this;
    self.log.debug("getState() Getting state");

    sectoralarm.connect(self.email, self.password, self.siteId)
        .then(site => {
            return site.status();
        })
        .then(status => {
            status = JSON.parse(status);
            var alarmstate;
            alarmstate = status.armedStatus;
        
            self.log.debug("getState() Armed status: " + alarmstate);
            callback(null, translateToState(self.log, alarmstate));
        })
        .catch(error => {
            self.log(error.message);
            self.log(error.code);
            callback(error);
        });
};

SectorSecuritySystemAccessory.prototype.getCurrentState = function(callback) {
    var self = this;
    self.log("getCurrentState() Getting current state");

    if (self.polling) {
        self.log("getCurrentState() Returning current state " + currentState);
        callback(null, currentState);
    } else {
        self.log("getCurrentState() Getting current state - delayed...");
        waitUntil()
            .interval(500)
            .times(15)
            .condition(function () {
                self.log("getCurrentState() In condition " + currentState);
                return (currentState ? true : false);
            })
            .done(function (result) {
                // do stuff
                self.log("getCurrentState() Update current state to:", currentState);
                callback(null, currentState);

            });
    }
};

/**
 * Gets the state of the security system from a given URL
 *
 * @param {string} url The URL to poke for the result
 * @param {string} body The body of the request
 * @param {Function} callback The method to call with the results
 */
SectorSecuritySystemAccessory.prototype.setTargetState = function(state, callback) {
    var self = this;
    self.log.debug("Setting target state to " + state + ". Current state is " + currentState);
    sectoralarm.connect(self.email, self.password, self.siteId)
        .then((site) => {
            switch (state) {
            case Characteristic.SecuritySystemTargetState.STAY_ARM:
                site.partialArm(self.code);
                break;
            case Characteristic.SecuritySystemTargetState.NIGHT_ARM:
                site.partialArm(self.code);
                break;
            case Characteristic.SecuritySystemTargetState.AWAY_ARM:
                site.arm(self.code);
                break;
            case Characteristic.SecuritySystemTargetState.DISARM:
                site.disarm(self.code);
                break;
            }
        })
        .then(output => {
            self.log.debug("setTargetState() Raw output: " + output);
            currentState = state;

            self.securityService.setCharacteristic(Characteristic.SecuritySystemCurrentState, currentState);
            callback(null, state);
        })
        .catch(error => {
            self.log(error.message);
            self.log(error.code);
            callback(error);
        });
};

SectorSecuritySystemAccessory.prototype.getTargetState = function(callback) {
    var self = this;
    self.log.info("getTargetState() Getting target state.");
    if (self.polling) {
        self.log("getTargetState() Getting target state using polling. Current state is " + currentState);
        if(currentState) {
            callback(null, currentState);
        } else {
            self.getState(callback); 
        }
    } else {
        self.log("getTargetState() Getting target state using getState() ...");
        self.getState(callback);
    }

};

/**
 * Identifies the security device (?)
 *
 * @param {Function} callback The method to call with the results
 */
SectorSecuritySystemAccessory.prototype.identify = function(callback) {
    var self = this;
    self.log("Identify requested!");
    callback();
};

/**
 * Returns the services offered by this security device
 *
 * @returns {Array} The services offered
 */
SectorSecuritySystemAccessory.prototype.getServices =  function() {
    this.securityService = new Service.SecuritySystem(this.name);

    this.securityService
        .getCharacteristic(Characteristic.SecuritySystemCurrentState)
        .on("get", this.getCurrentState.bind(this));

    this.securityService
        .getCharacteristic(Characteristic.SecuritySystemTargetState)
        .on("get", this.getTargetState.bind(this))
        .on("set", this.setTargetState.bind(this));

    this.infoService = new Service.AccessoryInformation();
    this.infoService
        .setCharacteristic(Characteristic.Manufacturer, "Fredrik JL")
        .setCharacteristic(Characteristic.Model, this.name)
        .setCharacteristic(Characteristic.SerialNumber, "1234");

    return [ this.securityService ];
};

class SectorSecurityTemperatureAccessory {
    constructor(log, config)
    {
        this.log = log;

        this.name = config.name;
        this.email = config.email;
        this.password = config.password;
        this.siteId = config.siteId;
        this.sensorId = config.sensorId;
        this.temperature = 0;

        this.init();
    }

    init() {
        this.log("Initializing...");
        this.getAndUpdateTemperature();

        // setup a background polling job to increase performance/responsiveness
        setInterval(() => {
            this.getAndUpdateTemperature();
        }, 60000);

        this.log("Self-test completed successfully.");
    }

    async getAndUpdateTemperature() {
        this.log(`Getting temperature for sensor ${this.sensorId}.`);
        const site = await sectoralarm.connect(this.email, this.password, this.siteId);
        this.log.debug("Logged in to site.");
        let result = await site.temperatures(this.sensorId);
        this.log.debug("Fetched results.");
        this.log.debug(result);

        result = JSON.parse(result);
        this.log.debug("Parsed results");
        this.temperature = parseInt(result[0].temperature);
        this.log.debug("Parsed temperature: " + this.temperature.toString());

        if (this.currentTemperatureCharacteristic) {
            this.log.debug("Updating temperature characteristic");
            this.currentTemperatureCharacteristic.updateValue(this.temperature);
        }

        this.log.debug("Returning current value.");
        return this.temperature;
    }

    getTemperatureWithCallback(callback) {
        this.log.debug(`Providing pre-fetched value ${ this.temperature } to caller!`);
        callback(null, this.temperature);
    }

    getServices() {
        this.log.debug(`Creating info-service for sensor ${this.sensorId}.`);
        var infoService = new Service.AccessoryInformation();
        infoService
            .setCharacteristic(Characteristic.Manufacturer, "Sector Alarm")
            .setCharacteristic(Characteristic.Model, "IR Sensor")
            .setCharacteristic(Characteristic.SerialNumber, this.sensorId)
            .setCharacteristic(Characteristic.FirmwareRevision, "N/A");

        this.log.debug(`Creating temperature-service for sensor ${this.sensorId}.`);
        var temperatureService = new Service.TemperatureSensor(this.name);
        this.currentTemperatureCharacteristic = temperatureService.getCharacteristic(Characteristic.CurrentTemperature);
        this.currentTemperatureCharacteristic.updateValue(this.temperature);
        this.currentTemperatureCharacteristic.on("get", (callback) => { this.getTemperatureWithCallback(callback); });

        this.log(`Created temperature-services for sensor ${this.sensorId}.`);
        return [infoService, temperatureService];
    }
}
