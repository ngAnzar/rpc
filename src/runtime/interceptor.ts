import { Observable } from "rxjs"
import { Transaction } from "./transaction"

export abstract class RpcInterceptor<T = any> {
    public abstract intercept(transaction: Transaction<T>, source: Observable<T>): Observable<T>

    public onRequest?: (transactions: Array<Transaction<T>>) => void
}


export function applyInterceptors<T>(transaction: Transaction<T>, source: Observable<T>, interceptors: Array<RpcInterceptor<T>>): Observable<T> {
    for (const i of interceptors) {
        source = i.intercept(transaction, source)
    }
    return source
}
