import { Observable, NEVER } from "rxjs"
import { DataSource, Model, PrimaryKey, Filter, Sorter, Meta, NzRange } from "@anzar/core"


export interface Backend {
    search(params: { filter: { [key: string]: any }, order: { [key: string]: any }, begin: number, count: number }, m?: Meta<any>): Observable<any[]>
    get(params: { id: PrimaryKey }, m?: Meta<any>): Observable<any>
    save(params: { [key: string]: any }, m?: Meta<any>): Observable<any>
    remove(params: { id: PrimaryKey }, m?: Meta<any>): Observable<boolean>
    position(params: { id: PrimaryKey }, m?: Meta<any>): Observable<number | null>
}


export class RpcDataSource<T extends Model, B extends Backend> extends DataSource<T> {
    public readonly async = true

    public constructor(public readonly backend: B) {
        super()
    }

    protected _search(f?: Filter<T>, s?: Sorter<T>, r?: NzRange, m?: Meta<T>): Observable<any[]> {
        return this.backend.search({ filter: f, order: s, begin: r ? r.begin : null, count: r ? r.length : null }, m)
    }

    protected _get(id: PrimaryKey, m?: Meta<T>): Observable<T> {
        return this.backend.get({ id }, m)
    }

    protected _save(model: T, m?: Meta<T>): Observable<T> {
        return this.backend.save(Model.toObject(model, true), m)
    }

    protected _remove(id: PrimaryKey, m?: Meta<T>): Observable<boolean> {
        return this.backend.remove({ id }, m)
    }

    public getPosition(id: PrimaryKey, m?: Meta<T>): Observable<number> {
        return this.backend.position({ id }, m)
    }
}
