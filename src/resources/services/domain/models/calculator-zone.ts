import {computedFrom} from "aurelia-binding";
import {Zone} from "../../../models/zone";
import {CalculatorWeek} from "./calculator-week";

export class CalculatorZone implements Zone {
    name:string;
    tables:number;
    autoSpace:boolean;
    weeks:CalculatorWeek[];
    isPropagationZone:boolean;

    constructor(zone:Zone) {
        _.extend(this, zone);
    }

    @computedFrom('weeks')
    get canFit():boolean {
        return _.all(this.weeks, week => {
            return week.zones[this.name] && week.zones[this.name].available >= 0;
        });
    }
}
