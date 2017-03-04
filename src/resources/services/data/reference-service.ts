import {autoinject} from 'aurelia-framework';
import {Database} from '../database';
import {Customer} from '../../models/customer';
import {Plant, PlantDocument} from '../../models/plant';
import {Zone} from '../../models/zone';
import {Season} from '../../models/season';
import {Week} from "../../models/week";
import {SeasonTime} from "../../models/season-time";
import {CapacityWeekZones} from "../../models/capacity-week";

const PlantsKey:string = 'plants';
const CustomersKey:string = 'customers';
const SeasonsKey:string = 'seasons';
const PropagationTimesKey:string = 'propagation-times';
const FlowerTimesKey:string = 'flower-times';

@autoinject()
export class ReferenceService {
    constructor(private database:Database) { }

    customers():Promise<Customer[]> {
        return new Promise((resolve, reject) => {

            this.database.db.get(CustomersKey)
                .then(result => {
                    const customers = _.sortBy(result.customers, (customer:Customer) => customer.name.toLowerCase());
                    resolve(customers);
                })
                .catch(reject);
        });
    }

    plants():Promise<Plant[]> {
        return new Promise((resolve, reject) => {

            this.database.db.get(PlantsKey)
                .then(result => {
                    const plants = _.sortBy(result.plants, (plant:Plant) => plant.crop.toLowerCase() + plant.size);
                    plants.forEach((plant, index) => {
                        if(typeof plant.id === 'undefined') plant.id = index;
                    });
                    resolve(plants);
                })
                .catch(reject);
        });
    }

    savePlant(plant:Plant, seasons:Season[], propagationTimes:SeasonTime[], flowerTimes:SeasonTime[]):Promise<PouchDB.Core.Response> {
        return new Promise((resolve, reject) => {
            this.database.db.get(PlantsKey)
                .then(plantsResult => {
                    const plants = <Plant[]>plantsResult.plants, 
                        index = _.findIndex(plants, p => p.id === plant.id);
                    if(index === -1) {
                        plant.id = _.max(plants, p => p.id).id + 1;
                        plantsResult.plants.push(plant);
                    } else {
                        plantsResult.plants[index] = plant;
                    }
                    this.database.db.put(plantsResult)
                        .then(saveResult => {
                            Promise.all([
                                this.saveSeasons(seasons, plants),
                                this.savePropagationTimes(propagationTimes, plants),
                                this.saveFlowerTimes(flowerTimes, plants)
                            ]).then(() => {
                                resolve(saveResult);
                            })
                            .catch(reject);
                        })
                        .catch(reject);
                })
                .catch(reject);
        });
    }

    deletePlant(plant:Plant):Promise<PouchDB.Core.Response> {
        return new Promise((resolve, reject) => {
            this.database.db.get(PlantsKey)
                .then(result => {
                    const plants = <Plant[]>result.plants, 
                        index = _.findIndex(plants, p => p.id === plant.id);
                    if(index !== -1) {
                        result.plants.splice(index, 1);
                    }
                    this.database.db.put(result)
                        .then(resolve)
                        .catch(reject);
                })
                .catch(reject);
        });
    }

    zones():Promise<Zone[]> {
        return new Promise((resolve, reject) => {

            this.database.db.get('zones')
                .then(result => {
                    resolve(result.zones);
                })
                .catch(reject);
        });
    }

    seasons():Promise<Season[]> {
        return new Promise((resolve, reject) => {

            this.database.db.get(SeasonsKey)
                .then(result => {
                    resolve(result.seasons);
                })
                .catch(reject);
        });
    }

    saveSeasons(seasons:Season[], plants:Plant[]):Promise<Season[]> {
        return new Promise((resolve, reject) => {
            this.database.db.get(SeasonsKey)
                .then(seasonsResult => {
                    const existingSeasons:Season[] = seasonsResult.seasons;

                    seasons.forEach(season => {
                        const index = existingSeasons.findIndex(s => s.year === season.year && s.name === season.name),
                            dbSeason = index === -1 ? {
                                name: season.name,
                                year: season.year,
                                week: plants.reduce((memo, plant) => {
                                    memo[plant.crop] = 0;
                                    return memo;
                                }, {})
                            } : _.clone(existingSeasons[index]);
                        
                        if(typeof dbSeason.week === 'number') {
                            dbSeason.week = plants.reduce((memo, plant) => {
                                memo[plant.crop] = dbSeason.week;
                                return memo;
                            }, {});
                        }
                        _.extend(dbSeason.week, season.week);

                        if(index === -1) {
                            existingSeasons.push(dbSeason);                            
                        } else {
                            existingSeasons[index] = dbSeason;
                        }
                    });

                    this.database.db.put(seasonsResult)
                        .then(resolve)
                        .catch(reject);
                })
                .catch(reject);
        });
    }

    weeks():Promise<Week[]> {
        return new Promise((resolve, reject) => {
            this.database.db.get('zones')
                .then(result => {
                    const zones:CapacityWeekZones = _.reduce(result.zones, (memo, zone:Zone) => {
                            memo[zone.name] = {
                                zone:zone,
                                tables:zone.tables,
                                available:zone.tables  
                            };
                            return memo;
                        }, {}),
                        start = moment().subtract(1, 'year'),
                        returnValue = _.chain(_.range(0, 200))
                            .map(idx => {
                                const date = start.clone().add(idx, 'weeks');

                                return {
                                    _id: date.toWeekNumberId(),
                                    year: date.isoWeekYear(),
                                    week: date.isoWeek(),
                                    zones: zones
                                };
                            })
                            .value();

                    resolve(returnValue);
                })
                .catch(reject);
        });        
    }

    propagationTimes():Promise<SeasonTime[]> {
        return new Promise((resolve, reject) => {

            this.database.db.get(PropagationTimesKey)
                .then(result => {
                    resolve(result.propagationTimes);
                })
                .catch(reject);
        })
    }

    savePropagationTimes(propagationTimes:SeasonTime[], plants:Plant[]):Promise<SeasonTime[]> {
        return new Promise((resolve, reject) => {
            this.database.db.get(PropagationTimesKey)
                .then(propTimesResult => {
                    const existingPropTimes:SeasonTime[] = propTimesResult.propagationTimes;

                    propagationTimes.forEach(propTime => {
                        const index = existingPropTimes.findIndex(pt => pt.plant === propTime.plant && pt.year === propTime.year);
                        
                        if(index === -1) {
                            existingPropTimes.push(_.clone(propTime));
                        } else {
                            _.extend(existingPropTimes[index], propTime);
                        }
                    });

                    this.database.db.put(propTimesResult)
                        .then(resolve)
                        .catch(reject);
                    
                })
                .catch(reject);
        });
    }

    flowerTimes():Promise<SeasonTime[]> {
        return new Promise((resolve, reject) => {

            this.database.db.get(FlowerTimesKey)
                .then(result => {
                    resolve(result.flowerTimes);
                })
                .catch(reject);
        })
    }

    saveFlowerTimes(flowerTimes:SeasonTime[], plants:Plant[]):Promise<SeasonTime[]> {
        return new Promise((resolve, reject) => {
            this.database.db.get(FlowerTimesKey)
                .then(flowerTimesResult => {
                    const existingFlowerTimes:SeasonTime[] = flowerTimesResult.flowerTimes;

                    flowerTimes.forEach(flowerTime => {
                        const index = existingFlowerTimes.findIndex(pt => pt.plant === flowerTime.plant && pt.year === flowerTime.year);
                        
                        if(index === -1) {
                            existingFlowerTimes.push(_.clone(flowerTime));
                        } else {
                            _.extend(existingFlowerTimes[index], flowerTime);
                        }
                    });
                    
                    this.database.db.put(flowerTimesResult)
                        .then(resolve)
                        .catch(reject);
                    
                })
                .catch(reject);
        });
    }
}
