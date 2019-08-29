import { InjectionToken, Inject, Optional } from "@angular/core"
import { HttpClient, HttpHeaders } from "@angular/common/http"
import { Observable, race, NEVER } from "rxjs"
import { share, takeUntil, catchError } from "rxjs/operators"

import { Transaction, RequestMeta, RpcError } from "./transaction"
import { RpcInterceptor, applyInterceptors } from "./interceptor"


export abstract class Transport {
    public readonly packingTime: number = 50
    protected nextId: number = 1
    protected transactions: { [key: number]: Transaction<any> } = {}

    protected pending: Array<Transaction<any>> = []
    protected packingTimeout: any

    public constructor(@Inject(RpcInterceptor) @Optional() protected readonly interceptors: RpcInterceptor[]) {

    }

    public call(name: string, params: { [key: string]: any }, meta?: RequestMeta): Observable<any> {
        const trans = new Transaction(this.nextId++, name, params, meta)
        this.transactions[trans.id] = trans

        const observable = new Observable(observer => {
            let s = trans.progress.subscribe(observer)

            if (this.packingTime) {
                this.pending.push(trans)

                if (!this.packingTimeout) {
                    this.packingTimeout = setTimeout(() => {
                        let toSend = this.pending.slice()
                        this.pending.length = 0
                        clearTimeout(this.packingTimeout)
                        delete this.packingTimeout
                        this._send(toSend)
                            .pipe(catchError((err: any) => {
                                observer.error(err)
                                return NEVER
                            }))
                            .subscribe()
                    }, this.packingTime)
                }
            } else {
                this._send([trans])
                    .pipe(catchError((err: any) => {
                        observer.error(err)
                        return NEVER
                    }))
                    .subscribe()
            }

            return () => {
                if (!trans.isCompleted) {
                    trans.progress.complete()
                    this._cancel(trans)
                }
                s.unsubscribe()
            }
        })

        return applyInterceptors(observable, this.interceptors || []).pipe(share())
    }

    protected abstract _send(trans: Array<Transaction<any>>): Observable<any>

    protected abstract _cancel(trans: Transaction<any>): void
}


export class HTTPTransport extends Transport {
    public static readonly ENDPOINT = new InjectionToken("HTTPTransport.ENDPOINT")

    public constructor(
        @Inject(RpcInterceptor) @Optional() interceptors: RpcInterceptor[],
        @Inject(HTTPTransport.ENDPOINT) public readonly endpoint: string,
        @Inject(HttpClient) protected readonly http: HttpClient) {
        super(interceptors)
    }

    // protected _send(trans: Transaction<any>) {
    //     const data = this._render(trans)
    //     const headers = new HttpHeaders({
    //         "Content-Type": "application/json"
    //     })

    //     this.http.post(this.endpoint, JSON.stringify(data), { headers, withCredentials: true })
    //         .pipe(takeUntil(trans.progress))
    //         .subscribe(success => {
    //             let body: any[] = Array.isArray(success) ? success : [success]
    //             this._handleResponse(body)
    //         })
    // }

    protected _send(trans: Array<Transaction<any>>): Observable<any> {
        const data = trans.map(t => this._render(t))
        const headers = new HttpHeaders({
            "Content-Type": "application/json"
        })

        return new Observable(observer => {
            const s = this.http.post(this.endpoint, JSON.stringify(data), { headers, withCredentials: true })
                .pipe(
                    takeUntil(race(trans.map(t => t.progress))),
                    catchError(err => {
                        observer.error(err)
                        return NEVER
                    })
                ).subscribe(success => {
                    let body: any[] = Array.isArray(success) ? success : [success]
                    this._handleResponse(body)
                    observer.complete()
                })

            return () => {
                s.unsubscribe()
            }
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
                    delete this.transactions[item.id]
                } else if (!trans) { // TODO: dev only
                    throw new RpcError(`Transaction not found for ${item.id}`, RpcError.SYSTEM_ERROR)
                }
            } else { // TODO: dev only
                throw new RpcError("Missing transaction id", RpcError.TRANSPORT_ERROR)
            }
        }
    }

    protected _render(trans: Transaction<any>) {
        let res: any = {
            id: trans.id,
            method: trans.method,
            params: trans.params
        }
        if (trans.meta) {
            res.meta = trans.meta
        }
        return res
    }

    protected _updateTrans(trans: Transaction<any>, response: any) {
        const error = response.error
        if (error) {
            trans.done(null, new RpcError(error.message, error.code, error.data))
        } else {
            trans.done(response.result)
        }
    }
}
