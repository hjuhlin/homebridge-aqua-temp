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
    private readonly device: ObjectResult,
    public readonly config: PlatformConfig,
    public readonly log: Logger,
    public readonly token: string,
  ) {
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'AquaTemp')
      .setCharacteristic(this.platform.Characteristic.Model, 'AquaTempThermometerSensor')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, device.device_id);

    this.service = this.accessory.getService(this.platform.Service.TemperatureSensor) ||
    this.accessory.addService(this.platform.Service.TemperatureSensor);

    this.service.setCharacteristic(this.platform.Characteristic.Name, device.device_nick_name);
  }
}
