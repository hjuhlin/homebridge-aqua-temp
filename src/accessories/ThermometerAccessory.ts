import { Service, PlatformAccessory, Logger, PlatformConfig } from 'homebridge';

import { AquaTempHomebridgePlatform } from '../platform';
import { ObjectResult } from '../types/ObjectResult';

export class ThermometerAccessory {
  private service: Service;

  constructor(
    private readonly platform: AquaTempHomebridgePlatform,
    private readonly accessory: PlatformAccessory,
    private readonly device: ObjectResult,
    public readonly config: PlatformConfig,
    public readonly log: Logger,
    private readonly SubName: string,
  ) {
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'AquaTemp')
      .setCharacteristic(this.platform.Characteristic.Model, 'AquaTempThermometerSensor')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, device.device_id+'_'+SubName);

    this.service = this.accessory.getService(this.platform.Service.TemperatureSensor) ||
    this.accessory.addService(this.platform.Service.TemperatureSensor);

    this.service.setCharacteristic(this.platform.Characteristic.Name, device.device_nick_name + ' ('+SubName+')');
  }
}
