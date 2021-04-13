import { Service, PlatformAccessory, Logger, PlatformConfig } from 'homebridge';

import { AquaTempHomebridgePlatform } from '../platform';
import { AquaTempObject } from '../types/AquaTempObject';
import { ObjectResult } from '../types/ObjectResult';
import { HttpRequest } from '../utils/httprequest';

export class ThermometerAccessory {
  private service: Service;

  constructor(
    private readonly platform: AquaTempHomebridgePlatform,
    private readonly accessory: PlatformAccessory,
    private readonly jsonItem: ObjectResult,
    public readonly config: PlatformConfig,
    public readonly log: Logger,
  ) {
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'AquaTemp')
      .setCharacteristic(this.platform.Characteristic.Model, 'AquaTempThermometerSensor')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, accessory.context.device.device_id);

    this.service = this.accessory.getService(this.platform.Service.TemperatureSensor) ||
    this.accessory.addService(this.platform.Service.TemperatureSensor);

    this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.device_nick_name);

    const httpRequest = new HttpRequest(this.config, log);

    httpRequest.GetDeviceStatus(accessory.context.device.device_code).then((deviceResults)=> {

      const deviceResult = <AquaTempObject>deviceResults;

      for (const codeData of deviceResult.object_result) {
        if (codeData.code ==='T02') {
          this.service.getCharacteristic(this.platform.Characteristic.CurrentTemperature).setProps({minValue: -100, maxValue: 100});
          this.service.updateCharacteristic(this.platform.Characteristic.CurrentTemperature, codeData.value);

        }
      }
    });
  }
}
