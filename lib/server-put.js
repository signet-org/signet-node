const http = require('http');
const serverBase = requre('./config').server;

function put(attestations, cb) {
  if (Array.isArray(attestations)) {
    attestations = {attestations};
  }
  const data = JSON.stringify(attestations, null, 4);

  const options = url.parse(serverBase);
  options.method = 'PUT';

  const req = http.request(options, res => {
    if (res.statusCode !== 200) {
      return cb(new Error('Something went wrong on the server. Try again.'));
    }
    cb();
  });

  req.on('error', cb);

  req.write(data);
  req.end();
}
