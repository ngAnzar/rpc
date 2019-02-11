import { Entity } from "../schema";
import { Compiler } from "./compiler";
/**
 * class User extends Entity {
 *      @Field({}) public fieldName: type
 * }
 */
export declare function createEntityCode(comp: Compiler, ent: Entity): string;
