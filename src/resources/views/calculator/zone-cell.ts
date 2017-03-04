import {bindable, autoinject} from 'aurelia-framework';
import {OrderCalculator} from '../../services/domain/order-calculator';
import {CalculatorWeek} from '../../services/domain/models/calculator-week';
import {Week, WeekZone} from '../../models/week';

@autoinject()
export class ZoneCell {
    @bindable calculator:OrderCalculator;
    @bindable week:CalculatorWeek;
    @bindable zone:WeekZone;

    select() {
        if(!this.zone.selected) {
            this.calculator.setZoneForWeek(this.zone.zone, this.week.week);
        }
    }
}