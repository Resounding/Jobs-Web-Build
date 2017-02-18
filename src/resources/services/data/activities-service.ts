import {autoinject} from 'aurelia-framework';
import {Database} from './db';

@autoinject()
export class ActivitiesService {
    db: PouchDB;

    constructor(database:Database){
        this.db = database.db;
    }

    getAll():Promise<string[]> {
        return new Promise((resolve, reject) => {
            this.db.get('activities')
                .then(result => {
                    resolve(result.items);
                })
                .catch(err => {
                    if(err.status === 404) {
                        var activities = {
                            _id: 'activities',
                            items: []
                        };
                        this.db.put(activities)
                            .then(() => resolve([]))
                            .catch(reject);
                    } else {
                        reject(err);
                    }
                });
        });
    }

    create(activity:string):Promise<any> {
        return new Promise((resolve, reject) => {
            this.db.get('activities')
                .then(result => {
                    result.items.push(activity);
                    return this.db.put(result);
                })
                .catch(err => {
                    if(err.status === 404) {
                        var activities = {
                            _id: 'activities',
                            items: [activity]
                        };
                        return this.db.put(activities);
                    } else {
                        reject(err);
                    }
                });
        })
    }
}
