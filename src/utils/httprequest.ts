const request = require('request');

import { PlatformConfig, Logger } from 'homebridge';

export class HttpRequest {

  readonly urlDevicesList = 'http://cloud.linked-go.com:84/cloudservice/api/app/device/deviceList.json';
  readonly urlDevicesData = 'http://cloud.linked-go.com:84/cloudservice/api/app/device/getDataByCode.json';
  //readonly urlUpdateDevice = `http://${this.config['ip']}/v1/nodes/{id}/call?timeout=500`;

  constructor(
    public readonly config: PlatformConfig,
    public readonly log: Logger,
  ) {}

  createInstance() {
    return {};
  }

  GetDeviceList() {
    return new Promise((resolve, reject) => {
      request(
        {
          url: this.urlDevicesList,
          method: 'POST',
          headers: {
            'x-token': this.config['Token'],
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

  GetDeviceStatus(deviceCode: string) {
    return new Promise((resolve, reject) => {
      request(
        {
          url: this.urlDevicesData,
          method: 'POST',
          headers: {
            'x-token': this.config['Token'],
          },
          body: {
            device_code: deviceCode,
            protocal_codes: ['power', 'T02'],
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

  //   Update(id: number, body) {
  //     return new Promise((resolve, reject) => {

//       request(
//         {
//           url: this.urlUpdateDevice.replace('{id}', id.toString()),
//           method: 'POST',
//           body: body,
//           auth: {
//             user: 'nexa',
//             pass: 'nexa',
//             sendImmediately: false,
//           },
//           json: true,
//         },
//         (error, response, body) => {
//           if (error) {
//             reject(error);
//           } else {
//             resolve(body);
//           }
//         },
//       );
//     });
//   }
}