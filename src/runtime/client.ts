import { Inject, Injectable } from "@angular/core"
import { of, throwError } from "rxjs"
import { map, switchMap } from "rxjs/operators"

import { HTTPTransport, Transport } from "./transport"


export abstract class Client {
    public abstract readonly transport: Transport
}


export interface MethodOptions {
    map?: (obj: any) => any
}


export function Method(name: string, options: MethodOptions = {}) {
    return (target: any, propertyKey: string, descriptor?: PropertyDescriptor) => {
        const type = Reflect.getMetadata("design:type", target, propertyKey)
        if (type !== Function) {
            throw new Error("RpcMethod must be function type")
        }

        const action_ = name
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
                return this.transport.call(action_, params, meta)
                    .pipe(switchMap(function (result: any) {
                        return result instanceof Error ? throwError(result) : of(map_(result))
                    }))
            }
            : function (this: Client, params: { [key: string]: any }, meta?: any): any {
                return this.transport.call(action_, params, meta)
            }
    }
}


@Injectable()
export class HTTPClient extends Client {
    public constructor(@Inject(HTTPTransport) public readonly transport: Transport) {
        super()
    }
}
