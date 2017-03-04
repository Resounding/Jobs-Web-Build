interface CuttingsPerTable {
    tight: number;
    half?: number;
    full: number
}

export interface Plant {
    id:number;
    name:string;
    abbreviation:string;
    crop:string;
    size:string;
    cuttingsPerPot:number;
    cuttingsPerTable:CuttingsPerTable;
    potsPerCase:number;
    hasLightsOut:boolean;
}

export class PlantDocument implements Plant {
    id:number;
    name:string = '';
    abbreviation:string = '';
    crop:string = '';
    size:string = '';
    cuttingsPerPot:number = 1;
    cuttingsPerTable:CuttingsPerTable = {full: 0, tight: 0};
    potsPerCase:number = 0;
    hasLightsOut:boolean = false;

    constructor(args?:Plant) {
        if(args) {
            _.extend(this, args);
        }
    }
}

export class Spacings {
    static Tight:string = 'tight';
    static Half:string = 'half';
    static Full:string = 'full';
}

export type SpacingOptions = 'tight' | 'half' | 'full';
