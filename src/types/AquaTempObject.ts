import { ObjectResult } from './ObjectResult';

export interface AquaTempObject {
        error_code: string;
        error_msg: string;
        error_msg_code: string;
        object_result: ObjectResult[];
        is_reuslt_suc: boolean;
}
