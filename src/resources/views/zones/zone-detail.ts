import {autoinject} from 'aurelia-framework';
import {EventAggregator, Subscription} from 'aurelia-event-aggregator';
import {Zone} from "../../models/zone";
import {OrdersService} from "../../services/data/orders-service";
import {ReferenceService} from "../../services/data/reference-service";
import {ZoneDetailService, ZoneDetailModel} from "../../services/domain/zone-detail-service";
import {OrderDocument} from "../../models/order";
import {Plant} from "../../models/plant";

@autoinject()
export class ZoneDetail {
    year:number;
    zone:Zone;
    orderChangedSubscription:Subscription;
    showZoneDetailSubscription: Subscription;
    model:ZoneDetailModel;

    constructor(private events:EventAggregator,
                private orderService:OrdersService, private referenceService:ReferenceService,
                private zoneDetailService:ZoneDetailService) { }

    attached() {
        this.orderChangedSubscription = this.events.subscribe(OrdersService.OrdersChangedEvent, this.loadOrders.bind(this));
        this.showZoneDetailSubscription = this.events.subscribe(ZoneDetail.ShowZoneDetailEvent, this.show.bind(this));

        $('#zone-detail-sidebar').sidebar({
            closable: false,
            scrollLock: true
        });
    }

    detached() {
        this.orderChangedSubscription.dispose();
        this.showZoneDetailSubscription.dispose();
        $('#zone-detail-sidebar').sidebar('destroy');
    }

    show(model:ZoneDetailInputModel) {
        $('#zone-detail-sidebar').sidebar('show');
        console.log(model);
        this.zone = model.zone;
        this.year = model.year;
        
        this.loadOrders();
    }

    //noinspection JSMethodCanBeStatic
    close() {
        $('#zone-detail-sidebar').sidebar('hide');
    }

    loadOrders() {
        // this gets called whenever an order is created/deleted.
        // but if we don't have a year/zone, just ignore
        if(this.year && this.zone) {
            let orders: OrderDocument[],
                plants: Plant[];

            Promise.all([
                this.orderService.getAll()
                    .then(result => orders = result),
                this.referenceService.plants()
                    .then(result => plants = result)
            ])
                .then(() => {
                    this.zoneDetailService.createModel(plants, orders, this.year, this.zone)
                        .then(result => {
                            this.model = result;
                            console.log(this.model);
                        });
                });
        }
    }

    static ShowZoneDetailEvent:string = 'show-zone-detail';
}

export interface ZoneDetailInputModel {
    zone:Zone;
    year:number;
}
