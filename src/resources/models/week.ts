import {Zone} from './zone';

export interface WeekZone {
    zone:Zone;
    available:number;
    tables:number;
    selected:boolean;
}

export interface WeekZones {
    [index:string]: WeekZone;
}

export interface Week {
    _id:string;
    year:number;
    week:number;
    zones:WeekZones;
}

export class WeekDocument implements Week{
    _id:string;
    year:number;
    week:number;
    zones:WeekZones;

    constructor(arg?:Week) {
        if(arg) {
            _.extend(this, arg);
        }
    }

    getAvailable():number {
        return _.reduce(Object.keys(this.zones), (memo:number, key:string) => {
            return memo + this.zones[key].available;
        }, 0);
    }
}
