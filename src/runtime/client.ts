import { Inject, Injectable } from "@angular/core"
import { of, throwError } from "rxjs"
import { map, switchMap } from "rxjs/operators"

import { HTTPTransport, Transport } from "./transport"


export abstract class Client {
    public abstract readonly transport: Transport
}


export interface MethodOptions {
    name: string
    map?: (obj: any) => any,
    hasParams?: boolean
}


export function Method(options: MethodOptions) {
    return (target: any, propertyKey: string, descriptor?: PropertyDescriptor) => {
        const type = Reflect.getMetadata("design:type", target, propertyKey)
        if (type !== Function) {
            throw new Error("RpcMethod must be function type")
        }

        const action_ = options.name
        const hasParams = options.hasParams
        const map_ = options.map
        if (map_ && typeof map_ !== "function") {
            throw new Error("'map' option must be a function")
        }

        function lf(src: any) {
            // TODO: ...
            if (typeof src.getLoadFields === "function") {
                return src.getLoadFields()
            }
            return null
        }

        target[propertyKey] = map_
            ? function (this: Client, params: { [key: string]: any }, meta?: any): any {
                return (hasParams ? this.transport.call(action_, params, meta) : this.transport.call(action_, null, params))
                    .pipe(switchMap(function (result: any) {
                        return result instanceof Error ? throwError(() => result) : of(map_(result))
                    }))
            }
            : function (this: Client, params: { [key: string]: any }, meta?: any): any {
                return (hasParams ? this.transport.call(action_, params, meta) : this.transport.call(action_, null, params))
            }
    }
}


@Injectable()
export class HTTPClient extends Client {
    public constructor(@Inject(HTTPTransport) public readonly transport: Transport) {
        super()
    }
}
