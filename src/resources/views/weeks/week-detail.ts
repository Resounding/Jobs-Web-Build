import {autoinject, computedFrom} from 'aurelia-framework';
import {DialogService, DialogResult} from 'aurelia-dialog';
import {EventAggregator, Subscription} from 'aurelia-event-aggregator';
import {Database} from "../../services/database";
import {OrdersService} from "../../services/data/orders-service";
import {ReferenceService} from "../../services/data/reference-service";
import {WeekDetailService, WeekDetailFilter, WeekDetailOrder} from "../../services/domain/week-detail-service";
import {Week} from "../../models/week";
import {OrderDocument} from "../../models/order";
import {OrderDetail} from "../orders/order-detail";
import {PlantThisWeek, PlantThisWeekDataModel} from '../reports/plant-this-week';
import {FlowerThisWeek, FlowerThisWeekDataModel} from '../reports/flower-this-week';

@autoinject()
export class WeekDetail {
    orderChangedSubscription:Subscription;
    databaseSyncSubscription:Subscription;
    showWeekDetailSubscription:Subscription;
    filter:WeekDetailFilter = new WeekDetailFilter();
    weekDetailService:WeekDetailService;
    orders: WeekDetailOrder[] = [];
    zones: string[];
    allWeeks: Week[];

    constructor(private events:EventAggregator, private ordersService:OrdersService, referenceService:ReferenceService, private dialogService:DialogService, private element:Element) {
        this.loadOrders();

        referenceService.zones()
            .then(result => this.zones = _.pluck(result, 'name').sort());

        referenceService.weeks()
            .then(result => this.allWeeks = result);
    }

    attached() {
        this.orderChangedSubscription = this.events.subscribe(OrdersService.OrdersChangedEvent, () => this.loadOrders().then(this.refresh.bind(this)));
        this.databaseSyncSubscription = this.events.subscribe(Database.OrdersSyncChangeEvent, () => this.loadOrders().then(this.refresh.bind(this)));
        this.showWeekDetailSubscription = this.events.subscribe(WeekDetail.ShowWeekDetailEvent, this.show.bind(this));

        $('#week-detail-sidebar').sidebar({
            closable: false,
            onShow: this.onShow.bind(this)
        });

        $('[name=zones]', this.element).dropdown({
            forceSelection: false,
            placeholder: 'Select Zone',
            onChange: this.refresh.bind(this)
        });
        $('.calendar.start', this.element).calendar({
            type: 'date',
            onChange: this.onStartChange.bind(this)
        });
        $('.calendar.end', this.element).calendar({
            type: 'date',
            onChange: this.onEndChange.bind(this)
        });
    }

    detached() {
        this.orderChangedSubscription.dispose();
        this.showWeekDetailSubscription.dispose();
        $('#week-detail-sidebar').sidebar('destroy');
        $('[name=zones]', this.element).dropdown('destroy');
        $('.calendar.start', this.element).calendar('destroy')
        $('.calendar.end', this.element).calendar('destroy')
    }

    show(week:Week) {
        $('#week-detail-sidebar').sidebar('show');
        this.filter = new WeekDetailFilter(week);
        $('.calendar.start', this.element).calendar('set date', this.filter.startDate);
        $('.calendar.end', this.element).calendar('set date', this.filter.endDate);
        this.refresh();
    }

    close() {
        $('i', this.element).popup('destroy');
        $('#week-detail-sidebar').sidebar('hide');
    }

    loadOrders() {
        return this.ordersService.getAll()
            .then(orders => {
                this.weekDetailService = new WeekDetailService(orders);
            });
    }

    refresh() {
        $('i', this.element).popup('destroy');
        this.orders = this.weekDetailService.filter(this.filter);
        window.setTimeout(() => {
            $('i', this.element).popup();
        });
    }

    onShow() {
        $('.calendar', this.element).calendar('popup', 'show');
        $('.calendar', this.element).calendar('popup', 'hide');
    }

    onStartChange(value:string) {
        this.filter.startDate = moment(value).toDate();
        this.refresh();
    }

    onEndChange(value:string) {
        this.filter.endDate = moment(value).toDate();
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

    openPlantThisWeekReport() {
        const filter = new WeekDetailFilter(this.week);

        const allOrders = this.weekDetailService.filter(filter), 
            model:PlantThisWeekDataModel = new PlantThisWeekDataModel(allOrders, this.week);
        this.dialogService.open({
            viewModel: PlantThisWeek,
            model: model
        });
    }

    openFlowerThisWeekReport() {
        const filter = new WeekDetailFilter(this.week);

        const allOrders = this.weekDetailService.filter(filter), 
            model:FlowerThisWeekDataModel = new FlowerThisWeekDataModel(allOrders, this.week);
        this.dialogService.open({
            viewModel: FlowerThisWeek,
            model: model
        });
    }

    get week():Week {
        if(!this.filter.startDate) return null;
        const start = moment(this.filter.startDate),
            weekNumber = start.isoWeek(),
            year = start.isoWeekYear(),
            startWeek = this.allWeeks.find(w => w.year === year && w.week === weekNumber);

        return startWeek;
    }

    get weekId():string {
        const week = this.week;
        return week ? week._id : '';
    }

    @computedFrom('filter.startDate')
    get startDateDisplay() {
        if(!this.filter.startDate) return '';
        return moment(this.filter.startDate).format('ddd, MMM Do');
    }

    @computedFrom('filter.endDate')
    get endDateDisplay() {
        if(!this.filter.endDate) return '';
        return moment(this.filter.endDate).format('ddd, MMM Do');
    }

    static ShowWeekDetailEvent:string = 'show-week-detail';
}
