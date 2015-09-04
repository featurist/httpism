var expect = require('chai').expect;
var httpism = require('../..');
Promise = require('es6-promise').Promise;

var server = 'http://' + window.location.hostname + ':12345';

describe('httpism', function () {
  describe('get', function () {
    it('can make a JSON GET request', function () {
      return httpism.get('/').then(function (response) {
        expect(response.body.method).to.equal('GET');
        expect(response.body.url).to.equal('/');
        expect(response.headers['content-type']).to.equal('application/json; charset=utf-8');
        expect(response.url).to.equal('/');
      });
    });

    it('can GET with query string', function () {
      return httpism.get('/?a=b&b=c&c=d', {querystring: {b: 'd'}}).then(function (response) {
        expect(response.body.method).to.equal('GET');
        expect(response.body.query).to.eql({a: 'b', b: 'd', c: 'd'});
        expect(response.body.url).to.equal('/?a=b&b=d&c=d');
        expect(response.headers['content-type']).to.equal('application/json; charset=utf-8');
        expect(response.url).to.equal('/?a=b&b=d&c=d');
      });
    });

    it('can make a string GET request', function () {
      return httpism.get('/text?text=asdf').then(function (response) {
        expect(response.body).to.equal('asdf');
      });
    });

    it('throws if receives 404', function () {
      return httpism.get('/status/404').then(function (response) {
        throw new Error('expected to throw exception');
      }, function (response) {
        expect(response.message).to.eql('GET /status/404 => 404 Not Found');
        expect(response.body.method).to.eql('GET');
        expect(response.headers['content-type']).to.equal('application/json; charset=utf-8');
        expect(response.url).to.equal('/status/404');
      });
    });

    it('redirects', function () {
      return httpism.get('/redirect?url=' + encodeURIComponent('/')).then(function (response) {
        expect(response.body.method).to.eql('GET');
        expect(response.url).to.equal('/');
      });
    });
  });

  describe('cookies', function () {
    it('can send and receive cookies', function () {
      return httpism.get('/cookies', {querystring: {a: 'b'}}).then(function () {
        expect(document.cookie).to.equal('a=b');
        return httpism.get('/').then(function (response) {
          expect(response.body.cookies.a).to.equal('b');
        });
      });
    });

    describe('cross-domain', function () {
      beforeEach(function () {
        return httpism.get(server + '/cookies', {querystring: {a: ''}, withCredentials: true});
      });

      it("by default, doesn't send cookies cross-domain", function () {
        return httpism.get(server + '/cookies', {querystring: {a: 'b'}, withCredentials: true}).then(function () {
          return httpism.get(server + '/').then(function (response) {
            expect(response.body.cookies.a).to.be.undefined;
          });
        });
      });

      it("withCredentials = true, sends cookies cross-domain", function () {
        return httpism.get(server + '/cookies', {querystring: {a: 'b'}, withCredentials: true}).then(function () {
          return httpism.get(server + '/', {withCredentials: true}).then(function (response) {
            expect(response.body.cookies.a).to.equal('b');
          });
        });
      });
    });
  });

  describe('post', function () {
    it('can make a json post request', function () {
      return httpism.post('/', {data: 'hehey'}).then(function (response) {
        expect(response.body.body).to.eql({data: 'hehey'});
        expect(response.body.headers['content-type']).to.equal('application/json');
        expect(response.headers['content-type']).to.equal('application/json; charset=utf-8');
        expect(response.url).to.equal('/');
      });
    });

    it('can make a cross-origin json post request', function () {
      return httpism.post(server + '/', {data: 'hehey'}).then(function (response) {
        expect(response.body.body).to.eql({data: 'hehey'});
        expect(response.body.headers['content-type']).to.equal('application/json');
        expect(response.headers['content-type']).to.equal('application/json; charset=utf-8');
        expect(response.url).to.equal(server + '/');
      });
    });

    it('can make a text post request', function () {
      return httpism.post('/', 'hehey').then(function (response) {
        expect(response.body.body).to.eql('hehey');
        expect(response.body.headers['content-type']).to.equal('text/plain;charset=UTF-8');
        expect(response.headers['content-type']).to.equal('application/json; charset=utf-8');
        expect(response.url).to.equal('/');
      });
    });

    it('can make a form post request', function () {
      return httpism.post('/', {data: ['hehey', 'hoho']}, {form: true}).then(function (response) {
        expect(response.body.body).to.eql({data: ['hehey', 'hoho']});
        expect(response.body.headers['content-type']).to.equal('application/x-www-form-urlencoded');
        expect(response.headers['content-type']).to.equal('application/json; charset=utf-8');
        expect(response.url).to.equal('/');
      });
    });
  });

  describe('put', function () {
    it('can make a json put request', function () {
      return httpism.put('/', {data: 'hehey'}).then(function (response) {
        expect(response.body.body).to.eql({data: 'hehey'});
        expect(response.body.headers['content-type']).to.equal('application/json');
        expect(response.headers['content-type']).to.equal('application/json; charset=utf-8');
        expect(response.url).to.equal('/');
      });
    });
  });

  describe('abort', function () {
    it('can abort a request', function () {
      var request = httpism.get('/');
      request.abort();
      return new Promise(function (fulfil, reject) {
        request.then(function (response) {
          reject(new Error("didn't expect response"));
        }, function (error) {
          if (error.aborted != true) {
            reject(error);
          } else {
            fulfil();
          }
        });
      });
    });

    it('can abort a request even with user middleware', function () {
      var middlewareRequest, middlewareResponse;

      var http = httpism.api([
        function (request, next) {
          middlewareRequest = true;
          return next().then(function (response) {
            middlewareResponse = true;
            return response;
          });
        }
      ]);

      var request = http.get('/');
      request.abort();
      return new Promise(function (fulfil, reject) {
        request.then(function (response) {
          reject(new Error("didn't expect response"));
        }, function (error) {
          if (error.aborted != true) {
            reject(error);
          } else {
            fulfil();
          }
        });
      }).then(function () {
        expect(middlewareRequest).to.be.true;
        expect(middlewareResponse).to.be.undefined;
      });
    });
  });
});
