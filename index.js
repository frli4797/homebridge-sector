var Service, Characteristic;

module.exports = function(homebridge){
	Service = homebridge.hap.Service;
	Characteristic = homebridge.hap.Characteristic;
	homebridge.registerAccessory("homebridge-sector-securitysystem", "Sector-SecuritySystem", SectorSecuritySystemAccessory);
};

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
	self.name = config["name"];

	// the service
	self.securityService = null;

	// debug flag
	self.debug = config.debug;

	// polling settings
	self.polling = config.polling;
	self.pollInterval = config.pollInterval || 30000;

	// cached values
	self.previousCurrentState = null;
    self.previousTargetState = null;
    
    self.init();
}

/**
 * Initializer method, fired after the config has been applied
 */
SectorSecuritySystemAccessory.prototype.init = function() {
	var self = this;

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
            self.log("In poll function")
            /*
            if (state) {
                // Get OnceMore time Current State:
                        self.log("New state detected: (" + state + ") -> " + translateState(state) + ". Notify!");
                        self.securityService.setCharacteristic(Characteristic.SecuritySystemCurrentState, state);
                        self.previousCurrentState = state;
            }*/
        });

        emitter.on("err", function (err) {
            self.log("Polling failed, error was %s", err);
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
SectorSecuritySystemAccessory.prototype.getState = function(callback) {
    this.log("Getting state")
    callback(null, 2);
	// this.httpRequest(url, body, function(error, response, responseBody) {
	// 	if (error) {
	// 		this.log("GetState function failed: %s", error.message);
	// 		callback(error);
	// 	} else {
	// 		var state = responseBody;
	// 		state = this.applyMappers(state);
	// 		callback(null, parseInt(state));
	// 	}
	// }.bind(this));
};
