export interface ObjectResult {
    deviceStatus: string;
    is_fault: boolean;
    deviceId: string;
    deviceCode: string;
    productId: string;
    deviceNickName: string;
    code: string;
    value: string;

    role_name: string;
    user_type: string;
    user_id: string;
    user_name: string;
    nick_name: string;
    roleName: string;
    'x-token': string;
    real_name?: any;
}