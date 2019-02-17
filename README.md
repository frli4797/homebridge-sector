# Sector Alarm Homebridge
This is a feble attempt to write a homebridge plugin to control a Sector Alarm security system. It is very much alpha, pre-release, boiler plate code and functionality. This might not work with your Sector Alarm system.

I have very limited time to work with this. So any contribution is very much appreciated. 

I'm also not a Javascript developer, much less a node developer. This is clearly visible in the code. Feel free to give me feedback and correct my mistakes. 

## Foolish assumptions
By default, Sector alarm provides three modes (armed, partial armed and disarmed). Since HomeKit allows a security system to have 4 states (away, home, night and off), I've taken the liberty to map these as I saw fit. The least bad option. A less bad option would be to at least have this mapping configrable. 
 * armed <-> away
 * partial armed <-> night (and home)
 * disarmed <-> off

## Roadmap
There are quite a few things that could be added to this.

* Modularize. Refactor the code to be a platform rather than an accessory. Thus enabling separation between different possible accessories to the alarm system.
* Support for temperature sensors.
* Make it possible to configure different states and behaviours to state changes.
* Clean up the code. 


## Configuration
Below is a configuration example snipped that should be inserted into your existing, workingm, homebridge config.

```json
// Config example.
{
    "accessories": [
        {
            "accessory": "Sector-SecuritySystem",
            "email": "myemail@someplace.com",
            "password": "SuperSecurePassword",
            "siteId": "111111",                
            "code": "6827",                    
            "polling": false,                  
            "pollInterval": 60000,             
            "name": "Home security"
        }
    ]
}
```
