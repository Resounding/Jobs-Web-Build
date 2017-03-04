import {autoinject} from 'aurelia-framework';
import {CapacityWeek} from '../../models/capacity-week';
import {Week} from '../../models/week';
import {ReferenceService} from '../data/reference-service';
import {OrderDocument, OrderWeek, WeekInHouse} from '../../models/order';
import {OrdersService} from '../data/orders-service';

@autoinject()
export class CapacityService {
    constructor(private referenceService:ReferenceService, private ordersService:OrdersService) { }

    getCapacityWeeks(year?:number):Promise<Map<string, CapacityWeek>> {

        return new Promise((resolve, reject) => {
            return this.ordersService.getAll()
                .then((orders:OrderDocument[]) => {
                    return this.referenceService.weeks()
                        .then((weeks) => {
                            const capacityWeeks = new Map<string,CapacityWeek>();

                            weeks.forEach((w:Week) => {
                                if(!year || w.year === year) {
                                    const key = makeKey(w),
                                        value = new CapacityWeek(w);

                                    capacityWeeks.set(key, value);
                                }
                            });

                            orders.forEach((order:OrderDocument) => {
                                _.forEach(order.weeksInHouse, (w:WeekInHouse, weekId:string) => {
                                    if(capacityWeeks.has(weekId)) {
                                        capacityWeeks.get(weekId).addOrder(w);
                                    }
                                });
                            });

                            resolve(capacityWeeks);
                        })
                        .catch(reject);                    
                })
                .catch(reject);
        });
    }
}

function makeKey(week:Week) {
    return `week:${week.year}.${week.week}`
}
