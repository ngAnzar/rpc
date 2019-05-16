import { Observable, NEVER } from "rxjs"
import { DataSource, Model, ID, Filter, Sorter } from "@anzar/core/data.module"
import { NzRange } from "@anzar/core/util"


export interface Backend {
    search(params: { filter: { [key: string]: any }, order: { [key: string]: any }, begin: number, count: number }): Observable<any[]>
    get(params: { id: ID }): Observable<any>
    save(params: { [key: string]: any }): Observable<any>
    remove(params: { id: ID }): Observable<boolean>
    position(params: { id: ID }): Observable<number | null>
}


export class RpcDataSource<T extends Model, B extends Backend> extends DataSource<T> {
    public readonly async = true

    public constructor(public readonly backend: B) {
        super()
    }

    protected _search(f?: Filter<T>, s?: Sorter<T>, r?: NzRange): Observable<any[]> {
        return this.backend.search({ filter: f, order: s, begin: r ? r.begin : null, count: r ? r.length : null })
    }

    protected _get(id: ID): Observable<T> {
        return this.backend.get({ id })
    }

    protected _save(model: T): Observable<T> {
        return this.backend.save(Model.toObject(model, true))
    }

    protected _remove(id: ID): Observable<boolean> {
        return this.backend.remove({ id })
    }

    public getPosition(id: ID): Observable<number> {
        return this.backend.position({ id })
    }
}
