export interface Customer {
    _id:string;
    _rev:string;
    type: string;
    name:string;
    address?:string;
    city?:string;
    province?:string;
    postal_code?:string;
    contact?:string;
    phone?:string;
}

export class CustomerDocument implements Customer {
    _id: string;
    _rev: string;
    type: string;
    name: string;
    address?:string;
    city?:string;
    province?:string;
    postal_code?:string;
    contact?:string;
    phone?:string;

    constructor(props?:Object) {
        if(props) {
            _.extend(this, props);
        }
    }

    toJSON():Customer {
        return {
            _id: this._id,
            _rev: this._rev,
            type: CustomerDocument.DOCUMENT_TYPE,
            name: this.name,
            address: this.address,
            city: this.city,
            province: this.province,
            postal_code: this.postal_code,
            contact: this.contact,
            phone: this.phone
        };
    }

    static createId(name:string):string {
        return `${CustomerDocument.DOCUMENT_TYPE}:${name.toLowerCase().replace(' ', '-')}`;
    }

    static DOCUMENT_TYPE:string = 'customer';
}
