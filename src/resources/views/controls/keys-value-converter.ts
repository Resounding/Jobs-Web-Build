export class KeysValueConverter {
    toView(obj) {
        return Reflect.ownKeys(obj);
    }
}

export class ValuesValueConverter {
    toView(obj) {
        return _.values(obj);
    }
}