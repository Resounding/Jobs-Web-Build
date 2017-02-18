import {Aurelia} from 'aurelia-framework'
import {Authentication} from './resources/services/auth';
import {Configuration} from './resources/services/config';

Promise.config({
  warnings: {
    wForgottenReturn: false
  }
});

export function configure(aurelia: Aurelia) {
  aurelia.use
    .standardConfiguration()
    .feature('resources')
    .plugin('aurelia-dialog', config => {
      config.useDefaults();
      config.settings.lock = true;
    });

  if (Configuration.isDebug()) {
    aurelia.use.developmentLogging();
  }

  return aurelia.start().then(() => {
      const auth = aurelia.container.get(Authentication),
          config = aurelia.container.get(Configuration),
          root = auth.isAuthenticated() ? config.app_root : config.login_root;
      return aurelia.setRoot(root)
  });
}
