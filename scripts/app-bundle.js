define('environment',["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = {
        debug: true,
        testing: true
    };
});

define('resources/services/config',["require", "exports"], function (require, exports) {
    "use strict";
    var Configuration = (function () {
        function Configuration() {
            this.app_database_name = 'LangendoenJobs';
            this.app_root = 'resources/views/app';
            this.login_root = 'resources/views/login';
            this.remote_server = 'https://resounding.cloudant.com';
            this.remote_database_name = Configuration.isDebug() ? this.remote_server + "/langendoen-test" : this.remote_server + "/langendoen";
        }
        Configuration.isDebug = function () {
            return window.location.hostname === 'localhost';
        };
        return Configuration;
    }());
    exports.Configuration = Configuration;
});

define('resources/services/log',["require", "exports", 'aurelia-framework'], function (require, exports, aurelia_framework_1) {
    "use strict";
    exports.log = aurelia_framework_1.LogManager.getLogger('jobsweb');
});

var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
define('resources/services/auth',["require", "exports", 'aurelia-framework', 'aurelia-event-aggregator', 'aurelia-router', 'aurelia-fetch-client', './config', './log'], function (require, exports, aurelia_framework_1, aurelia_event_aggregator_1, aurelia_router_1, aurelia_fetch_client_1, config_1, log_1) {
    "use strict";
    var storage_key = 'auth_token';
    var database = null;
    var user_info = null;
    var Authentication = (function () {
        function Authentication(app, config, router, httpClient, events) {
            this.app = app;
            this.config = config;
            this.router = router;
            this.httpClient = httpClient;
            this.events = events;
            database = new PouchDB(this.config.remote_database_name, { skip_setup: true });
            user_info = JSON.parse(localStorage[storage_key] || null);
        }
        Authentication.prototype.login = function (user, password) {
            var _this = this;
            return new Promise(function (resolve, reject) {
                var url = _this.config.remote_server + "/_session", body = "name=" + encodeURI(user) + "&password=" + encodeURI(password), authHeader = "Basic " + window.btoa(user + password);
                _this.httpClient.fetch(url, {
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: authHeader },
                    method: 'post',
                    body: body
                })
                    .then(function (result) {
                    if (result.ok) {
                        log_1.log.debug('Login succeeded');
                        result.json().then(function (info) {
                            user_info = {
                                name: info.name,
                                password: password,
                                roles: info.roles,
                                basicAuth: authHeader
                            };
                            localStorage[storage_key] = JSON.stringify(user_info);
                            _this.app.setRoot(_this.config.app_root);
                            _this.events.publish(Authentication.AuthenticatedEvent);
                            return resolve(user_info);
                        });
                    }
                    else {
                        log_1.log.debug('Login failed');
                        result.json().then(function (error) {
                            reject(new Error("Login failed: " + error.reason));
                        });
                    }
                })
                    .catch(reject);
            });
        };
        Authentication.prototype.logout = function () {
            user_info = null;
            localStorage[storage_key] = null;
            this.app.setRoot(this.config.login_root);
            this.router.navigateToRoute('login');
            return Promise.resolve();
        };
        Authentication.prototype.isAuthenticated = function () {
            return user_info !== null;
        };
        Authentication.prototype.isInRole = function (role) {
            return this.isAuthenticated() && user_info.roles.indexOf(role) !== -1;
        };
        Authentication.prototype.userInfo = function () {
            return user_info;
        };
        Authentication.isLoggedIn = function () {
            return user_info !== null;
        };
        Authentication.AuthenticatedEvent = 'authenticated';
        Authentication = __decorate([
            aurelia_framework_1.autoinject(), 
            __metadata('design:paramtypes', [aurelia_framework_1.Aurelia, config_1.Configuration, aurelia_router_1.Router, aurelia_fetch_client_1.HttpClient, aurelia_event_aggregator_1.EventAggregator])
        ], Authentication);
        return Authentication;
    }());
    exports.Authentication = Authentication;
    var AuthorizeStep = (function () {
        function AuthorizeStep() {
        }
        AuthorizeStep.prototype.run = function (navigationInstruction, next) {
            if (navigationInstruction.getAllInstructions().some(function (i) { return i.config.auth; })) {
                var loggedIn = Authentication.isLoggedIn();
                if (!loggedIn) {
                    return next.cancel(new aurelia_router_1.Redirect('login'));
                }
            }
            return next();
        };
        return AuthorizeStep;
    }());
    exports.AuthorizeStep = AuthorizeStep;
    var Roles = (function () {
        function Roles() {
        }
        Roles.Foreman = 'foreman';
        Roles.Administrator = 'administrator';
        Roles.Owner = 'owner';
        Roles.OfficeAdmin = 'office_admin';
        return Roles;
    }());
    exports.Roles = Roles;
});

define('main',["require", "exports", './resources/services/auth', './resources/services/config'], function (require, exports, auth_1, config_1) {
    "use strict";
    Promise.config({
        warnings: {
            wForgottenReturn: false
        }
    });
    function configure(aurelia) {
        aurelia.use
            .standardConfiguration()
            .feature('resources')
            .plugin('aurelia-dialog', function (config) {
            config.useDefaults();
            config.settings.lock = true;
        });
        if (config_1.Configuration.isDebug()) {
            aurelia.use.developmentLogging();
        }
        return aurelia.start().then(function () {
            var auth = aurelia.container.get(auth_1.Authentication), config = aurelia.container.get(config_1.Configuration), root = auth.isAuthenticated() ? config.app_root : config.login_root;
            return aurelia.setRoot(root);
        });
    }
    exports.configure = configure;
});

define('resources/index',["require", "exports"], function (require, exports) {
    "use strict";
    function configure(config) {
    }
    exports.configure = configure;
});

define('resources/models/billing-type',["require", "exports"], function (require, exports) {
    "use strict";
    var BillingType = (function () {
        function BillingType() {
        }
        BillingType.TIME_AND_MATERIALS = 't+m';
        BillingType.FIXED_CONTRACT = 'time';
        BillingType.OPTIONS = [
            { id: BillingType.TIME_AND_MATERIALS, name: 'Time and Materials' },
            { id: BillingType.FIXED_CONTRACT, name: 'Fixed/Contract' }
        ];
        return BillingType;
    }());
    exports.BillingType = BillingType;
});

define('resources/models/customer',["require", "exports"], function (require, exports) {
    "use strict";
    var CustomerDocument = (function () {
        function CustomerDocument(props) {
            if (props) {
                _.extend(this, props);
            }
        }
        CustomerDocument.prototype.toJSON = function () {
            return {
                _id: this._id,
                _rev: this._rev,
                type: CustomerDocument.DOCUMENT_TYPE,
                name: this.name,
                address: this.address,
                city: this.city,
                province: this.province,
                postal_code: this.postal_code,
                contact: this.contact,
                phone: this.phone
            };
        };
        CustomerDocument.createId = function (name) {
            return CustomerDocument.DOCUMENT_TYPE + ":" + name.toLowerCase().replace(' ', '-');
        };
        CustomerDocument.DOCUMENT_TYPE = 'customer';
        return CustomerDocument;
    }());
    exports.CustomerDocument = CustomerDocument;
});

define('resources/models/foreman',["require", "exports"], function (require, exports) {
    "use strict";
    var Foreman = (function () {
        function Foreman() {
        }
        Foreman.OPTIONS = [
            'Barry',
            'Dan',
            'Kurt'
        ];
        return Foreman;
    }());
    exports.Foreman = Foreman;
});

define('resources/models/job-status',["require", "exports"], function (require, exports) {
    "use strict";
    var JobStatus = (function () {
        function JobStatus() {
        }
        JobStatus.PENDING = 'pending';
        JobStatus.IN_PROGRESS = 'inprogress';
        JobStatus.COMPLETE = 'complete';
        JobStatus.CLOSED = 'closed';
        JobStatus.OPTIONS = [
            { id: JobStatus.PENDING, name: 'Pending', cssClass: 'hourglass start inverted blue' },
            { id: JobStatus.IN_PROGRESS, name: 'In Progress', cssClass: 'hourglass half inverted green' },
            { id: JobStatus.COMPLETE, name: 'Complete', cssClass: 'hourglass end' },
            { id: JobStatus.CLOSED, name: 'Closed', cssClass: '' }
        ];
        return JobStatus;
    }());
    exports.JobStatus = JobStatus;
});

define('resources/models/job-type',["require", "exports"], function (require, exports) {
    "use strict";
    var JobType = (function () {
        function JobType() {
        }
        JobType.PROJECT = 'project';
        JobType.SERVICE_CALL = 'service';
        JobType.OPTIONS = [
            { id: JobType.PROJECT, name: 'Project' },
            { id: JobType.SERVICE_CALL, name: 'Service Call' }
        ];
        return JobType;
    }());
    exports.JobType = JobType;
});

define('resources/models/job',["require", "exports", './job-status', './job-type'], function (require, exports, job_status_1, job_type_1) {
    "use strict";
    var JobDocument = (function () {
        function JobDocument(props) {
            this._id = null;
            this.job_type = job_type_1.JobType.SERVICE_CALL;
            this.number = null;
            this.name = '';
            this.customer = null;
            this.status = job_status_1.JobStatus.PENDING;
            this.description = '';
            this.days = 1;
            this.startDate = null;
            this.endDate = null;
            this.notes = '';
            this.deleted = false;
            if (props) {
                _.extend(this, props);
            }
        }
        Object.defineProperty(JobDocument.prototype, "isMultiDay", {
            get: function () {
                if (!_.isDate(this.startDate) || !_.isDate(this.endDate))
                    return false;
                return !moment(this.startDate).isSame(this.endDate, 'day');
            },
            enumerable: true,
            configurable: true
        });
        JobDocument.prototype.toJSON = function () {
            return {
                _id: this._id,
                job_type: this.job_type,
                number: this.number,
                name: this.name,
                customer: this.customer,
                status: this.status,
                description: this.description,
                billing_type: this.billing_type,
                work_type: this.work_type,
                isMultiDay: this.isMultiDay,
                days: this.days,
                startDate: this.startDate,
                endDate: this.endDate,
                foreman: this.foreman,
                notes: this.notes,
                manHours: this.manHours,
                deleted: this.deleted,
                type: JobDocument.DOCUMENT_TYPE,
                _rev: this._rev
            };
        };
        JobDocument.DOCUMENT_TYPE = 'job';
        return JobDocument;
    }());
    exports.JobDocument = JobDocument;
});

define('resources/models/work-type',["require", "exports"], function (require, exports) {
    "use strict";
    var WorkType = (function () {
        function WorkType() {
        }
        WorkType.MATERIALS_AND_INSTALL = 'm+i';
        WorkType.INSTALL_ONLY = 'install';
        WorkType.MATERIALS_ONLY = 'materials';
        WorkType.OPTIONS = [
            { id: WorkType.MATERIALS_AND_INSTALL, name: 'Materials + Install' },
            { id: WorkType.INSTALL_ONLY, name: 'Install Only' },
            { id: WorkType.MATERIALS_ONLY, name: 'Materials Only' }
        ];
        return WorkType;
    }());
    exports.WorkType = WorkType;
});

var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
define('resources/services/data/db',["require", "exports", 'aurelia-event-aggregator', 'aurelia-framework', '../../models/job', '../config', '../log', '../auth'], function (require, exports, aurelia_event_aggregator_1, aurelia_framework_1, job_1, config_1, log_1, auth_1) {
    "use strict";
    var localDB = null;
    var remoteDB = null;
    var Database = (function () {
        function Database(auth, config, events) {
            this.auth = auth;
            this.config = config;
            this.events = events;
            this.init();
            this.events.subscribe(auth_1.Authentication.AuthenticatedEvent, this.init.bind(this));
        }
        Database.prototype.init = function (localOps) {
            var _this = this;
            if (localDB === null) {
                if (localOps) {
                    localDB = new PouchDB(this.config.app_database_name, localOps);
                }
                else {
                    localDB = new PouchDB(this.config.app_database_name);
                }
                localDB.getIndexes()
                    .then(function (indexes) {
                    var names = _.pluck(indexes.indexes, 'name');
                    if (names.indexOf('by_type_name') === -1) {
                        localDB.createIndex({
                            name: 'by_type_name',
                            index: {
                                fields: ['type', 'name'],
                                sort: ['name']
                            }
                        }).then(function (result) {
                            log_1.log.debug(result);
                        }).catch(function (error) {
                            log_1.log.error(error);
                        });
                    }
                    if (names.indexOf('by_type_deleted') === -1) {
                        localDB.createIndex({
                            name: 'by_type_deleted',
                            index: {
                                fields: ['type', 'deleted']
                            }
                        }).then(function (result) {
                            log_1.log.debug(result);
                        }).catch(function (error) {
                            log_1.log.error(error);
                        });
                    }
                });
            }
            if (this.auth.isAuthenticated()) {
                var userInfo = this.auth.userInfo(), headers = { Authorization: userInfo.basicAuth };
                remoteDB = new PouchDB(this.config.remote_database_name, {
                    skip_setup: true,
                    auth: { username: userInfo.name, password: userInfo.password }
                });
                var sync_1 = localDB.sync(remoteDB, { live: true })
                    .on('complete', function () {
                    log_1.log.debug('Sync complete');
                })
                    .on('error', function (err) {
                    log_1.log.error('Sync error');
                    log_1.log.error(err);
                    var values = _.values(err);
                    if (values.indexOf('web_sql_went_bad') !== -1) {
                        try {
                            sync_1.cancel();
                        }
                        catch (e) { }
                        localDB = null;
                        var options = { adapter: 'localstorage' };
                        _this.init(options);
                    }
                })
                    .on('change', function (change) {
                    log_1.log.info('Sync change');
                    log_1.log.debug(change);
                    if (change.direction === 'pull') {
                        if (_.isArray(change.change.docs)) {
                            change.change.docs.forEach(function (doc) {
                                if (doc.type === job_1.JobDocument.DOCUMENT_TYPE) {
                                    var job = new job_1.JobDocument(doc);
                                    _this.events.publish(Database.SyncChangeEvent, job);
                                }
                            });
                        }
                    }
                }).on('paused', function (info) {
                    log_1.log.info('Sync pause');
                    log_1.log.debug(info);
                }).on('active', function (info) {
                    log_1.log.info('Sync active');
                    log_1.log.debug(info);
                });
            }
        };
        Database.prototype.destroy = function () {
            return localDB.destroy()
                .then(this.init.bind(this));
        };
        Database.prototype.nextJobNumber = function () {
            return new Promise(function (resolve, reject) {
                localDB.find({
                    selector: { type: job_1.JobDocument.DOCUMENT_TYPE },
                    fields: ['number']
                })
                    .then(function (rows) {
                    log_1.log.debug(rows);
                    var nextNumber = rows.docs.reduce(function (memo, job) {
                        var number = parseInt(job.number);
                        if (!isNaN(number) && number > memo)
                            memo = number;
                        return memo;
                    }, 0) + 1;
                    var formattedNumber = nextNumber < 99999 ? ("0000" + nextNumber).slice(-5) : nextNumber.toString();
                    resolve(formattedNumber);
                })
                    .catch(reject);
            });
        };
        Object.defineProperty(Database.prototype, "db", {
            get: function () {
                return localDB;
            },
            enumerable: true,
            configurable: true
        });
        Database.SyncChangeEvent = 'SyncChangeEvent';
        Database = __decorate([
            aurelia_framework_1.autoinject(), 
            __metadata('design:paramtypes', [auth_1.Authentication, config_1.Configuration, aurelia_event_aggregator_1.EventAggregator])
        ], Database);
        return Database;
    }());
    exports.Database = Database;
});

var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
define('resources/services/data/job-service',["require", "exports", 'aurelia-framework', '../log', './db', '../auth', "../../models/job"], function (require, exports, aurelia_framework_1, log_1, db_1, auth_1, job_1) {
    "use strict";
    var JobService = (function () {
        function JobService(auth, database) {
            this.auth = auth;
            this.database = database;
            this.db = database.db;
        }
        JobService.prototype.getAll = function () {
            var _this = this;
            return new Promise(function (resolve, reject) {
                _this.db.find({ selector: { type: job_1.JobDocument.DOCUMENT_TYPE, deleted: { '$ne': true } } })
                    .then(function (items) {
                    var jobs = items.docs.map(function (item) {
                        var job = new job_1.JobDocument(item);
                        if (_.isString(item.startDate)) {
                            job.startDate = moment(item.startDate).toDate();
                        }
                        if (_.isString(item.endDate)) {
                            job.endDate = moment(item.endDate).toDate();
                        }
                        return job;
                    });
                    resolve(jobs);
                })
                    .catch(reject);
            });
        };
        JobService.prototype.getOne = function (id) {
            var _this = this;
            return new Promise(function (resolve, reject) {
                _this.db.get(id)
                    .then(function (doc) {
                    log_1.log.info(doc);
                    var job = new job_1.JobDocument(doc);
                    if (_.isString(doc.startDate)) {
                        job.startDate = moment(doc.startDate).toDate();
                    }
                    if (_.isString(doc.endDate)) {
                        job.endDate = moment(doc.endDate).toDate();
                    }
                    resolve(job);
                })
                    .catch(reject);
            });
        };
        JobService.prototype.save = function (job) {
            var _this = this;
            return new Promise(function (resolve, reject) {
                if (!job._id) {
                    _this.database.nextJobNumber()
                        .then(function (number) {
                        job._id = "job:" + number;
                        job.number = number;
                        if (_this.auth.isInRole(auth_1.Roles.Foreman)) {
                            job.foreman = _this.auth.userInfo().name;
                        }
                        return _this.db.put(job)
                            .then(resolve)
                            .catch(reject);
                    });
                }
                else {
                    return _this.db.put(job)
                        .then(resolve)
                        .catch(reject);
                }
            });
        };
        JobService.prototype.delete = function (job) {
            job.deleted = true;
            return this.db.put(job);
        };
        JobService.prototype.destroy = function () {
            return this.database.destroy();
        };
        JobService = __decorate([
            aurelia_framework_1.autoinject(), 
            __metadata('design:paramtypes', [auth_1.Authentication, db_1.Database])
        ], JobService);
        return JobService;
    }());
    exports.JobService = JobService;
});

var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
define('resources/services/csv-export',["require", "exports", 'aurelia-framework', 'papaparse', "./data/job-service", "../models/job-type"], function (require, exports, aurelia_framework_1, PapaParse, job_service_1, job_type_1) {
    "use strict";
    var CsvExport = (function () {
        function CsvExport(jobsService) {
            this.jobsService = jobsService;
        }
        CsvExport.prototype.export = function () {
            var _this = this;
            return new Promise(function (resolve, reject) {
                var json = {
                    fields: [
                        'Number', 'Name', 'Customer', 'Status', 'Foreman', 'Description', 'Notes', 'Start Date', 'End Date'
                    ],
                    data: []
                };
                _this.jobsService
                    .getAll()
                    .then(function (jobs) {
                    json.data = jobs
                        .map(function (job) {
                        var formattedNumber = job.number < 99999 ? ("0000" + job.number).slice(-5) : job.number.toString(), prefix = job.job_type === job_type_1.JobType.SERVICE_CALL ? 'S' : 'P', startMoment = moment(job.startDate), endMoment = moment(job.endDate), start = job.startDate && startMoment.isValid() ? startMoment.format('YYYY-MM-DD') : '', end = job.endDate && endMoment.isValid() ? endMoment.format('YYYY-MM-DD') : '';
                        return [
                            (prefix + "-" + formattedNumber),
                            job.name,
                            job.customer.name,
                            job.status,
                            job.foreman,
                            job.description,
                            job.notes,
                            start,
                            end
                        ];
                    });
                    var csv = PapaParse.unparse(json);
                    resolve(csv);
                })
                    .catch(reject);
            });
        };
        CsvExport = __decorate([
            aurelia_framework_1.autoinject(), 
            __metadata('design:paramtypes', [job_service_1.JobService])
        ], CsvExport);
        return CsvExport;
    }());
    exports.CsvExport = CsvExport;
});

define('resources/services/notifications',["require", "exports"], function (require, exports) {
    "use strict";
    toastr.options.positionClass = "toast-bottom-left";
    var Notifications = (function () {
        function Notifications() {
        }
        Notifications.success = function (message) {
            toastr.success(message);
        };
        Notifications.error = function (err) {
            toastr.error(JSON.stringify(err));
        };
        return Notifications;
    }());
    exports.Notifications = Notifications;
});

define('resources/services/utils',["require", "exports"], function (require, exports) {
    "use strict";
    var device = undefined;
    function isDevice() {
        if (typeof device === 'undefined') {
            var el = $('<div class="hide-mobile"></div>');
            el.appendTo(document.documentElement);
            device = !el.is(':visible');
            el.remove();
        }
        return device;
    }
    exports.isDevice = isDevice;
});

define('resources/views/app',["require", "exports", '../services/auth'], function (require, exports, auth_1) {
    "use strict";
    var App = (function () {
        function App() {
        }
        App.prototype.configureRouter = function (config, router) {
            config.addPipelineStep('authorize', auth_1.AuthorizeStep);
            config.title = 'Langendoen Mechanical Job Management Application';
            config.map([
                { route: ['', 'jobs'], name: 'jobs.list', moduleId: 'resources/views/jobs/list', title: 'Jobs List', nav: true, auth: true, settings: { icon: 'browser' } },
                { route: 'jobs/new', name: 'jobs.new', moduleId: 'resources/views/jobs/detail', title: 'New Job', nav: true, auth: true, settings: { icon: 'plus' } },
                { route: 'jobs/:id', name: 'jobs.edit', moduleId: 'resources/views/jobs/detail', title: 'Edit Job', auth: true },
                { route: 'customers', name: 'customers.list', moduleId: 'resources/views/customers/list', title: 'Customer List', nav: true, auth: true, settings: { icon: 'building outline', hideMobile: true } }
            ]);
            this.router = router;
        };
        return App;
    }());
    exports.App = App;
});

var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
define('resources/views/login',["require", "exports", 'aurelia-framework', '../services/auth'], function (require, exports, aurelia_framework_1, auth_1) {
    "use strict";
    var Login = (function () {
        function Login(auth) {
            this.auth = auth;
        }
        Login.prototype.login = function () {
            var _this = this;
            this.errorMessage = '';
            if (!this.password)
                this.errorMessage = 'Please enter your password';
            if (!this.username)
                this.errorMessage = 'Please enter your username';
            if (!this.errorMessage) {
                this.auth.login(this.username, this.password)
                    .catch(function (err) {
                    _this.errorMessage = err.message;
                });
            }
        };
        Login = __decorate([
            aurelia_framework_1.autoinject(), 
            __metadata('design:paramtypes', [auth_1.Authentication])
        ], Login);
        return Login;
    }());
    exports.Login = Login;
});

var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
define('resources/services/data/activities-service',["require", "exports", 'aurelia-framework', './db'], function (require, exports, aurelia_framework_1, db_1) {
    "use strict";
    var ActivitiesService = (function () {
        function ActivitiesService(database) {
            this.db = database.db;
        }
        ActivitiesService.prototype.getAll = function () {
            var _this = this;
            return new Promise(function (resolve, reject) {
                _this.db.get('activities')
                    .then(function (result) {
                    resolve(result.items);
                })
                    .catch(function (err) {
                    if (err.status === 404) {
                        var activities = {
                            _id: 'activities',
                            items: []
                        };
                        _this.db.put(activities)
                            .then(function () { return resolve([]); })
                            .catch(reject);
                    }
                    else {
                        reject(err);
                    }
                });
            });
        };
        ActivitiesService.prototype.create = function (activity) {
            var _this = this;
            return new Promise(function (resolve, reject) {
                _this.db.get('activities')
                    .then(function (result) {
                    result.items.push(activity);
                    return _this.db.put(result);
                })
                    .catch(function (err) {
                    if (err.status === 404) {
                        var activities = {
                            _id: 'activities',
                            items: [activity]
                        };
                        return _this.db.put(activities);
                    }
                    else {
                        reject(err);
                    }
                });
            });
        };
        ActivitiesService = __decorate([
            aurelia_framework_1.autoinject(), 
            __metadata('design:paramtypes', [db_1.Database])
        ], ActivitiesService);
        return ActivitiesService;
    }());
    exports.ActivitiesService = ActivitiesService;
});

var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
define('resources/services/data/customer-service',["require", "exports", 'aurelia-framework', './db', "../../models/customer"], function (require, exports, aurelia_framework_1, db_1, customer_1) {
    "use strict";
    var CustomerService = (function () {
        function CustomerService(database) {
            this.db = database.db;
        }
        CustomerService.prototype.getAll = function () {
            var _this = this;
            return new Promise(function (resolve, reject) {
                _this.db.find({ selector: { type: customer_1.CustomerDocument.DOCUMENT_TYPE }, sort: ['type', 'name'] })
                    .then(function (items) {
                    var customers = items.docs.map(function (item) {
                        var customer = new customer_1.CustomerDocument(item);
                        return customer;
                    });
                    resolve(customers);
                })
                    .catch(reject);
            });
        };
        CustomerService.prototype.create = function (customer) {
            var _this = this;
            if (!customer._id) {
                customer._id = customer_1.CustomerDocument.createId(customer.name);
            }
            return new Promise(function (resolve, reject) {
                return _this.db.put(customer)
                    .then(function (result) {
                    _this.db.get(result.id)
                        .then(function (custResult) {
                        var saved = new customer_1.CustomerDocument(custResult);
                        resolve(saved);
                    })
                        .catch(reject);
                })
                    .catch(reject);
            });
        };
        CustomerService.prototype.save = function (customer) {
            var _this = this;
            return new Promise(function (resolve, reject) {
                if (!customer._id) {
                    return _this.create(customer);
                }
                else {
                    return _this.db.put(customer)
                        .then(resolve)
                        .catch(reject);
                }
            });
        };
        CustomerService.prototype.delete = function (customer) {
            var _this = this;
            return new Promise(function (resolve, reject) {
                _this.db.remove(customer)
                    .then(resolve)
                    .catch(reject);
            });
        };
        CustomerService = __decorate([
            aurelia_framework_1.autoinject(), 
            __metadata('design:paramtypes', [db_1.Database])
        ], CustomerService);
        return CustomerService;
    }());
    exports.CustomerService = CustomerService;
});

define('resources/views/controls/integer-value-converter',["require", "exports"], function (require, exports) {
    "use strict";
    var IntegerValueConverter = (function () {
        function IntegerValueConverter() {
        }
        IntegerValueConverter.prototype.fromView = function (value) {
            var numeric = parseInt(value);
            if (isNaN(numeric)) {
                numeric = 0;
            }
            return numeric;
        };
        IntegerValueConverter.prototype.toView = function (value) {
            var text = '';
            if (_.isNumber(value)) {
                text = value.toString();
            }
            return text;
        };
        return IntegerValueConverter;
    }());
    exports.IntegerValueConverter = IntegerValueConverter;
});

var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
define('resources/views/controls/nav-bar',["require", "exports", 'aurelia-framework', 'aurelia-router', '../../services/auth', "../../services/csv-export", "../../services/data/db"], function (require, exports, aurelia_framework_1, aurelia_router_1, auth_1, csv_export_1, db_1) {
    "use strict";
    var NavBar = (function () {
        function NavBar(element, auth, database, csvExport) {
            this.element = element;
            this.auth = auth;
            this.csvExport = csvExport;
        }
        NavBar.prototype.attached = function () {
            $('.dropdown', this.element).dropdown();
        };
        NavBar.prototype.detached = function () {
            $('.dropdown', this.element).dropdown('destroy');
            this.changes.cancel();
        };
        NavBar.prototype.downloadCsv = function () {
            this.csvExport.export()
                .then(function (result) {
                var csv = encodeURIComponent(result), href = "data:text/csv;charset=utf-8, " + csv, link = document.createElement('a');
                link.download = 'jobs.csv';
                link.href = href;
                link.click();
            });
        };
        NavBar.prototype.logout = function () {
            this.auth.logout();
        };
        Object.defineProperty(NavBar.prototype, "userName", {
            get: function () {
                return (this.auth.userInfo() || {}).name;
            },
            enumerable: true,
            configurable: true
        });
        __decorate([
            aurelia_framework_1.bindable, 
            __metadata('design:type', aurelia_router_1.Router)
        ], NavBar.prototype, "router", void 0);
        NavBar = __decorate([
            aurelia_framework_1.autoinject(), 
            __metadata('design:paramtypes', [Element, auth_1.Authentication, db_1.Database, csv_export_1.CsvExport])
        ], NavBar);
        return NavBar;
    }());
    exports.NavBar = NavBar;
});

var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
define('resources/views/controls/prompt',["require", "exports", 'aurelia-framework', "aurelia-dialog"], function (require, exports, aurelia_framework_1, aurelia_dialog_1) {
    "use strict";
    var Prompt = (function () {
        function Prompt(controller) {
            this.controller = controller;
        }
        Prompt.prototype.activate = function (message) {
            this.message = message;
        };
        Prompt = __decorate([
            aurelia_framework_1.autoinject(), 
            __metadata('design:paramtypes', [aurelia_dialog_1.DialogController])
        ], Prompt);
        return Prompt;
    }());
    exports.Prompt = Prompt;
});

var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
define('resources/views/customers/edit',["require", "exports", 'aurelia-framework', "aurelia-dialog"], function (require, exports, aurelia_framework_1, aurelia_dialog_1) {
    "use strict";
    var EditCustomer = (function () {
        function EditCustomer(controller) {
            this.controller = controller;
            this.errors = false;
        }
        EditCustomer.prototype.activate = function (customer) {
            this.customer = _.clone(customer);
        };
        EditCustomer.prototype.save = function () {
            this.errors = false;
            if (!this.customer.name) {
                this.errors = true;
            }
            this.controller.ok(this.customer);
        };
        EditCustomer = __decorate([
            aurelia_framework_1.autoinject(), 
            __metadata('design:paramtypes', [aurelia_dialog_1.DialogController])
        ], EditCustomer);
        return EditCustomer;
    }());
    exports.EditCustomer = EditCustomer;
});

var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
define('resources/views/customers/list',["require", "exports", 'aurelia-framework', 'aurelia-binding', 'aurelia-dialog', '../controls/prompt', './edit', "../../services/data/customer-service", "../../services/notifications"], function (require, exports, aurelia_framework_1, aurelia_binding_1, aurelia_dialog_1, prompt_1, edit_1, customer_service_1, notifications_1) {
    "use strict";
    var CustomerList = (function () {
        function CustomerList(customerService, dialogService) {
            this.customerService = customerService;
            this.dialogService = dialogService;
            this.search = '';
        }
        CustomerList.prototype.refresh = function () {
            var _this = this;
            this.customerService.getAll()
                .then(function (result) {
                _this.allCustomers = result;
            })
                .catch(notifications_1.Notifications.error);
        };
        CustomerList.prototype.attached = function () {
            this.refresh();
        };
        Object.defineProperty(CustomerList.prototype, "customers", {
            get: function () {
                var _this = this;
                if (!this.search)
                    return this.allCustomers;
                return this.allCustomers.filter(function (c) {
                    return c.name.toLowerCase().indexOf(_this.search.toLowerCase()) !== -1;
                });
            },
            enumerable: true,
            configurable: true
        });
        CustomerList.prototype.delete = function (customer) {
            var _this = this;
            this.dialogService.open({ viewModel: prompt_1.Prompt, model: 'Are you sure you want to delete this Customer?' })
                .then(function (result) {
                if (result.wasCancelled)
                    return;
                _this.customerService.delete(customer)
                    .then(function () {
                    notifications_1.Notifications.success('Customer deleted successfully');
                    _this.refresh();
                })
                    .catch(notifications_1.Notifications.error);
            });
        };
        CustomerList.prototype.edit = function (customer) {
            var _this = this;
            this.dialogService.open({ viewModel: edit_1.EditCustomer, model: customer })
                .then(function (result) {
                if (result.wasCancelled)
                    return;
                _this.customerService.save(result.output)
                    .then(function () {
                    notifications_1.Notifications.success('Customer saved successfully');
                    _this.refresh();
                })
                    .catch(notifications_1.Notifications.error);
            });
        };
        __decorate([
            aurelia_binding_1.computedFrom('search', 'allCustomers'), 
            __metadata('design:type', Object)
        ], CustomerList.prototype, "customers", null);
        CustomerList = __decorate([
            aurelia_framework_1.autoinject(), 
            __metadata('design:paramtypes', [customer_service_1.CustomerService, aurelia_dialog_1.DialogService])
        ], CustomerList);
        return CustomerList;
    }());
    exports.CustomerList = CustomerList;
});

var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
define('resources/views/jobs/close-job',["require", "exports", 'aurelia-framework'], function (require, exports, aurelia_framework_1) {
    "use strict";
    var CloseJobArgs = (function () {
        function CloseJobArgs() {
        }
        CloseJobArgs.ShowModalEvent = 'show-close-job';
        CloseJobArgs.ModalApprovedEvent = 'close-job-approved';
        return CloseJobArgs;
    }());
    exports.CloseJobArgs = CloseJobArgs;
    var CloseJob = (function () {
        function CloseJob() {
        }
        __decorate([
            aurelia_framework_1.bindable, 
            __metadata('design:type', CloseJobArgs)
        ], CloseJob.prototype, "args", void 0);
        return CloseJob;
    }());
    exports.CloseJob = CloseJob;
});

var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
define('resources/views/jobs/detail',["require", "exports", "aurelia-framework", "aurelia-router", 'aurelia-dialog', '../controls/prompt', '../../services/data/job-service', '../../services/data/customer-service', '../../services/notifications', '../../models/job', '../../models/customer', '../../models/job-type', '../../models/job-status', "../../models/billing-type", "../../models/work-type", "../../services/auth"], function (require, exports, aurelia_framework_1, aurelia_router_1, aurelia_dialog_1, prompt_1, job_service_1, customer_service_1, notifications_1, job_1, customer_1, job_type_1, job_status_1, billing_type_1, work_type_1, auth_1) {
    "use strict";
    var EditJob = (function () {
        function EditJob(element, router, jobService, customerService, auth, dialogService) {
            var _this = this;
            this.element = element;
            this.router = router;
            this.jobService = jobService;
            this.customerService = customerService;
            this.dialogService = dialogService;
            this.jobTypes = job_type_1.JobType.OPTIONS;
            this.jobStatuses = job_status_1.JobStatus.OPTIONS;
            this.billingTypes = billing_type_1.BillingType.OPTIONS;
            this.workTypes = work_type_1.WorkType.OPTIONS;
            this.isFollowup = false;
            this.canEditManHours = false;
            this.canEditManHours = auth.isInRole(auth_1.Roles.OfficeAdmin);
            this.customerServicePromise = customerService.getAll()
                .then(function (customers) { return _this.customers = customers; })
                .catch(notifications_1.Notifications.error);
        }
        EditJob.prototype.activate = function (params, routeConfig) {
            var _this = this;
            this.routeConfig = routeConfig;
            this.customerServicePromise.then(function () {
                var id = params.id;
                if (_.isUndefined(id)) {
                    _this.job = new job_1.JobDocument();
                    if (_.isString(params.type)) {
                        _this.job.type = params.type;
                    }
                    if (params.from) {
                        _this.jobService.getOne(params.from)
                            .then(function (prev) {
                            _this.isFollowup = true;
                            _this.job.customer = prev.customer;
                        });
                    }
                }
                else {
                    _this.jobService.getOne(id)
                        .then(function (job) {
                        _this.job = job;
                        if (_.isDate(job.startDate)) {
                            $('.calendar.start', _this.element).calendar('set date', job.startDate);
                        }
                        if (_.isDate(job.endDate)) {
                            $('.calendar.end', _this.element).calendar('set date', job.endDate);
                        }
                        if (job.customer) {
                            $('.customer', _this.element).dropdown('set selected', job.customer.name);
                            $('.customer', _this.element).dropdown('set value', job.customer._id);
                        }
                        if (job.status) {
                            $('#status', _this.element).dropdown('set selected', job.status);
                            $('#status', _this.element).dropdown('set value', job.status);
                        }
                    })
                        .catch(function (err) {
                        notifications_1.Notifications.error(err);
                        _this.router.navigateToRoute('jobs.list');
                    });
                }
            });
        };
        EditJob.prototype.attached = function () {
            var _this = this;
            $('.dropdown.customer', this.element).dropdown({
                allowAdditions: true,
                hideAdditions: false,
                fullTextSearch: 'exact',
                match: 'text',
                onChange: function (value) {
                    _this.job.customer = _.find(_this.customers, function (c) { return c._id === value; });
                    if (!_this.job.customer) {
                        _this.job.customer = new customer_1.CustomerDocument();
                        _this.job.customer.name = value;
                    }
                }
            });
            $('.dropdown.basic.button', this.element).dropdown();
            $('#status', this.element).dropdown();
            $('#billingType', this.element).dropdown();
            $('#workType', this.element).dropdown();
            $('.calendar.start', this.element).calendar({
                type: 'date',
                onChange: function (date) { return _this.job.startDate = moment(date).toDate(); }
            });
            $('.calendar.end', this.element).calendar({
                type: 'date',
                onChange: function (date) { return _this.job.endDate = moment(date).toDate(); }
            });
            var $buttonBar = $('.button-bar', this.element);
            $buttonBar.visibility({
                once: false,
                onBottomPassed: function () {
                    $buttonBar.addClass('fixed top');
                },
                onBottomPassedReverse: function () {
                    $buttonBar.removeClass('fixed top');
                }
            });
        };
        EditJob.prototype.detached = function () {
            $('.dropdown.activity', this.element).dropdown('destroy');
            $('#status', this.element).dropdown('destroy');
            $('#billingType', this.element).dropdown('destroy');
            $('#workType', this.element).dropdown('destroy');
            $('.calendar.start', this.element).calendar('destroy');
            $('.calendar.end', this.element).calendar('destroy');
            $('.button-bar', this.element).visibility('destroy');
            $('.dropdown.basic.button', this.element).dropdown('destroy');
        };
        Object.defineProperty(EditJob.prototype, "customer_id", {
            get: function () {
                return (this.job && this.job.customer) ? this.job.customer._id : null;
            },
            set: function (value) {
                var customer = _.findWhere(this.customers, { _id: value });
                if (customer) {
                    this.job.customer = customer;
                }
            },
            enumerable: true,
            configurable: true
        });
        EditJob.prototype.onIsMultiDayChange = function () {
            if (this.job.isMultiDay) {
                $('#days', this.element).focus();
            }
            else {
                this.job.days = null;
            }
        };
        EditJob.prototype.onSaveClick = function () {
            var _this = this;
            if (this.customer_id) {
                this.saveJob();
            }
            else {
                this.saveCustomer(this.job.customer)
                    .then(function (customer) {
                    _this.job.customer = customer;
                    _this.saveJob();
                })
                    .catch(notifications_1.Notifications.error);
            }
        };
        EditJob.prototype.onDeleteClick = function () {
            var _this = this;
            this.dialogService.open({ viewModel: prompt_1.Prompt, model: 'Are you sure you want to delete this job?' })
                .then(function (result) {
                if (result.wasCancelled)
                    return;
                _this.jobService.delete(_this.job.toJSON())
                    .then(function () {
                    notifications_1.Notifications.success('Job Deleted');
                    _this.router.navigateToRoute('jobs.list');
                })
                    .catch(notifications_1.Notifications.error);
            });
        };
        EditJob.prototype.saveJob = function () {
            var _this = this;
            return this.jobService.save(this.job.toJSON())
                .then(function () {
                notifications_1.Notifications.success('Job Saved');
                _this.router.navigateToRoute('jobs.list');
            })
                .catch(function (err) {
                notifications_1.Notifications.error(err);
            });
        };
        EditJob.prototype.saveCustomer = function (customer) {
            return this.customerService.create(customer.toJSON());
        };
        EditJob = __decorate([
            aurelia_framework_1.autoinject(), 
            __metadata('design:paramtypes', [Element, aurelia_router_1.Router, job_service_1.JobService, customer_service_1.CustomerService, auth_1.Authentication, aurelia_dialog_1.DialogService])
        ], EditJob);
        return EditJob;
    }());
    exports.EditJob = EditJob;
});

var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
define('resources/views/jobs/list-item',["require", "exports", 'aurelia-framework', 'aurelia-event-aggregator', "../../models/job-status", "../../models/job-type", "../../models/foreman", "../../services/data/job-service", "../../services/notifications", '../../services/auth', './close-job'], function (require, exports, aurelia_framework_1, aurelia_event_aggregator_1, job_status_1, job_type_1, foreman_1, job_service_1, notifications_1, auth_1, close_job_1) {
    "use strict";
    var ListItem = (function () {
        function ListItem(element, jobService, auth, events) {
            this.element = element;
            this.jobService = jobService;
            this.auth = auth;
            this.events = events;
            this.expanded = false;
            this.foremen = foreman_1.Foreman.OPTIONS;
            this.jobStatuses = job_status_1.JobStatus.OPTIONS;
            if (!this.auth.isInRole(auth_1.Roles.OfficeAdmin)) {
                var close = _.findIndex(this.jobStatuses, function (status) { return status.id === job_status_1.JobStatus.CLOSED; });
                if (close !== -1) {
                    this.jobStatuses.splice(close, 1);
                }
            }
        }
        ListItem.prototype.attached = function () {
            this.jobManHoursSubscription = this.events.subscribe(close_job_1.CloseJobArgs.ModalApprovedEvent, this.onJobManHoursChanged.bind(this));
            $('.dropdown.status', this.element).dropdown({
                onChange: this.onStatusChanged.bind(this)
            });
            $('.dropdown.foreman', this.element).dropdown({
                onChange: this.onForemanChanged.bind(this)
            });
        };
        ListItem.prototype.detached = function () {
            $('.dropdown.status', this.element).dropdown('destroy');
            $('.dropdown.foreman', this.element).dropdown('destroy');
        };
        ListItem.prototype.toggleExpanded = function () {
            this.expanded = !this.expanded;
        };
        Object.defineProperty(ListItem.prototype, "startDateDisplay", {
            get: function () {
                var display = 'Not Scheduled';
                if (this.job.startDate) {
                    display = moment(this.job.startDate).format('ddd, MMM Do');
                }
                return display;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(ListItem.prototype, "endDateDisplay", {
            get: function () {
                var display = '';
                if (this.job.endDate) {
                    display = moment(this.job.endDate).format('ddd, MMM Do');
                }
                return display;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(ListItem.prototype, "jobStatus", {
            get: function () {
                var _this = this;
                return _.find(this.jobStatuses, function (s) { return s.id == _this.job.status; });
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(ListItem.prototype, "foremanDisplay", {
            get: function () {
                return this.job.foreman || 'Unassigned';
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(ListItem.prototype, "isPending", {
            get: function () {
                return this.job.status === 'pending';
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(ListItem.prototype, "isInProgress", {
            get: function () {
                return this.job.status === job_status_1.JobStatus.PENDING;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(ListItem.prototype, "isComplete", {
            get: function () {
                return this.job.status === job_status_1.JobStatus.COMPLETE;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(ListItem.prototype, "isClosed", {
            get: function () {
                return this.job.status === job_status_1.JobStatus.CLOSED;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(ListItem.prototype, "isProject", {
            get: function () {
                return this.job.job_type === job_type_1.JobType.PROJECT;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(ListItem.prototype, "isServiceCall", {
            get: function () {
                return this.job.job_type === job_type_1.JobType.SERVICE_CALL;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(ListItem.prototype, "jobNumberDisplay", {
            get: function () {
                var prefix = this.job.job_type === job_type_1.JobType.SERVICE_CALL ? 'S' : 'P';
                return prefix + "-" + this.job.number;
            },
            enumerable: true,
            configurable: true
        });
        ListItem.prototype.onStatusChanged = function (value) {
            var _this = this;
            this.job.status = value;
            this.save('Status')
                .then(function () {
                if (value === job_status_1.JobStatus.CLOSED) {
                    _this.events.publish(close_job_1.CloseJobArgs.ShowModalEvent, _this.job._id);
                }
            });
        };
        ListItem.prototype.onForemanChanged = function (value) {
            this.job.foreman = value;
            this.save('Foreman');
        };
        ListItem.prototype.onJobManHoursChanged = function (args) {
            if (args.jobId === this.job._id) {
                this.job.manHours = parseInt(args.manHours) || 0;
                this.save('Status');
            }
        };
        ListItem.prototype.save = function (field) {
            var _this = this;
            return this.jobService.save(this.job)
                .then(function (response) {
                _this.job._rev = response.rev;
                notifications_1.Notifications.success(field + " updated");
            })
                .catch(notifications_1.Notifications.error);
        };
        __decorate([
            aurelia_framework_1.bindable, 
            __metadata('design:type', Object)
        ], ListItem.prototype, "job", void 0);
        ListItem = __decorate([
            aurelia_framework_1.autoinject(), 
            __metadata('design:paramtypes', [Element, job_service_1.JobService, auth_1.Authentication, aurelia_event_aggregator_1.EventAggregator])
        ], ListItem);
        return ListItem;
    }());
    exports.ListItem = ListItem;
});

var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
define('resources/views/jobs/list',["require", "exports", 'aurelia-framework', 'aurelia-event-aggregator', '../../services/auth', '../../services/log', '../../services/data/db', '../../models/job-type', '../../models/job-status', '../../services/data/job-service', './close-job'], function (require, exports, aurelia_framework_1, aurelia_event_aggregator_1, auth_1, log_1, db_1, job_type_1, job_status_1, job_service_1, close_job_1) {
    "use strict";
    var JobList = (function () {
        function JobList(element, auth, jobService, events) {
            this.element = element;
            this.auth = auth;
            this.jobService = jobService;
            this.events = events;
            this.myJobs = false;
            this.showOpen = true;
            this.showClosed = false;
            this.showCompleted = false;
            this.reverseSort = false;
            this.customerSort = false;
            this.showProjects = true;
            this.showServiceCalls = true;
            this.filtersExpanded = false;
            this.closeJobArgs = new close_job_1.CloseJobArgs;
            this.showCompleted = auth.isInRole(auth_1.Roles.OfficeAdmin);
            this.showClosed = auth.isInRole(auth_1.Roles.OfficeAdmin);
        }
        JobList.prototype.attached = function () {
            var _this = this;
            var that = this;
            $('.modal.close-job', this.element).modal({
                onApprove: function () {
                    _this.events.publish(close_job_1.CloseJobArgs.ModalApprovedEvent, that.closeJobArgs);
                }
            });
            $('.ui.toggle.checkbox', this.element)
                .checkbox({
                onChange: this.filter.bind(this)
            });
            this.showModalSubscription = this.events.subscribe(close_job_1.CloseJobArgs.ShowModalEvent, this.showCloseJobModal.bind(this));
            this.syncChangeSubscription = this.events.subscribe(db_1.Database.SyncChangeEvent, this.refresh.bind(this));
            this.refresh();
        };
        JobList.prototype.detached = function () {
            $('.modal.close-job', this.element).modal('destroy');
            this.showModalSubscription.dispose();
        };
        JobList.prototype.refresh = function () {
            var _this = this;
            this.jobService.getAll()
                .then(function (items) {
                _this.items = items;
                _this.filter();
            });
        };
        JobList.prototype.filter = function () {
            var _this = this;
            var me = this.auth.userInfo().name;
            var mine = function (i) { return !_this.myJobs || i.foreman === me; };
            var open = function (i) { return _this.showOpen && (i.status === job_status_1.JobStatus.PENDING || i.status === job_status_1.JobStatus.IN_PROGRESS); };
            var completed = function (i) { return _this.showCompleted && (i.status == job_status_1.JobStatus.COMPLETE); };
            var closed = function (i) { return _this.showClosed && (i.status === job_status_1.JobStatus.CLOSED); };
            var projects = function (i) { return _this.showProjects && i.job_type == job_type_1.JobType.PROJECT; };
            var serviceCalls = function (i) { return _this.showServiceCalls && i.job_type == job_type_1.JobType.SERVICE_CALL; };
            log_1.log.debug("Only show my jobs: " + this.myJobs);
            log_1.log.debug("Show open jobs: " + this.showOpen);
            log_1.log.debug("Show completed jobs: " + this.showCompleted);
            log_1.log.debug("Show closed jobs: " + this.showClosed);
            log_1.log.debug("Show projects: " + this.showProjects);
            log_1.log.debug("Show service calls: " + this.showServiceCalls);
            var items = _.filter(this.items, function (i) { return mine(i) && (open(i) || closed(i) || completed(i)) && (projects(i) || serviceCalls(i)); }), sortedItems = _.sortBy(items, function (i) {
                if (_this.customerSort) {
                    return (i.customer.name || '').toString().toLowerCase() + i.number;
                }
                return parseInt(i.number);
            });
            if (this.reverseSort) {
                sortedItems.reverse();
            }
            this.filteredItems = sortedItems;
        };
        JobList.prototype.toggleFiltersExpanded = function () {
            this.filtersExpanded = !this.filtersExpanded;
        };
        JobList.prototype.showCloseJobModal = function (id) {
            this.closeJobArgs.jobId = id;
            this.closeJobArgs.manHours = null;
            $('.modal.close-job').modal('show');
        };
        Object.defineProperty(JobList.prototype, "isOwner", {
            get: function () {
                return this.auth.isInRole(auth_1.Roles.Owner);
            },
            enumerable: true,
            configurable: true
        });
        JobList = __decorate([
            aurelia_framework_1.autoinject(), 
            __metadata('design:paramtypes', [Element, auth_1.Authentication, job_service_1.JobService, aurelia_event_aggregator_1.EventAggregator])
        ], JobList);
        return JobList;
    }());
    exports.JobList = JobList;
});

var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
define('resources/views/jobs/new',["require", "exports", "aurelia-framework", "aurelia-router", '../../services/data/job-service', '../../services/data/customer-service', '../../services/notifications', '../../models/job', '../../models/customer', '../../models/job-type', '../../models/job-status', "../../models/billing-type", "../../models/work-type"], function (require, exports, aurelia_framework_1, aurelia_router_1, job_service_1, customer_service_1, notifications_1, job_1, customer_1, job_type_1, job_status_1, billing_type_1, work_type_1) {
    "use strict";
    var NewJob = (function () {
        function NewJob(element, router, jobService, customerService) {
            var _this = this;
            this.element = element;
            this.router = router;
            this.jobService = jobService;
            this.customerService = customerService;
            this.jobTypes = job_type_1.JobType.OPTIONS;
            this.jobStatuses = job_status_1.JobStatus.OPTIONS;
            this.billingTypes = billing_type_1.BillingType.OPTIONS;
            this.workTypes = work_type_1.WorkType.OPTIONS;
            this.isFollowup = false;
            this.job = new job_1.JobDocument();
            customerService.getAll()
                .then(function (customers) { return _this.customers = customers; })
                .catch(notifications_1.Notifications.error);
        }
        NewJob.prototype.activate = function (params, routeConfig) {
            var _this = this;
            routeConfig.title = this.title;
            if (_.isString(params.type)) {
                this.job.type = params.type;
            }
            if (params.from) {
                this.jobService.getOne(params.from)
                    .then(function (prev) {
                    _this.isFollowup = true;
                    _this.job.customer = prev.customer;
                });
            }
        };
        NewJob.prototype.attached = function () {
            var _this = this;
            $('.dropdown.customer', this.element).dropdown({
                allowAdditions: true,
                hideAdditions: false,
                fullTextSearch: true,
                onChange: function (value) {
                    _this.job.customer = _.find(_this.customers, function (c) { return c._id === value; });
                    if (!_this.job.customer) {
                        _this.job.customer = new customer_1.CustomerDocument();
                        _this.job.customer.name = value;
                    }
                    console.log(_this.job.customer);
                }
            });
            $('#status', this.element).dropdown();
            $('#billingType', this.element).dropdown();
            $('#workType', this.element).dropdown();
            $('.calendar.start', this.element).calendar({
                type: 'date',
                onChange: function (date) { return _this.job.startDate = moment(date).toDate(); }
            });
            var $buttonBar = $('.button-bar', this.element);
            $buttonBar.visibility({
                once: false,
                onBottomPassed: function () {
                    $buttonBar.addClass('fixed top');
                },
                onBottomPassedReverse: function () {
                    $buttonBar.removeClass('fixed top');
                }
            });
        };
        NewJob.prototype.detached = function () {
            $('.dropdown.customer', this.element).dropdown('destroy');
            $('#status', this.element).dropdown('destroy');
            $('#billingType', this.element).dropdown('destroy');
            $('#workType', this.element).dropdown('destroy');
            $('.calendar.start', this.element).calendar('destroy');
            $('.button-bar', this.element).visibility('destroy');
        };
        Object.defineProperty(NewJob.prototype, "title", {
            get: function () {
                return 'New Job';
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(NewJob.prototype, "customer_id", {
            get: function () {
                return this.job.customer ? this.job.customer._id : null;
            },
            enumerable: true,
            configurable: true
        });
        NewJob.prototype.onIsMultiDayChange = function () {
            if (this.job.isMultiDay) {
                $('#days', this.element).focus();
            }
            else {
                this.job.days = null;
            }
        };
        NewJob.prototype.onSaveClick = function () {
            var _this = this;
            if (this.customer_id) {
                this.saveJob()
                    .then(function () { return _this.router.navigateToRoute('jobs.list'); });
            }
            else {
                this.saveCustomer(this.job.customer)
                    .then(function (customer) {
                    _this.job.customer = customer;
                    _this.saveJob()
                        .then(function () { return _this.router.navigateToRoute('jobs.list'); });
                })
                    .catch(notifications_1.Notifications.error);
            }
        };
        NewJob.prototype.saveJob = function () {
            return this.jobService.save(this.job.toJSON())
                .then(function () {
                notifications_1.Notifications.success('Job Saved');
            })
                .catch(function (err) {
                notifications_1.Notifications.error(err);
            });
        };
        NewJob.prototype.saveCustomer = function (customer) {
            return this.customerService.create(customer.toJSON());
        };
        NewJob = __decorate([
            aurelia_framework_1.autoinject(), 
            __metadata('design:paramtypes', [Element, aurelia_router_1.Router, job_service_1.JobService, customer_service_1.CustomerService])
        ], NewJob);
        return NewJob;
    }());
    exports.NewJob = NewJob;
});

define('aurelia-dialog/ai-dialog',['exports', 'aurelia-templating'], function (exports, _aureliaTemplating) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.AiDialog = undefined;

  

  var _dec, _dec2, _class;

  var AiDialog = exports.AiDialog = (_dec = (0, _aureliaTemplating.customElement)('ai-dialog'), _dec2 = (0, _aureliaTemplating.inlineView)('\n  <template>\n    <slot></slot>\n  </template>\n'), _dec(_class = _dec2(_class = function AiDialog() {
    
  }) || _class) || _class);
});
define('aurelia-dialog/ai-dialog-header',['exports', 'aurelia-templating', './dialog-controller'], function (exports, _aureliaTemplating, _dialogController) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.AiDialogHeader = undefined;

  

  var _dec, _dec2, _class, _class2, _temp;

  var AiDialogHeader = exports.AiDialogHeader = (_dec = (0, _aureliaTemplating.customElement)('ai-dialog-header'), _dec2 = (0, _aureliaTemplating.inlineView)('\n  <template>\n    <button type="button" class="dialog-close" aria-label="Close" if.bind="!controller.settings.lock" click.trigger="controller.cancel()">\n      <span aria-hidden="true">&times;</span>\n    </button>\n\n    <div class="dialog-header-content">\n      <slot></slot>\n    </div>\n  </template>\n'), _dec(_class = _dec2(_class = (_temp = _class2 = function AiDialogHeader(controller) {
    

    this.controller = controller;
  }, _class2.inject = [_dialogController.DialogController], _temp)) || _class) || _class);
});
define('aurelia-dialog/dialog-controller',['exports', './lifecycle', './dialog-result'], function (exports, _lifecycle, _dialogResult) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.DialogController = undefined;

  

  var DialogController = exports.DialogController = function () {
    function DialogController(renderer, settings, resolve, reject) {
      

      this.renderer = renderer;
      this.settings = settings;
      this._resolve = resolve;
      this._reject = reject;
    }

    DialogController.prototype.ok = function ok(output) {
      return this.close(true, output);
    };

    DialogController.prototype.cancel = function cancel(output) {
      return this.close(false, output);
    };

    DialogController.prototype.error = function error(message) {
      var _this = this;

      return (0, _lifecycle.invokeLifecycle)(this.viewModel, 'deactivate').then(function () {
        return _this.renderer.hideDialog(_this);
      }).then(function () {
        _this.controller.unbind();
        _this._reject(message);
      });
    };

    DialogController.prototype.close = function close(ok, output) {
      var _this2 = this;

      if (this._closePromise) {
        return this._closePromise;
      }

      this._closePromise = (0, _lifecycle.invokeLifecycle)(this.viewModel, 'canDeactivate').then(function (canDeactivate) {
        if (canDeactivate) {
          return (0, _lifecycle.invokeLifecycle)(_this2.viewModel, 'deactivate').then(function () {
            return _this2.renderer.hideDialog(_this2);
          }).then(function () {
            var result = new _dialogResult.DialogResult(!ok, output);
            _this2.controller.unbind();
            _this2._resolve(result);
            return result;
          });
        }

        _this2._closePromise = undefined;
      }, function (e) {
        _this2._closePromise = undefined;
        return Promise.reject(e);
      });

      return this._closePromise;
    };

    return DialogController;
  }();
});
define('aurelia-dialog/lifecycle',['exports'], function (exports) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.invokeLifecycle = invokeLifecycle;
  function invokeLifecycle(instance, name, model) {
    if (typeof instance[name] === 'function') {
      var result = instance[name](model);

      if (result instanceof Promise) {
        return result;
      }

      if (result !== null && result !== undefined) {
        return Promise.resolve(result);
      }

      return Promise.resolve(true);
    }

    return Promise.resolve(true);
  }
});
define('aurelia-dialog/dialog-result',["exports"], function (exports) {
  "use strict";

  Object.defineProperty(exports, "__esModule", {
    value: true
  });

  

  var DialogResult = exports.DialogResult = function DialogResult(cancelled, output) {
    

    this.wasCancelled = false;

    this.wasCancelled = cancelled;
    this.output = output;
  };
});
define('aurelia-dialog/ai-dialog-body',['exports', 'aurelia-templating'], function (exports, _aureliaTemplating) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.AiDialogBody = undefined;

  

  var _dec, _dec2, _class;

  var AiDialogBody = exports.AiDialogBody = (_dec = (0, _aureliaTemplating.customElement)('ai-dialog-body'), _dec2 = (0, _aureliaTemplating.inlineView)('\n  <template>\n    <slot></slot>\n  </template>\n'), _dec(_class = _dec2(_class = function AiDialogBody() {
    
  }) || _class) || _class);
});
define('aurelia-dialog/ai-dialog-footer',['exports', 'aurelia-templating', './dialog-controller'], function (exports, _aureliaTemplating, _dialogController) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.AiDialogFooter = undefined;

  function _initDefineProp(target, property, descriptor, context) {
    if (!descriptor) return;
    Object.defineProperty(target, property, {
      enumerable: descriptor.enumerable,
      configurable: descriptor.configurable,
      writable: descriptor.writable,
      value: descriptor.initializer ? descriptor.initializer.call(context) : void 0
    });
  }

  

  function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) {
    var desc = {};
    Object['ke' + 'ys'](descriptor).forEach(function (key) {
      desc[key] = descriptor[key];
    });
    desc.enumerable = !!desc.enumerable;
    desc.configurable = !!desc.configurable;

    if ('value' in desc || desc.initializer) {
      desc.writable = true;
    }

    desc = decorators.slice().reverse().reduce(function (desc, decorator) {
      return decorator(target, property, desc) || desc;
    }, desc);

    if (context && desc.initializer !== void 0) {
      desc.value = desc.initializer ? desc.initializer.call(context) : void 0;
      desc.initializer = undefined;
    }

    if (desc.initializer === void 0) {
      Object['define' + 'Property'](target, property, desc);
      desc = null;
    }

    return desc;
  }

  function _initializerWarningHelper(descriptor, context) {
    throw new Error('Decorating class property failed. Please ensure that transform-class-properties is enabled.');
  }

  var _dec, _dec2, _class, _desc, _value, _class2, _descriptor, _descriptor2, _class3, _temp;

  var AiDialogFooter = exports.AiDialogFooter = (_dec = (0, _aureliaTemplating.customElement)('ai-dialog-footer'), _dec2 = (0, _aureliaTemplating.inlineView)('\n  <template>\n    <slot></slot>\n\n    <template if.bind="buttons.length > 0">\n      <button type="button" class="btn btn-default" repeat.for="button of buttons" click.trigger="close(button)">${button}</button>\n    </template>\n  </template>\n'), _dec(_class = _dec2(_class = (_class2 = (_temp = _class3 = function () {
    function AiDialogFooter(controller) {
      

      _initDefineProp(this, 'buttons', _descriptor, this);

      _initDefineProp(this, 'useDefaultButtons', _descriptor2, this);

      this.controller = controller;
    }

    AiDialogFooter.prototype.close = function close(buttonValue) {
      if (AiDialogFooter.isCancelButton(buttonValue)) {
        this.controller.cancel(buttonValue);
      } else {
        this.controller.ok(buttonValue);
      }
    };

    AiDialogFooter.prototype.useDefaultButtonsChanged = function useDefaultButtonsChanged(newValue) {
      if (newValue) {
        this.buttons = ['Cancel', 'Ok'];
      }
    };

    AiDialogFooter.isCancelButton = function isCancelButton(value) {
      return value === 'Cancel';
    };

    return AiDialogFooter;
  }(), _class3.inject = [_dialogController.DialogController], _temp), (_descriptor = _applyDecoratedDescriptor(_class2.prototype, 'buttons', [_aureliaTemplating.bindable], {
    enumerable: true,
    initializer: function initializer() {
      return [];
    }
  }), _descriptor2 = _applyDecoratedDescriptor(_class2.prototype, 'useDefaultButtons', [_aureliaTemplating.bindable], {
    enumerable: true,
    initializer: function initializer() {
      return false;
    }
  })), _class2)) || _class) || _class);
});
define('aurelia-dialog/attach-focus',['exports', 'aurelia-templating'], function (exports, _aureliaTemplating) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.AttachFocus = undefined;

  

  var _dec, _class, _class2, _temp;

  var AttachFocus = exports.AttachFocus = (_dec = (0, _aureliaTemplating.customAttribute)('attach-focus'), _dec(_class = (_temp = _class2 = function () {
    function AttachFocus(element) {
      

      this.value = true;

      this.element = element;
    }

    AttachFocus.prototype.attached = function attached() {
      if (this.value && this.value !== 'false') {
        this.element.focus();
      }
    };

    AttachFocus.prototype.valueChanged = function valueChanged(newValue) {
      this.value = newValue;
    };

    return AttachFocus;
  }(), _class2.inject = [Element], _temp)) || _class);
});
define('aurelia-dialog/dialog-configuration',['exports', './renderer', './dialog-renderer', './dialog-options', 'aurelia-pal'], function (exports, _renderer, _dialogRenderer, _dialogOptions, _aureliaPal) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.DialogConfiguration = undefined;

  

  var defaultRenderer = _dialogRenderer.DialogRenderer;

  var resources = {
    'ai-dialog': './ai-dialog',
    'ai-dialog-header': './ai-dialog-header',
    'ai-dialog-body': './ai-dialog-body',
    'ai-dialog-footer': './ai-dialog-footer',
    'attach-focus': './attach-focus'
  };

  var defaultCSSText = 'ai-dialog-container,ai-dialog-overlay{position:fixed;top:0;right:0;bottom:0;left:0}ai-dialog-overlay{opacity:0}ai-dialog-overlay.active{opacity:1}ai-dialog-container{display:block;transition:opacity .2s linear;opacity:0;overflow-x:hidden;overflow-y:auto;-webkit-overflow-scrolling:touch}ai-dialog-container.active{opacity:1}ai-dialog-container>div{padding:30px}ai-dialog-container>div>div{display:block;min-width:300px;width:-moz-fit-content;width:-webkit-fit-content;width:fit-content;height:-moz-fit-content;height:-webkit-fit-content;height:fit-content;margin:auto}ai-dialog-container,ai-dialog-container>div,ai-dialog-container>div>div{outline:0}ai-dialog{display:table;box-shadow:0 5px 15px rgba(0,0,0,.5);border:1px solid rgba(0,0,0,.2);border-radius:5px;padding:3;min-width:300px;width:-moz-fit-content;width:-webkit-fit-content;width:fit-content;height:-moz-fit-content;height:-webkit-fit-content;height:fit-content;margin:auto;border-image-source:initial;border-image-slice:initial;border-image-width:initial;border-image-outset:initial;border-image-repeat:initial;background:#fff}ai-dialog>ai-dialog-header{display:block;padding:16px;border-bottom:1px solid #e5e5e5}ai-dialog>ai-dialog-header>button{float:right;border:none;display:block;width:32px;height:32px;background:0 0;font-size:22px;line-height:16px;margin:-14px -16px 0 0;padding:0;cursor:pointer}ai-dialog>ai-dialog-body{display:block;padding:16px}ai-dialog>ai-dialog-footer{display:block;padding:6px;border-top:1px solid #e5e5e5;text-align:right}ai-dialog>ai-dialog-footer button{color:#333;background-color:#fff;padding:6px 12px;font-size:14px;text-align:center;white-space:nowrap;vertical-align:middle;-ms-touch-action:manipulation;touch-action:manipulation;cursor:pointer;background-image:none;border:1px solid #ccc;border-radius:4px;margin:5px 0 5px 5px}ai-dialog>ai-dialog-footer button:disabled{cursor:default;opacity:.45}ai-dialog>ai-dialog-footer button:hover:enabled{color:#333;background-color:#e6e6e6;border-color:#adadad}.ai-dialog-open{overflow:hidden}';

  var DialogConfiguration = exports.DialogConfiguration = function () {
    function DialogConfiguration(aurelia) {
      

      this.aurelia = aurelia;
      this.settings = _dialogOptions.dialogOptions;
      this.resources = [];
      this.cssText = defaultCSSText;
      this.renderer = defaultRenderer;
    }

    DialogConfiguration.prototype.useDefaults = function useDefaults() {
      return this.useRenderer(defaultRenderer).useCSS(defaultCSSText).useStandardResources();
    };

    DialogConfiguration.prototype.useStandardResources = function useStandardResources() {
      return this.useResource('ai-dialog').useResource('ai-dialog-header').useResource('ai-dialog-body').useResource('ai-dialog-footer').useResource('attach-focus');
    };

    DialogConfiguration.prototype.useResource = function useResource(resourceName) {
      this.resources.push(resourceName);
      return this;
    };

    DialogConfiguration.prototype.useRenderer = function useRenderer(renderer, settings) {
      this.renderer = renderer;
      this.settings = Object.assign(this.settings, settings || {});
      return this;
    };

    DialogConfiguration.prototype.useCSS = function useCSS(cssText) {
      this.cssText = cssText;
      return this;
    };

    DialogConfiguration.prototype._apply = function _apply() {
      var _this = this;

      this.aurelia.transient(_renderer.Renderer, this.renderer);
      this.resources.forEach(function (resourceName) {
        return _this.aurelia.globalResources(resources[resourceName]);
      });

      if (this.cssText) {
        _aureliaPal.DOM.injectStyles(this.cssText);
      }
    };

    return DialogConfiguration;
  }();
});
define('aurelia-dialog/renderer',['exports'], function (exports) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });

  

  var Renderer = exports.Renderer = function () {
    function Renderer() {
      
    }

    Renderer.prototype.getDialogContainer = function getDialogContainer() {
      throw new Error('DialogRenderer must implement getDialogContainer().');
    };

    Renderer.prototype.showDialog = function showDialog(dialogController) {
      throw new Error('DialogRenderer must implement showDialog().');
    };

    Renderer.prototype.hideDialog = function hideDialog(dialogController) {
      throw new Error('DialogRenderer must implement hideDialog().');
    };

    return Renderer;
  }();
});
define('aurelia-dialog/dialog-renderer',['exports', 'aurelia-pal', 'aurelia-dependency-injection'], function (exports, _aureliaPal, _aureliaDependencyInjection) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.DialogRenderer = undefined;

  

  var _dec, _class;

  var containerTagName = 'ai-dialog-container';
  var overlayTagName = 'ai-dialog-overlay';
  var transitionEvent = function () {
    var transition = null;

    return function () {
      if (transition) return transition;

      var t = void 0;
      var el = _aureliaPal.DOM.createElement('fakeelement');
      var transitions = {
        'transition': 'transitionend',
        'OTransition': 'oTransitionEnd',
        'MozTransition': 'transitionend',
        'WebkitTransition': 'webkitTransitionEnd'
      };
      for (t in transitions) {
        if (el.style[t] !== undefined) {
          transition = transitions[t];
          return transition;
        }
      }
    };
  }();

  var DialogRenderer = exports.DialogRenderer = (_dec = (0, _aureliaDependencyInjection.transient)(), _dec(_class = function () {
    function DialogRenderer() {
      var _this = this;

      

      this._escapeKeyEventHandler = function (e) {
        if (e.keyCode === 27) {
          var top = _this._dialogControllers[_this._dialogControllers.length - 1];
          if (top && top.settings.lock !== true) {
            top.cancel();
          }
        }
      };
    }

    DialogRenderer.prototype.getDialogContainer = function getDialogContainer() {
      return _aureliaPal.DOM.createElement('div');
    };

    DialogRenderer.prototype.showDialog = function showDialog(dialogController) {
      var _this2 = this;

      var settings = dialogController.settings;
      var body = _aureliaPal.DOM.querySelectorAll('body')[0];
      var wrapper = document.createElement('div');

      this.modalOverlay = _aureliaPal.DOM.createElement(overlayTagName);
      this.modalContainer = _aureliaPal.DOM.createElement(containerTagName);
      this.anchor = dialogController.slot.anchor;
      wrapper.appendChild(this.anchor);
      this.modalContainer.appendChild(wrapper);

      this.stopPropagation = function (e) {
        e._aureliaDialogHostClicked = true;
      };
      this.closeModalClick = function (e) {
        if (!settings.lock && !e._aureliaDialogHostClicked) {
          dialogController.cancel();
        } else {
          return false;
        }
      };

      dialogController.centerDialog = function () {
        if (settings.centerHorizontalOnly) return;
        centerDialog(_this2.modalContainer);
      };

      this.modalOverlay.style.zIndex = settings.startingZIndex;
      this.modalContainer.style.zIndex = settings.startingZIndex;

      var lastContainer = Array.from(body.querySelectorAll(containerTagName)).pop();

      if (lastContainer) {
        lastContainer.parentNode.insertBefore(this.modalContainer, lastContainer.nextSibling);
        lastContainer.parentNode.insertBefore(this.modalOverlay, lastContainer.nextSibling);
      } else {
        body.insertBefore(this.modalContainer, body.firstChild);
        body.insertBefore(this.modalOverlay, body.firstChild);
      }

      if (!this._dialogControllers.length) {
        _aureliaPal.DOM.addEventListener('keyup', this._escapeKeyEventHandler);
      }

      this._dialogControllers.push(dialogController);

      dialogController.slot.attached();

      if (typeof settings.position === 'function') {
        settings.position(this.modalContainer, this.modalOverlay);
      } else {
        dialogController.centerDialog();
      }

      this.modalContainer.addEventListener('click', this.closeModalClick);
      this.anchor.addEventListener('click', this.stopPropagation);

      return new Promise(function (resolve) {
        var renderer = _this2;
        if (settings.ignoreTransitions) {
          resolve();
        } else {
          _this2.modalContainer.addEventListener(transitionEvent(), onTransitionEnd);
        }

        _this2.modalOverlay.classList.add('active');
        _this2.modalContainer.classList.add('active');
        body.classList.add('ai-dialog-open');

        function onTransitionEnd(e) {
          if (e.target !== renderer.modalContainer) {
            return;
          }
          renderer.modalContainer.removeEventListener(transitionEvent(), onTransitionEnd);
          resolve();
        }
      });
    };

    DialogRenderer.prototype.hideDialog = function hideDialog(dialogController) {
      var _this3 = this;

      var settings = dialogController.settings;
      var body = _aureliaPal.DOM.querySelectorAll('body')[0];

      this.modalContainer.removeEventListener('click', this.closeModalClick);
      this.anchor.removeEventListener('click', this.stopPropagation);

      var i = this._dialogControllers.indexOf(dialogController);
      if (i !== -1) {
        this._dialogControllers.splice(i, 1);
      }

      if (!this._dialogControllers.length) {
        _aureliaPal.DOM.removeEventListener('keyup', this._escapeKeyEventHandler);
      }

      return new Promise(function (resolve) {
        var renderer = _this3;
        if (settings.ignoreTransitions) {
          resolve();
        } else {
          _this3.modalContainer.addEventListener(transitionEvent(), onTransitionEnd);
        }

        _this3.modalOverlay.classList.remove('active');
        _this3.modalContainer.classList.remove('active');

        function onTransitionEnd() {
          renderer.modalContainer.removeEventListener(transitionEvent(), onTransitionEnd);
          resolve();
        }
      }).then(function () {
        body.removeChild(_this3.modalOverlay);
        body.removeChild(_this3.modalContainer);
        dialogController.slot.detached();

        if (!_this3._dialogControllers.length) {
          body.classList.remove('ai-dialog-open');
        }

        return Promise.resolve();
      });
    };

    return DialogRenderer;
  }()) || _class);


  DialogRenderer.prototype._dialogControllers = [];

  function centerDialog(modalContainer) {
    var child = modalContainer.children[0];
    var vh = Math.max(_aureliaPal.DOM.querySelectorAll('html')[0].clientHeight, window.innerHeight || 0);

    child.style.marginTop = Math.max((vh - child.offsetHeight) / 2, 30) + 'px';
    child.style.marginBottom = Math.max((vh - child.offsetHeight) / 2, 30) + 'px';
  }
});
define('aurelia-dialog/dialog-options',["exports"], function (exports) {
  "use strict";

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  var dialogOptions = exports.dialogOptions = {
    lock: true,
    centerHorizontalOnly: false,
    startingZIndex: 1000,
    ignoreTransitions: false
  };
});
define('aurelia-dialog/dialog-service',['exports', 'aurelia-metadata', 'aurelia-dependency-injection', 'aurelia-templating', './dialog-controller', './renderer', './lifecycle', './dialog-result', './dialog-options'], function (exports, _aureliaMetadata, _aureliaDependencyInjection, _aureliaTemplating, _dialogController, _renderer, _lifecycle, _dialogResult, _dialogOptions) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.DialogService = undefined;

  

  var _class, _temp;

  var DialogService = exports.DialogService = (_temp = _class = function () {
    function DialogService(container, compositionEngine) {
      

      this.container = container;
      this.compositionEngine = compositionEngine;
      this.controllers = [];
      this.hasActiveDialog = false;
    }

    DialogService.prototype.open = function open(settings) {
      return this.openAndYieldController(settings).then(function (controller) {
        return controller.result;
      });
    };

    DialogService.prototype.openAndYieldController = function openAndYieldController(settings) {
      var _this = this;

      var childContainer = this.container.createChild();
      var dialogController = void 0;
      var promise = new Promise(function (resolve, reject) {
        dialogController = new _dialogController.DialogController(childContainer.get(_renderer.Renderer), _createSettings(settings), resolve, reject);
      });
      childContainer.registerInstance(_dialogController.DialogController, dialogController);
      dialogController.result = promise;
      dialogController.result.then(function () {
        _removeController(_this, dialogController);
      }, function () {
        _removeController(_this, dialogController);
      });
      return _openDialog(this, childContainer, dialogController).then(function () {
        return dialogController;
      });
    };

    return DialogService;
  }(), _class.inject = [_aureliaDependencyInjection.Container, _aureliaTemplating.CompositionEngine], _temp);


  function _createSettings(settings) {
    settings = Object.assign({}, _dialogOptions.dialogOptions, settings);
    settings.startingZIndex = _dialogOptions.dialogOptions.startingZIndex;
    return settings;
  }

  function _openDialog(service, childContainer, dialogController) {
    var host = dialogController.renderer.getDialogContainer();
    var instruction = {
      container: service.container,
      childContainer: childContainer,
      model: dialogController.settings.model,
      view: dialogController.settings.view,
      viewModel: dialogController.settings.viewModel,
      viewSlot: new _aureliaTemplating.ViewSlot(host, true),
      host: host
    };

    return _getViewModel(instruction, service.compositionEngine).then(function (returnedInstruction) {
      dialogController.viewModel = returnedInstruction.viewModel;
      dialogController.slot = returnedInstruction.viewSlot;

      return (0, _lifecycle.invokeLifecycle)(dialogController.viewModel, 'canActivate', dialogController.settings.model).then(function (canActivate) {
        if (canActivate) {
          return service.compositionEngine.compose(returnedInstruction).then(function (controller) {
            service.controllers.push(dialogController);
            service.hasActiveDialog = !!service.controllers.length;
            dialogController.controller = controller;
            dialogController.view = controller.view;

            return dialogController.renderer.showDialog(dialogController);
          });
        }
      });
    });
  }

  function _getViewModel(instruction, compositionEngine) {
    if (typeof instruction.viewModel === 'function') {
      instruction.viewModel = _aureliaMetadata.Origin.get(instruction.viewModel).moduleId;
    }

    if (typeof instruction.viewModel === 'string') {
      return compositionEngine.ensureViewModel(instruction);
    }

    return Promise.resolve(instruction);
  }

  function _removeController(service, controller) {
    var i = service.controllers.indexOf(controller);
    if (i !== -1) {
      service.controllers.splice(i, 1);
      service.hasActiveDialog = !!service.controllers.length;
    }
  }
});
define('text!resources/views/app.html', ['module'], function(module) { module.exports = "<template>\n  <require from=\"styles/styles.css\"></require>\n  <require from=\"./controls/nav-bar\"></require>\n\n  <nav-bar router.bind=\"router\"></nav-bar>\n\n  <div class=\"ui main container\">\n    <router-view></router-view>\n  </div>\n</template>\n"; });
define('text!styles/customer-list.css', ['module'], function(module) { module.exports = "#customer-list .ui.header {\n  margin-bottom: 0;\n}\n"; });
define('text!resources/views/login.html', ['module'], function(module) { module.exports = "<template>\n  <require from=\"styles/login.css\"></require>\n  <div class=\"login-form ui middle aligned center aligned grid\">\n    <div class=\"column\">\n      <h2 class=\"ui blue image header\">\n        <img src=\"/images/logo.png\" class=\"image\">\n        Langendoen Mechanical Job Management Site\n      </h2>\n      <form class=\"ui large form ${errorMessage ? 'error' : ''}\" submit.trigger=\"login($event)\" method=\"post\"\n            novalidate>\n        <div class=\"ui stacked segment\">\n          <div class=\"field\">\n            <div class=\"ui left icon input\">\n              <i class=\"user icon\"></i>\n              <input id=\"username\" name=\"username\" type=\"text\" value.bind=\"username\" placeholder=\"User Name\" required>\n            </div>\n          </div>\n          <div class=\"field\">\n            <div class=\"ui left icon input\">\n              <i class=\"lock icon\"></i>\n              <input id=\"password\" name=\"password\" type=\"password\" value.bind=\"password\" placeholder=\"Password\"\n                     required>\n            </div>\n          </div>\n          <input class=\"ui fluid large blue submit button\" type=\"submit\" value=\"Login\" submit.trigger=\"cancel($event)\">\n          <div class=\"ui error message\" show.bind=\"errorMessage\">\n            <ul class=\"list\">\n              <li>\n                ${errorMessage}\n              </li>\n            </ul>\n          </div>\n        </div>\n      </form>\n    </div>\n  </div>\n</template>\n"; });
define('text!styles/edit-customer-dialog.css', ['module'], function(module) { module.exports = "form[name=edit-customer-dialog] {\n  min-width: 500px;\n}\n"; });
define('text!resources/views/controls/nav-bar.html', ['module'], function(module) { module.exports = "<template>\n    <div id=\"main-menu\" class=\"ui inverted segment\">\n        <div class=\"ui container\">\n            <div class=\"ui large secondary inverted pointing menu\">\n                <a href=\"#\" class=\"item logo-item\">\n                    <img src=\"images/logo.png\" alt=\"Logo\" class=\"logo\">\n                    <span>Langendoen Mechanical</span>\n                </a>\n                <a repeat.for=\"item of router.navigation\" href.bind=\"item.href\" class=\"item ${item.isActive ? 'active' : ''} ${item.settings.hideMobile ? 'hide-mobile' : ''}\">\n                    <i if.bind=\"item.settings.icon\" class=\"icon ${item.settings.icon}\"></i>\n                    ${item.title}\n                </a>\n                <a class=\"item hide-mobile\" click.delegate=\"downloadCsv()\">\n                  <i class=\"cloud download icon\"></i>\n                  Export\n                </a>\n                <div class=\"ui right dropdown item\">\n                    ${userName}\n                    <i class=\"dropdown icon\"></i>\n                    <div class=\"menu\">\n                        <button class=\"item\" click.trigger=\"logout()\">Logout</button>\n                    </div>\n                </div>\n            </div>\n        </div>\n    </div>\n</template>\n"; });
define('text!styles/job-detail.css', ['module'], function(module) { module.exports = "@media only screen and (max-width: 767px) {\n  .ui.form .field select.compact,\n  .ui.form .field > .selection.dropdown.compact,\n  .ui.form .fields .field .ui.input.compact {\n    width: 200px;\n  }\n}\n"; });
define('text!resources/views/controls/prompt.html', ['module'], function(module) { module.exports = "<template>\n  <ai-dialog>\n    <ai-dialog-body>\n      <p>${message}</p>\n    </ai-dialog-body>\n\n    <ai-dialog-footer>\n      <button click.trigger=\"controller.cancel()\" class=\"ui button basic\">No</button>\n      <button click.trigger=\"controller.ok()\" class=\"ui button primary\">Yes</button>\n    </ai-dialog-footer>\n  </ai-dialog>\n</template>\n"; });
define('text!styles/job-list.css', ['module'], function(module) { module.exports = ".ui.cards {\n  padding-top: 10px;\n}\n@media only screen and (min-width: 1200px) {\n  .ui.container.main {\n    width: calc(100% -  50px);\n  }\n}\n"; });
define('text!resources/views/customers/edit.html', ['module'], function(module) { module.exports = "<template>\n  <require from=\"styles/edit-customer-dialog.css\"></require>\n  <ai-dialog>\n    <ai-dialog-body>\n      <form name=\"edit-customer-dialog\" class=\"ui form\">\n        <div class=\"field\">\n          <label for=\"name\">Name:</label>\n          <input type=\"text\" id=\"name\" placeholder=\"ABC Greenhouses\" value.bind=\"customer.name\" attach-focus=\"true\" required>\n        </div>\n        <h4 class=\"ui dividing header\">Address Information</h4>\n        <div class=\"two fields\">\n          <div class=\"field\">\n            <label for=\"address\">Address:</label>\n            <input type=\"text\" id=\"address\" placeholder=\"123 Main St.\" value.bind=\"customer.address\">\n          </div>\n          <div class=\"field\">\n            <label for=\"city\">City:</label>\n            <input type=\"text\" id=\"city\" placeholder=\"Vineland\" value.bind=\"customer.city\">\n          </div>\n        </div>\n        <div class=\"two fields\">\n          <div class=\"field\">\n            <label for=\"province\">Province:</label>\n            <input type=\"text\" id=\"province\" placeholder=\"ON\" value.bind=\"customer.province\">\n          </div>\n          <div class=\"field\">\n            <label for=\"postal-code\">Postal Code:</label>\n            <input type=\"text\" id=\"postal-code\" placeholder=\"L0R 2A3\" value.bind=\"customer.postal_code\">\n          </div>\n        </div>\n        <h4 class=\"ui dividing header\">Contact Information</h4>\n        <div class=\"two fields\">\n          <div class=\"field\">\n            <label for=\"contact\">Contact Name:</label>\n            <input type=\"text\" id=\"contact\" placeholder=\"John Doe\" value.bind=\"customer.contact\">\n          </div>\n          <div class=\"field\">\n            <label for=\"phone\">Phone:</label>\n            <input type=\"tel\" id=\"phone\" placeholder=\"905 555 1234\" value.bind=\"customer.phone\">\n          </div>\n        </div>\n      </form>\n    </ai-dialog-body>\n\n    <ai-dialog-footer>\n      <button click.trigger=\"controller.cancel()\" class=\"ui button basic\">Cancel</button>\n      <button click.trigger=\"save()\" class=\"ui button primary\">Save</button>\n    </ai-dialog-footer>\n  </ai-dialog>\n</template>\n"; });
define('text!styles/login.css', ['module'], function(module) { module.exports = "@import '../../node_modules/semantic-ui-css/semantic.css';\n.login-form {\n  height: 100%;\n  background-color: #DADADA;\n}\n.login-form > .column {\n  background-color: #ffffff;\n  max-width: 450px;\n}\n.login-form .ui.error.message ul {\n  list-style: none;\n}\n.login-form .ui.error.message ul li:before {\n  content: \"\";\n}\n"; });
define('text!resources/views/customers/list.html', ['module'], function(module) { module.exports = "<template>\n  <require from=\"styles/customer-list.css\"></require>\n\n  <div class=\"ui segment\" id=\"customer-list\">\n    <div class=\"ui grid\">\n      <h2 class=\"ui header six wide column\">\n        <i class=\"circular building outline icon\"></i>\n        <div class=\"content\">\n          Customer List\n        </div>\n      </h2>\n      <div class=\"ten wide column\">\n        <div class=\"ui fluid icon input\">\n          <input type=\"search\" name=\"search\" placeholder=\"Search...\" value.bind=\"search & debounce\" autofocus>\n          <i class=\"search icon\"></i>\n        </div>\n      </div>\n    </div>\n    <div class=\"ui divider\"></div>\n    <div class=\"ui special cards\">\n      <div class=\"ui card\" href=\"#/${c._id}\" repeat.for=\"c of customers\">\n        <div class=\"content\">\n          <div class=\"header\">${c.name}</div>\n          <div class=\"description\">\n            <p><strong>Address:</strong>&nbsp;${c.address}</p>\n            <p><strong>City:</strong>&nbsp;${c.city}</p>\n            <p><strong>Province:</strong>&nbsp;${c.province}</p>\n            <p class=\"divider\"><strong>Postal Code:</strong>&nbsp;${c.postal_code}</p>\n            <p><strong>Contact:</strong>&nbsp;${c.contact}</p>\n            <p><strong>Phone:</strong>&nbsp;${c.phone}</p>\n          </div>\n        </div>\n        <div class=\"extra content\">\n          <div class=\"ui two buttons\">\n            <button type=\"button\" class=\"small ui red basic button\" click.delegate=\"delete(c)\">\n              <i class=\"icon trash\"></i>\n              Delete\n            </button>\n            <button type=\"button\" class=\"small ui grey basic button\" click.delegate=\"edit(c)\">\n              <i class=\"icon edit\"></i>\n              Edit\n            </button>\n          </div>\n        </div>\n      </div>\n    </div>\n  </div>\n</template>\n"; });
define('text!resources/views/jobs/close-job.html', ['module'], function(module) { module.exports = "<template>\r\n    <form class=\"ui big form small modal close-job\">\r\n        <i class=\"close icon\"></i>\r\n        <div class=\"header\">Close Job</div>\r\n        <div class=\"content\">\r\n            <div class=\"description\">\r\n                <p>Enter the man-hours for the job</p>\r\n                <input type=\"number\" placeholder=\"Man Hours\" value.bind=\"args.manHours\">\r\n            </div>\r\n        </div>\r\n        <div class=\"actions\">\r\n            <button class=\"ui button cancel\">Cancel</button>\r\n            <button class=\"ui button positive\">OK</button>\r\n        </div>\r\n    </form>\r\n</template>"; });
define('text!styles/styles.css', ['module'], function(module) { module.exports = "@import '../../node_modules/semantic-ui-css/semantic.css';\n@import '../../node_modules/semantic-ui/dist/components/calendar.css';\n.toast-title {\n  font-weight: bold;\n}\n.toast-message {\n  -ms-word-wrap: break-word;\n  word-wrap: break-word;\n}\n.toast-message a,\n.toast-message label {\n  color: #FFFFFF;\n}\n.toast-message a:hover {\n  color: #CCCCCC;\n  text-decoration: none;\n}\n.toast-close-button {\n  position: relative;\n  right: -0.3em;\n  top: -0.3em;\n  float: right;\n  font-size: 20px;\n  font-weight: bold;\n  color: #FFFFFF;\n  -webkit-text-shadow: 0 1px 0 #ffffff;\n  text-shadow: 0 1px 0 #ffffff;\n  opacity: 0.8;\n  -ms-filter: progid:DXImageTransform.Microsoft.Alpha(Opacity=80);\n  filter: alpha(opacity=80);\n}\n.toast-close-button:hover,\n.toast-close-button:focus {\n  color: #000000;\n  text-decoration: none;\n  cursor: pointer;\n  opacity: 0.4;\n  -ms-filter: progid:DXImageTransform.Microsoft.Alpha(Opacity=40);\n  filter: alpha(opacity=40);\n}\n/*Additional properties for button version\n iOS requires the button element instead of an anchor tag.\n If you want the anchor version, it requires `href=\"#\"`.*/\nbutton.toast-close-button {\n  padding: 0;\n  cursor: pointer;\n  background: transparent;\n  border: 0;\n  -webkit-appearance: none;\n}\n.toast-top-center {\n  top: 0;\n  right: 0;\n  width: 100%;\n}\n.toast-bottom-center {\n  bottom: 0;\n  right: 0;\n  width: 100%;\n}\n.toast-top-full-width {\n  top: 0;\n  right: 0;\n  width: 100%;\n}\n.toast-bottom-full-width {\n  bottom: 0;\n  right: 0;\n  width: 100%;\n}\n.toast-top-left {\n  top: 12px;\n  left: 12px;\n}\n.toast-top-right {\n  top: 12px;\n  right: 12px;\n}\n.toast-bottom-right {\n  right: 12px;\n  bottom: 12px;\n}\n.toast-bottom-left {\n  bottom: 12px;\n  left: 12px;\n}\n#toast-container {\n  position: fixed;\n  z-index: 999999;\n  pointer-events: none;\n  /*overrides*/\n}\n#toast-container * {\n  -moz-box-sizing: border-box;\n  -webkit-box-sizing: border-box;\n  box-sizing: border-box;\n}\n#toast-container > div {\n  position: relative;\n  pointer-events: auto;\n  overflow: hidden;\n  margin: 0 0 6px;\n  padding: 15px 15px 15px 50px;\n  width: 300px;\n  -moz-border-radius: 3px 3px 3px 3px;\n  -webkit-border-radius: 3px 3px 3px 3px;\n  border-radius: 3px 3px 3px 3px;\n  background-position: 15px center;\n  background-repeat: no-repeat;\n  -moz-box-shadow: 0 0 12px #999999;\n  -webkit-box-shadow: 0 0 12px #999999;\n  box-shadow: 0 0 12px #999999;\n  color: #FFFFFF;\n  opacity: 0.8;\n  -ms-filter: progid:DXImageTransform.Microsoft.Alpha(Opacity=80);\n  filter: alpha(opacity=80);\n}\n#toast-container > :hover {\n  -moz-box-shadow: 0 0 12px #000000;\n  -webkit-box-shadow: 0 0 12px #000000;\n  box-shadow: 0 0 12px #000000;\n  opacity: 1;\n  -ms-filter: progid:DXImageTransform.Microsoft.Alpha(Opacity=100);\n  filter: alpha(opacity=100);\n  cursor: pointer;\n}\n#toast-container > .toast-info {\n  background-image: url(\"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAGwSURBVEhLtZa9SgNBEMc9sUxxRcoUKSzSWIhXpFMhhYWFhaBg4yPYiWCXZxBLERsLRS3EQkEfwCKdjWJAwSKCgoKCcudv4O5YLrt7EzgXhiU3/4+b2ckmwVjJSpKkQ6wAi4gwhT+z3wRBcEz0yjSseUTrcRyfsHsXmD0AmbHOC9Ii8VImnuXBPglHpQ5wwSVM7sNnTG7Za4JwDdCjxyAiH3nyA2mtaTJufiDZ5dCaqlItILh1NHatfN5skvjx9Z38m69CgzuXmZgVrPIGE763Jx9qKsRozWYw6xOHdER+nn2KkO+Bb+UV5CBN6WC6QtBgbRVozrahAbmm6HtUsgtPC19tFdxXZYBOfkbmFJ1VaHA1VAHjd0pp70oTZzvR+EVrx2Ygfdsq6eu55BHYR8hlcki+n+kERUFG8BrA0BwjeAv2M8WLQBtcy+SD6fNsmnB3AlBLrgTtVW1c2QN4bVWLATaIS60J2Du5y1TiJgjSBvFVZgTmwCU+dAZFoPxGEEs8nyHC9Bwe2GvEJv2WXZb0vjdyFT4Cxk3e/kIqlOGoVLwwPevpYHT+00T+hWwXDf4AJAOUqWcDhbwAAAAASUVORK5CYII=\") !important;\n}\n#toast-container > .toast-error {\n  background-image: url(\"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAHOSURBVEhLrZa/SgNBEMZzh0WKCClSCKaIYOED+AAKeQQLG8HWztLCImBrYadgIdY+gIKNYkBFSwu7CAoqCgkkoGBI/E28PdbLZmeDLgzZzcx83/zZ2SSXC1j9fr+I1Hq93g2yxH4iwM1vkoBWAdxCmpzTxfkN2RcyZNaHFIkSo10+8kgxkXIURV5HGxTmFuc75B2RfQkpxHG8aAgaAFa0tAHqYFfQ7Iwe2yhODk8+J4C7yAoRTWI3w/4klGRgR4lO7Rpn9+gvMyWp+uxFh8+H+ARlgN1nJuJuQAYvNkEnwGFck18Er4q3egEc/oO+mhLdKgRyhdNFiacC0rlOCbhNVz4H9FnAYgDBvU3QIioZlJFLJtsoHYRDfiZoUyIxqCtRpVlANq0EU4dApjrtgezPFad5S19Wgjkc0hNVnuF4HjVA6C7QrSIbylB+oZe3aHgBsqlNqKYH48jXyJKMuAbiyVJ8KzaB3eRc0pg9VwQ4niFryI68qiOi3AbjwdsfnAtk0bCjTLJKr6mrD9g8iq/S/B81hguOMlQTnVyG40wAcjnmgsCNESDrjme7wfftP4P7SP4N3CJZdvzoNyGq2c/HWOXJGsvVg+RA/k2MC/wN6I2YA2Pt8GkAAAAASUVORK5CYII=\") !important;\n}\n#toast-container > .toast-success {\n  background-image: url(\"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAADsSURBVEhLY2AYBfQMgf///3P8+/evAIgvA/FsIF+BavYDDWMBGroaSMMBiE8VC7AZDrIFaMFnii3AZTjUgsUUWUDA8OdAH6iQbQEhw4HyGsPEcKBXBIC4ARhex4G4BsjmweU1soIFaGg/WtoFZRIZdEvIMhxkCCjXIVsATV6gFGACs4Rsw0EGgIIH3QJYJgHSARQZDrWAB+jawzgs+Q2UO49D7jnRSRGoEFRILcdmEMWGI0cm0JJ2QpYA1RDvcmzJEWhABhD/pqrL0S0CWuABKgnRki9lLseS7g2AlqwHWQSKH4oKLrILpRGhEQCw2LiRUIa4lwAAAABJRU5ErkJggg==\") !important;\n}\n#toast-container > .toast-warning {\n  background-image: url(\"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAGYSURBVEhL5ZSvTsNQFMbXZGICMYGYmJhAQIJAICYQPAACiSDB8AiICQQJT4CqQEwgJvYASAQCiZiYmJhAIBATCARJy+9rTsldd8sKu1M0+dLb057v6/lbq/2rK0mS/TRNj9cWNAKPYIJII7gIxCcQ51cvqID+GIEX8ASG4B1bK5gIZFeQfoJdEXOfgX4QAQg7kH2A65yQ87lyxb27sggkAzAuFhbbg1K2kgCkB1bVwyIR9m2L7PRPIhDUIXgGtyKw575yz3lTNs6X4JXnjV+LKM/m3MydnTbtOKIjtz6VhCBq4vSm3ncdrD2lk0VgUXSVKjVDJXJzijW1RQdsU7F77He8u68koNZTz8Oz5yGa6J3H3lZ0xYgXBK2QymlWWA+RWnYhskLBv2vmE+hBMCtbA7KX5drWyRT/2JsqZ2IvfB9Y4bWDNMFbJRFmC9E74SoS0CqulwjkC0+5bpcV1CZ8NMej4pjy0U+doDQsGyo1hzVJttIjhQ7GnBtRFN1UarUlH8F3xict+HY07rEzoUGPlWcjRFRr4/gChZgc3ZL2d8oAAAAASUVORK5CYII=\") !important;\n}\n#toast-container.toast-top-center > div,\n#toast-container.toast-bottom-center > div {\n  width: 300px;\n  margin-left: auto;\n  margin-right: auto;\n}\n#toast-container.toast-top-full-width > div,\n#toast-container.toast-bottom-full-width > div {\n  width: 96%;\n  margin-left: auto;\n  margin-right: auto;\n}\n.toast {\n  background-color: #030303;\n}\n.toast-success {\n  background-color: #51A351;\n}\n.toast-error {\n  background-color: #BD362F;\n}\n.toast-info {\n  background-color: #2F96B4;\n}\n.toast-warning {\n  background-color: #F89406;\n}\n.toast-progress {\n  position: absolute;\n  left: 0;\n  bottom: 0;\n  height: 4px;\n  background-color: #000000;\n  opacity: 0.4;\n  -ms-filter: progid:DXImageTransform.Microsoft.Alpha(Opacity=40);\n  filter: alpha(opacity=40);\n}\n/*Responsive Design*/\n@media all and (max-width: 240px) {\n  #toast-container > div {\n    padding: 8px 8px 8px 50px;\n    width: 11em;\n  }\n  #toast-container .toast-close-button {\n    right: -0.2em;\n    top: -0.2em;\n  }\n}\n@media all and (min-width: 241px) and (max-width: 480px) {\n  #toast-container > div {\n    padding: 8px 8px 8px 50px;\n    width: 18em;\n  }\n  #toast-container .toast-close-button {\n    right: -0.2em;\n    top: -0.2em;\n  }\n}\n@media all and (min-width: 481px) and (max-width: 768px) {\n  #toast-container > div {\n    padding: 15px 15px 15px 50px;\n    width: 25em;\n  }\n}\n.ui.secondary.pointing.menu .item.logo-item {\n  padding: 0 20px;\n}\n.ui.fixed.menu.button-bar.top {\n  top: 0px;\n}\n.ui.popup.calendar:focus {\n  outline: none;\n}\n@media only screen and (max-width: 767px) {\n  #main-menu > .ui.container {\n    margin: 0px !important;\n  }\n  list-item {\n    width: 100%;\n  }\n  list-item > .ui.card {\n    width: 100%;\n  }\n  list-item > .ui.card .ui.header {\n    margin-top: 10px;\n  }\n  .menu .item.logo-item span {\n    display: none;\n  }\n  .ui.cards > .card {\n    width: 100%;\n  }\n  .hide-mobile {\n    display: none !important;\n  }\n}\n@media only screen and (min-width: 768px) {\n  .hide-desktop {\n    display: none !important;\n  }\n}\n"; });
define('text!resources/views/jobs/detail.html', ['module'], function(module) { module.exports = "<template>\n  <require from=\"styles/job-detail.css\"></require>\n  <require from=\"../controls/integer-value-converter\"></require>\n\n    <div class=\"ui menu button-bar\">\n        <div class=\"ui container\">\n            <a route-href=\"route:jobs.list\" class=\"ui button\">Cancel</a>\n            <button type=\"button\" class=\"ui button positive\" click.trigger=\"onSaveClick()\">\n                <i class=\"icon save\"></i>\n                Save\n            </button>\n\n            <button type=\"button\" class=\"ui button red basic right\" click.trigger=\"onDeleteClick()\" show.bind=\"job._id\">\n              <i class=\"icon trash\"></i>\n              Delete\n            </button>\n        </div>\n    </div>\n\n    <form class=\"ui form\">\n        <h2 class=\"ui ${isFollowup ? '' : 'dividing header'}\">${routeConfig.title}</h2>\n\n        <div class=\"fields\">\n            <div class=\"field eight wide\">\n                <label for=\"customer\">Customer</label>\n                <div class=\"ui search selection dropdown customer\">\n                    <input type=\"hidden\" name=\"customer\" id=\"customer\" value.bind=\"customer_id\">\n                    <i class=\"dropdown icon\"></i>\n                    <div class=\"default text\">Select Customer</div>\n                    <div class=\"menu\">\n                        <div repeat.for=\"customer of customers\" class=\"item\" data-value.bind=\"customer._id\" data-text.bind=\"customer.name\">\n                            ${customer.name}\n                        </div>\n                    </div>\n                </div>\n            </div>\n          <div class=\"field eight wide\">\n            <label for=\"job-name\">Job Name</label>\n            <input type=\"text\" name=\"job-name\" id=\"job-name\" value.bind=\"job.name\">\n          </div>\n        </div>\n        <div class=\"fields\">\n            <div class=\"field sixteen wide\">\n                <label for=\"description\">Job Description</label>\n                <textarea name=\"description\" id=\"description\" value.bind=\"job.description\" cols=\"30\" rows=\"5\"></textarea>\n            </div>\n        </div>\n        <div class=\"fields\">\n            <div class=\"field six wide\">\n                <label for=\"jobType\">Job Type</label>\n                <select name=\"jobType\" id=\"jobType\" value.bind=\"job.job_type\" class=\"ui compact dropdown\">\n                    <option repeat.for=\"t of jobTypes\" value=\"${t.id}\">${t.name}</option>\n                </select>\n            </div>\n        </div>\n        <div class=\"fields\">\n            <div class=\"field six wide\">\n                <label for=\"status\">Status</label>\n                <select name=\"status\" id=\"status\" value.bind=\"job.status\" class=\"ui compact dropdown\">\n                    <option repeat.for=\"s of jobStatuses\" value=\"${s.id}\">${s.name}</option>\n                </select>\n            </div>\n            <div class=\"field six wide\">\n                <label for=\"billingType\">Billing Type</label>\n                <select name=\"billingType\" id=\"billingType\" value.bind=\"job.billing_type\" class=\"ui compact dropdown\">\n                    <option repeat.for=\"bt of billingTypes\" value=\"${bt.id}\">${bt.name}</option>\n                </select>\n            </div>\n            <div class=\"field six wide\">\n                <label for=\"jobType\">Work Type</label>\n                <select name=\"workType\" id=\"workType\" value.bind=\"job.work_type\" class=\"ui compact dropdown\">\n                    <option repeat.for=\"wt of workTypes\" value=\"${wt.id}\">${wt.name}</option>\n                </select>\n            </div>\n        </div>\n        <div class=\"fields\">\n            <div class=\"field six wide\">\n                <label for=\"start\">Scheduled Start</label>\n                <div class=\"ui calendar start\">\n                    <div class=\"ui input compact left icon\">\n                        <i class=\"calendar icon\"></i>\n                        <input type=\"text\" placeholder=\"Date/Time\" id=\"start\" name=\"start\">\n                    </div>\n                </div>\n            </div>\n          <div class=\"field six wide\">\n            <label for=\"start\">Scheduled End</label>\n            <div class=\"ui calendar end\">\n              <div class=\"ui input compact left icon\">\n                <i class=\"calendar icon\"></i>\n                <input type=\"text\" placeholder=\"Date/Time\" id=\"end\" name=\"end\">\n              </div>\n            </div>\n          </div>\n        </div>\n        <div class=\"fields\">\n            <div class=\"field sixteen wide\">\n                <label for=\"notes\">Notes</label>\n                <textarea name=\"notes\" id=\"notes\" value.bind=\"job.notes\" cols=\"30\" rows=\"3\"></textarea>\n            </div>\n        </div>\n        <div class=\"fields\">\n          <div class=\"field six wide\">\n            <label for=\"man-hours\">Man-hours:</label>\n            <input type=\"number\" id=\"man-hours\" name=\"man-hours\" value.bind=\"job.manHours | integer\" if.bind=\"canEditManHours\">\n            <input type=\"number\" id=\"man-hours-readonly\" name=\"man-hours-readonly\" value.bind=\"job.manHours | integer\" if.bind=\"!canEditManHours\" readonly>\n          </div>\n        </div>\n    </form>\n</template>\n"; });
define('text!resources/views/jobs/list-item.html', ['module'], function(module) { module.exports = "<template>\n      <div class=\"content\">\n          <div class=\"right floated meta\" style=\"max-width: 40%;\">\n              <span>${startDateDisplay}</span>\n              <span show.bind=\"job.endDate\">&nbsp;&ndash;&nbsp;</span>\n              <br show.bind=\"job.endDate\">\n              <span show.bind=\"job.endDate\">${endDateDisplay}</span>\n          </div>\n          <a class=\"header\" route-href=\"route:jobs.edit; params.bind: {id: job._id}\">\n              <i class=\"icon building\" show.bind=\"isProject\"></i>\n              <i class=\"icon wrench\" show.bind=\"isServiceCall\"></i>\n              &nbsp;${jobNumberDisplay}\n          </a>\n          <div class=\"ui header\">${job.customer.name}</div>\n      </div>\n      <div class=\"content\">\n          <div class=\"ui sub header\">\n              <button class=\"ui basic icon button right floated hide-desktop\" click.trigger=\"toggleExpanded()\">\n                  <i class=\"dropdown icon ${expanded ? 'vertically flipped' : ''}\"></i>\n              </button>\n              ${job.name}\n          </div>\n          <p class=\"ui ${expanded ? '' : 'hide-mobile'}\">${job.description}</p>\n          <div class=\"ui sub header ${expanded ? '' : 'hide-mobile'}\" show.bind=\"job.manHours\">Man hours: ${job.manHours}</div>\n      </div>\n      <div class=\"ui extra content ${expanded ? '' : 'hide-mobile'}\">\n          <div class=\"right floated author\">\n              <div class=\"ui dropdown foreman\">\n                  <div class=\"text\">\n                      <i class=\"icon user\" show.bind=\"job.foreman\"></i>\n                      <i class=\"icon user plus\" hide.bind=\"job.foreman\"></i>\n                      &nbsp;${foremanDisplay}\n                  </div>\n                  <i class=\"dropdown icon\"></i>\n                  <div class=\"menu\">\n                      <div repeat.for=\"f of foremen\" class=\"item\" data-value.bind=\"f\">${f}</div>\n                  </div>\n              </div>\n          </div>\n          <div class=\"ui dropdown status\">\n              <div class=\"text\">\n                  <i class=\"icon circular ${jobStatus.cssClass}\"></i>\n                  <span>&nbsp;${jobStatus.name}</span>\n              </div>\n              <i class=\"dropdown icon\"></i>\n              <div class=\"menu\">\n                  <div class=\"item\" repeat.for=\"status of jobStatuses\" data-value.bind=\"status.id\">\n                      <i class=\"icon circular ${status.cssClass}\"></i>\n                      <span>&nbsp;${status.name}</span>\n                  </div>\n              </div>\n          </div>\n      </div>\n</template>\n"; });
define('text!resources/views/jobs/list.html', ['module'], function(module) { module.exports = "<template>\n  <require from=\"./list-item\"></require>\n  <require from=\"./close-job\"></require>\n\n  <require from=\"styles/job-list.css\"></require>\n\n  <div class=\"ui segment\">\n    <button class=\"ui button basic right floated hide-desktop mini\" click.trigger=\"toggleFiltersExpanded()\"\n            show.bind=\"isOwner\">\n      Filters\n      <i class=\"dropdown icon ${filtersExpanded ? 'vertically flipped' : ''}\"></i>\n    </button>\n    <div class=\"ui two column grid stackable container ${filtersExpanded ? '' : 'hide-mobile'}\" show.bind=\"isOwner\">\n      <div class=\"column\">\n        <div class=\"ui toggle checkbox\">\n          <input type=\"checkbox\" checked.bind=\"myJobs\">\n          <label>My Jobs Only</label>\n        </div>\n      </div>\n      <div class=\"column\">\n        <div class=\"ui toggle checkbox column\">\n          <input type=\"checkbox\" checked.bind=\"showOpen\">\n          <label>Show open jobs</label>\n        </div>\n      </div>\n      <div class=\"column\">\n        <div class=\"ui toggle checkbox column\">\n          <input type=\"checkbox\" checked.bind=\"showCompleted\">\n          <label>Show completed jobs</label>\n        </div>\n      </div>\n      <div class=\"column\">\n        <div class=\"ui toggle checkbox column\">\n          <input type=\"checkbox\" checked.bind=\"showClosed\">\n          <label>Show closed jobs</label>\n        </div>\n      </div>\n      <div class=\"column\">\n        <div class=\"ui toggle checkbox column\">\n          <input type=\"checkbox\" checked.bind=\"customerSort\">\n          <label>Customer Sort</label>\n        </div>\n      </div>\n      <div class=\"column\">\n        <div class=\"ui toggle checkbox column\">\n          <input type=\"checkbox\" checked.bind=\"reverseSort\">\n          <label>Reverse Sort</label>\n        </div>\n      </div>\n      <div class=\"column\">\n        <div class=\"ui toggle checkbox column\">\n          <input type=\"checkbox\" checked.bind=\"showProjects\">\n          <label>Show Projects</label>\n        </div>\n      </div>\n      <div class=\"column\">\n        <div class=\"ui toggle checkbox column\">\n          <input type=\"checkbox\" checked.bind=\"showServiceCalls\">\n          <label>Show Service Calls</label>\n        </div>\n      </div>      \n    </div>\n\n    <div class=\"ui cards\" show.bind=\"filteredItems.length\">\n      <list-item job.bind=\"item\" repeat.for=\"item of filteredItems\" class=\"card\"></list-item>\n    </div>\n    <div class=\"ui message\" show.bind=\"!filteredItems.length\">\n      <div class=\"header\">No items</div>\n    </div>\n  </div>\n\n  <close-job id=\"close-job\" args.bind=\"closeJobArgs\"></close-job>\n</template>\n"; });
//# sourceMappingURL=app-bundle.js.map