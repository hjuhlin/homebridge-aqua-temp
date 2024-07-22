const request = require('request');
const crypto = require('crypto');

import { PlatformConfig, Logger } from 'homebridge';

export class HttpRequest {

  readonly urlLogin = 'https://cloud.linked-go.com:449/crmservice/api/app/user/login?lang=en';
  readonly urlDevicesList = 'https://cloud.linked-go.com:449/crmservice/api/app/device/deviceList?lang=en';
  readonly urlDevicesData = 'https://cloud.linked-go.com:449/crmservice/api/app/device/getDataByCode?lang=en';
  readonly urlUpdateDevice = 'https://cloud.linked-go.com:449/crmservice/api/app/device/control?lang=en';
  readonly urlDevicesSharedList = 'https://cloud.linked-go.com:449/crmservice/api/app/device/getMyAppectDeviceShareDataList?lang=en';

  constructor(
    public readonly config: PlatformConfig,
    public readonly log: Logger,
  ) {}

  createInstance() {
    return {};
  }

  Login() {
    return new Promise((resolve, reject) => {
      request(
        {
          url: this.urlLogin,
          method: 'POST',
          headers: {
            'content-type': 'application/json;charset=UTF-8',
            'x-token': '',
          },
          body: {
            password: this.HashPassword(this.config['Password']),
            loginSource: 'IOS',
            appId: '14',
            type: '2',
            userName: this.config['UserName'],
          },
          json: true,
        }, (error, response, body) => {
          if (error) {
            reject(error);
          } else {
            resolve(body);
          }
        });
    });
  }

  HashPassword(plainPassword) {
    const passwordBytes = Buffer.from(plainPassword, 'utf8');
    const md5hash = crypto.createHash('md5');
    md5hash.update(passwordBytes);
    const passwordHashed = md5hash.digest('hex');

    return passwordHashed;
  }

  GetDeviceList(token: string) {
    return new Promise((resolve, reject) => {
      request(
        {
          url: this.urlDevicesList,
          method: 'POST',
          headers: {
            'x-token': token,
          },
          body: {
            appId: '14',
          },
          json: true,
        }, (error, response, body) => {
          if (response.statusCode === 401) {
            reject('NotLoggedIn');
          }

          if (error) {
            reject(error);
          } else {
            resolve(body);
          }
        });
    });
  }

  GetDeviceSharedList(token: string) {
    return new Promise((resolve, reject) => {
      request(
        {
          url: this.urlDevicesSharedList,
          method: 'POST',
          headers: {
            'x-token': token,
          },
          body: {
            appId: '14',
          },
          json: true,
        }, (error, response, body) => {
          if (response.statusCode === 401) {
            reject('NotLoggedIn');
          }

          if (error) {
            reject(error);
          } else {
            resolve(body);
          }
        });
    });
  }

  GetDeviceStatus(deviceCode: string, token: string) {
    return new Promise((resolve, reject) => {
      request(
        {
          url: this.urlDevicesData,
          method: 'POST',
          headers: {
            'x-token': token,
          },
          body: {
            device_code: deviceCode,
            appId: '14',
            protocal_codes: ['T02', 'T05', 'T12', 'R02', 'power', 'Manual-mute'],
          },
          json: true,
        }, (error, response, body) => {

          if (response.statusCode === 401) {
            reject('NotLoggedIn');
          }

          if (error) {
            this.log.error(error);
            reject(error);
          } else {
            resolve(body);
          }
        });
    });
  }

  ChangePowerOfDevice(deviceCode: string, turnOn: boolean, token: string) {
    return new Promise((resolve, reject) => {
      request(
        {
          url: this.urlUpdateDevice,
          method: 'POST',
          headers: {
            'x-token': token,
          },
          body: {
            param: [{
              device_code: deviceCode,
              value: turnOn? '1':'0',
              protocol_code: 'Power',
            }],
          },
          json: true,
        }, (error, response, body) => {
          if (response.statusCode === 401) {
            reject('NotLoggedIn');
          }

          if (error) {
            reject(error);
          } else {
            resolve(body);
          }
        });
    });
  }

  ChangeTargetTemperatureOfDevice(deviceCode: string, value: string, token: string) {
    return new Promise((resolve, reject) => {
      request(
        {
          url: this.urlUpdateDevice,
          method: 'POST',
          headers: {
            'x-token': token,
          },
          body: {
            param: [{
              device_code: deviceCode,
              value: value,
              protocol_code: 'R02',
            }],
          },
          json: true,
        }, (error, response, body) => {
          if (response.statusCode === 401) {
            reject('NotLoggedIn');
          }

          if (error) {
            reject(error);
          } else {
            resolve(body);
          }
        });
    });
  }

  ChangeSilenceModeOfDevice(deviceCode: string, value: string, token: string) {
    return new Promise((resolve, reject) => {
      request(
        {
          url: this.urlUpdateDevice,
          method: 'POST',
          headers: {
            'x-token': token,
          },
          body: {
            param: [{
              device_code: deviceCode,
              value: value,
              protocol_code: 'Manual-mute',
            }],
          },
          json: true,
        }, (error, response, body) => {
          if (response.statusCode === 401) {
            reject('NotLoggedIn');
          }

          if (error) {
            reject(error);
          } else {
            resolve(body);
          }
        });
    });
  }

}