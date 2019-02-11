import { InjectionToken, Inject } from "@angular/core"
import { HttpClient } from "@angular/common/http"
import { Observable } from "rxjs"
import { share, takeUntil } from "rxjs/operators"

import { Transaction, RequestMeta, RpcError } from "./transaction"


export abstract class Transport {
    protected nextId: number = 0
    protected transactions: { [key: number]: Transaction<any> } = {}

    public call(name: string, params: any[], meta?: RequestMeta): Observable<any> {
        const trans = new Transaction(this.nextId++, name, params, meta)
        this.transactions[trans.id] = trans
        return new Observable(observer => {
            let s = trans.progress.subscribe(observer)
            this._send(trans)
            return () => {
                if (!trans.isCompleted) {
                    trans.progress.complete()
                    this._cancel(trans)
                }
                s.unsubscribe()
            }
        }).pipe(share())
    }

    protected abstract _send(trans: Transaction<any>);

    protected abstract _cancel(trans: Transaction<any>);
}


export class HTTPTransport extends Transport {
    public static readonly ENDPOINT = new InjectionToken("HTTPTransport.ENDPOINT")

    public constructor(
        @Inject(HTTPTransport.ENDPOINT) public readonly endpoint: string,
        @Inject(HttpClient) protected readonly http: HttpClient) {
        super()
    }

    protected _send(trans: Transaction<any>) {
        const data = this._render(trans)

        this.http.post(this.endpoint, JSON.stringify(data), { withCredentials: true })
            .pipe(takeUntil(trans.progress))
            .subscribe(success => {
                let body: any[] = Array.isArray(success) ? success : [success]
                this._handleResponse(body)
            })
    }

    protected _cancel(trans: Transaction<any>) {
        trans.cancel()
    }

    protected _handleResponse(response: any[]) {
        for (const item of response) {
            if (item.id) {
                const trans = this.transactions[item.id]
                if (trans) {
                    this._updateTrans(trans, item)
                } else if (!trans) { // TODO: dev only
                    throw new RpcError(`Transaction not found for ${item.id}`, RpcError.SYSTEM_ERROR)
                }
            } else { // TODO: dev only
                throw new RpcError("Missing transaction id", RpcError.TRANSPORT_ERROR)
            }
        }
    }

    protected _render(trans: Transaction<any>) {
        return {
            id: trans.id,
            method: trans.method,
            params: trans.params,
            meta: trans.meta
        }
    }

    protected _updateTrans(trans: Transaction<any>, response: any) {
        const error = response.error
        if (error) {
            trans.done(null, new RpcError(error.message, error.code, error.data))
        } else {
            trans.done(response.data)
        }
    }
}