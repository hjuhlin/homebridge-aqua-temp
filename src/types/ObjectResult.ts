export interface ObjectResult {
    device_status: string;
    is_fault: boolean;
    device_id: string;
    device_code: string;
    product_id: string;
    device_nick_name: string;
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