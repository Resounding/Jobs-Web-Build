import { EscapeQuotesValueConverter } from '../controls/escape-quotes-value-converter';
import { Plant } from '../../models/plant';
import { OrdersService } from '../../services/data/orders-service';
import { OrderDocument } from '../../models/order';

export class SearchFilter {
    zone:string = null;
    plant:string = null;
    crop:string = null;
    customer:string = null;
    sortBy:string = 'batch';
    sortDirection:string = SearchFilter.SORT_ASCENDING;

    static ALL_ZONES:string = 'All Zones';
    static ALL_PLANTS:string = 'All Plants';
    static ALL_CROPS:string = 'All Crops';
    static ALL_CUSTOMERS:string = 'All Customers'

    static SORT_ASCENDING:string = 'ascending';
    static SORT_DESCENDING:string = 'descending';
}

export class SearchOrder {
    batch:string;
    plant:string;
    pots:number;
    crop:string;
    customer:string;
    stick:moment.Moment;
    flower:moment.Moment;
    ship:moment.Moment;
    zone:string;

    constructor(private order:OrderDocument) {
        this.batch = order.orderNumber;
        this.plant = order.plant.name;
        this.crop = order.plant.crop;
        this.pots = order.quantity;
        this.stick = moment(order.stickDate);
        this.flower = moment(order.flowerDate);
        this.ship = moment(order.arrivalDate);
        this.zone = order.zone.name;
        this.customer = order.customer.name;
    }

    get stickDate():Date {
        return this.stick.toDate();
    }

    get stickDateString():string {
        return formatDate(this.stick);
    }

    get flowerDate():Date {
        return this.flower.toDate();
    }

    get flowerDateString():string {
        return formatDate(this.flower);
    }

    get shipDate():Date {
        return this.ship.toDate();
    }

    get shipDateString():string {
        return formatDate(this.ship);
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

export class SearchService {
    constructor(private orders:OrderDocument[], private year:number) { }

    filter(filter:SearchFilter):SearchOrder[] {
        const valueConverter = new EscapeQuotesValueConverter(),
            year = this.year;

        return this.orders            
            .map(o => new SearchOrder(o))
            .filter(currentYear)
            .filter(zones)
            .filter(plants)
            .filter(crops)
            .filter(customers)
            .sort(sort);

        function currentYear(order:SearchOrder):boolean {
            return order.stick.isoWeekYear() === year || order.ship.isoWeekYear() === year;
        }

        function zones(order:SearchOrder):boolean {
            return !filter.zone || filter.zone === SearchFilter.ALL_ZONES || filter.zone === order.zone;
        }

        function plants(order:SearchOrder):boolean {
            return !filter.plant || filter.plant === SearchFilter.ALL_PLANTS || filter.plant === valueConverter.toView(order.plant);
        }

        function crops(order:SearchOrder):boolean {
            return !filter.crop || filter.crop === SearchFilter.ALL_CROPS || filter.crop === order.crop;
        }

        function customers(order:SearchOrder):boolean {
            return !filter.customer || filter.customer === SearchFilter.ALL_CUSTOMERS || filter.customer === order.customer;
        }

        function sort(order1:SearchOrder, order2:SearchOrder):number {
            const val1 = order1[filter.sortBy],
                val2 = order2[filter.sortBy];

            let returnValue:number = 0;

            if(filter.sortBy === 'plant') {
                returnValue = (order1.crop + order1.plant).localeCompare(order2.crop + order2.plant);
            } else if(typeof val1 === 'string') {
                returnValue =  val1.localeCompare(val2);
            } else if(typeof val1 === 'number') {
                returnValue =  val1 - val2;
            } else if(_.isDate(val1)) {
                returnValue = val1.valueOf() - val2.valueOf();
            }

            if(filter.sortDirection === SearchFilter.SORT_DESCENDING) {
                returnValue *= -1;
            }
            return returnValue;
        }
    }
}

function formatDate(date:moment.Moment):string {
    return `${date.format('MMM D, YYYY')} (week ${date.isoWeek()})`;
}