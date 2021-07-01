import { Service, PlatformAccessory, Logger, PlatformConfig, CharacteristicValue } from 'homebridge';

import { AquaTempHomebridgePlatform } from '../platform';
import { AquaTempObject } from '../types/AquaTempObject';
import { ObjectResult } from '../types/ObjectResult';
import { HttpRequest } from '../utils/httprequest';

export class ThermostatAccessory {
  private service: Service;
  private startUp: boolean;

  constructor(
    private readonly platform: AquaTempHomebridgePlatform,
    private readonly accessory: PlatformAccessory,
    private readonly jsonItem: ObjectResult,
    public readonly config: PlatformConfig,
    public readonly log: Logger,
    private readonly SubName: string,
  ) {
    const startUp = true;

    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'AquaTemp')
      .setCharacteristic(this.platform.Characteristic.Model, 'AquaTempThermostat')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, accessory.context.device.device_id+'_heater');

    this.service = this.accessory.getService(this.platform.Service.Thermostat) ||
    this.accessory.addService(this.platform.Service.Thermostat);

    this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.device_nick_name + ' ('+SubName+')');
    this.service.setCharacteristic(this.platform.Characteristic.TemperatureDisplayUnits,
      this.platform.Characteristic.TemperatureDisplayUnits.CELSIUS);

    this.service.getCharacteristic(this.platform.Characteristic.CurrentHeatingCoolingState).setProps({
      minValue: 0,
      maxValue: 1,
      validValues: [0, 1],
    });

    this.service.getCharacteristic(this.platform.Characteristic.TargetHeatingCoolingState).setProps({
      minValue: 0,
      maxValue: 1,
      validValues: [0, 1],
    });

    this.service.getCharacteristic(this.platform.Characteristic.TargetHeatingCoolingState).onSet(this.setState.bind(this));
    this.service.getCharacteristic(this.platform.Characteristic.TargetTemperature).onSet(this.setTemperature.bind(this));

    if (this.config['ViewElectricPowerUsage'] as boolean) {
      this.service.addOptionalCharacteristic(this.platform.customCharacteristic.characteristic.ElectricPower);
    }

    this.startUp = false;
  }

  setState(value: CharacteristicValue) {
    if (this.startUp===true) {
      return;
    }

    let on = false;

    switch (value) {
      case this.platform.Characteristic.TargetHeatingCoolingState.HEAT:
        on=true;
    }

    const httpRequest = new HttpRequest(this.config, this.log);
    httpRequest.ChangePowerOfDevice(this.accessory.context.device.device_code, on, this.platform.Token).then((results)=> {

      const result = <AquaTempObject>results;

      if (result.is_reuslt_suc===false) {
        this.log.error(result.error_msg);
        this.log.error(result.error_code);
        this.log.error(result.error_msg_code);
      } else {
        this.log.info('Changed state to ' +(value?'HEAT':'OFF'));
      }
    }).catch((error) => {
      if (error==='NotLoggedIn') {
        this.platform.getToken(false);
      }
    });
  }

  setTemperature(value: CharacteristicValue) {
    if (this.startUp===true) {
      return;
    }

    const temp = value as string;

    const httpRequest = new HttpRequest(this.config, this.log);
    httpRequest.ChangeTargetTemperatureOfDevice(this.accessory.context.device.device_code, temp, this.platform.Token).then((results)=> {

      const result = <AquaTempObject>results;

      if (result.is_reuslt_suc===false) {
        this.log.error(result.error_msg);
        this.log.error(result.error_code);
        this.log.error(result.error_msg_code);
      } else {
        this.log.info('Changed target temperature to ' +(value));
      }
    }).catch((error) => {
      if (error==='NotLoggedIn') {
        this.platform.getToken(false);
      }
    });
  }
}