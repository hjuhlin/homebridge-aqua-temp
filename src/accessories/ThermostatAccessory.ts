import { Service, PlatformAccessory, Logger, PlatformConfig, CharacteristicValue } from 'homebridge';

import { AquaTempHomebridgePlatform } from '../platform';
import { AquaTempObject } from '../types/AquaTempObject';
import { ObjectResult } from '../types/ObjectResult';
import { HttpRequest } from '../utils/httprequest';

export class ThermostatAccessory {
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
      .setCharacteristic(this.platform.Characteristic.Model, 'AquaTempThermostat')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, accessory.context.device.device_id);

    this.service = this.accessory.getService(this.platform.Service.Thermostat) ||
    this.accessory.addService(this.platform.Service.Thermostat);

    this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.device_nick_name);

    this.service.getCharacteristic(this.platform.Characteristic.TargetHeatingCoolingState).setProps({
      minValue: 0,
      maxValue: 1,
      validValues: [0, 1],
    });

    this.service.setCharacteristic(this.platform.Characteristic.CurrentTemperature, 0);

    const httpRequest = new HttpRequest(this.config, log);

    httpRequest.GetDeviceStatus(accessory.context.device.device_code, token).then((deviceResults)=> {

      const deviceResult = <AquaTempObject>deviceResults;

      for (const codeData of deviceResult.object_result) {
        if (codeData.code ==='power') {
          const isOn = codeData.value==='0'?false:true;
          this.service.setCharacteristic(this.platform.Characteristic.TargetHeatingCoolingState,
            isOn?this.platform.Characteristic.CurrentHeatingCoolingState.HEAT: this.platform.Characteristic.CurrentHeatingCoolingState.OFF);
        }

        if (codeData.code ==='T02') {
          this.service.setCharacteristic(this.platform.Characteristic.CurrentTemperature, codeData.value);
        }

        if (codeData.code ==='R02') {
          this.service.setCharacteristic(this.platform.Characteristic.TargetTemperature, codeData.value);
        }
      }
    });

    this.service.getCharacteristic(this.platform.Characteristic.TargetHeatingCoolingState).onSet(this.setState.bind(this));
    this.service.getCharacteristic(this.platform.Characteristic.TargetTemperature).onSet(this.setTemperature.bind(this));
  }

  setState(value: CharacteristicValue) {

    let on = false;

    switch (value) {
      case this.platform.Characteristic.CurrentHeatingCoolingState.HEAT:
        on=true;
    }

    const httpRequest = new HttpRequest(this.config, this.log);
    httpRequest.ChangePowerOfDevice(this.accessory.context.device.device_code, on, this.token).then((results)=> {

      const result = <AquaTempObject>results;

      if (result.is_reuslt_suc===false) {
        this.log.error(result.error_msg);
        this.log.error(result.error_code);
        this.log.error(result.error_msg_code);
      } else {
        if (this.config['Debug'] as boolean) {
          this.log.info('Changed state to ' +(value?'HEAT':'OFF'));
        }
      }
    });
  }

  setTemperature(value: CharacteristicValue) {

    const temp = value as string;

    const httpRequest = new HttpRequest(this.config, this.log);
    httpRequest.ChangeTargetTemperatureOfDevice(this.accessory.context.device.device_code, temp, this.token).then((results)=> {

      const result = <AquaTempObject>results;

      if (result.is_reuslt_suc===false) {
        this.log.error(result.error_msg);
        this.log.error(result.error_code);
        this.log.error(result.error_msg_code);
      } else {
        if (this.config['Debug'] as boolean) {
          this.log.info('Changed target temperature to ' +(value));
        }
      }
    });
  }
}