import { OrderDetail } from '../orders/order-detail';
import { OrderDocument } from '../../models/order';
import {autoinject} from 'aurelia-framework';
import {DialogController, DialogService, DialogResult} from 'aurelia-dialog';
import {OrdersService} from "../../services/data/orders-service";
import {ReferenceService} from "../../services/data/reference-service";
import {SearchFilter, SearchOrder, SearchService} from './search-service';
import {Week} from "../../models/week";
import {Plant} from '../../models/plant';

@autoinject()
export class Search {
    year:number;
    orders: SearchOrder[];
    zones: string[];
    allWeeks: Week[];
    plants: Plant[];
    crops: string[];
    customers: string[];
    searchService:SearchService;
    filter:SearchFilter = new SearchFilter();

    constructor(private ordersService:OrdersService, referenceService:ReferenceService, private dialogService:DialogService, private controller:DialogController, private element:Element) {
        Promise.all([
            referenceService.zones()
                .then(result => {
                    result.unshift({ name: SearchFilter.ALL_ZONES, autoSpace: null, isPropagationZone: null, tables: null })
                    this.zones = _.pluck(result, 'name');
                }),
            referenceService.weeks()
                .then(result => this.allWeeks = result),
            referenceService.plants()
                .then(result => {
                    result.unshift({ name: SearchFilter.ALL_PLANTS, crop: SearchFilter.ALL_CROPS, abbreviation: null, cuttingsPerPot: null, cuttingsPerTable: null, hasLightsOut: null, id: null, potsPerCase: null, size: null });

                    this.plants = result;
                    this.crops = result
                        .map(p => p.crop)
                        .filter((c, idx, self) => self.indexOf(c) === idx);                                        
                }),
            referenceService.customers()
                .then(result => {
                    result.unshift({ name: SearchFilter.ALL_CUSTOMERS, abbreviation: null });
                    this.customers = result.map(c => c.name);
                }),
            this.loadOrders()
        ]).then(this.refresh.bind(this));

        controller.settings.lock = true;
        controller.settings.position = position;
    }

    activate(year:number) {
        this.year = year;
    }

    attached() {
        $('select', this.element).dropdown({
            forceSelection: false,
            onChange: this.refresh.bind(this)
        });
    }

    detached() {
        $('select', this.element).dropdown('destroy');
    }

    sortBy(field:string) {
        if(this.filter.sortBy === field && this.filter.sortDirection !== SearchFilter.SORT_DESCENDING) {
            this.filter.sortDirection = SearchFilter.SORT_DESCENDING;
        } else {
            this.filter.sortBy = field;
            this.filter.sortDirection = SearchFilter.SORT_ASCENDING;
        }
        this.refresh();
    }

    detail(order:OrderDocument) {
        this.dialogService.open({
            viewModel: OrderDetail,
            model: order
        }).then((result:DialogResult) => {
            if(result.wasCancelled) return;

            this.loadOrders().then(this.refresh.bind(this));
        });
    }

    loadOrders():Promise<any> {
        return this.ordersService.getAll()
            .then(orders => {
                this.searchService = new SearchService(orders, this.year);
            });
    }

    refresh() {
        this.orders = this.searchService.filter(this.filter);
    }
}

function position(modalContainer:Element) {
    const $container = $(modalContainer),
        $aiHeader = $container.find('ai-dialog-header'),
        $aiFooter = $container.find('ai-dialog-footer'),
        $aiBody = $container.find('ai-dialog-body'),
        headerHeight = $aiHeader.outerHeight(),
        footerHeight = $aiFooter.outerHeight(),
        bodyHeight = `calc(100% - ${headerHeight + footerHeight}px)`;

    $aiBody.css({ height: bodyHeight });
}