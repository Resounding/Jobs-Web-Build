import {autoinject, computedFrom} from 'aurelia-framework';
import {ObserverLocator, observable} from 'aurelia-binding';
import {EventAggregator} from 'aurelia-event-aggregator';
import {DialogController, DialogService, DialogResult} from 'aurelia-dialog';
import {log} from '../../services/log';
import {ReferenceService} from '../../services/data/reference-service';
import {CapacityService} from '../../services/domain/capacity-service';
import {OrderCalculator} from '../../services/domain/order-calculator';
import {OrdersService} from "../../services/data/orders-service";
import {CalculatorZone} from "../../services/domain/models/calculator-zone";
import {Prompt} from '../controls/prompt';
import {ErrorNotification} from '../controls/error-notification';
import {Plant} from '../../models/plant';
import {Customer} from '../../models/customer';
import {Order} from '../../models/order';
import {Season} from '../../models/season';
import {Zone} from '../../models/zone';
import {SeasonTime} from '../../models/season-time';
import {CapacityWeek} from '../../models/capacity-week';

@autoinject()
export class Calculator {
    static RepeaterResetEvent:string = 'Repeater Reset';

    private _repeatCount:number = 0;
    private _repeatDays:number = 1;
    private _isRepeatingOrder:boolean = false;
    private _zones:Zone[];
    private _seasons:Season[];
    private _weeks:Map<string, CapacityWeek> = new Map<string,CapacityWeek>();
    private _propagationTimes:SeasonTime[];
    private _flowerTimes:SeasonTime[];

    customers:Customer[];
    plants:Plant[];
    season:Season;
    calculator:OrderCalculator;
    @observable repeatCalculators:OrderCalculator[] = [];
    partialSpace:boolean = false;

    constructor(private ordersService:OrdersService, private referenceService:ReferenceService, private capacityService:CapacityService,
                private dialogService:DialogService, private controller:DialogController, private element:Element,
                private observerLocator:ObserverLocator, private events:EventAggregator) {
        controller.settings.lock = true;
        controller.settings.position = position;

        referenceService.customers().then(result => {
            this.customers = result;
        });
        referenceService.plants().then(result => {
            this.plants = result;
        });

        Promise.all([
            this.referenceService.seasons().then(result => {
                this._seasons = result;
            }),
            this.referenceService.zones().then(result => {
                this._zones = result;
            }),
            this.referenceService.propagationTimes().then(result => {
                this._propagationTimes = result;
            }),
            this.referenceService.flowerTimes().then(result => {
                this._flowerTimes = result;
            }),
            this.capacityService.getCapacityWeeks().then(result => {
                this._weeks = result;
            })
        ]).then(() => {
            this.calculator = this.createCalculator();
            this.observerLocator
                .getObserver(this.calculator.order, 'zone')
                .subscribe(this.onZoneChange.bind(this));
            this.observerLocator
                .getObserver(this.calculator, 'orderQuantity')
                .subscribe(this.onQuantityChange.bind(this));
        });
    }

    attached() {
        $('.dropdown.customer', this.element).dropdown({
            allowAdditions: true,
            selectOnKeydown: true,
            forceSelection: true,
            onChange: this.onCustomerChange.bind(this)
        });
        $('#plant', this.element).dropdown({
            onChange: this.onPlantChange.bind(this)
        });
        $('.calendar', this.element).calendar({
            type: 'date',
            onChange: this.onDateChange.bind(this)
        });
    }

    detached() {
        $('#customer', this.element).dropdown('destroy');
        $('#plant', this.element).dropdown('destroy');
        $('.calendar', this.element).calendar('destroy');
         this.observerLocator
                .getObserver(this.calculator.order, 'zone')
                .unsubscribe(this.onZoneChange.bind(this));
        this.observerLocator
                .getObserver(this.calculator, 'orderQuantity')
                .unsubscribe(this.onQuantityChange.bind(this));

        this._zones = null;
        this._seasons = null;
        this._weeks.clear();
        this._weeks = null;
        this._propagationTimes = null;
        this._flowerTimes = null;

        this.customers = null;
        this.plants = null;
        this.season = null;
        this.calculator = null;
        this.repeatCalculators = null;
    }

    @computedFrom('calculator.order.arrivalDate')
    get dateDisplay():string {
        let display = 'Choose Date';
        if(this.calculator && _.isDate(this.calculator.order.arrivalDate)) {
            display = moment(this.calculator.order.arrivalDate).format('ddd, MMM Do');
        }
        return display;
    }

    onPlantChange(value:string) {
        const plant = _.find(this.plants, p => p.name === value);
        this.calculator.setPlant(plant);
        this.repeatCalculators.forEach((calculator, index) => {
            this.resetRepeatingCalculator(calculator, index);
        });
    }
    onDateChange(value:string) {
        const date = moment(value).toDate();
        this.calculator.setArrivalDate(date);
        this.repeatCalculators.forEach((calculator, index) => {
            this.resetRepeatingCalculator(calculator, index);
        });
    }
    onZoneChange(value:CalculatorZone) {
        this.repeatCalculators.forEach((calculator, index) => {
            calculator.order.zone = value;
            this.resetRepeatingCalculator(calculator, index);
        });
    }
    onQuantityChange(value:string) {
        this.repeatCalculators.forEach((calculator, index) => {
            this.resetRepeatingCalculator(calculator, index);
        });
    }
    onPartialSpacingChange(value:boolean) {
        const partialSpace = this.calculator.partialSpace;
        this.repeatCalculators.forEach((calculator, index) => {
            calculator.partialSpace = partialSpace;
            this.resetRepeatingCalculator(calculator, index);
        });
    }
    onCustomerChange(value:string) {
        const customer = _.find(this.customers, c => c.name === value) || { name: value, abbreviation: value };
        this.calculator.order.customer = customer;
        this.repeatCalculators.forEach(calculator => {
            calculator.order.customer = customer;
        });        
    }
    onRepeaterChange(value:CalculatorZone) {
        this.repeatCalculators.forEach(this.resetRepeatingCalculator.bind(this));
    }

    createCalculator():OrderCalculator {
        return new OrderCalculator(this._zones, this._weeks, this._seasons, this._propagationTimes, this._flowerTimes);
    }

    createOrder() {
        let revision = 0;

        //noinspection JSUnusedLocalSymbols
        const saver = () => {
            this.ordersService.create(this.calculator.getOrderDocument())
                .then(result => {
                    this.controller.close(true, result);                    
                })
                .catch(error => {
                    log.error(error);
                    if(error.status === 409) {
                        // if this is the first conflict, prompt
                        if(revision === 0) {
                            const customer = this.calculator.order.customer.name,
                                date = moment(this.calculator.order.arrivalDate).format('MMM D, YYYY');
                            this.dialogService.open({ viewModel: Prompt, model: `There is already an order for ${customer} on ${date}. Would you like to continue creating this order?` })
                                .then((result:DialogResult) => {
                                    if(result.wasCancelled) return;

                                    //noinspection TypeScriptUnresolvedFunction
                                    recreate();
                                });
                        // if there are multiple conflicts, don't ask every time
                        } else {
                            //noinspection TypeScriptUnresolvedFunction
                            recreate();
                        }
                    } else {
                        this.dialogService.open({ viewModel: ErrorNotification, model: error.message })
                    }
                });
        },
        recreate = () => {
            const order = this.calculator.order;
            order._id = void 0;
            const id = this.calculator.getOrderDocument().toJSON()._id;

            revision++;
            this.calculator.order._id = `${id} (${revision})`;
            saver();
        },
        saveBulk = () => {
            const orders = [this.calculator.getOrderDocument()].concat(this.repeatCalculators.map(c => c.getOrderDocument()));

            this.ordersService.createBulk(orders)
                .then(result => {
                    this.controller.close(true, result);                    
                })
                .catch(error => {
                    log.error(error);
                    this.dialogService.open({ viewModel: ErrorNotification, model: `There was a problem with one or more of the orders:\n\n${error.message}` })
                });
        };

        if(this.isRepeatingOrder) {
            saveBulk();
        } else {
            
            // any weeks where all zones are unselected?
            if(_.any(this.calculator.weeks, w => _.all(w.zones, z => !z || !z.selected))) {
                this.dialogService.open({ viewModel: ErrorNotification, model: 'Please ensure that all weeks have a zone selected.' });
            } else {
                saver();
            }
        }
    }

    get isRepeatingOrder():boolean {
        return this._isRepeatingOrder;
    }

    set isRepeatingOrder(value:boolean) {
        this._isRepeatingOrder = value;

        if(!value) {
            this.repeatCount = 0;
        }
    }

    get repeatCount():number {
        return this._repeatCount;
    }
    set repeatCount(value:number) {
        value = numeral(value).value();

        if(value < 0) {
            value = 0;
        }

        if(this._repeatCount !== value) {
            this._repeatCount = value;

            while(this.repeatCalculators.length > value) {
                const calculator = this.repeatCalculators.pop();
                this.observerLocator
                    .getObserver(calculator.order, 'partialSpace')
                    .unsubscribe(this.onRepeaterChange.bind(this));
            }

            while(this.repeatCalculators.length < value) {
                const calculator = this.createCalculator();
                this.observerLocator
                    .getObserver(calculator.order, 'partialSpace')
                    .subscribe(this.onRepeaterChange.bind(this));
                this.repeatCalculators.push(calculator);
            }

            this.repeatCalculators.forEach(this.resetRepeatingCalculator.bind(this));
        }
    }

    get repeatDays():number {
        return this._repeatDays;
    }
    set repeatDays(value:number) {
        value = numeral(value).value();

        this._repeatDays = value;

        if(this.calculator.order.arrivalDate) {
            this.repeatCalculators.forEach(this.resetRepeatingCalculator.bind(this));
        }
    }

    resetRepeatingCalculator(calculator:OrderCalculator, index:number) {
        const firstArrival = moment(this.calculator.order.arrivalDate),
            days = (index + 1) * this._repeatDays,
            thisArrival = firstArrival.clone().add(days, 'days').toDate(),
            previous = index === 0 ? this.calculator : this.repeatCalculators[index-1];

        calculator.setRepeater(previous, thisArrival);
        this.events.publish(Calculator.RepeaterResetEvent, calculator);
    }
}

function position(modalContainer:Element) {
    const $container = $(modalContainer),
        $aiFooter = $container.find('ai-dialog-footer'),
        $aiBody = $container.find('ai-dialog-body'),
        footerHeight = $aiFooter.outerHeight(),
        bodyHeight = `calc(100% - ${footerHeight}px)`;

    $aiBody.css({ height: bodyHeight });
}
