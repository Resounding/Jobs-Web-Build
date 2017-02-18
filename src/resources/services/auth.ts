import {Aurelia, autoinject} from 'aurelia-framework';
import {EventAggregator} from 'aurelia-event-aggregator';
import {Router, NavigationInstruction, Redirect, Next} from 'aurelia-router';
import {HttpClient} from 'aurelia-fetch-client';
import {Configuration} from './config';
import {log} from './log';

const storage_key:string = 'auth_token';
let database = null;
let user_info: UserInfo = null;

export interface UserInfo {
    name: string;
    password: string;
    roles: string[];
    basicAuth: string;
}

@autoinject()
export class Authentication {
    constructor(private app: Aurelia, private config: Configuration, private router:Router, private httpClient:HttpClient, private events:EventAggregator) {
        database = new PouchDB(this.config.remote_database_name, { skip_setup: true });
        user_info = JSON.parse(localStorage[storage_key] || null);
    }

    login(user:string, password:string):Promise<UserInfo> {
        return new Promise((resolve, reject) => {
            const url = `${this.config.remote_server}/_session`,
                body = `name=${encodeURI(user)}&password=${encodeURI(password)}`,
                authHeader = `Basic ${window.btoa(user + password)}`;
            this.httpClient.fetch(
                url, {
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: authHeader },
                    method: 'post',
                    body: body
                    }
                )
                .then(result => {
                    if(result.ok) {
                        log.debug('Login succeeded');
                        result.json().then(info => {
                            user_info = {
                                name: info.name,
                                password: password,
                                roles: info.roles,
                                basicAuth: authHeader
                            };

                            localStorage[storage_key] = JSON.stringify(user_info);
                            this.app.setRoot(this.config.app_root);
                            this.events.publish(Authentication.AuthenticatedEvent);
                            return resolve(user_info);
                        })
                    } else {
                        log.debug('Login failed')
                        result.json().then(error => {
                            reject(new Error(`Login failed: ${error.reason}`));
                        });
                    }
                })
                .catch(reject);
        });
    }


    logout():Promise {
        user_info = null;
        localStorage[storage_key] = null;
        this.app.setRoot(this.config.login_root);
        this.router.navigateToRoute('login');
        return Promise.resolve();
    }

    isAuthenticated() {
        return user_info !== null;
    }

    isInRole(role:string) {
        return this.isAuthenticated() && user_info.roles.indexOf(role) !== -1;
    }

    userInfo():UserInfo {
        return user_info;
    }

    static AuthenticatedEvent:string = 'authenticated';

    static isLoggedIn() {
      return user_info !== null;
    }
}

export class AuthorizeStep {
  run(navigationInstruction:NavigationInstruction, next: Next) {
    if(navigationInstruction.getAllInstructions().some(i => i.config.auth )) {
      var loggedIn = Authentication.isLoggedIn();
      if(!loggedIn) {
        return next.cancel(new Redirect('login'));
      }
    }

    return next();
  }
}

export class Roles {
    static Foreman:string = 'foreman';
    static Administrator:string = 'administrator';
    static Owner:string = 'owner';
    static OfficeAdmin:string = 'office_admin';
}
