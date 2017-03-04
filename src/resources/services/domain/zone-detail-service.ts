import {autoinject} from 'aurelia-framework';
import {ReferenceService} from "../data/reference-service";
import {OrderDocument} from "../../models/order";
import {Plant} from "../../models/plant";
import {Week} from "../../models/week";
import {Zone} from "../../models/zone";

interface ZoneWeek {
    weekNumber:number;
    plants:number[];
    available:number;
}

export interface ZoneDetailModel {
    plants:string[];
    weeks:ZoneWeek[]
}

@autoinject()
export class ZoneDetailService {

    constructor(private referenceService:ReferenceService) { }

    createModel(plants:Plant[], orders:OrderDocument[], year:number, zone:Zone):Promise<ZoneDetailModel> {
        return new Promise((resolve, reject) => {
        this.referenceService.weeks()
            .then(result => {
                const
                    sortedPlants = _.sortBy(plants, p => p.name.toLowerCase() + p.size),
                    plantNames = _.pluck(sortedPlants, 'name'),
                    plantOrders = plantNames.reduce((memo:Map<string, Map<string,number>>, plantName:string) => {
                        if(!memo.has(plantName)) {
                            memo.set(plantName, new Map<string,number>());
                        }
                        return memo;
                    }, new Map<string, Map<string,number>>()),
                    zoneOrders = orders
                        .reduce((memo:Map<string, Map<string,number>>, o:OrderDocument) => {
                            _.forEach(o.weeksInHouse, (value, key) => {
                                const plantWeek = memo.get(o.plant.name);

                                if(!plantWeek.has(key)) {
                                    plantWeek.set(key, 0);
                                }

                                let tables = plantWeek.get(key);

                                if(value.zone === zone.name) {
                                    tables += value.tables;
                                }

                                plantWeek.set(key, tables);
                            });
                            return memo;
                        }, plantOrders),
                    weeks =  result
                        .filter(w => w.year === year)
                        .sort((a:Week, b:Week) => {
                            return a.week - b.week;
                        })
                        .map(w => {
                            let available:number = zone.tables;
                            return {
                                weekNumber: w.week,
                                plants: plantNames.map(p => {
                                    const weeks = zoneOrders.get(p),
                                        tables = weeks.has(w._id) ? weeks.get(w._id) : 0;

                                    available -= tables;
                                    return tables;
                                }),
                                available: available
                            };
                        });

                const model = {
                    plants: plantNames,
                    weeks: weeks,
                    zone: zone
                };

                resolve(model);
            })
            .catch(reject);
        });
    }
}
