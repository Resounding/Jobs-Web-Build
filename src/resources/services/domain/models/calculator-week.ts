import {Week, WeekZones} from '../../../models/week';

export interface Event {
    name:string;
    date:Date;
}

export interface CalculatorWeek {
    week:Week;
    events: Event[];
    tables: number;
    zones: WeekZones;
}

export class Events {
    static StickEvent:string = 'Stick';
    static LightsOutEventName:string = 'Lights Out';
    static SpacingEventName:string = 'Space';
    static FlowerEventName:string = 'Flower';
    static ShipEventName:string = 'Ship Date';
    static PartialSpaceEventName:string = 'Partial Space';
    static FullSpaceEventName:string = 'Full Space';
}
