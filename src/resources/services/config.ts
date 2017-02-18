export class Configuration {
    constructor() {
        this.remote_database_name = Configuration.isDebug() ? `${this.remote_server}/langendoen-test` : `${this.remote_server}/langendoen`;
    }

    app_database_name:string = 'LangendoenJobs';
    app_root:string = 'resources/views/app';
    login_root:string = 'resources/views/login';
    remote_server:string = 'https://resounding.cloudant.com';
    remote_database_name:string;

    static isDebug():boolean {
        return window.location.hostname === 'localhost';
    }
}
