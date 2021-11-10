import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic } from 'homebridge';
import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
import { HttpRequest } from './utils/httprequest';

import { AquaTempObject, LoginObject } from './types/AquaTempObject';
import { ObjectResult } from './types/ObjectResult';

import { ThermometerAccessory } from './accessories/ThermometerAccessory';
import { ThermostatAccessory } from './accessories/ThermostatAccessory';

import { CustomCharacteristic } from './CustomCharacteristic';

import fakegato from 'fakegato-history';

export class AquaTempHomebridgePlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service = this.api.hap.Service;
  public readonly Characteristic: typeof Characteristic = this.api.hap.Characteristic;
  public readonly accessories: PlatformAccessory[] = [];
  public customCharacteristic: CustomCharacteristic;

  private FakeGatoHistoryService;

  public Token = '';
  public LoginTries = 0;

  private lastUpdate1min = new Date('2021-01-01');
  private lastUpdate10min = new Date('2021-01-01');
  private update1min=false;
  private update10min=false;
  private start = true;

  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API,

  ) {
    this.customCharacteristic = new CustomCharacteristic(api);

    this.api.on('didFinishLaunching', () => {
      log.debug('Executed didFinishLaunching callback');

      this.Token = this.getToken(true);
    });

    this.FakeGatoHistoryService = fakegato(this.api);

    this.log.debug('Finished initializing platform:', this.config.name);

    setInterval(() => {
      if (this.Token==='') {
        this.Token = this.getToken(false);
        this.LoginTries = 0;
      } else {
        this.updateDeviceStatus();
      }
    }, (this.config['UpdateTime'] as number) * 1000);
  }

  updateDeviceStatus() {
    const httpRequest = new HttpRequest(this.config, this.log);

    httpRequest.GetDeviceList(this.Token).then((results)=> {

      const now = new Date();
      const added1Min = new Date(this.lastUpdate1min.getTime()+(1*60000));
      const added10Min = new Date(this.lastUpdate10min.getTime()+(10*60000));

      if (now>added1Min) {
        this.lastUpdate1min = now;
        this.update1min = true;
      }

      if (now>added10Min) {
        this.lastUpdate10min = now;
        this.update10min = true;
      }

      if (results!==undefined) {

        const aquaTempObject = <AquaTempObject>results;

        if (aquaTempObject.is_reuslt_suc) {
          for (const device of aquaTempObject.object_result) {
            httpRequest.GetDeviceStatus(device.device_code, this.Token).then((deviceResults)=> {
              const deviceResult = <AquaTempObject>deviceResults;
              const deviceNickName = device.device_nick_name;

              if (deviceResult.is_reuslt_suc) {
                const thermostatObject = this.getAccessory(device, 'thermostat');
                const thermostatService = thermostatObject.accessory.getService(this.Service.Thermostat);
                const thermostatSwitchService = thermostatObject.accessory.getService(this.Service.Switch);

                const thermometerObject = this.getAccessory(device, 'thermometer');
                const thermometerService = thermometerObject.accessory.getService(this.Service.TemperatureSensor);
                if (thermostatService!==undefined) {

                  let targetTemp = 0;
                  let currentTemp = 0;
                  let currentPowerUsage = 0;
                  let isHeating = false;

                  for (const codeData of deviceResult.object_result) {
                    device.device_nick_name = deviceNickName;

                    if (codeData.code ==='T02') {
                      if (this.config['Debug'] as boolean) {
                        this.log.info('Update temperature for ' + device.device_nick_name + ': '+codeData.value);
                      }

                      currentTemp = parseFloat(codeData.value);

                      thermostatService.updateCharacteristic(this.Characteristic.CurrentTemperature, codeData.value);

                      if (this.config['ViewWaterThermometer'] as boolean === true) {
                        const thermometerObjectWater = this.getAccessory(device, 'thermometerwater');
                        const thermometerServiceWater = thermometerObjectWater.accessory.getService(this.Service.TemperatureSensor);

                        if (thermometerServiceWater!==undefined) {
                          if (this.config['Debug'] as boolean) {
                            this.log.info('Update water temperature for ' + device.device_nick_name + ': '+codeData.value);
                          }

                          thermometerServiceWater.updateCharacteristic(this.Characteristic.CurrentTemperature, codeData.value);
                        }
                      }
                    }

                    if (codeData.code ==='R02') {
                      if (this.config['Debug'] as boolean) {
                        this.log.info('Update target temperature for ' + device.device_nick_name + ': '+codeData.value);
                      }

                      targetTemp = parseFloat(codeData.value);

                      thermostatService.updateCharacteristic(this.Characteristic.TargetTemperature, codeData.value);
                    }

                    if (codeData.code ==='power') {
                      const isOn = codeData.value==='0'?false:true;

                      if (this.config['Debug'] as boolean) {
                        this.log.info('Update power for ' + device.device_nick_name + ': '+isOn);
                      }

                      isHeating = isOn;
                      thermostatService.updateCharacteristic(this.Characteristic.TargetHeatingCoolingState,
                        isOn?this.Characteristic.TargetHeatingCoolingState.HEAT: this.Characteristic.TargetHeatingCoolingState.OFF);
                    }

                    if (codeData.code ==='T05') {
                      if (thermometerService!==undefined) {
                        if (this.config['Debug'] as boolean) {
                          this.log.info('Update air temperature for ' + device.device_nick_name + ': '+codeData.value);
                        }

                        thermometerService.updateCharacteristic(this.Characteristic.CurrentTemperature, codeData.value);
                      }
                    }

                    if (codeData.code ==='T12') {
                      if (this.config['ViewElectricPowerUsage'] as boolean) {
                        currentPowerUsage = parseInt(codeData.value);
                        thermostatService.setCharacteristic(this.customCharacteristic.characteristic.ElectricPower, currentPowerUsage);

                        if (this.config['Debug'] as boolean) {
                          this.log.info('Update power usage for ' + device.device_nick_name + ': '+codeData.value+'W');
                        }
                      }
                    }

                    if (thermostatSwitchService!==undefined && codeData.code ==='Manual-mute') {
                      const isOn = codeData.value==='1'?true: false;
                      thermostatSwitchService.updateCharacteristic(this.Characteristic.On, isOn);

                      if (this.config['Debug'] as boolean) {
                        this.log.info('Update silence mode for ' + device.device_nick_name + ': '+isOn);
                      }
                    }
                  }

                  if (this.config['ViewElectricPowerUsage'] as boolean) {
                    const powerConsumptionLimit = this.config['PowerConsumptionLimit'] as number;
                    if (device.is_fault!==false || currentPowerUsage<=powerConsumptionLimit) {
                      isHeating = false;
                    }
                  } else {
                    if (device.is_fault!==false) {
                      isHeating = false;
                    }
                  }

                  if (this.config['Debug'] as boolean) {
                    this.log.info('Update heating status for ' + device.device_nick_name + ': '+isHeating);
                  }

                  if (this.config['EveLoging'] as boolean) {

                    if (this.update10min) {
                      if (this.start===false){
                        thermostatObject.accessory.context.fakeGatoService.setExtraPersistedData({
                          totalenergy:thermostatObject.accessory.context.totalenergy});
                      }

                      thermostatObject.accessory.context.fakeGatoService.addEntry({time: Math.round(new Date().valueOf() / 1000),
                        currentTemp: currentTemp, setTemp: targetTemp, valvePosition: 1, power: currentPowerUsage});

                      thermostatService.updateCharacteristic(this.Characteristic.CurrentHeatingCoolingState,
                        isHeating?this.Characteristic.CurrentHeatingCoolingState.HEAT: this.Characteristic.CurrentHeatingCoolingState.OFF);
                    }

                    if (this.update1min) {
                      if (this.start===true) {
                        if (thermostatObject.accessory.context.fakeGatoService!==undefined) {
                          if (thermostatObject.accessory.context.fakeGatoService.isHistoryLoaded()) {
                            const extraPersistedData = thermostatObject.accessory.context.fakeGatoService.getExtraPersistedData();

                            if (extraPersistedData !== undefined) {
                              thermostatObject.accessory.context.totalenergy = extraPersistedData.totalenergy;
                              this.log.info(device.device_nick_name + ' - loading total energy from file ' +
                              thermostatObject.accessory.context.totalenergy+' kWh');
                            } else {
                              this.log.warn(device.device_nick_name + ' - starting new log for total energy in file!');
                              thermostatObject.accessory.context.fakeGatoService.setExtraPersistedData({ totalenergy:0, lastReset: 0 });
                              this.log.warn(device.device_nick_name + ' - done!');
                            }
                          } else {
                            this.log.error(device.device_nick_name + ' - history not loaded yet!');
                          }
                        }

                        this.start =false;
                      }

                      const now = new Date().getTime();
                      const refresh = (now - thermostatObject.accessory.context.lastUpdated)/ 1000;
                      const add = (currentPowerUsage / ((60 * 60) / (refresh)));
                      const totalenergy = thermostatObject.accessory.context.totalenergy + add/1000;
                      thermostatObject.accessory.context.lastUpdated = now;
                      thermostatObject.accessory.context.totalenergy = totalenergy;




                      if (this.config['Debug'] as boolean) {
                        if (currentPowerUsage>0) {
                          const totalenergyLog = Math.round(totalenergy* 100000) / 100000;
                          this.log.info(thermostatObject.accessory.displayName +': '+ totalenergyLog +
                           ' kWh from '+thermostatObject.accessory.context.startTime.toISOString());
                        }
                      }

                      thermostatService.updateCharacteristic(this.customCharacteristic.characteristic.TotalPowerConsumption,
                        thermostatObject.accessory.context.totalenergy);
                    }
                  }
                }
              } else {
                this.log.error(deviceResult.error_msg);
                this.log.error(deviceResult.error_code);
                this.log.error(deviceResult.error_msg_code);
              }
            }).catch((error) => {
              if (error==='NotLoggedIn') {
                this.getToken(false);
              }
            });
          }
        } else {
          this.log.error(aquaTempObject.error_msg);
          this.log.error(aquaTempObject.error_code);
          this.log.error(aquaTempObject.error_msg_code);
          this.log.info('Token', this.Token);
        }
      } else {
        this.log.error('Error gettind data');
      }
    }).catch((error) => {
      if (error==='NotLoggedIn') {
        this.getToken(false);
      }
    });

    this.update1min= false;
    this.update10min= false;
  }

  getToken(start:boolean): string {
    this.LoginTries +1;

    if (this.LoginTries<3) {
      const httpRequest = new HttpRequest(this.config, this.log);

      httpRequest.Login().then((results)=> {

        if (results!==undefined) {

          const aquaTempObject = <LoginObject>results;

          if (aquaTempObject!==undefined) {
            this.log.info('Token', aquaTempObject.object_result['x-token']);
            this.Token = aquaTempObject.object_result['x-token'];
            this.LoginTries=0;

            if (start) {
              this.discoverDevices();
            }

          } else {
            this.log.error('aquaTempObject = undefined');
          }
        } else {
          this.log.error('Error login in!');
        }

      });
    }

    return '';
  }

  configureAccessory(accessory: PlatformAccessory) {
    this.log.info('Loading accessory from cache:', accessory.displayName);

    this.accessories.push(accessory);
  }

  discoverDevices() {
    const httpRequest = new HttpRequest(this.config, this.log);

    httpRequest.GetDeviceList(this.Token).then((results)=> {

      if (results!==undefined) {

        const aquaTempObject = <AquaTempObject>results;

        if (aquaTempObject.is_reuslt_suc) {
          this.accessories.forEach(accessory => {
            if (this.config['ClearAllAtStartUp'] as boolean) {
              this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
              this.log.info('Removing existing accessory:', accessory.displayName);
            }
          });

          this.log.info('Found ' +aquaTempObject.object_result.length + ' device');

          for (const device of aquaTempObject.object_result) {
            const airObject = this.getAccessory(device, 'thermometer');
            new ThermometerAccessory(this, airObject.accessory, device, this.config, this.log, 'air');
            this.addOrRestorAccessory(airObject.accessory, device.device_nick_name, 'thermometer', airObject.exists);

            if (this.config['ViewWaterThermometer'] as boolean === true) {
              const waterObject = this.getAccessory(device, 'thermometerwater');
              new ThermometerAccessory(this, waterObject.accessory, device, this.config, this.log, 'water');
              this.addOrRestorAccessory(waterObject.accessory, device.device_nick_name, 'thermometerwater', waterObject.exists);
            }

            const thermostatObject = this.getAccessory(device, 'thermostat');
            if (this.config['EveLoging'] as boolean === true) {
              const fakeGatoService = new this.FakeGatoHistoryService('custom', thermostatObject.accessory,
                {log: this.log, storage: 'fs', disableTimer:true});

              thermostatObject.accessory.context.fakeGatoService = fakeGatoService;
            }

            new ThermostatAccessory(this, thermostatObject.accessory, device, this.config, this.log, 'heater');
            this.addOrRestorAccessory(thermostatObject.accessory, device.device_nick_name, 'thermostat', thermostatObject.exists);
          }

          this.accessories.forEach(accessory => {
            let found = false;

            for (const device of aquaTempObject.object_result) {
              if (accessory.UUID === this.localIdForType(device, 'thermostat') ||
              accessory.UUID === this.localIdForType(device, 'thermometer') ||
              accessory.UUID === this.localIdForType(device, 'thermometerwater')) {
                found = true;
              }
            }

            if (found === false) {
              this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
              this.log.info('Removing existing accessory:', accessory.displayName);
            }
          });

          this.updateDeviceStatus();

        } else {
          this.log.error(aquaTempObject.error_msg);
          this.log.error(aquaTempObject.error_code);
          this.log.error(aquaTempObject.error_msg_code);
          this.log.info('Token:', this.Token);
        }
      } else {
        this.log.error('Error getting data!');
      }
    }).catch((error) => {
      if (error==='NotLoggedIn') {
        this.getToken(false);
      }
    });
  }

  public getAccessory(device: ObjectResult, type: string) {
    const existingAccessory = this.accessories.find(accessory => accessory.UUID === this.localIdForType(device, type));

    if (existingAccessory!==undefined) {
      existingAccessory.displayName = device.device_nick_name;

      return {accessory : existingAccessory, exists : true};
    }

    const accessory = new this.api.platformAccessory(device.device_nick_name, this.localIdForType(device, type));
    accessory.context.device = device;

    return {accessory : accessory, exists : false};
  }

  public addOrRestorAccessory(accessory: PlatformAccessory<Record<string, unknown>>, name: string, type: string, exists: boolean) {
    if (exists) {
      this.log.info('Restoring existing accessory:', name +' ('+type+')');
      this.api.updatePlatformAccessories([accessory]);
    } else {
      this.log.info('Adding new accessory:', name +' ('+type+')');
      this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
    }
  }

  localIdForType(device:ObjectResult, type:string):string {
    return this.api.hap.uuid.generate(device.device_id.toString()+'_'+type);
  }
}