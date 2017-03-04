import {Zone} from "../../../models/zone";
import {Order, OrderDocument, OrderWeeksInHouse} from "../../../models/order";
import {CalculatorZone} from "./calculator-zone";
import {CalculatorWeek} from "./calculator-week";
import {Customer} from "../../../models/customer";
import {Plant} from "../../../models/plant";

export class CalculatorOrder implements Order {
    _id:string;
    _rev:string;
    type:string;
    orderNumber:string;
    arrivalDate:Date = null;
    flowerDate:Date = null;
    partialSpaceDate:Date = null;
    lightsOutDate:Date = null;
    fullSpaceDate:Date;
    stickDate:Date = null;
    quantity:number = 0;
    customer:Customer = null;
    plant:Plant = null;
    zone:CalculatorZone = null;
    weeksInHouse:OrderWeeksInHouse;
    partialSpace: boolean = false;

    constructor(args?:any) {
        if(args) {
            _.extend(this, args);
        }
    }

    toOrderDocument(weeks:CalculatorWeek[], zones:Zone[]):OrderDocument {
        const zone = _.clone(_.find(zones, z => z && z.name === this.zone.name));


        //noinspection TypeScriptUnresolvedVariable
        delete zone.__metadata__;
        delete zone.weeks;

        const weeksInHouse = weeks.reduce((memo: OrderWeeksInHouse, w:CalculatorWeek):OrderWeeksInHouse => {
            const selectedZone = _.find(w.zones, (zone, name) => zone && zone.selected);
            if(selectedZone) {
                const
                    zoneName = selectedZone.zone.name,
                    tables = selectedZone.tables;

                memo[w.week._id] = { zone: zoneName, tables: tables, week: w.week.week, year: w.week.year };
            }
            return memo;
        }, <OrderWeeksInHouse>{});

        return new OrderDocument({
            _id: this._id,
            _rev: this._rev,
            type: OrderDocument.OrderDocumentType,
            orderNumber: this.orderNumber,
            arrivalDate: this.arrivalDate,
            flowerDate: this.flowerDate,
            partialSpaceDate: this.partialSpaceDate,
            lightsOutDate: this.lightsOutDate,
            fullSpaceDate: this.fullSpaceDate,
            stickDate: this.stickDate,
            quantity: this.quantity,
            customer: this.customer,
            plant: this.plant,
            zone: zone,
            weeksInHouse: weeksInHouse,
            partialSpace: this.partialSpace
        });
    }
}
