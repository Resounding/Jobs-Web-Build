import {autoinject} from 'aurelia-framework';
import {DialogController, DialogService, DialogResult} from 'aurelia-dialog';
import {ErrorNotification} from '../controls/error-notification';
import {Prompt} from '../controls/prompt';
import {log} from '../../services/log';
import {ReferenceService} from '../../services/data/reference-service';
import {Plant,Spacings} from '../../models/plant';
import {Season} from '../../models/season';
import {SeasonTime,SeasonTimeSeasons} from '../../models/season-time';

class SeasonsYear implements SeasonTimeSeasons {
    spring: number = 0;
    summer: number = 0;
    fall: number = 0;
    winter: number = 0;
}

interface SeasonMap {
    [index:string]: SeasonTimeSeasons
}

@autoinject
export class PlantDetail {
    private plant:Plant;
    private seasons:SeasonMap = {};
    private propagationTimes:SeasonMap = {};
    private flowerTimes:SeasonMap = {};
    private currentYear:number = new Date().getFullYear();

    constructor(private referenceService:ReferenceService, private dialogService:DialogService,
        private controller:DialogController, private element:Element) {
        controller.settings.lock = true;
        controller.settings.position = position;        
    }

    activate(plant:Plant) {
        this.plant = _.clone(plant);

        if(this.plant.size && !this.plant.size.endsWith('"')) this.plant.size += '"';

        this.referenceService.seasons()
            .then(seasons => {
                seasons.forEach(s => {
                    if(!this.seasons[s.year]) {
                        this.seasons[s.year] = new SeasonsYear();
                    }
                    const week = typeof s.week === 'number' ? s.week : s.week[this.plant.crop];
                    this.seasons[s.year][s.name] = week;
                    this.verifyCurrentSeason();
                });
            });

        this.referenceService.propagationTimes()
            .then(propagationTimes => {
                propagationTimes.filter(pt => pt.plant === this.plant.name)
                    .forEach(pt => {
                        this.propagationTimes[pt.year] = new SeasonsYear();
                        if(typeof pt.times === 'number') {
                            this.propagationTimes[pt.year].spring =
                            this.propagationTimes[pt.year].summer =
                            this.propagationTimes[pt.year].fall = 
                            this.propagationTimes[pt.year].winter =
                                pt.times
                        } else {
                            this.propagationTimes[pt.year] = _.clone(pt.times);
                        }
                });
            });

        this.referenceService.flowerTimes()
            .then(flowerTimes => {
                flowerTimes.filter(ft => ft.plant === this.plant.name)
                    .forEach(ft => {
                        this.flowerTimes[ft.year] = new SeasonsYear();
                        if(typeof ft.times === 'number') {
                            this.flowerTimes[ft.year].spring =
                            this.flowerTimes[ft.year].summer =
                            this.flowerTimes[ft.year].fall = 
                            this.flowerTimes[ft.year].winter =
                                ft.times
                        } else {
                            this.flowerTimes[ft.year] = _.clone(ft.times);
                        }
                    });
            });
    }

    attached() {
        $('.ui.checkbox', this.element).checkbox();
    }

    detached() {
        $('.ui.checkbox', this.element).checkbox('destroy');
    }

    nextSeason() {
        this.currentYear++;
        this.verifyCurrentSeason();
    }

    previousSeason() {
        this.currentYear--;
        this.verifyCurrentSeason();
    }

    private verifyCurrentSeason() {
        if(!this.seasons[this.currentYear]) {
            this.seasons[this.currentYear] = new SeasonsYear();
        }
        if(!this.propagationTimes[this.currentYear]) {
            this.propagationTimes[this.currentYear] = new SeasonsYear();
        }
        if(!this.flowerTimes[this.currentYear]) {
            this.flowerTimes[this.currentYear] = new SeasonsYear();
        }
    }

    cancel() {
        this.controller.cancel();
    }

    save() {
        let error;

        _.forEach(this.flowerTimes, (value, key) => {
            if(!value || _.values(value).some(v => !numeral(v).value())) error = `Please enter the number of weeks for each flower time in ${key}`;
        });
        _.forEach(this.propagationTimes, (value, key) => {
            if(!value || _.values(value).some(v => !numeral(v).value())) error = `Please enter the number of weeks for each propagation time in ${key}`;
        });
        _.forEach(this.seasons, (value, key) => {
            if(_.values(value).some(v => !numeral(v).value())) error = `Please enter the weeks for each season in ${key}`;
        });
        if(!this.plant.cuttingsPerPot) error = 'Please enter the cuttings per pot';
        if(!this.plant.crop) error = 'Please enter the crop';
        if(!this.plant.size) error = 'Please enter the size';

        if(error) {
            this.dialogService.open({ viewModel: ErrorNotification, model: error });
            return;
        }

        const plant = _.clone(this.plant);

        plant.size = numeral(plant.size).value().toString();
        plant.name = `${plant.size}" ${plant.crop}`;
        plant.cuttingsPerPot = numeral(plant.cuttingsPerPot).value();
        const half = numeral(plant.cuttingsPerTable.half).value();
        plant.cuttingsPerTable = {
            tight: numeral(plant.cuttingsPerTable.tight).value(),
            full: numeral(plant.cuttingsPerTable.full).value()
        };
        if(half) {
            plant.cuttingsPerTable.half = half;
        }

        const seasons:Season[] = [],
            propagationTimes:SeasonTime[] = [],
            flowerTimes:SeasonTime[] = [];

        _.forEach(this.seasons, (value, key) => {
            const year = numeral(key).value();
            Object.keys(value).forEach(seasonName => {
                const week = numeral(value[seasonName]).value(),
                    season = {
                        year: year,
                        name: seasonName,
                        week: { }
                    };
                season.week[plant.crop] = week;
                seasons.push(season);
            });
        });
        _.forEach(this.propagationTimes, (value, key) => {
            const year = numeral(key).value(),
                propagationTime = {
                        plant: plant.name,
                        year: year,
                        times: new SeasonsYear()
                    };

            Object.keys(value).forEach(seasonName => {
                const weeks = numeral(value[seasonName]).value();                
                propagationTime.times[seasonName] = weeks;            
            });
            propagationTimes.push(propagationTime);
        });
        _.forEach(this.flowerTimes, (value, key) => {
            const year = numeral(key).value(),
                flowerTime = {
                        plant: plant.name,
                        year: year,
                        times: new SeasonsYear()
                    };

            Object.keys(value).forEach(seasonName => {
                const weeks = numeral(value[seasonName]).value();                
                flowerTime.times[seasonName] = weeks;            
            });
            flowerTimes.push(flowerTime);
        });
        
        this.referenceService.savePlant(plant, seasons, propagationTimes, flowerTimes)
            .then(() => {
                this.controller.close(true, plant);
            })
            .catch(err => {
                log.error(err);
                alert(err);
            });
    }

    delete() {
        this.dialogService.open({ viewModel: Prompt, model: 'Are you sure you want to delete this plant?'})
            .then((result:DialogResult) => {
                if(result.wasCancelled) return;
        
                this.referenceService.deletePlant(this.plant)
                    .then(() => {
                        this.controller.close(true, this.plant);
                    })
                    .catch(err => {
                        log.error(err);
                        alert(err);
                    });
            });
    }

    get isNew():boolean {
        return !this.plant.id;
    }

    get currentSeasonsYear():SeasonsYear {
        return this.seasons[this.currentYear];
    }

    get currentPropationTimesYear():SeasonsYear {
        return this.propagationTimes[this.currentYear];
    }

    get currentFlowerTimesYear():SeasonsYear {
        return this.flowerTimes[this.currentYear];
    }
}

function position(modalContainer:Element, modalOverlay:Element) {
    const $container = $(modalContainer),
        $aiHeader = $container.find('ai-dialog-header'),
        $aiFooter = $container.find('ai-dialog-footer'),
        $aiBody = $container.find('ai-dialog-body'),
        headerHeight = $aiHeader.outerHeight(),
        footerHeight = $aiFooter.outerHeight(),
        bodyHeight = `calc(100% - ${footerHeight + headerHeight}px)`;

    $aiBody.css({ height: bodyHeight });
}