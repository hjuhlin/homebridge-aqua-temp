import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic } from 'homebridge';
import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
import { HttpRequest } from './utils/httprequest';

import { AquaTempObject, LoginObject } from './types/AquaTempObject';
import { ObjectResult } from './types/ObjectResult';

import { ThermometerAccessory } from './accessories/ThermometerAccessory';
import { ThermostatAccessory } from './accessories/ThermostatAccessory';

export class AquaTempHomebridgePlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service = this.api.hap.Service;
  public readonly Characteristic: typeof Characteristic = this.api.hap.Characteristic;

  public readonly accessories: PlatformAccessory[] = [];

  public Token = '';
  public LoginTries = 0;

  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API,

  ) {
    this.api.on('didFinishLaunching', () => {
      log.debug('Executed didFinishLaunching callback');

      this.Token = this.getToken(true);
    });


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
      if (results!==undefined) {

        const aquaTempObject = <AquaTempObject>results;

        if (aquaTempObject.is_reuslt_suc) {
          for (const device of aquaTempObject.object_result) {
            if (device.is_fault!==false) {
              this.log.error('Device is in fault state (check app!)');
            }

            httpRequest.GetDeviceStatus(device.device_code, this.Token).then((deviceResults)=> {
              const deviceResult = <AquaTempObject>deviceResults;
              const deviceNickName = device.device_nick_name;

              if (deviceResult.is_reuslt_suc) {

                const thermostatObject = this.getAccessory(device, 'thermostat');
                const thermostatService = thermostatObject.accessory.getService(this.Service.Thermostat);

                const thermometerObject = this.getAccessory(device, 'thermometer');
                const thermometerService = thermometerObject.accessory.getService(this.Service.TemperatureSensor);

                for (const codeData of deviceResult.object_result) {
                  device.device_nick_name = deviceNickName;

                  if (codeData.code ==='T02') {
                    if (thermostatService!==undefined) {
                      if (this.config['Debug'] as boolean) {
                        this.log.info('Update temperature for ' + device.device_nick_name + ': '+codeData.value);
                      }

                      thermostatService.updateCharacteristic(this.Characteristic.CurrentTemperature, codeData.value);
                    }
                  }

                  if (codeData.code ==='R02') {
                    if (thermostatService!==undefined) {
                      if (this.config['Debug'] as boolean) {
                        this.log.info('Update target temperature for ' + device.device_nick_name + ': '+codeData.value);
                      }

                      thermostatService.updateCharacteristic(this.Characteristic.TargetTemperature, codeData.value);
                    }
                  }

                  if (codeData.code ==='power') {
                    if (thermostatService!==undefined) {
                      const isOn = codeData.value==='0'?false:true;

                      if (this.config['Debug'] as boolean) {
                        this.log.info('Update power for ' + device.device_nick_name + ': '+isOn);
                      }

                      thermostatService.updateCharacteristic(this.Characteristic.CurrentHeatingCoolingState,
                        isOn?this.Characteristic.CurrentHeatingCoolingState.HEAT: this.Characteristic.CurrentHeatingCoolingState.OFF);

                      thermostatService.updateCharacteristic(this.Characteristic.TargetHeatingCoolingState,
                        isOn?this.Characteristic.TargetHeatingCoolingState.HEAT: this.Characteristic.TargetHeatingCoolingState.OFF);
                    }
                  }

                  if (codeData.code ==='T05') {
                    if (thermometerService!==undefined) {
                      if (this.config['Debug'] as boolean) {
                        this.log.info('Update temperature for ' + device.device_nick_name + ': '+codeData.value);
                      }

                      thermometerService.updateCharacteristic(this.Characteristic.CurrentTemperature, codeData.value);
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
            const thermostatObject = this.getAccessory(device, 'thermostat');
            new ThermostatAccessory(this, thermostatObject.accessory, device, this.config, this.log, this.Token);
            this.addOrRestorAccessory(thermostatObject.accessory, device.device_nick_name, 'thermostat', thermostatObject.exists);

            const airObject = this.getAccessory(device, 'thermometer');
            new ThermometerAccessory(this, airObject.accessory, device, this.config, this.log, this.Token);
            this.addOrRestorAccessory(airObject.accessory, device.device_nick_name, 'thermometer', airObject.exists);
          }

          this.accessories.forEach(accessory => {
            let found = false;

            for (const device of aquaTempObject.object_result) {
              if (accessory.UUID === this.localIdForType(device, 'thermostat') ||
              accessory.UUID === this.localIdForType(device, 'thermometer')) {
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
          this.log.info('Token', this.Token);
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

  public addOrRestorAccessory(accessory: PlatformAccessory<Record<string, unknown>>, name: string, type: string, exists: boolean ) {
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