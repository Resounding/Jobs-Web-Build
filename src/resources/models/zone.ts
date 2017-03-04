export interface Zone {
    name:string;
    tables:number;
    autoSpace:boolean;
    isPropagationZone:boolean;
}

export class ZoneDocument implements Zone {
    name:string;
    tables:number;
    autoSpace:boolean;
    isPropagationZone:boolean;

    constructor(args?:Zone) {
        if(args) {
            _.extend(this, args);
        }
    }
}
