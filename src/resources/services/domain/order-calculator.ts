import {computedFrom} from 'aurelia-binding';
import {log} from '../log';
import {SeasonSelector} from "./season-selector";
import {TimeSelector} from "./time-selector";
import {SpaceCalculator, TableSpaceResult} from './space-calculator';
import {CalculatorWeek, Events, Event} from './models/calculator-week';
import {CalculatorOrder} from './models/calculator-order';
import {CalculatorZone} from "./models/calculator-zone";
import {Zone} from '../../models/zone';
import {Season} from '../../models/season';
import {Week, WeekZone, WeekZones} from '../../models/week';
import {Plant} from "../../models/plant";
import {SeasonTime} from "../../models/season-time";
import {CapacityWeek} from "../../models/capacity-week";
import {OrderDocument} from "../../models/order";

export class OrderCalculator {
    private _order:CalculatorOrder;
    private _weeks:CalculatorWeek[];

    zones:CalculatorZone[];
    propagationZone:Zone;
    season:Season;
    seasonSelector:SeasonSelector;
    propagationTimeSelector:TimeSelector;
    flowerTimeSelector:TimeSelector;
    spaceCalculator:SpaceCalculator;

    constructor(zones:Zone[], private allWeeks:Map<string, CapacityWeek>, seasons:Season[], private propagationTimes:SeasonTime[], private flowerTimes:SeasonTime[], order?:OrderDocument) {
        this._order = new CalculatorOrder(order);
        this._weeks = [];

        this.zones = _.sortBy(zones, z => z.name.toLowerCase()).map(z => new CalculatorZone(z));
        this.propagationZone = _.find(zones, z => z.isPropagationZone);
        this.seasonSelector = new SeasonSelector(seasons);
        this.propagationTimeSelector = new TimeSelector(propagationTimes);
        this.flowerTimeSelector = new TimeSelector(flowerTimes);
        this.spaceCalculator = new SpaceCalculator(this._order);

        if(order && _.isDate(order.arrivalDate)){
            this.resetWeeks();
            this._weeks.forEach(w => {
                    const weekInHouse = order.weeksInHouse[w.week._id];
                    if(weekInHouse) {
                        _.forEach(w.zones, (z, name) => {
                            if(z) z.selected = name === weekInHouse.zone;
                        });
                    }
            });
        }
    }

    setZone(zone:CalculatorZone):OrderCalculator {
        this._order.zone = zone;
        this._weeks.forEach(w => {
            _.forEach(w.zones, (z, name) => {
                if(z) {
                    z.selected = name === zone.name;
                }
            });
        });
        this.resetWeeks();
        return this;
    }

    setZoneForWeek(zone:Zone, week:Week):OrderCalculator {
        const thisWeek = this._weeks.find(w => w.week._id === week._id);
        if(thisWeek) {
            _.forEach(thisWeek.zones, (z, name) => {
                if(z) {
                    z.selected = name === zone.name;
                }
            });

            this.resetWeeks();
        }
        return this;
    }

    setZoneFromEventOnward(zoneName:string, weekId:string):OrderCalculator {
        let  weekIndex = this._weeks.findIndex(w => w.week._id === weekId);
        if(weekIndex !== -1) {
            for(; weekIndex < this._weeks.length; weekIndex++) {
                const thisWeek = this._weeks[weekIndex];
                 _.forEach(thisWeek.zones, (z, name) => {
                    if(z) {
                        z.selected = name === zoneName;
                    }
                });
            }
            this.resetWeeks();
        }
        return this;
    }

    setArrivalDate(date:Date):OrderCalculator {
        this._order.arrivalDate = date;
        this.resetFlowerDate();
        this.resetLightsOutDate();
        this.resetStickDate();
        this.resetWeeks();

        return this;
    }

    setPlant(plant:Plant):OrderCalculator {
        this._order.plant = plant;
        this.resetFlowerDate();
        this.resetLightsOutDate();
        this.resetStickDate();
        this.resetWeeks();

        return this;
    }

    @computedFrom('order.quantity')
    get orderQuantity():number {
        let quantity = 0;

        if(this._order) {
            quantity = numeral(this._order.quantity).value();
        }
        return quantity;
    }

    set orderQuantity(quantity:number) {
        if(this._order) {
            this._order.quantity = numeral(quantity).value();
            this.resetWeeks();
        }
    }

    @computedFrom('order.plant')
    get potsPerCase():number {
        let potsPerCase = 0;

        if(this._order && this._order.plant) {
            potsPerCase = numeral(this._order.plant.potsPerCase).value();
        }

        return potsPerCase;
    }

    set potsPerCase(potsPerCase:number) {
        if(this._order && this._order.plant) {
            this._order.plant.potsPerCase = numeral(potsPerCase).value();
        }
    }

    @computedFrom('order.partialSpace')
    get partialSpace():boolean {
        return this._order && this._order.partialSpace;
    }

    set partialSpace(value:boolean) {
        if(this._order) {
            this._order.partialSpace = value;
            this.resetWeeks();
        }
    }

    setFlowerDate(date:Date):OrderCalculator {
        this._order.flowerDate = date;
        this.resetWeeks();

        return this;
    }

    setLightsOutDate(date:Date):OrderCalculator {
        this._order.lightsOutDate = date;
        this.resetWeeks();

        return this;
    }

    setPartialSpaceDate(date:Date):OrderCalculator {
        this._order.partialSpaceDate = date;
        this.resetWeeks();
        return this;
    }

    setFullSpaceDate(date:Date):OrderCalculator {
        this._order.fullSpaceDate = date;
        this.resetWeeks();
        return this;
    }

    setStickDate(date:Date):OrderCalculator {
        this._order.stickDate = date;
        this.resetWeeks();

        return this;
    }

    setRepeater(previous:OrderCalculator, arrivalDate:Date) {
        this.order.quantity = previous.orderQuantity;
        this.order.plant = previous.order.plant;
        this.order.arrivalDate = arrivalDate;
        this.order.customer = previous.order.customer;
        this.resetFlowerDate();
        this.resetLightsOutDate();
        this.resetStickDate();

        var propZone = this.zones.find(z => z.isPropagationZone);

        const previousWeeks = _.reduce(previous.weeks, (memo:Map<string, WeekZones>, week:CalculatorWeek) => {
            const weekClone = _.clone(week),
                zones = _.reduce(week.zones, (memo:WeekZones, z:WeekZone) => {
                    if(z === null) {
                        if(propZone) {
                            memo[propZone.name] = {
                                zone: propZone,
                                available: propZone.tables,
                                tables: 0
                            };
                        }
                    } else {
                        memo[z.zone.name] = _.clone(week.zones[z.zone.name])
                    }
                    return memo;
                }, {});

            weekClone.zones = zones;
            
            memo.set(week.week._id, weekClone.zones);
            return memo;
        }, new Map<string, WeekZones>());
        this.resetWeeks(previousWeeks);
    }

    get order():CalculatorOrder {
        return this._order;
    }

    
    @computedFrom('plant', 'order.quantity', 'order.arrivalDate', 'order.flowerDate', 'order.lightsOutDate', 'order.stickDate', 'order.partialSpace')
    get weeks():CalculatorWeek[] {
        return this._weeks;
    }

    public getOrderDocument() {
        return this.order.toOrderDocument(this.weeks, this.zones);
    }

    private resetWeeks(previousWeeks?:Map<string, WeekZones>) {

        let stickEventCreated = false,
            partialSpaceEventCreated = false,
            lightsOutEventCreated = false, 
            fullSpaceEventCreated = false,
            flowerEventCreated = false;

        const weeks:CalculatorWeek[] = [],
            shipWeek = this.getShipWeek(),
            flowerWeek = this.getFlowerWeek(),
            fullSpaceWeek = this.getFullSpaceWeek(),
            lightsOutWeek = this.getLightsOutWeek(),
            partialSpaceWeek = this.getPartialSpaceWeek(),
            stickWeek = this.getStickWeek();

        if(shipWeek) {
            log.debug(`Ship week: ${shipWeek._id}`);

            const tables = this.spaceCalculator.getTables(shipWeek._id),
                zones = this.getZones(shipWeek, tables, false, previousWeeks),
                tableCount = typeof tables === 'number' ? tables : tables.manualSpacing;
            weeks.push({
                week: shipWeek,
                events: [{
                    name: Events.ShipEventName,
                    date: this._order.arrivalDate
                }],
                tables: tableCount,
                zones: zones
            });

            if(flowerWeek) {
                const flowerEvent:Event = {
                    name: Events.FlowerEventName,
                    date: this._order.flowerDate
                };
                if(flowerWeek._id === shipWeek._id) {
                    weeks[0].events.unshift(flowerEvent);
                    flowerEventCreated = true;
                } else {
                    const tables = this.spaceCalculator.getTables(flowerWeek._id),
                        tableCount = typeof tables === 'number' ? tables : tables.manualSpacing,
                        zones = this.getZones(flowerWeek, tables, false, previousWeeks);
                    weeks.unshift({
                        week: flowerWeek,
                        events: [flowerEvent],
                        tables: tableCount,
                        zones: zones
                    });
                    flowerEventCreated = true;
                }
            } else {
                log.debug('No flower week');
            }
        } else {
            log.debug('No ship week!');
        }

        if(fullSpaceWeek) {
            log.debug(`Full space  week: ${fullSpaceWeek._id}`);
            
            const fullSpaceDate = this.getFullSpaceDate(),
                fullSpaceStartOfWeek = fullSpaceDate.clone().startOf('isoweek'),
                fullSpaceId = fullSpaceDate.toWeekNumberId(),
                lightsOutId = moment(this._order.lightsOutDate).toWeekNumberId(),
                loopDate = moment(this._order.flowerDate).subtract(1, 'week').startOf('isoweek');
            while(loopDate.isSameOrAfter(fullSpaceStartOfWeek)) {
                let id = loopDate.toWeekNumberId(),
                    week = this.allWeeks.get(id);

                if(week) {
                    const isFullSpaceWeek = week._id === fullSpaceId; 
                        
                    let tables = this.spaceCalculator.getTables(week._id),
                        tableCount = typeof tables === 'number' ? tables : tables.manualSpacing,
                        zones = this.getZones(week, tables, false, previousWeeks),
                        calculatorWeek:CalculatorWeek = {
                        week: week,
                        events: [],
                        tables: tableCount,
                        zones: zones
                    };

                    if(isFullSpaceWeek) {
                        calculatorWeek.events.push({
                            name: Events.FullSpaceEventName,
                            date: fullSpaceDate.toDate(),
                        });
                        fullSpaceEventCreated = true;

                        // if lights-out falls on the same week as full spacing...
                        if(lightsOutId === week._id) {
                            calculatorWeek.events.push({
                                name: Events.LightsOutEventName,
                                date: this._order.lightsOutDate,
                            });
                            lightsOutEventCreated = true;
                        }
                    }

                    weeks.unshift(calculatorWeek);
                    
                    if(isFullSpaceWeek) {
                        if(!lightsOutEventCreated) {
                            const lightsOutStartOfWeek = moment(this._order.lightsOutDate).startOf('isoweek');
                            while(loopDate.isSameOrAfter(fullSpaceStartOfWeek)) {
                                // now add lights-out...
                                loopDate.subtract(1, 'week');
                                id = loopDate.toWeekNumberId();
                                week = this.allWeeks.get(id);

                                if(week) {
                                    tables = this.spaceCalculator.getTables(week._id);
                                    tableCount = typeof tables === 'number' ? tables : tables.manualSpacing;
                                    zones = this.getZones(week, tables, false, previousWeeks);
                                    calculatorWeek = {
                                        week: week,
                                        events: [ ],
                                        tables: tableCount,
                                        zones: zones
                                    };

                                    if(id === lightsOutId) {
                                        calculatorWeek.events.push({
                                            name: Events.LightsOutEventName,
                                            date: this._order.lightsOutDate
                                        });
                                        lightsOutEventCreated = true;
                                    }

                                    weeks.unshift(calculatorWeek);
                                }
                            }
                        }

                        const partialSpaceDate = this.getPartialSpaceDate(), 
                            partialSpaceId = partialSpaceDate.toWeekNumberId(),
                            partialSpaceStartOfWeek = partialSpaceDate.clone().startOf('isoweek');

                        while(!partialSpaceEventCreated && loopDate.isSameOrAfter(partialSpaceStartOfWeek)) {
                            // ... & partial space
                            loopDate.subtract(1, 'week');
                            id = loopDate.toWeekNumberId();
                            week = this.allWeeks.get(id);

                            if(week) {
                                tables = this.spaceCalculator.getTables(week._id);
                                tableCount = typeof tables === 'number' ? tables : tables.manualSpacing;
                                zones = this.getZones(week, tables, false, previousWeeks);
                                
                                calculatorWeek = {
                                    week: week,
                                    events: [ ],
                                    tables: tableCount,
                                    zones: zones
                                };

                                weeks.unshift(calculatorWeek);

                                if(week._id === partialSpaceId) {
                                    calculatorWeek.events.push({
                                        name: Events.PartialSpaceEventName,
                                        date: partialSpaceDate.toDate(),
                                    });
                                    partialSpaceEventCreated = true;
                                }
                            }
                        }
                    }
                }

                loopDate.subtract(1, 'week');
            }
        } else if(lightsOutWeek) {
            log.debug(`Lights out week: ${lightsOutWeek._id}`);

            const lightsOutDate = moment(this._order.lightsOutDate),
                lightsOutStartOfWeek = lightsOutDate.clone().startOf('isoweek'),
                lightsOutId = lightsOutDate.toWeekNumberId(),
                loopDate = moment(this._order.flowerDate).add(-1, 'week');
            while(loopDate.isSameOrAfter(lightsOutStartOfWeek)) {
                let id = loopDate.toWeekNumberId(),
                    week = this.allWeeks.get(id);

                if(week) {
                    const tables = this.spaceCalculator.getTables(week._id),
                        tableCount = typeof tables === 'number' ? tables : tables.manualSpacing,
                        zones = this.getZones(week, tables, false, previousWeeks);
                    const calculatorWeek:CalculatorWeek = {
                        week: week,
                        events: [],
                        tables: tableCount,
                        zones: zones
                    };

                    if(week._id === lightsOutId) {
                        calculatorWeek.events.push({
                            name: this._order.plant.hasLightsOut ? Events.LightsOutEventName : Events.SpacingEventName,
                            date: lightsOutDate.toDate()
                        });
                        lightsOutEventCreated = true;
                    }

                    weeks.unshift(calculatorWeek);                    
                }

                loopDate.add(-1, 'week');
            }
        } else {
            log.debug('No lights-out week');
        }

        if(stickWeek) {
            log.debug(`Stick Week: ${stickWeek._id}`);

            const season:Season = this.seasonSelector.get(this._order.arrivalDate, this._order.plant.crop);

            if(season) {
                const propagationTime = this.propagationTimeSelector.get(season, this._order.plant.name);

                if(propagationTime) {
                    const
                        stickDate = moment(this._order.stickDate),
                        stickDateStartOfWeek = stickDate.clone().startOf('isoweek'),
                        lastDate = partialSpaceWeek ? this.getPartialSpaceDate() : moment(this._order.lightsOutDate),
                        loopDate = lastDate.add(-1, 'week');

                    while(loopDate.isSameOrAfter(stickDateStartOfWeek)) {
                        let id = loopDate.toWeekNumberId(),
                            week = this.allWeeks.get(id);

                        if(week) {
                            const tables = this.spaceCalculator.getTables(week._id),
                                tableCount = typeof tables === 'number' ? tables : tables.manualSpacing,
                                zones = this.getZones(week, tables, true, previousWeeks);
                            const calculatorWeek = {
                                week: week,
                                events: [],
                                tables: tableCount,
                                zones: zones
                            };

                            if(week._id === stickWeek._id) {
                                calculatorWeek.events.push({
                                    name: Events.StickEvent,
                                    date: stickDate.toDate()
                                });
                                stickEventCreated = true;
                            }

                            weeks.unshift(calculatorWeek);
                        }

                        loopDate.add(-1, 'week');
                    }
                } else {
                    log.debug(`Propagation time not found for ${this._order.plant.crop} in ${season.name}`);
                }
            } else {
                log.debug(`Season not found for ${this._order.plant.crop} on ${this._order.arrivalDate}`);
            }
        } else {
            log.debug('No stick week');
        }

        // if events overlaps another event's week, we'll put
        //  the event where it belongs
        if(stickWeek && !stickEventCreated) {
            const week = _.find(weeks, w => {
                return w.week._id === stickWeek._id;
            });
            if(week) {
                week.events.unshift({
                    name: Events.StickEvent,
                    date: this._order.stickDate
                });
            }
        }
        if(partialSpaceWeek && !partialSpaceEventCreated) {
            const week = _.find(weeks, w => {
                return w.week._id === partialSpaceWeek._id;
            });
            if(week) {
                week.events.unshift({
                    name: Events.PartialSpaceEventName,
                    date: this.getPartialSpaceDate().toDate()
                });
            }
        }
        if(lightsOutWeek && !lightsOutEventCreated) {
            const week = _.find(weeks, w => {
                return w.week._id === lightsOutWeek._id;
            });
            if(week) {
                const eventName = (this._order.plant.hasLightsOut || this._order.partialSpace) ? Events.LightsOutEventName : Events.SpacingEventName;
                week.events.unshift({
                    name: eventName,
                    date: this._order.lightsOutDate
                });
            }
        }
        if(fullSpaceWeek && !fullSpaceEventCreated) {
            const week = _.find(weeks, w => {
                return w.week._id === fullSpaceWeek._id;
            });
            if(week) {
                week.events.unshift({
                    name: Events.FullSpaceEventName,
                    date: moment(this._order.lightsOutDate).add(1, 'week').toDate()
                });
            }
        }
        if(flowerWeek && !flowerEventCreated) {
            const week = _.find(weeks, w => {
                return w.week._id === flowerWeek._id;
            });
            if(week) {
                week.events.unshift({
                    name: Events.FlowerEventName,
                    date: this._order.flowerDate
                });
            }
        }

        this.zones.forEach(z => z.weeks = weeks);
        this._weeks.splice(0, this._weeks.length);
        this._weeks.splice(0, 0, ...weeks);
    }

    private getShipWeek():CapacityWeek {
        if(!this._order.arrivalDate) {
            log.debug('No arrival date - ship week null');
            return null;
        }

        const id = moment(this._order.arrivalDate).toWeekNumberId();
        return this.allWeeks.get(id);
    }

    private resetFlowerDate():Date {
        let date:Date = null;

        if(this._order.arrivalDate) {
            date = moment(this._order.arrivalDate).add(-OrderCalculator.FLOWER_LEAD_TIME, 'days').toDate();
        }

        this._order.flowerDate = date;
        return date;
    }

    private getFlowerWeek():CapacityWeek {
        if(!this._order.flowerDate) return null;

        const id = moment(this._order.flowerDate).toWeekNumberId();
        return this.allWeeks.get(id);
    }

    private resetLightsOutDate():Date {
        let date:Date = null;

        if(this._order.flowerDate && this._order.plant) {

            const season: Season = this.getSeason();

            if (!season) return null;

            const time: number = this.flowerTimeSelector.get(season, this._order.plant.name);
            if (!time) return null;

            const lightsOutDate = moment(this._order.flowerDate).addWeeksAndDays(-time);

            date = lightsOutDate.toDate();
        }

        this._order.lightsOutDate = date;

        return date;
    }

    private getLightsOutWeek():CapacityWeek {
        if(!this._order.lightsOutDate) return null;

        const id = moment(this._order.lightsOutDate).toWeekNumberId();
        return this.allWeeks.get(id);
    }

    private getPartialSpaceWeek():CapacityWeek {
        if(!this._order.partialSpace || !this._order.lightsOutDate) return null;

        let id:string = this.getPartialSpaceDate().toWeekNumberId();
        return this.allWeeks.get(id);
    }

    private getPartialSpaceDate():moment.Moment {
        if(!this._order.partialSpace || !this._order.lightsOutDate) return null;

        return _.isDate(this._order.partialSpaceDate) ?
            moment(this._order.partialSpaceDate) :
            moment(this._order.lightsOutDate).subtract(1, 'week');
    }

    private getFullSpaceWeek():CapacityWeek {
        if(!this._order.partialSpace || !this._order.lightsOutDate) return null;

        let id:string = this.getFullSpaceDate().toWeekNumberId();
        return this.allWeeks.get(id);
    }

    private getFullSpaceDate():moment.Moment {
        if(!this._order.partialSpace || !this._order.lightsOutDate) return null;

        return _.isDate(this._order.fullSpaceDate) ?
            moment(this._order.fullSpaceDate) :
            moment(this._order.lightsOutDate).add(1, 'week');
    }

    private resetStickDate():Date {
        let date:Date = null;

        if(this._order.arrivalDate && this._order.plant) {

            const season = this.getSeason();

            if (season) {

                const time = this.propagationTimeSelector.get(season, this._order.plant.name);
                if (time) {

                    const lightsOut = moment(this._order.lightsOutDate);

                    date = lightsOut.addWeeksAndDays(-time).toDate();
                }
            }
        }

        this._order.stickDate = date;
        return date;
    }

    private getStickWeek():CapacityWeek {
        const id = moment(this._order.stickDate).toWeekNumberId();
        return this.allWeeks.get(id);
    }

    private getSeason():Season {
        return this.seasonSelector.get(this._order.arrivalDate, this._order.plant.crop);
    }

    private getZones(week:Week, tables:number|TableSpaceResult, usePropZone:boolean, previousWeeks:Map<string, WeekZones> = new Map<string, WeekZones>()):WeekZones {
        const zones = { },
            keys = Object.keys(week.zones),
            previousZones = previousWeeks.get(week._id),
            selectionWeek = this._weeks.find(w => w.week._id === week._id);
        for(const key of keys) {
            const zone = _.clone(week.zones[key]),
                tableCount = typeof tables === 'number' ? tables : (zone.zone.autoSpace ? tables.autoSpacing : tables.manualSpacing),
                isPropZone = (this.propagationZone && key === this.propagationZone.name),
                previousZone = previousZones && previousZones[key];

            if(previousZone && typeof previousZone.available === 'number') {
                zone.available = previousZone.available;
            }
            
            // reduce the prop zone if you're using it, reduce anything else if you're not
            if((usePropZone && isPropZone) || !isPropZone) {
                zone.available -= tableCount;
                zone.tables = tableCount;
            }

            zone.selected = selectionWeek && selectionWeek.zones[zone.zone.name] && selectionWeek.zones[zone.zone.name].selected;

            if(usePropZone || !isPropZone) {
                zones[key] = zone;
            } else {
                zones[key] = null;
            }
        }
        return zones;
    }

    static FLOWER_LEAD_TIME:number = 4;
}
