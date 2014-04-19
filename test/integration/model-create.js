var should   = require('should');
var helper   = require('../support/spec_helper');
var ORM      = require('../../');

describe("Model.create()", function() {
	var db = null;
	var Pet = null;
	var Person = null;
	var Pen = null;

	var setup = function () {
		return function (done) {
			Person = db.define("person", {
				name   : String
			});
			Pet = db.define("pet", {
				name   : { type: "text", defaultValue: "Mutt" },
				age    : { type: 'number' }
			});
			Person.hasMany("pets", Pet);

			Pen = db.define("pen", {
				colour : { type: "text" }
			});

			return helper.dropSync([ Person, Pet, Pen ], done);
		};
	};

	before(function (done) {
		helper.connect(function (connection) {
			db = connection;

			return done();
		});
	});

	after(function () {
		return db.close();
	});

	describe("if passing an object", function () {
		before(setup());

		it("should accept it as the only item to create", function (done) {
			Person.create({
				name : "John Doe"
			}, function (err, John) {
				should.equal(err, null);
				John.should.have.property("name", "John Doe");

				return done();
			});
		});
	});

	describe("if passing an array", function () {
		before(setup());

		it("should accept it as a list of items to create", function (done) {
			Person.create([{
				name : "John Doe"
			}, {
				name : "Jane Doe"
			}], function (err, people) {
				should.equal(err, null);
				should(Array.isArray(people));

				people.should.have.property("length", 2);
				people[0].should.have.property("name", "John Doe");
				people[1].should.have.property("name", "Jane Doe");

				return done();
			});
		});
	});

	describe("if element has an association", function () {
		before(setup());

		it("should also create it or save it", function (done) {
			Person.create({
				name : "John Doe",
				pets : [ new Pet({ name: "Deco" }) ]
			}, function (err, John) {
				should.equal(err, null);

				John.should.have.property("name", "John Doe");

				should(Array.isArray(John.pets));

				John.pets[0].should.have.property("name", "Deco");
				John.pets[0].should.have.property(Pet.id);
				John.pets[0].saved().should.be.true;

				return done();
			});
		});

		it("should also create it or save it even if it's an object and not an instance", function (done) {
			Person.create({
				name : "John Doe",
				pets : [ { name: "Deco" } ]
			}, function (err, John) {
				should.equal(err, null);

				John.should.have.property("name", "John Doe");

				should(Array.isArray(John.pets));

				John.pets[0].should.have.property("name", "Deco");
				John.pets[0].should.have.property(Pet.id);
				John.pets[0].saved().should.be.true;

				return done();
			});
		});
	});

	describe("when not passing a property", function () {
		before(setup());

		it("should use defaultValue if defined", function (done) {
			Pet.create({}, function (err, Mutt) {
				should.equal(err, null);

				Mutt.should.have.property("name", "Mutt");

				return done();
			});
		});

		it("should not use defaultValue when updating", function (done) {
			Pet.create({name: "Ruffy"}, function (err, pet) {
				should.equal(err, null);
				should.equal(pet.name, "Ruffy");

				// simulated data from a user
				var params = { age: 4 };

				pet.age  = params.age;
				pet.name = params.name; // we expected a name, but it's undefined

				pet.save(function (err) {
					should.not.exist(err);

					Pet.get(pet.id, function (err, pet) {
						should.not.exist(err);
						should.strictEqual(pet.name, null);

						done();
					})
				});
			})
		});

		it("should return the default value set in the databse", function (done) {
			db.driver.execQuery(
				"ALTER TABLE ?? ALTER COLUMN ?? SET DEFAULT ?", [Pen.table, 'colour', 'blue'],
				function (err) {
					should.not.exist(err);

					Pen.create({colour: undefined}, function (err, pen) {
						should.not.exist(err);

						should.equal(pen.colour, 'blue');

						done();
					});
				}
			);
		});
	});
});
