var expect = require('chai').expect;
var httpism = require('../..');

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

  describe('post', function () {
    it('can make a json post request', function () {
      return httpism.post('/', {data: 'hehey'}).then(function (response) {
        expect(response.body.body).to.eql({data: 'hehey'});
        expect(response.body.headers['content-type']).to.equal('application/json');
        expect(response.headers['content-type']).to.equal('application/json; charset=utf-8');
        expect(response.url).to.equal('/');
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
});
