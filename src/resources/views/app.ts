import {Router, RouterConfiguration} from 'aurelia-router';
import {AuthorizeStep} from '../services/auth';

export class App {
    router:Router;

    configureRouter(config:RouterConfiguration, router:Router) {
        config.addPipelineStep('authorize', AuthorizeStep);
        config.title = 'Langendoen Mechanical Job Management Application';
        config.map([
            {route: ['', 'jobs'], name: 'jobs.list', moduleId: 'resources/views/jobs/list', title: 'Jobs List', nav: true, auth: true, settings: { icon: 'browser' }},
            {route: 'jobs/new', name: 'jobs.new', moduleId: 'resources/views/jobs/detail', title: 'New Job', nav: true, auth: true, settings: { icon: 'plus' }},
            {route: 'jobs/:id', name: 'jobs.edit', moduleId: 'resources/views/jobs/detail', title: 'Edit Job', auth: true},
            {route: 'customers', name: 'customers.list', moduleId: 'resources/views/customers/list', title: 'Customer List', nav: true, auth: true, settings: { icon: 'building outline', hideMobile: true }},
            {route: 'calendar/:date?', href: '#calendar?:date', name: 'calendar', moduleId: 'resources/views/calendar/calendar', title: 'Calendar', nav: true, auth: true, settings: { icon: 'calendar', hideMobile: true }}
        ]);

        this.router = router;
    }
}
