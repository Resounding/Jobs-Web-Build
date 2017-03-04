export interface SeasonTimeSeasons {
    spring: number;
    winter: number;
    fall: number;
    summer: number;
}

export interface SeasonTime {
    plant: string;
    year: number;
    times: number | SeasonTimeSeasons;
}

export class SeasonTimeDocument {
    plant: string;
    year: number;
    times: number | SeasonTimeSeasons;

    constructor(args?:SeasonTime) {
        if(args) {
            _.extend(this, args);
        }
    }
}
