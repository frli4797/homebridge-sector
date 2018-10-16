const sectoralarm = require('sectoralarm');

const email = 'fredrik@jagare-lilja.se',
      password = 'Sieko54Ger',
      siteId = '02581279',
      code = '<Code to use for arming/disarming>';


sectoralarm.connect(email,password,siteId)
    .then(site => {
        status = site.status();
        console.log(status);
        return status;
    })
    .then(status => {
        console.log(status);
    })
    .catch(error => {
        console.log(error.message);
        console.log(error.code);
    });
