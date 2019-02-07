
const REQUEST = Symbol("@rpc.request")


class RpcEntity {
    public static factory(rpc: RpcClient): any {
        return class extends this {
            private static rpc: any = rpc
        }
    }

    public static [REQUEST]() {
        return this.rpc.request()
    }
}


class User extends RpcEntity {
    public static readonly INSTANCE = new InjectionToken("User instance")
}


export const USER_PROVIDE = {
    provide: User,
    deps: [RpcClient],
    useFactory: User.factory
}


// extending the user class
namespace User {
    export function list(filter: any) {
        this[REQUEST]("User.list", filter)
    }
}


class RpcService { }


class UserController extends RpcService {
    public constructor(
        @Inject(User) private readonly _type1: ModelClass<User>,
        @Inject(User2) private readonly _type2: ModelClass<User>) {
        super()
    }

    list(filter: any) {
        this.rpc.request().map(v => v.items).map(v => new this._type1(v))
    }
}
