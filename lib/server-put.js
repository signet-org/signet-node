const http = require('https');
const url = require('url');
const serverBase = require('./config').server;

function put(attestations, cb) {
  if (Array.isArray(attestations)) {
    attestations = {attestations};
  }
  const data = JSON.stringify(attestations);

  const options = url.parse(serverBase + '/sig');
  options.method = 'POST';
  options.headers = {'Content-Type': 'application/json'};

  const req = http.request(options, res => {
    if (res.statusCode !== 200) {
      return cb(new Error('Something went wrong on the server. Try again.'));
    }

    const bufs = [];
    res.on('data', d => bufs.push(d));
    res.on('end', () => {
      let data;
      try {
        data = JSON.parse(Buffer.concat(bufs).toString('utf8'));
      } catch (e) {
        return cb(e);
      }

      if (!data.ok) {
        return cb(new Error('Error from server: ' + data.error));
      }

      cb();
    })
  });

  req.on('error', cb);

  req.write(data);
  req.end();
}

module.exports = put;
