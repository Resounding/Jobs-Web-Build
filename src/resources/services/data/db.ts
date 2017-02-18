import {EventAggregator} from 'aurelia-event-aggregator';
import {autoinject} from 'aurelia-framework';
import {Job, JobDocument} from '../../models/job';
import {Configuration} from '../config';
import {log} from '../log';
import {Authentication} from '../auth';
import {PouchSyncOptions} from "../../../../custom_typings/pouchdb-find";
import DatabaseConfiguration = PouchDB.Configuration.DatabaseConfiguration;

let localDB: PouchDB = null;
let remoteDB: PouchDB = null;

@autoinject()
export class Database {
  constructor(private auth: Authentication, private config: Configuration, private events: EventAggregator) {
    this.init();
    this.events.subscribe(Authentication.AuthenticatedEvent, this.init.bind(this));
  }

  init(localOps?:DatabaseConfiguration, remoteOps?:DatabaseConfiguration) {
    if (localDB === null) {
      if(localOps) {
        localDB = new PouchDB(this.config.app_database_name, localOps);
      } else {
        localDB = new PouchDB(this.config.app_database_name);
      }
      localDB.getIndexes()
        .then(indexes => {
          const names = _.pluck(indexes.indexes, 'name');
          if(names.indexOf('by_type_name') === -1) {
            localDB.createIndex({
              name: 'by_type_name',
              index: {
                fields: ['type', 'name'],
                sort: ['name']
              }
            }).then(result => {
              log.debug(result);
            }).catch(error => {
              log.error(error);
            });
          }

          if(names.indexOf('by_type_deleted') === -1) {
            localDB.createIndex({
              name: 'by_type_deleted',
              index: {
                fields: ['type', 'deleted']
              }
            }).then(result => {
              log.debug(result);
            }).catch(error => {
              log.error(error);
            });
          }
        });
    }

    if (this.auth.isAuthenticated()) {
      const userInfo = this.auth.userInfo(),
        headers = {Authorization: userInfo.basicAuth},
        opts = {
          skip_setup: true,
          auth: {username: userInfo.name, password: userInfo.password}
        };
      if(remoteOps) {
        _.extend(opts, remoteOps);
      }
      let remoteDB = new PouchDB(this.config.remote_database_name, opts);
      const sync = localDB.sync(remoteDB, {live: true})
        .on('complete', () => {
          log.debug('Sync complete');
        })
        .on('error', err => {
          log.error('Sync error');
          log.error(err);
          const values = _.values(err);
          // this happens on Samsung TV
          if(values.indexOf('web_sql_went_bad') !== -1) {
            try {
              sync.cancel();
            } catch(e) { }

            localDB = null;
            const options:DatabaseConfiguration = { adapter: 'localstorage' };
            this.init(options);
          // this happens on iOS 10/Safari. Use the API keys...
          } else if(values.indexOf('_reader access is required for this request') !== -1) {
            try {
              sync.cancel();
            } catch (e) { }

            localDB = null;
            const options:DatabaseConfiguration = {
              skip_setup: true,
              auth: {username: 'servaryinallyzeaccedicie', password: 'f2062820500e00f931c25f848928023cc1b427cc'}
            };
            this.init(undefined, options);
          }
        })
        .on('change', change => {
          log.info('Sync change');
          log.debug(change);
          if(change.direction === 'pull') {
            if(_.isArray(change.change.docs)){
              change.change.docs.forEach(doc => {
                if(doc.type === JobDocument.DOCUMENT_TYPE) {
                  const job = new JobDocument(doc);
                  this.events.publish(Database.SyncChangeEvent, job);
                }
              })
            }
          }

        }).on('paused', info => {
        log.info('Sync pause');
        log.debug(info);
      }).on('active', info => {
        log.info('Sync active');
        log.debug(info);
      });
    }
  }

  destroy(): Promise<any> {
    return localDB.destroy()
      .then(this.init.bind(this));
  }

  nextJobNumber(): Promise<string> {
    return new Promise((resolve, reject) => {
      localDB.find<Job>({
        selector: {type: JobDocument.DOCUMENT_TYPE},
        fields: ['number']
      })
        .then(rows => {
          log.debug(rows);
          const nextNumber: number = rows.docs.reduce((memo, job) => {
              var number = parseInt(job.number);
              if (!isNaN(number) && number > memo) memo = number;
              return memo;
            }, 0) + 1;

          //http://stackoverflow.com/a/10073761
          const formattedNumber: string = nextNumber < 99999 ? `0000${nextNumber}`.slice(-5) : nextNumber.toString();
          resolve(formattedNumber);
        })
        .catch(reject);
    });
  }

  get db() {
    return localDB;
  }

  static SyncChangeEvent:string = 'SyncChangeEvent';
}
