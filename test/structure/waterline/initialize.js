var Waterline = require('../../../lib/waterline'),
    assert = require('assert');
    disk = require('sails-disk');
describe('Waterline', function() {

  describe('loader', function() {
    var waterline;

    before(function() {
      waterline = new Waterline();
    });


    it('should keep an internal mapping of collection definitions', function() {
      var collection = Waterline.Collection.extend({ foo: 'bar' });
      var collections = waterline.loadCollection(collection);

      assert(Array.isArray(collections));
      assert(collections.length === 1);
    });
  });


  describe('initialize', function() {

    describe('without junction tables', function() {
      var waterline;

      before(function() {
        waterline = new Waterline();

        // Setup Fixture Model
        var collection = Waterline.Collection.extend({
          tableName: 'foo',
          connection: 'my_foo',
          attributes: {
            foo: 'string'
          }
        });

        waterline.loadCollection(collection);
      });


      it('should return an array of initialized collections', function(done) {

        var connections = {
          'my_foo': {
            adapter: 'foo'
          }
        };

        waterline.initialize({ adapters: { foo: {} }, connections: connections }, function(err, data) {
          if(err) return done(err);

          assert(data.collections);
          assert(Object.keys(data.collections).length === 1);
          assert(data.collections.foo);
          done();
        });
      });
    });


    describe('with junction tables', function() {
      var waterline;

      before(function() {
        waterline = new Waterline();

        // Setup Fixture Models
        var foo = Waterline.Collection.extend({
          tableName: 'foo',
          connection: 'my_foo',
          attributes: {
            bar: {
              collection: 'bar',
              via: 'foo',
              dominant: true
            }
          }
        });

        var bar = Waterline.Collection.extend({
          tableName: 'bar',
          connection: 'my_foo',
          attributes: {
            foo: {
              collection: 'foo',
              via: 'bar'
            }
          }
        });

        waterline.loadCollection(foo);
        waterline.loadCollection(bar);
      });


      it('should add the junction tables to the collection output', function(done) {

        var connections = {
          'my_foo': {
            adapter: 'foo'
          }
        };

        waterline.initialize({ adapters: { foo: {} }, connections: connections }, function(err, data) {
          if(err) return done(err);

          assert(data.collections);
          assert(Object.keys(data.collections).length === 3);
          assert(data.collections.foo);
          assert(data.collections.bar);
          assert(data.collections.bar_foo__foo_bar);

          done();
        });
      });
    });
        describe('Alter Mode Recovery', function () {
            var waterline, adapters, connections, inserted, person, PersonModel;
            before(function () {
            waterline = new Waterline();
            person;
            PersonModel = {
                identity: 'Person',
                tableName: 'person_table',
                connection: 'test_alter',
                migrate: 'alter',
                adapter: 'disk',
                attributes: {
                    label: 'string',
                    num: 'integer',
                    average: 'float',
                    ids: 'array',
                    avatar: 'binary',
                    status: 'boolean',
                    obj: 'json',
                    date: 'datetime',
                    id: {
                        primaryKey: true,
                        type: 'integer',
                        autoIncrement: true
                    }
                }
            };
            var buffer = new Buffer('test alter mode', 'utf8');
            inserted = {label: 'test_alter',
                num: 21,
                average: 20.35,
                ids: [1, 2, 4, 8],
                avatar: buffer,
                status: true,
                obj: {foo: 'bar', bar: 'foo'},
                date: new Date()};
            connections = {
                'test_alter': {
                    adapter: 'disk'
                }
            };
            adapters = {disk: disk};
                var PersonCollection = Waterline.Collection.extend(PersonModel);
                waterline.loadCollection(PersonCollection);
            });
            it('should not lose data when mode "alter"(recovery) is activated', function () {
                waterline.initialize({adapters: adapters, connections: connections}, function (err, data) {
                    assert(!err, 'Alter : First initialization error ' + err);
                    person = data.collections.person;
                    person.create(inserted, function (err, created) {
                        assert(!err, 'Alter : Record creation error ' + err);
                        waterline.teardown(function (err) {
                            assert(!err, 'Alter : TearDown connection error ' + err);
                            var PersonCollection = Waterline.Collection.extend(PersonModel);
                            waterline.loadCollection(PersonCollection);
                            waterline.initialize({adapters: adapters, connections: connections}, function (err, data) {
                                assert(!err, 'Alter : Second initialization error ' + err);
                                data.collections.person.findOne({id: created.id}, function (err, found) {
                                    assert(!err, 'Alter : FindOne error ' + err);
                                    assert(found, 'Alter : Alter mode should backup data, but records found === ' + found);
                                    var record = found;
                                    assert(inserted.label === record.label,
                                            'Alter : Alter mode should recover string type, but (inserted string === "' + inserted.label 
                                                    + '") !== (recovered string === "' + record.label + '")');
                                    assert(inserted.num === record.num,
                                            'Alter : Alter mode should recover integer type, but (inserted integer === ' + inserted.num 
                                                    + ') !== (recovered integer === ' + record.num + ')');
                                    assert(inserted.average === record.average,
                                            'Alter : Alter mode should recover float type, but (inserted float === ' + inserted.average 
                                                    + ') !== (recovered float === ' + record.average + ')');
                                    assert(Array.isArray(record.ids),
                                            'Alter : Alter mode should recover array type, but recovered object is not an array');
                                    assert(inserted.ids.length === record.ids.length,
                                            'Alter : Alter mode should recover array type, inserted array length === ' + inserted.ids.length + ', but recovered array length === ' + record.ids.length);
                                    for (var i = 0; i < inserted.ids.length; i++) {
                                        assert(inserted.ids[i] === record.ids[i],
                                                'Alter : Alter mode should recover array data, but (orignal.array[' + i + '] === '
                                                + inserted.ids[i] + ') !== (recovered.array[' + i + '] === ' + record.ids[i] + ')');
                                    }
                                    ;
                                    assert(inserted.avatar.toString('utf8') === record.avatar.toString('utf8'), 'Alter : Alter mode should recover binary type, but (inserted string === "'
                                            + inserted.avatar.toString('utf8') + '") !== (recovered string === ' + record.avatar.toString('utf8')+')');
                                    assert(inserted.status === record.status,
                                            'Alter : Alter mode should recover boolean type, but (inserted boolean === ' 
                                                    + inserted.status + ') !== (recovered boolean === ' + record.status + ')');
                                    assert(Date.parse(inserted.date) === Date.parse(new Date(record.date)),
                                            'Alter : Alter mode should recover date type, but ' + new Date(Date.parse(inserted.date)) 
                                                    + ' !== ' + new Date(Date.parse(new Date(record.date))));
                                    _.keys(inserted.obj).forEach(function (key) {
                                        assert(record.obj[key],
                                                'Alter : Alter mode should recover json type structure, but property recovered obj.' + key + ' does not exist');
                                        assert(inserted.obj[key] === record.obj[key],
                                                'Alter : Alter mode should recover json type data, but property (inserted.obj.' + key + ' === ' + inserted.obj[key] 
                                                        + ') !== (inserted.obj.' + key + ' === ' + record.obj[key] + ')');
                                    });
                                    data.collections.person.drop(function (err) {
                                        assert(!err, 'Alter : Drop error ' + err);
                                    });
                                });
                            });
                        });

                    });

                });
            });
        });
  });
});
