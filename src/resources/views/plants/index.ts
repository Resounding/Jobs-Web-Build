import {autoinject} from 'aurelia-framework';
import {EventAggregator, Subscription} from 'aurelia-event-aggregator';
import {DialogController, DialogService, DialogResult} from 'aurelia-dialog';
import {Database} from '../../services/database';
import {ReferenceService} from '../../services/data/reference-service'
import {Plant, PlantDocument,Spacings} from '../../models/plant';
import {PlantDetail} from './plant-detail';

@autoinject
export class CropIndex {
    plants:Plant[];
    plantSyncChangeSubscription:Subscription;
    
    constructor(private referenceService:ReferenceService, private dialogService:DialogService,
        private events:EventAggregator) {
        this.loadPlants();
    }

    activate() {
        this.plantSyncChangeSubscription = this.events.subscribe(Database.PlantsSyncChangeEvent, this.loadPlants.bind(this));
    }

    deactivate() {

    }

    loadPlants() {
        return this.referenceService.plants()
            .then(result => this.plants = _.sortBy(result, p => p.crop.toLowerCase() + p.size));
    }

    cuttingsPerTable(plant:Plant) {
        if(typeof plant.cuttingsPerTable === 'number') return plant.cuttingsPerTable;

        return _.reduce([Spacings.Tight, Spacings.Half, Spacings.Full], (memo:string[], space:string) => {
            var value = plant.cuttingsPerTable[space]; 
            if(typeof value !== 'undefined') {
                memo.push(`${space}: ${value}`);
            }
            return memo;
        }, []).join(', ');
    }

    addPlant() {
        this.dialogService.open({
            viewModel: PlantDetail,
            model: new PlantDocument()
        }).then((result:DialogResult) => {
            if(result.wasCancelled) return;

            this.loadPlants();
        });
    }

    detail(plant:Plant) {
        this.dialogService.open({
            viewModel: PlantDetail,
            model: plant
        }).then((result:DialogResult) => {
            if(result.wasCancelled) return;

            this.loadPlants();
        });
    }
}