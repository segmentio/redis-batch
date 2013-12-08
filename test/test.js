var assert = require('assert');
var sinon = require('sinon');

describe('RedisBatch', function () {

  var RedisBatch = require('../');

  var key1 = 'key1';
  var key2 = 'key2';
  var fields = ['mobile', 'server', 'browser'];
  var flushAfter = 250;

  var redisSpy = function () {
    return {
      incrby: sinon.spy(),
      hincrby: sinon.spy(),
      sadd: sinon.spy()
    };
  };

  var flushes = function (flushes) {
    return (flushAfter * flushes + 20);
  };

  /**
   * Constructor tests.
   */

  describe('Constructor', function () {

    it('should error if not given a redis instance', function () {
      try {
        var batch = new RedisBatch();
        assert(false);
      } catch (err) {
        assert(err);
      }
    });

    it('should instantiate with just a redis', function () {
      try {
        var redis = redisSpy();
        var batch = new RedisBatch(redis);
        assert(batch);
        assert.equal(batch.options.flushAfter, 5000);
      } catch (err) {
        assert(false);
      }
    });

    it('should override the default flushAfter if provided', function () {
      var redis = redisSpy();
      var batch = new RedisBatch(redis, { flushAfter: flushAfter });
      assert(batch.options.flushAfter === flushAfter);
    });

  });

  /**
   * incrby tests
   */
  
  describe('incrby', function () {
    
    var redis;
    var batch;
    
    beforeEach(function () {
      redis = redisSpy();
      batch = new RedisBatch(redis, { flushAfter: flushAfter });
    });

    describe('batching', function () {

      it('should incrby 1 by default', function () {
        assert.equal(batch.batch.incrby[key1], undefined);
        batch.incrby(key1);
        assert.equal(batch.batch.incrby[key1], 1);
      });

      it('should incrby a positive number if provided', function () {
        assert.equal(batch.batch.incrby[key1], undefined);
        batch.incrby(key1, 1238898);
        assert.equal(batch.batch.incrby[key1], 1238898);
      });

      it('should incrby a negative number if provided', function () {
        assert.equal(batch.batch.incrby[key2], undefined);
        batch.incrby(key2, -81726);
        assert.equal(batch.batch.incrby[key2], -81726);
      });

      it('should incrby a positive number after a negative number', function () {
        assert.equal(batch.batch.incrby[key2], undefined);
        batch.incrby(key2, -81726);
        assert.equal(batch.batch.incrby[key2], -81726);
        batch.incrby(key2, 81727);
        assert.equal(batch.batch.incrby[key2], 1);
      });

    });

    describe('flushing', function () {

      it('should not flush when nothing is incremented', function (done) {
        var test = function () {
          assert.equal(redis.incrby.callCount, 0);
        };
        setTimeout(test, flushes(1));
        setTimeout(test, flushes(2));
        setTimeout(test, flushes(3));
        setTimeout(test, flushes(4));
        setTimeout(done, flushes(5));
      });

      it('should flush one key', function (done) {
        batch.incrby(key1);
        var test = function () {
          assert.equal(redis.incrby.callCount, 1);
          assert(redis.incrby.calledWith(key1, 1));
        };
        setTimeout(test, flushes(1));
        setTimeout(test, flushes(4));
        setTimeout(done, flushes(5));
      });

      it('should flush several keys', function (done) {
        batch.incrby(key1);
        batch.incrby(key2, -40);
        var test = function () {
          assert.equal(redis.incrby.callCount, 2);
          assert(redis.incrby.calledWith(key1, 1));
          assert(redis.incrby.calledWith(key2, -40));
        };
        setTimeout(test, flushes(1));
        setTimeout(test, flushes(4));
        setTimeout(done, flushes(5));
      });

      it('should flush multiple increments of a key-field as one incrby', function (done) {
        batch.incrby(key1)
          .incrby(key1)
          .incrby(key1)
          .incrby(key1)
          .incrby(key1)
          .incrby(key1)
          .incrby(key1)
          .incrby(key1)
          .incrby(key1)
          .incrby(key2, 2)
          .incrby(key2, 2)
          .incrby(key2, 2)
          .incrby(key2, 3);
        var test = function () {
          assert.equal(redis.incrby.callCount, 2);
          assert(redis.incrby.calledWith(key1, 9));
          assert(redis.incrby.calledWith(key2, 9));
        };
        setTimeout(test, flushes(1));
        setTimeout(test, flushes(4));
        setTimeout(done, flushes(5));
      });

    });

  });

  /**
   * hincrby tests
   */
  /*
  describe('hincrby', function () {
    
    var redis;
    var batch;
    
    beforeEach(function () {
      redis = redisSpy();
      batch = new RedisBatch(redis, { flushAfter: flushAfter });
    });

    describe('batching', function () {

      it('should increment by 1 by default', function () {
        assert(batch.hashtable[key1] === undefined);
        batch.increment(key1, fields[0]);
        assert(batch.hashtable[key1][fields[0]] === 1);
      });

      it('should increment by a positive number if provided', function () {
        assert(batch.hashtable[key1] === undefined);
        batch.increment(key1, fields[2], 1238898);
        assert(batch.hashtable[key1][fields[2]] === 1238898);
      });

      it('should increment by a negative number if provided', function () {
        assert(batch.hashtable[key2] === undefined);
        batch.increment(key2, fields[1], -81726);
        assert(batch.hashtable[key2][fields[1]] === -81726);
      });

      it('should increment by a positive number after a negative number', function () {
        assert(batch.hashtable[key2] === undefined);
        batch.increment(key2, fields[1], -81726);
        assert(batch.hashtable[key2][fields[1]] === -81726);
        batch.increment(key2, fields[1], 81727);
        assert(batch.hashtable[key2][fields[1]] === 1);
      });

    });

    describe('flushing', function () {

      it('should not flush when nothing is incremented', function (done) {
        done = after(4, done);
        var test = function () {
          assert(redis.hincrby.callCount === 0);
          done();
        };
        setTimeout(test, flushes(1));
        setTimeout(test, flushes(2));
        setTimeout(test, flushes(3));
        setTimeout(test, flushes(4));
      });

      it('should flush one key-field', function (done) {
        batch.increment(key1, fields[0]);
        done = after(2, done);
        var test = function () {
          assert(redis.hincrby.callCount === 1);
          assert(redis.hincrby.calledWith(key1, fields[0], 1));
          done();
        };
        setTimeout(test, flushes(1));
        setTimeout(test, flushes(4));
      });

      it('should flush several key-fields', function (done) {
        batch.increment(key1, fields[0]);
        batch.increment(key1, fields[2], 3);
        batch.increment(key1, fields[1], -40);
        done = after(2, done);
        var test = function () {
          assert(redis.hincrby.callCount === 3);
          assert(redis.hincrby.calledWith(key1, fields[0], 1));
          assert(redis.hincrby.calledWith(key1, fields[1], -40));
          assert(redis.hincrby.calledWith(key1, fields[2], 3));
          done();
        };
        setTimeout(test, flushes(1));
        setTimeout(test, flushes(4));
      });

      it('should flush several keys-field', function (done) {
        batch.increment(key1, fields[0]);
        batch.increment(key2, fields[2], 3);
        done = after(2, done);
        var test = function () {
          assert(redis.hincrby.callCount === 2);
          assert(redis.hincrby.calledWith(key1, fields[0], 1));
          assert(redis.hincrby.calledWith(key2, fields[2], 3));
          done();
        };
        setTimeout(test, flushes(1));
        setTimeout(test, flushes(4));
      });

      it('should flush multiple increments of a key-field as one hincrby', function (done) {
        batch.increment(key1, fields[0]);
        batch.increment(key1, fields[0]);
        batch.increment(key1, fields[0]);
        batch.increment(key1, fields[0]);
        batch.increment(key1, fields[0]);
        batch.increment(key1, fields[0]);
        batch.increment(key1, fields[0]);
        batch.increment(key1, fields[0]);
        batch.increment(key1, fields[0]);
        batch.increment(key2, fields[0], 2);
        batch.increment(key2, fields[0], 2);
        batch.increment(key2, fields[0], 2);
        batch.increment(key2, fields[0], 2);
        done = after(2, done);
        var test = function () {
          assert(redis.hincrby.callCount === 2);
          assert(redis.hincrby.calledWith(key1, fields[0], 9));
          assert(redis.hincrby.calledWith(key2, fields[0], 8));
          done();
        };
        setTimeout(test, flushes(1));
        setTimeout(test, flushes(4));
      });

    });


    

  });*/

});
