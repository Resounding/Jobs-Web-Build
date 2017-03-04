import {bindable, autoinject} from 'aurelia-framework';
import {Event, Events} from "../../services/domain/models/calculator-week";
import {OrderCalculator} from "../../services/domain/order-calculator";
import {CalculatorZone} from "../../services/domain/models/calculator-zone";

@autoinject()
export class EventViewCustomElement {
    @bindable calculator:OrderCalculator;
    @bindable event:Event = null;

    constructor(private element:Element) { }

    attached() {
        $('.calendar', this.element).calendar({
            type: 'date',
            initialDate: this.event.date,
            onChange: this.onDateChange.bind(this)
        }).calendar('set date', this.event.date);

        $('.dropdown', this.element).dropdown({
            onChange: this.onMove.bind(this)
        });
    }

    detached() {
        $('.calendar', this.element).calendar('destroy');
        $('.dropdown', this.element).dropdown('destroy');
    }

    onDateChange(value:string) {
        let date = moment(value).toDate();
        switch(this.event.name) {
            case Events.LightsOutEventName:
            case Events.SpacingEventName:
                if(isDifferent(this.calculator.order.lightsOutDate)) {
                    this.calculator.setLightsOutDate(date);
                }
                break;
            case Events.FlowerEventName:
                if(isDifferent(this.calculator.order.flowerDate)) {
                    this.calculator.setFlowerDate(date);
                }
                break;
            case Events.StickEvent:
                if(isDifferent(this.calculator.order.stickDate)) {
                    this.calculator.setStickDate(date);
                }
                break;
            case Events.ShipEventName:
                if(isDifferent(this.calculator.order.arrivalDate)) {
                    this.calculator.setArrivalDate(date);
                }
                break;
            case Events.PartialSpaceEventName:
                if(isDifferent(this.calculator.order.partialSpaceDate)) {
                    this.calculator.setPartialSpaceDate(date);
                }
                break;
            case Events.FullSpaceEventName:
                if(isDifferent(this.calculator.order.fullSpaceDate)) {
                    this.calculator.setFullSpaceDate(date);
                }
        }
        
        function isDifferent(compare:Date):boolean {
            return !moment(compare).isSame(date);
        }
    }

    onMove(value:string) {
        const weekId = moment(this.event.date).toWeekNumberId();
        this.calculator.setZoneFromEventOnward(value, weekId);
    }
}
