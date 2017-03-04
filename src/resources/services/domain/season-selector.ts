import {Season} from '../../models/season';

export class SeasonSelector{
    constructor(public seasons:Season[]) { }

    get(date:Date, crop:string) {
        const orderedSeasons = _.sortBy(this.seasons, (s:Season) => s.year * 100 + s.week),
            m = moment(date),
            year = m.isoWeekYear(),
            week = m.isoWeek(),
            season = _.find(orderedSeasons, (s:Season, i:number, ary:Season[]) => {

                if(!isOnOrAfter(date, s, crop)) return false;
                if (i === ary.length - 1) return true;

                const nextSeason = ary[i+1];
                return isBefore(date, nextSeason, crop);
            });

        return season;
    }
}


function isOnOrAfter(date:Date, season:Season, crop:string):boolean {
    const m = moment(date),
        week = m.isoWeek(),
        year = m.isoWeekYear();
    let seasonWeek:number;
    if(typeof season.week === 'number'){
        seasonWeek = season.week;
    } else if(!crop in season.week) {
        throw Error(`Season ${season.name} in ${season.year} does not have a value for ${crop}`);
    } else {
        seasonWeek = season.week[crop];
    }

    if(year > season.year) return true;
    return (year === season.year && week >= seasonWeek);
}

function isBefore(date:Date, season:Season, crop:string):boolean {
    const m = moment(date),
        week = m.isoWeek(),
        year = m.isoWeekYear();
    let seasonWeek:number;
    if(typeof season.week === 'number'){
        seasonWeek = season.week;
    } else if(!crop in season.week) {
        throw Error(`Season ${season.name} in ${season.year} does not have a value for ${crop}`);
    } else {
        seasonWeek = season.week[crop];
    }

    if(year < season.year) return true;
    return (year === season.year && week < seasonWeek);
}
