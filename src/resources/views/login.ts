import {autoinject} from 'aurelia-framework';
import {Authentication} from '../services/auth';

@autoinject()
export class Login {
    username:string;
    password:string;
    errorMessage:string;

    constructor(private auth:Authentication) { }

    login() {
        this.errorMessage = '';

        if(!this.password) this.errorMessage = 'Please enter your password';
        if(!this.username) this.errorMessage = 'Please enter your username';


        if(!this.errorMessage) {
            this.auth.login(this.username, this.password)
                .catch(err => {
                    this.errorMessage = err.message;
                });
        }
    }
}
