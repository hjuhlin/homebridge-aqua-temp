import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic } from 'homebridge';
import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
import { HttpRequest } from './utils/httprequest';

import { AquaTempObject } from './types/AquaTempObject';
import { ObjectResult } from './types/ObjectResult';

import { ThermometerAccessory } from './accessories/ThermometerAccessory';

export class AquaTempHomebridgePlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service = this.api.hap.Service;
  public readonly Characteristic: typeof Characteristic = this.api.hap.Characteristic;

  public readonly accessories: PlatformAccessory[] = [];

  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API,

  ) {
    this.api.on('didFinishLaunching', () => {
      log.debug('Executed didFinishLaunching callback');

      this.discoverDevices();
    });


    this.log.debug('Finished initializing platform:', this.config.name);

    setInterval(() => {
      const httpRequest = new HttpRequest(this.config, log);

      httpRequest.GetDeviceList().then((results)=> {
        const aquaTempObject = <AquaTempObject>results;

        if (aquaTempObject.is_reuslt_suc) {
          for (const device of aquaTempObject.object_result) {
            if (device.is_fault===false) {

              httpRequest.GetDeviceStatus(device.device_code).then((deviceResults)=> {

                const deviceResult = <AquaTempObject>deviceResults;

                if (deviceResult.is_reuslt_suc) {
                  for (const codeData of deviceResult.object_result) {
                    if (codeData.code ==='T02') {

                      this.log.info('Update temperature for ' + device.device_nick_name + ' - set to: '+codeData.value);

                      const accessoryObject = this.getAccessory(device, 'temperature');
                      const service = accessoryObject.accessory.getService(this.Service.TemperatureSensor);

                      if (service!==undefined) {
                        service.updateCharacteristic(this.Characteristic.CurrentTemperature, codeData.value);
                      }
                    }
                  }
                } else {
                  this.log.error(deviceResult.error_msg);
                  this.log.error(deviceResult.error_code);
                  this.log.error(deviceResult.error_msg_code);
                }
              });
            }
          }
        } else {
          this.log.error(aquaTempObject.error_msg);
          this.log.error(aquaTempObject.error_code);
          this.log.error(aquaTempObject.error_msg_code);
        }
      });
    }, (this.config['UpdateTime'] as number) * 1000);

  }

  configureAccessory(accessory: PlatformAccessory) {
    this.log.info('Loading accessory from cache:', accessory.displayName);

    this.accessories.push(accessory);
  }

  discoverDevices() {
    const httpRequest = new HttpRequest(this.config, this.log);

    httpRequest.GetDeviceList().then((results)=> {
      const aquaTempObject = <AquaTempObject>results;

      if (aquaTempObject.is_reuslt_suc) {
        for (const device of aquaTempObject.object_result) {
          if (device.is_fault===false) {
            const accessoryObject = this.getAccessory(device, 'temperature');
            new ThermometerAccessory(this, accessoryObject.accessory, device, this.config, this.log);
            this.addOrRestorAccessory(accessoryObject.accessory, device.device_nick_name, 'temperature', accessoryObject.exists);
          }
        }
      } else {
        this.log.error(aquaTempObject.error_msg);
        this.log.error(aquaTempObject.error_code);
        this.log.error(aquaTempObject.error_msg_code);
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