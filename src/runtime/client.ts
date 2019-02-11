import { Inject } from "@angular/core"
import { map } from "rxjs/operators"

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
            ? function (this: Client, ...args: any[]): any {
                return this.transport.call(action_, args, lf(this)).pipe(map(map_))
            }
            : function (this: Client, ...args: any[]): any {
                return this.transport.call(action_, args, lf(this))
            }
    }
}


export class HTTPClient extends Client {
    public constructor(@Inject(HTTPTransport) public readonly transport: Transport) {
        super()
    }
}
