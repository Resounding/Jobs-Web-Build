import {autoinject, bindable} from 'aurelia-framework';
import {Router} from 'aurelia-router';
import {Authentication, UserInfo} from '../../services/auth';
import {CsvExport} from "../../services/csv-export";

@autoinject()
export class NavBar {

  @bindable router: Router;
  csv: string;

  constructor(private element: Element, private auth: Authentication, private csvExport: CsvExport) { }

  attached() {
    $('.dropdown', this.element).dropdown();
  }

  detached() {
    $('.dropdown', this.element).dropdown('destroy');
  }

  downloadCsv() {
    this.csvExport.export()
      .then(result => {
        const csv = encodeURIComponent(result),
          href = `data:text/csv;charset=utf-8, ${csv}`,
          link = document.createElement('a');

        link.download = 'jobs.csv';
        link.href = href;
        link.click();
      });
  }

  logout() {
    this.auth.logout();
  }

  get userName() {
    return (this.auth.userInfo() || <UserInfo>{}).name;
  }
}
