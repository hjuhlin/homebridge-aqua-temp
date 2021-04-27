import { Service, PlatformAccessory, Logger, PlatformConfig, CharacteristicValue, CharacteristicSetCallback } from 'homebridge';

import { AquaTempHomebridgePlatform } from '../platform';
import { AquaTempObject } from '../types/AquaTempObject';
import { ObjectResult } from '../types/ObjectResult';
import { HttpRequest } from '../utils/httprequest';

export class SwitchAccessory {
  private service: Service;

  constructor(
    private readonly platform: AquaTempHomebridgePlatform,
    private readonly accessory: PlatformAccessory,
    private readonly jsonItem: ObjectResult,
    public readonly config: PlatformConfig,
    public readonly log: Logger,
    public readonly token: string,
  ) {
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'AquaTemp')
      .setCharacteristic(this.platform.Characteristic.Model, 'AquaTempSwitchSensor')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, accessory.context.device.device_id);

    this.service = this.accessory.getService(this.platform.Service.Switch) || this.accessory.addService(this.platform.Service.Switch);
    this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.device_nick_name);

    const httpRequest = new HttpRequest(this.config, log);

    httpRequest.GetDeviceStatus(accessory.context.device.device_code, token).then((deviceResults)=> {

      const deviceResult = <AquaTempObject>deviceResults;

      for (const codeData of deviceResult.object_result) {
        if (codeData.code ==='power') {
          const isOn = codeData.value==='0'?false:true;
          this.service.setCharacteristic(this.platform.Characteristic.On, isOn);
        }
      }
    });

    this.service.getCharacteristic(this.platform.Characteristic.On).on('set', this.setOn.bind(this));
  }

  setOn(value: CharacteristicValue, callback: CharacteristicSetCallback) {
    const httpRequest = new HttpRequest(this.config, this.log);
    httpRequest.GetChangePowerOfDevice(this.accessory.context.device.device_code, value?true:false, this.token).then((results)=> {

      const result = <AquaTempObject>results;

      if (result.is_reuslt_suc===false) {
        this.log.error(result.error_msg);
        this.log.error(result.error_code);
        this.log.error(result.error_msg_code);
      } else {
        if (this.config['Debug'] as boolean) {
          this.log.info('Changed power to ' +(value?'On':'Off'));
        }
      }
    });

    callback(null, null);
  }
}