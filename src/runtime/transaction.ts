import { Subject } from "rxjs"

import { Meta } from "@anzar/core/data.module"


export type RequestMeta<T = any> = Meta<T>


export class Transaction<T> {
    public readonly isCompleted: boolean = false
    public readonly isSuccess: boolean = false
    public readonly isCancelled: boolean = false
    public readonly progress: Subject<T> = new Subject()

    public constructor(
        public readonly id: number,
        public readonly method: string,
        public readonly params: { [key: string]: any },
        public readonly meta?: RequestMeta) {
    }

    public done(success: T, error?: RpcError) {
        if (!this.isCancelled && !this.isCompleted) {
            (this as any).isCompleted = true
            if (error) {
                (this as any).isSuccess = false
                this.progress.error(error)
            } else {
                (this as any).isSuccess = true
                this.progress.next(success)
                this.progress.complete()
            }
        }
    }

    public cancel() {
        if (!this.isCompleted) {
            (this as any).isCancelled = true
            this.progress.complete()
        }
    }
}


export type LoadFields = "*" | Array<string | { [key: string]: LoadFields }>


export interface Request {
    id: number,
    method: string,
    params: { [key: string]: any },
    meta?: RequestMeta
}


export interface ResponseOk {
    id: number,
    result: any
}


export class RpcError extends Error {
    public static readonly PARSER_ERROR_MALFORMED = -32700
    public static readonly PARSER_ERROR_ENCODING = -32701
    public static readonly PARSER_ERROR_INVALID_CHAR = -32702
    public static readonly SERVER_ERROR_INVALID_RPC = -32600
    public static readonly SERVER_ERROR_METHOD_NOT_FOUND = -32601
    public static readonly SERVER_ERROR_INTERNAL_RPC_ERROR = -32603
    public static readonly APPLICATION_ERROR = -32500
    public static readonly SYSTEM_ERROR = -32400
    public static readonly TRANSPORT_ERROR = -32300

    public constructor(
        public readonly _message: string,
        public readonly code: number,
        public readonly data?: any) {
        super()

        let type, tb

        if (data) {
            type = data.type
            tb = data.traceback
        } else {

        }

        if (tb) {
            this.message = tb.join("\n")
        } else {
            if (type) {
                this.message = `${type}: ${_message}`
            } else {
                this.message = _message
            }
        }
    }
}
