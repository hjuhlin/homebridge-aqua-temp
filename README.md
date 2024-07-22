<p align="center">
<img alt="Home Bridge logotype" src="https://github.com/homebridge/branding/raw/master/logos/homebridge-wordmark-logo-vertical.png" width="150">
</p>

# Homebridge Platform Aqua Temp Plugin

This is a plugin for Aqua Temp pool heater.

# Important information!

- There is a bug that I have not managed to solve. After the plugin is installed and configured, one extra restart is needed. After that it works as expected. 

- With the new version of the Auqa Temp API version only one device can be logged in at the same time. If you are online in the official app, Homebridge can’t be online. The best way to fix this is to make a new account for Homebridge and share your heater with that account.


# Support for

1.4.0
- First working version

1.4.5
- Token refresh bug

1.5.1
- Change to not heating status when target temp is lower then current temp or if the pump doesnt have water flow.

1.7.0
- Eve logging for current pool temperate (Requiers Eve app, Apple Home app does not support logging).

1.8.0
- Added option to view an extra thermometer for water temperature

2.0.0
- Eve Power Consumption

2.1.0
- Added support for silent mode.

2.2.0
- Changed Eve stats from 9 min to 10 min.

2.3.0
- Fixed null problem when heater is offline

2.4.2
- Fixed that target temp cant be lower then 10 (that is not allowed in Homekit)

2.5.1
- Fixed a bug with CurrentHeatingCoolingState

2.6.0
- Changed to new API code

2.6.2
- Added code for finding devices in shared lists. 

2.6.3
- Added code for water out thermometer

# Default config

```json
"platforms": [
    {
        "name": "Aqua Temp Plugin",
        "Username": "[Username]",
        "Password": "[Password]",
        "UpdateTime": 60,
        "ViewWaterThermometer": false,
        "ViewWaterOutThermometer": false,
        "ViewElectricPowerUsage": false,
        "PowerConsumptionLimit": 0,
        "Debug": false,
        "ClearAllAtStartUp": false,
        "EveLoging": false
    }
]
```
