import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic } from 'homebridge';
import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
import { HttpRequest } from './utils/httprequest';

import { AquaTempObject, LoginObject } from './types/AquaTempObject';
import { ObjectResult } from './types/ObjectResult';

import { ThermometerAccessory } from './accessories/ThermometerAccessory';
import { SwitchAccessory } from './accessories/SwitchAccessory';

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
      this.updateDeviceStatus();
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
                for (const codeData of deviceResult.object_result) {
                  device.device_nick_name = deviceNickName;

                  if (codeData.code ==='T02') {
                    device.device_nick_name = device.device_nick_name + ' (water)';
                    const accessoryObject = this.getAccessory(device, 'water');
                    const service = accessoryObject.accessory.getService(this.Service.TemperatureSensor);

                    if (service!==undefined) {
                      if (this.config['Debug'] as boolean) {
                        this.log.info('Update temperature for ' + device.device_nick_name + ': '+codeData.value);
                      }

                      service.updateCharacteristic(this.Characteristic.CurrentTemperature, codeData.value);
                    }
                  }

                  if (codeData.code ==='T05') {
                    device.device_nick_name = device.device_nick_name + ' (air)';
                    const accessoryObject = this.getAccessory(device, 'air');
                    const service = accessoryObject.accessory.getService(this.Service.TemperatureSensor);

                    if (service!==undefined) {
                      if (this.config['Debug'] as boolean) {
                        this.log.info('Update temperature for ' + device.device_nick_name + ': '+codeData.value);
                      }

                      service.updateCharacteristic(this.Characteristic.CurrentTemperature, codeData.value);
                    }
                  }

                  if (codeData.code ==='power') {
                    const accessoryObject = this.getAccessory(device, 'switch');
                    const service = accessoryObject.accessory.getService(this.Service.Switch);

                    if (service!==undefined) {
                      const isOn = codeData.value==='0'?false:true;

                      if (this.config['Debug'] as boolean) {
                        this.log.info('Update power for ' + device.device_nick_name + ': '+ isOn);
                      }

                      service.updateCharacteristic(this.Characteristic.On, isOn);
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
              this.updateDeviceStatus();
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

          this.log.info('Found ' +aquaTempObject.object_result.length + ' device');

          for (const device of aquaTempObject.object_result) {
            const deviceNickName = device.device_nick_name;

            const switchObject = this.getAccessory(device, 'switch');
            new SwitchAccessory(this, switchObject.accessory, device, this.config, this.log, this.Token);
            this.addOrRestorAccessory(switchObject.accessory, device.device_nick_name, 'switch', switchObject.exists);

            device.device_nick_name = deviceNickName + ' (air)';
            const airObject = this.getAccessory(device, 'air');
            new ThermometerAccessory(this, airObject.accessory, device, this.config, this.log, this.Token);
            this.addOrRestorAccessory(airObject.accessory, device.device_nick_name, 'air', airObject.exists);

            device.device_nick_name = deviceNickName + ' (water)';
            const waterObject = this.getAccessory(device, 'water');
            new ThermometerAccessory(this, waterObject.accessory, device, this.config, this.log, this.Token);
            this.addOrRestorAccessory(waterObject.accessory, device.device_nick_name, 'water', waterObject.exists);
          }
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