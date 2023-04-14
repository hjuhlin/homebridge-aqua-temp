<p align="center">
<img alt="Home Bridge logotype" src="https://github.com/homebridge/branding/raw/master/logos/homebridge-wordmark-logo-vertical.png" width="150">
</p>

# Homebridge Platform Aqua Temp Plugin

This is a plugin for Aqua Temp pool heater.

# Support for

1.0.0

- Water temperature

  1.1.0

- Added support to turn on and off the device

  1.2.0

- Added support for getting token from username and password

  1.3.0

- Added support for refreshing token
- Added support for outdoor temperature

  1.4.0

- Changed from switch to Thermostat
- Added support for target temperature
- Added code to remove old devices (should clean up stuff from 1.3.0 and older)

  1.4.1

- Trying to fix start up bug

  1.4.2

- Fixing with correct Characteristic

  1.4.3, 1.4.4, 1.4.5

- Trying to fix token refresh bug

  1.5.0, 1.5.1

- Change to not heating status when target temp is lower then current temp or if the pump doesnt have water flow.

  1.6.0, 1.6.1, 1.6.2, 1.6.3, 1.6.4, 1.6.5, 1.6.6, 1.6.7, 1.6.8, 1.6.9

- Beta version of Eve logging for current pool temperate (Requiers Eve app, Apple Home app does not support logging).

  1.7.0

- Eve logging should now work!

  1.7.1

- Added debug message for testing current power usage

  1.8.0

- Added option to view an extra thermometer for water temperature

  1.9.0, 1.9.1

- Beta version for view electric power usage in Eve app.

  1.9.2

- Changed to use electric power usage instead of temperature to show if the heater is on or not.

  2.0.0

- Added Eve Total Power Consumption

  2.1.0

- Added support for silent mode.

  2.2.0

- Changed Eve stats from 9 min to 10 min.

  2.3.0

- Fixed null problem when heater is offline

  2.4.1

- Fixed that target temp cant be lower then 10 (that is not allowed in Homekit)

# Default config

```json
"platforms": [
    {
        "name": "Aqua Temp Plugin",
        "Username": "[Username]",
        "Password": "[Password]",
        "UpdateTime": 60,
        "ViewWaterThermometer": false,
        "ViewElectricPowerUsage": false,
        "PowerConsumptionLimit": 0,
        "Debug": false,
        "ClearAllAtStartUp": false,
        "EveLoging": false
    }
]
```
