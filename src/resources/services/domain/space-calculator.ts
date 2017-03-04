import {Order} from "../../../../src/resources/models/order";
import {Spacings, SpacingOptions} from "../../models/plant";

export class TableSpaceResult {
    autoSpacing: number;
    manualSpacing: number;
}

export class SpaceCalculator {

    constructor(private order:Order) { }

    getTables(weekId:string):number|TableSpaceResult {
        if(!this.order.stickDate || !this.order.plant) return 0;

        let loop = moment(this.order.stickDate).startOf('isoWeek'),
            spacingOption:SpacingOptions = <SpacingOptions>Spacings.Tight;

        if(this.order.lightsOutDate) {
            const lightsOutDate = moment(this.order.lightsOutDate).startOf('isoWeek'),
                isPartialSpacing = this.order.partialSpace;

            if(isPartialSpacing) {
                const partialSpaceDate = (_.isDate(this.order.partialSpaceDate) ? moment(this.order.partialSpaceDate) : lightsOutDate.clone().subtract(1, 'week')).startOf('isoweek'),
                    fullSpaceDate = (_.isDate(this.order.fullSpaceDate) ? moment(this.order.fullSpaceDate) : lightsOutDate.clone().add(1, 'week')).startOf('isoweek');

                while(loop.isBefore(partialSpaceDate)) {
                    if(loop.toWeekNumberId() === weekId) {
                        return this.calculateTables(spacingOption);
                    }
                    loop.add(1, 'week');
                }
                // now we're partially spaced. zones that are manually spaced are still tight
                spacingOption = <SpacingOptions>Spacings.Half;
                while(loop.isBefore(fullSpaceDate)) {
                    if(loop.toWeekNumberId() === weekId) {
                        return this.calculateTables(spacingOption, spacingOption);
                    }
                    loop.add(1, 'week');
                }
                spacingOption = <SpacingOptions>Spacings.Full;
                // after lights-out, zones that are manually spaced are full
                while(loop.isBefore(this.order.arrivalDate)) {
                    if(loop.toWeekNumberId() === weekId) {
                        return this.calculateTables(spacingOption, <SpacingOptions>Spacings.Full);
                    }
                    loop.add(1, 'week');
                }
            } else {
                while(loop.isBefore(lightsOutDate)) {
                    if(loop.toWeekNumberId() === weekId) {
                        return this.calculateTables(spacingOption);
                    }
                    loop.add(1, 'week');
                }
            }
            spacingOption = <SpacingOptions>Spacings.Full;

            if(this.order.arrivalDate) {
                const arrivalDate = moment(this.order.arrivalDate).startOf('isoWeek');

                while(loop.isSameOrBefore(arrivalDate)) {
                    if(loop.toWeekNumberId() === weekId) {
                        return this.calculateTables(spacingOption);
                    }
                    loop.add(1, 'week');
                }
            }
        }

        return 0;
    }

    private calculateTables(spaceType:SpacingOptions, manualSpaceType?:SpacingOptions):number|TableSpaceResult {
        if(this.order.plant.cuttingsPerPot == 0) return 0;

        let potsPerTable:number = this.order.plant.cuttingsPerTable[spaceType] / this.order.plant.cuttingsPerPot;

        if(isNaN(potsPerTable) && manualSpaceType) {
            potsPerTable = this.order.plant.cuttingsPerTable[manualSpaceType] / this.order.plant.cuttingsPerPot;
        }

        if(potsPerTable == 0) return 0;

        const spaceTypeTables = Math.ceil(this.order.quantity / potsPerTable);
        if(manualSpaceType) {
            const manualTables = this.calculateTables(manualSpaceType),
                manualTableCount = typeof manualTables === 'number' ? manualTables : manualTables.manualSpacing;
            return {
                autoSpacing: spaceTypeTables,
                manualSpacing: manualTableCount
            };
        }

        return spaceTypeTables;
    }
}
