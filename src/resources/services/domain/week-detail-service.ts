import {Week} from "../../models/week";
import {OrderDocument, Order} from "../../models/order";

export class WeekDetailFilter {
    startDate:Date = null;
    endDate:Date = null;
    zone:string = null;

    constructor(week?:Week) {
        if(week) {
            const start = moment().isoWeekYear(week.year).isoWeek(week.week).startOf('isoWeek'),
                end = start.clone().endOf('isoWeek');

            this.startDate = start.toDate();
            this.endDate = end.toDate();
        } else {

        }
    }

    get weekId():string {
        if(!this.endDate) return null;
        return moment(this.endDate).toWeekNumberId();
    }

    get weekNumber():number {
        if(!this.endDate) return 0;
        return moment(this.endDate).isoWeek();
    }

    get yearNumber():number {
        if(!this.endDate) return 0;
        return moment(this.endDate).isoWeekYear();
    }
}

export class WeekDetailOrder {
    batch:string;
    plant:string;
    pots:number;
    tables:number;
    shipWeek:number;
    flowerDate:string;
    isShippingThisWeek:boolean;
    isFloweringThisWeek:boolean;
    zone:string;

    constructor(public order:OrderDocument, filter:WeekDetailFilter) {
        this.batch = order.orderNumber;
        this.plant = order.plant.name;
        this.pots = order.quantity;
        this.flowerDate = moment(order.flowerDate).format('MMM D');
        this.shipWeek = moment(order.arrivalDate).isoWeek();        

        const filterWeekId = filter.weekId,
            filterWeek = filter.weekNumber,
            filterYear = filter.yearNumber,
            week = _.find(order.weeksInHouse, (value, key) => {
                return key === filterWeekId;
            }),
            tables = week ? week.tables : 0;
        this.tables = tables;
        this.zone = week ? week.zone : order.zone.name;

        const shippingDate = moment(order.arrivalDate),
            shippingWeek = shippingDate.isoWeek(),
            shippingYear = shippingDate.isoWeekYear();
        this.isShippingThisWeek = (shippingWeek === filterWeek && shippingYear === filterYear);

        const flowerDate = moment(order.flowerDate),
            flowerWeek = flowerDate.isoWeek(),
            flowerYear = flowerDate.isoWeekYear();
        this.isFloweringThisWeek = (flowerWeek == filterWeek && flowerYear === filterYear);
    }

    get cases():number {
        let cases = 0;
        if(this.order.plant && this.pots) {
            let potsPerCase:number = this.order.plant.potsPerCase || 0;
            if(potsPerCase) {
                cases = Math.ceil(this.pots / potsPerCase);
            }
        }
        return cases;
    }
}

export class WeekDetailService {

    constructor(private orders:OrderDocument[]) { }

    filter(filter:WeekDetailFilter):WeekDetailOrder[] {

        const filterStart = moment(filter.startDate).startOf('isoweek'),
            filterEnd = moment(filter.endDate).endOf('isoweek');

        return this.orders
            .filter(zones)
            .filter(dates)
            .sort(sortOrder)
            .map(o => new WeekDetailOrder(o, filter));

        function dates(order:OrderDocument):boolean {
            if(filter.startDate == null) return true;

            return moment(order.stickDate).startOf('isoweek').isSameOrBefore(filterEnd) &&
                (moment(order.arrivalDate).endOf('isoweek').isSameOrAfter(filterStart));
        }

        function zones(order:OrderDocument):boolean {
            if(!filter.zone) return true;

            return _.any(_.values(order.weeksInHouse), (w) => {
                return  w.zone === filter.zone && (filter.weekNumber === 0 || w.week === filter.weekNumber) && (filter.yearNumber === 0 || w.year === filter.yearNumber);
            });
        }

        function sortOrder(a:OrderDocument, b:OrderDocument):number {
            const dateFactor = (moment(a.arrivalDate).isoWeek() - moment(b.arrivalDate).isoWeek()) * 100,
                zoneFactor = (a.zone.name.charCodeAt(0) - b.zone.name.charCodeAt(0));

            return dateFactor + zoneFactor;
        }
    }
}
