import {bindable} from 'aurelia-framework';
import {OrderCalculator} from '../../services/domain/order-calculator';
import {CalculatorZone} from '../../services/domain/models/calculator-zone';
import {Calculator} from './calculator';

export class OrderTable {
    @bindable calculator:OrderCalculator;

    select(zone:CalculatorZone) {
        const z = _.clone(zone);
        z.weeks = void 0;
        z.__metadata__ = void 0;

        this.calculator.setZone(z);
    }
}
