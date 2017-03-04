import {autoinject} from 'aurelia-framework';
import {EventAggregator} from 'aurelia-event-aggregator';
import {Configuration} from './configuration';
import {Authentication} from './authentication';
import {log} from './log';
import {OrderDocument} from "../models/order";

let localDB: PouchDB = null;
let remoteDB: PouchDB = null;

@autoinject()
export class Database {
    constructor(private auth: Authentication, private config: Configuration, private events: EventAggregator) {
        this.init();
        this.events.subscribe(Authentication.AuthenticatedEvent, this.init.bind(this));
    }

    init(localOps?:PouchDB.Configuration.DatabaseConfiguration, remoteOps?:PouchDB.Configuration.DatabaseConfiguration) {
        if (localDB === null) {
            if(localOps) {
                localDB = new PouchDB(this.config.app_database_name, localOps);
            } else {
                localDB = new PouchDB(this.config.app_database_name);
            }
        }

        if (this.auth.isAuthenticated()) {
            const userInfo = this.auth.userInfo,
                headers = {Authorization: userInfo.basicAuth},
                opts = {
                skip_setup: true,
                auth: {username: userInfo.name, password: userInfo.password}
                };
            if(remoteOps) {
                _.extend(opts, remoteOps);
            }

            remoteDB = new PouchDB(this.config.remote_database_name, opts);

            const sync = localDB.sync(remoteDB, {live: true})
                .on('complete', () => {
                    log.debug('Sync complete');
                })
                .on('error', err => {
                    log.error('Sync error');
                    log.error(err);
                    const values = _.values(err);
                    // this happens on iOS 10/Safari. Use the API keys...
                    if(values.indexOf('_reader access is required for this request') !== -1) {
                        try {
                            sync.cancel();
                        } catch (e) { }

                        localDB = null;
                        this.init(undefined, this.apiKeyOptions);
                    }
                })
                .on('change', change => {
                    log.info('Sync change');
                    log.debug(change);
                    if(change.direction === 'pull' && _.isArray(change.change.docs)) {

                        let ordersSynced:boolean = _.any(change.change.docs, doc => doc.type === OrderDocument.OrderDocumentType),
                            zonesSynced:boolean = _.any(change.change.docs, doc => doc._id === 'zones'),
                            plantsSynced:boolean = _.any(change.change.docs, doc => doc._id === 'plants');

                        if(ordersSynced) {
                            this.events.publish(Database.OrdersSyncChangeEvent);
                        }

                        if(zonesSynced) {
                            this.events.publish(Database.ZonesSyncChangeEvent);
                        }

                        if(plantsSynced) {
                            this.events.publish(Database.PlantsSyncChangeEvent);
                        }
                    }
                })
                .on('paused', info => {
                    log.info('Sync paused');
                    log.debug(info);
                })
        }
    }

    //noinspection JSMethodCanBeStatic
    get db() {
        return localDB;
    }

    get apiKeyOptions():PouchDB.Configuration.DatabaseConfiguration {
        return Configuration.isDebug() ?
        {
            skip_setup: true,
            auth: {username: 'blosterionsionatteracanc', password: '69cae2ccabb512fbdbb35da517c1a64071deb07f'}
        } :
        {
            skip_setup: true,
            auth: {username: 'anytombsoloventmeatterse', password: '1f42225b5e1328fc400e407ce89f253eb834a904'}
        };
    }

    static OrdersSyncChangeEvent:string = 'OrdersSyncChangeEvent';
    static ZonesSyncChangeEvent:string = 'ZonesSyncChangeEvent';
    static PlantsSyncChangeEvent:string = 'PlantsSyncChangeEvent';
}
