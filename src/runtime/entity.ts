import { Model } from "@anzar/core/data.module"
import { Client } from "./client"


export const RPC_CLIENT = Symbol("@rpc.client")


export class Entity extends Model {
    public static factory(rpc: Client): any {
        return class extends this {
            private static [RPC_CLIENT]: Client = rpc
        }
    }
}
