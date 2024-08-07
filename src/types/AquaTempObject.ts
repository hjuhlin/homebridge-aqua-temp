import { ObjectResult } from './ObjectResult';

export interface AquaTempObject {
        error_code: string;
        error_msg: string;
        error_msg_code: string;
        objectResult: ObjectResult[];
        isReusltSuc: boolean;
}

export interface LoginObject {
        error_code: string;
        error_msg: string;
        error_msg_code: string;
        objectResult: ObjectResult;
        isReusltSuc: boolean;
}
