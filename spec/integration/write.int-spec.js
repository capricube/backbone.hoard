'use strict';

var _ = require('underscore');
var Backbone = require('backbone');
var Hoard = require('src/backbone.hoard');

describe("Writing", function () {
  beforeEach(function () {
    this.control = new Hoard.Control();
    this.urlRoot = '/models';
    this.Model = Backbone.Model.extend({
      urlRoot: this.urlRoot,
      sync: this.control.getModelSync()
    });

    //NOTE: This server setup demonstrates a case where you should not use Hoard,
    // or at the very least you should implement a custom set of strategies
    this.server.respondWith('GET', '/models/1', function (xhr) {
      this.storeRequest(xhr);
      xhr.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ id: -1, value: -1 }));
    }.bind(this));

    this.model = new this.Model({ value: 1 });
  });

  describe("saving a new model", function () {
    beforeEach(function () {
      this.server.respondWith('POST', this.urlRoot, function (xhr) {
        this.storeRequest(xhr);
        var model = JSON.parse(xhr.requestBody);
        _.extend(model, { id: model.value });
        xhr.respond(201, { 'Content-Type': 'application/json' }, JSON.stringify(model));
      }.bind(this));

      return this.model.save();
    });

    it("populates the model with the response", function () {
      expect(this.model.get('id')).to.equal(1);
      expect(this.model.get('value')).to.equal(1);
    });

    it("populates the cache", function () {
      return expect(this.control.store.get('/models/1')).to.eventually.eql({ id: 1, value: 1 });
    });

    it("allows future fetches to read from the cache", function () {
      var model2 = new this.Model({id: 1});
      return model2.fetch().then(function () {
        expect(model2.get('id')).to.equal(1);
        expect(model2.get('value')).to.equal(1);
        expect(this.requests['GET:/models/1']).to.be.undefined;
      }.bind(this));
    });
  });

  describe("updating an existing model", function () {
    beforeEach(function () {
      this.server.respondWith('PUT', '/models/1', function (xhr) {
        this.storeRequest(xhr);
        var model = JSON.parse(xhr.requestBody);
        _.extend(model, { updated: true });
        xhr.respond(201, { 'Content-Type': 'application/json' }, JSON.stringify(model));
      }.bind(this));

      this.model.set('id', 1);
      return this.model.save();
    });

    it("populates the model with the response", function () {
      expect(this.model.get('id')).to.equal(1);
      expect(this.model.get('value')).to.equal(1);
      expect(this.model.get('updated')).to.be.true;
    });

    it("populates the cache", function () {
      return expect(this.control.store.get('/models/1')).to.eventually.eql({
        id: 1,
        value: 1,
        updated: true
      });
    });

    it("allows future fetches to read from the cache", function () {
      var model2 = new this.Model({id: 1});
      return model2.fetch().then(function () {
        expect(model2.get('id')).to.equal(1);
        expect(model2.get('value')).to.equal(1);
        expect(model2.get('updated')).to.be.true;
        expect(this.requests['GET:/models/1']).to.be.undefined;
      }.bind(this));
    });
  });

  describe("patching an existing model", function () {
    beforeEach(function () {
      this.server.respondWith('PATCH', '/models/1', function (xhr) {
        this.storeRequest(xhr);
        var model = JSON.parse(xhr.requestBody);
        _.extend(model, { patched: true });
        xhr.respond(201, { 'Content-Type': 'application/json' }, JSON.stringify(model));
      }.bind(this));

      this.model.set('id', 1);
      return this.model.save({}, { patch: true });
    });

    it("populates the model with the response", function () {
      expect(this.model.get('id')).to.equal(1);
      expect(this.model.get('value')).to.equal(1);
      expect(this.model.get('patched')).to.be.true;
    });

    it("populates the cache", function () {
      return expect(this.control.store.get('/models/1')).to.eventually.eql({
        id: 1,
        value: 1,
        patched: true
      });
    });

    it("allows future fetches to read from the cache", function () {
      var model2 = new this.Model({id: 1});
      return model2.fetch().then(function () {
        expect(model2.get('id')).to.equal(1);
        expect(model2.get('value')).to.equal(1);
        expect(model2.get('patched')).to.be.true;
        expect(this.requests['GET:/models/1']).to.be.undefined;
      }.bind(this));
    });
  });

  describe("deleting an existing model", function () {
    beforeEach(function () {
      this.server.respondWith('DELETE', '/models/1', function (xhr) {
        this.storeRequest(xhr);
        xhr.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({}));
      }.bind(this));

      var setDeferred = Hoard.defer();
      this.storePromise = setDeferred.promise;
      this.model.set('id', 1);
      return this.control.store.set('/models/1', { deleted: false }).then(function () {
        return this.model.destroy();
      }.bind(this));
    });

    it("clears the cache", function () {
      return expect(this.control.store.get('/models/1')).to.be.rejected;
    });

    it("sends new fetches to the server", function () {
      var model2 = new this.Model({id: 1});
      return model2.fetch().then(function () {
        expect(model2.toJSON()).to.deep.eql({id: -1, value: -1 });
      }.bind(this));
    });
  });
});