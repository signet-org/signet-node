const http = require('https');
const serverBase = require('./config').server;

function get(id, cb) {
  const req = http.get(serverBase + '/sig/' + id, res => {
    if (res.statusCode !== 200) {
      return cb(null, {attestations: []});
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
      if (!Array.isArray(data.attestations)) {
        return cb(new Error('Data from server is invalid!'));
      }
      cb(false, data);
    })
  });
  req.on('error', cb);
}

module.exports = get;
