import { Observable } from "rxjs";

export abstract class RpcInterceptor<T = any> {
    public abstract intercept(source: Observable<T>): Observable<T>
}


export function applyInterceptors<T>(source: Observable<T>, interceptors: Array<RpcInterceptor<T>>): Observable<T> {
    for (const i of interceptors) {
        source = i.intercept(source)
    }
    return source
}
