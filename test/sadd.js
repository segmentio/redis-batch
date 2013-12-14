var assert = require('assert');
var sinon = require('sinon');
var RedisSpy = require('./lib/redis-spy');
var Flushes = require('./lib/flushes');

var RedisBatch = require('../');

/**
 * Testing data.
 */

var key1 = 'key1';
var key2 = 'key2';
var field1 = 'mobile';
var field2 = 'server';
var field3 = 'browser';

/**
 * Test timing management.
 */

var flushAfter = 10;
var flushes = Flushes(flushAfter);

/**
 * sadd tests
 */

describe('sadd', function () {
  
  var redis;
  var batch;
  
  beforeEach(function () {
    redis = RedisSpy('sadd');
    batch = new RedisBatch(redis, { flushAfter: flushAfter });
  });

  describe('batching', function () {

    it('should sadd a single member', function () {
      assert.equal(batch.batch.sadd[key1], undefined);
      batch.sadd(key1, field1);
      assert.deepEqual(Object.keys(batch.batch.sadd[key1]), [field1]);
    });

    it('should sadd multiple members to one key', function () {
      assert.equal(batch.batch.sadd[key1], undefined);
      batch.sadd(key1, field1);
      batch.sadd(key1, field1);
      batch.sadd(key1, field3);
      batch.sadd(key1, field2);
      assert.deepEqual(Object.keys(batch.batch.sadd[key1]), [field1, field3, field2]);
    });

    it('should add multiple members to multiple keys', function () {
      assert.equal(batch.batch.sadd[key1], undefined);
      batch.sadd(key1, field1)
        .sadd(key1, field1)
        .sadd(key1, field3)
        .sadd(key1, field2)
        .sadd(key2, field2)
        .sadd(key2, field3);
      assert.deepEqual(Object.keys(batch.batch.sadd[key1]), [field1, field3, field2]);
      assert.deepEqual(Object.keys(batch.batch.sadd[key2]), [field2, field3]);
    });

  });

  describe('flushing', function () {

    it('should not flush when no members are added', function (done) {
      var test = function () {
        assert.equal(redis.sadd.callCount, 0);
      };
      setTimeout(test, flushes(1));
      setTimeout(test, flushes(2));
      setTimeout(test, flushes(3));
      setTimeout(test, flushes(4));
      setTimeout(done, flushes(5));
    });

    it('should flush a single key and member', function (done) {
      batch.sadd(key1, field1);
      var test = function () {
        assert.equal(redis.sadd.callCount, 1);
        assert(redis.sadd.calledWith(key1, [field1]));
      };
      setTimeout(test, flushes(1));
      setTimeout(test, flushes(4));
      setTimeout(done, flushes(5));
    });

    it('should flush a single key with multiple members', function (done) {
      batch.sadd(key1, field1)
        .sadd(key1, field2)
        .sadd(key1, field1)
        .sadd(key1, field3);
      var test = function () {
        assert.equal(redis.sadd.callCount, 1);
        assert(redis.sadd.calledWith(key1, [field1, field2, field3]));
      };
      setTimeout(test, flushes(1));
      setTimeout(test, flushes(4));
      setTimeout(done, flushes(5));
    });

    it('should flush multiple keys', function (done) {
      batch.sadd(key1, field1)
        .sadd(key1, field2)
        .sadd(key1, field1)
        .sadd(key1, field3)
        .sadd(key2, field1);
      var test = function () {
        assert.equal(redis.sadd.callCount, 2);
        assert(redis.sadd.calledWith(key1, [field1, field2, field3]));
        assert(redis.sadd.calledWith(key2, [field1]));
      };
      setTimeout(test, flushes(1));
      setTimeout(test, flushes(4));
      setTimeout(done, flushes(5));
    });

  });

});