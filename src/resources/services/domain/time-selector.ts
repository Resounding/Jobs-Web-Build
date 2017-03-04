import {SeasonTime} from "../../models/season-time";
import {Season} from "../../models/season";

export class TimeSelector {
    constructor(public times:SeasonTime[]) { }

    get(season:Season, plant:string):number {
        const time:SeasonTime = _.find(this.times, ft => {
            return ft.year === season.year && ft.plant === plant;
        });

        if(!time) return undefined;

        if(typeof time.times === 'number') return <number>time.times;

        return time.times[season.name];
    }
}
